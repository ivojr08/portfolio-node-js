const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

const state = { projects: [], filtered: [], tags: new Set(), activeTags: new Set() };

function renderTags() {
  const wrap = $("#tagFilters");
  wrap.innerHTML = "";
  [...state.tags].sort().forEach(tag => {
    const b = document.createElement("button");
    b.className = "tag" + (state.activeTags.has(tag) ? " active" : "");
    b.textContent = tag;
    b.onclick = () => { state.activeTags.has(tag) ? state.activeTags.delete(tag) : state.activeTags.add(tag); renderTags(); applyFilters(); };
    wrap.appendChild(b);
  });
}

function cardTemplate(p) {
  return `
    <article class="card" data-tags="${p.tags.join(",")}">
      <img src="${p.image}" alt="${p.title}">
      <h3>${p.title}</h3>
      <p>${p.summary}</p>
      <div class="badges">${p.tech.map(t => `<span class="badge">${t}</span>`).join("")}</div>
      <div class="links">
        ${p.demo ? `<a class="btn ghost" href="${p.demo}" target="_blank">Demo</a>` : ""}
        ${p.repo ? `<a class="btn ghost" href="${p.repo}" target="_blank">Repo</a>` : ""}
        <button class="btn" data-id="${p.id}" data-open>Detalhes</button>
      </div>
    </article>`;
}

function renderGrid(list) {
  $("#gridProjetos").innerHTML = list.map(cardTemplate).join("");
  $$("[data-open]").forEach(btn => btn.addEventListener("click", openModal));
}

function applyFilters() {
  const q = $("#search").value.trim().toLowerCase();
  state.filtered = state.projects.filter(p => {
    const matchText = [p.title, p.summary, ...p.tech, ...p.tags].join(" ").toLowerCase().includes(q);
    const matchTags = state.activeTags.size === 0 || p.tags.some(t => state.activeTags.has(t));
    return matchText && matchTags;
  });
  renderGrid(state.filtered);
}

async function loadProjects() {
  const res = await fetch("/data/projects.json");
  const data = await res.json();
  state.projects = data.projects;
  state.filtered = data.projects;
  data.projects.forEach(p => p.tags.forEach(t => state.tags.add(t)));
  renderTags(); renderGrid(state.filtered);
}

function openModal(e) {
  const id = e.currentTarget.dataset.id;
  const p = state.projects.find(x => String(x.id) === String(id));
  if (!p) return;
  $("#modalBody").innerHTML = `
    <h3 style="margin-top:0">${p.title}</h3>
    <p>${p.description || p.summary}</p>
    ${p.image ? `<img style="width:100%;border-radius:12px;border:1px solid var(--border)" src="${p.image}" alt="${p.title}">` : ""}
    <p><strong>Tecnologias:</strong> ${p.tech.join(", ")}</p>
    <p>
      ${p.demo ? `<a class="btn" href="${p.demo}" target="_blank">Abrir demo</a>` : ""}
      ${p.repo ? `<a class="btn ghost" href="${p.repo}" target="_blank">Abrir repositório</a>` : ""}
    </p>`;
  $("#modal").setAttribute("aria-hidden", "false");
  $("#modal").setAttribute("aria-modal", "true");
}

function closeModal() {
  $("#modal").setAttribute("aria-hidden", "true");
  $("#modal").setAttribute("aria-modal", "false");
}

function setTheme(mode) {
  const root = document.documentElement;
  if (mode === "light") root.classList.add("light"); else root.classList.remove("light");
  localStorage.setItem("theme", mode);
  const btn = $("#themeToggle");
  if (btn) {
    btn.textContent = mode === "light" ? "🌞" : "🌙";
    btn.setAttribute("aria-label", mode === "light" ? "Switch to dark theme" : "Switch to light theme");
  }
}

function loadTheme() {
  const saved = localStorage.getItem("theme");
  // default = dark, mas respeita salvo
  setTheme(saved === "light" ? "light" : "dark");
}

function toggleTheme() {
  const isLight = document.documentElement.classList.contains("light");
  setTheme(isLight ? "dark" : "light");
}

async function handleContact(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const status = $("#contactStatus");
  status.textContent = "Enviando...";
  try {
    const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const out = await res.json();
    if (out.ok) { status.textContent = "Mensagem enviada!"; form.reset(); }
    else { status.textContent = out.error || "Falha ao enviar."; }
  } catch { status.textContent = "Erro de rede."; }
}

window.addEventListener("DOMContentLoaded", () => {
  $("#year").textContent = new Date().getFullYear();
  loadTheme(); loadProjects();
  $("#search").addEventListener("input", applyFilters);
  $("#modalClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  $("#themeToggle").addEventListener("click", toggleTheme);
  loadTheme();
  $("#contactForm").addEventListener("submit", handleContact);
});