const modules = [
  { href: "dashboard.html", label: "Dashboard", icon: "⌂" },
  { href: "applications.html", label: "Applications", icon: "▤" },
  { href: "reference-data.html?type=students", label: "Students", icon: "◎" },
  { href: "reference-data.html?type=universities", label: "Universities", icon: "◇" },
  { href: "reference-data.html?type=countries", label: "Countries", icon: "◌" },
  { href: "reference-data.html?type=programmes", label: "Programmes", icon: "▦" },
  { href: "document-types.html", label: "Document types", icon: "▱" },
  { href: "compliance-rules.html", label: "Compliance rules", icon: "✓" },
  { href: "module.html?module=reports", label: "Reports", icon: "▥" },
];

function isActive(href, active) {
  if (active === href) return true;
  if (!href.startsWith("module.html") || !active?.startsWith("module.html")) return false;
  const hrefModule = new URLSearchParams(href.split("?")[1] || "").get("module");
  const activeModule = new URLSearchParams(active.split("?")[1] || "").get("module");
  return hrefModule === activeModule;
}

export function renderTopbar(active) {
  document.body.classList.add("workspace-mode");
  const current = active || `${window.location.pathname.split("/").pop()}${window.location.search}`;
  const nav = modules.map(({ href, label, icon }) => `
    <a href="${href}" class="workspace-nav-link ${isActive(href, current) ? "active" : ""}">
      <span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span>
    </a>`).join("");

  document.body.insertAdjacentHTML("afterbegin", `
    <aside class="workspace-sidebar" aria-label="Workspace navigation">
      <div class="workspace-brand">
        <span class="mark">CC · MVP</span>
        <div><strong>Compliance</strong><span>Checker workspace</span></div>
      </div>
      <div class="workspace-section-label">Workspace</div>
      <nav class="workspace-nav">${nav}</nav>
      <div class="workspace-sidebar-footer">
        <a href="module.html?module=settings" class="workspace-nav-link ${current.includes("settings") ? "active" : ""}">
          <span class="nav-icon" aria-hidden="true">⚙</span><span>Settings</span>
        </a>
        <div class="workspace-status"><span class="status-dot"></span> Supabase connected</div>
      </div>
    </aside>
    <header class="workspace-mobile-header">
      <button class="workspace-menu-btn secondary" type="button" aria-label="Open navigation">Menu</button>
      <span class="workspace-mobile-title">Compliance Checker</span>
      <button class="workspace-mobile-close secondary" type="button" aria-label="Close navigation">Close</button>
    </header>
    <div class="workspace-scrim" aria-hidden="true"></div>
  `);

  const sidebar = document.querySelector(".workspace-sidebar");
  document.querySelector(".workspace-menu-btn")?.addEventListener("click", () => {
    sidebar?.classList.add("open");
    document.body.classList.add("nav-open");
  });
  document.querySelector(".workspace-mobile-close")?.addEventListener("click", closeNav);
  document.querySelector(".workspace-scrim")?.addEventListener("click", closeNav);
  sidebar?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));
}

function closeNav() {
  document.querySelector(".workspace-sidebar")?.classList.remove("open");
  document.body.classList.remove("nav-open");
}
