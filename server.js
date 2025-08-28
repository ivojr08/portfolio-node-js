import express from "express";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Desativar cache para HTML em dev
app.use((req, res, next) => {
  const wantsHTML = req.method === 'GET' && (req.path.endsWith('.html') || req.accepts('html'));
  if (wantsHTML) {
    res.set('Cache-Control', 'no-store');
  }
  next();
});
app.use(express.static("public", {
  etag: true,
  lastModified: true,
  maxAge: "7d"
}));

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Campos obrigatórios: name, email, message." });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const info = await transporter.sendMail({
      from: `Portfolio <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO || process.env.SMTP_USER,
      replyTo: email,
      subject: `Contato do Portfólio — ${name}`,
      text: message,
      html: `<p><strong>Nome:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Mensagem:</strong><br>${String(message).replace(/\n/g, "<br>")}</p>`
    });

    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Falha ao enviar email." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
