export function renderTopbar(active) {
  const links = [
    ["dashboard.html", "Applications"],
    ["document-types.html", "Document types"],
  ];
  const nav = links
    .map(([href, label]) => `<a href="${href}" class="${active === href ? "active" : ""}">${label}</a>`)
    .join("");
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<div class="topbar">
      <div class="brand">
        <span class="mark">CC · MVP</span>
        <span class="name">Compliance Checker</span>
      </div>
      <nav>
        ${nav}
        <span class="who" data-who></span>
        <a href="#" data-signout class="btn secondary" style="padding:5px 12px;">Sign out</a>
      </nav>
    </div>`
  );
}
