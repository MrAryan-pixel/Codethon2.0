import "./styles.css";

const API = import.meta.env.VITE_ITSM_API_BASE_URL || "";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ── API Layer ──
async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ── Toast ──
function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  $("#toastContainer").appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Modal ──
function openModal(title, bodyHTML, footerHTML = "") {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHTML;
  $("#modalFooter").innerHTML = footerHTML;
  $("#modalOverlay").classList.add("active");
}

function closeModal() {
  $("#modalOverlay").classList.remove("active");
}

// ── State ──
let currentView = "dashboard";
let cache = {};

// ── Navigation ──
function wireNav() {
  const navItems = $$(".nav-item");
  const btnCreate = $("#btnCreate");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const view = item.dataset.view;
      switchView(view);
      navItems.forEach((b) => b.classList.remove("active"));
      item.classList.add("active");
      closeSidebar();
    });
  });

  btnCreate.addEventListener("click", () => handleCreate());

  $("#modalClose").addEventListener("click", closeModal);
  $("#modalOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

function closeSidebar() {
  const sidebar = $("#sidebar");
  const overlay = $(".sidebar-overlay");
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("active");
}

// ── Mobile menu ──
function wireMobileMenu() {
  let btn = $(".mobile-menu-btn");
  if (!btn) {
    btn = document.createElement("button");
    btn.className = "mobile-menu-btn";
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    document.body.appendChild(btn);
  }

  let overlay = $(".sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
  }

  btn.addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
    overlay.classList.toggle("active");
  });

  overlay.addEventListener("click", closeSidebar);
}

// ── View Switching ──
const VIEW_META = {
  dashboard: { title: "Dashboard", eyebrow: "IT Service Management", create: false },
  incidents: { title: "Incidents", eyebrow: "Incident Management", create: true },
  requests: { title: "Service Requests", eyebrow: "Service Request Management", create: true },
  assets: { title: "Assets", eyebrow: "Asset Management", create: true },
  employees: { title: "Employees", eyebrow: "Employee Directory", create: true },
  teams: { title: "Support Teams", eyebrow: "Team Management", create: true },
  knowledge: { title: "Knowledge Base", eyebrow: "Knowledge Management", create: true },
};

function switchView(view) {
  currentView = view;
  const meta = VIEW_META[view];
  $("#viewTitle").textContent = meta.title;
  $("#viewEyebrow").textContent = meta.eyebrow;
  $("#btnCreate").style.display = meta.create ? "inline-flex" : "none";
  $("#btnCreate").textContent = "";
  const svg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  $("#btnCreate").innerHTML = svg + ` Create ${meta.title.replace(/s$/, "")}`;

  loadView(view);
}

// ── Load View Data ──
async function loadView(view) {
  const container = $("#viewContainer");
  container.innerHTML = '<div class="spinner"></div>';

  try {
    switch (view) {
      case "dashboard": await renderDashboard(container); break;
      case "incidents": await renderIncidents(container); break;
      case "requests": await renderRequests(container); break;
      case "assets": await renderAssets(container); break;
      case "employees": await renderEmployees(container); break;
      case "teams": await renderTeams(container); break;
      case "knowledge": await renderKnowledge(container); break;
    }
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Failed to load data: ${escapeHtml(err.message)}</p></div>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function badgeHtml(text) {
  return `<span class="badge ${(text || "").toLowerCase().replace(/[\s_]+/g, "-")}">${escapeHtml(text)}</span>`;
}

// ── Dashboard ──
async function renderDashboard(container) {
  const data = await api("/portal/data");
  const { metrics, recentIncidents, recentRequests } = data;

  container.innerHTML = `
    <div class="hero-grid">
      <article class="hero-card accent">
        <p>Open Incidents</p>
        <h3>${metrics.openIncidents}</h3>
        <span>Active issues requiring attention</span>
      </article>
      <article class="hero-card">
        <p>Pending Requests</p>
        <h3>${metrics.pendingRequests}</h3>
        <span>Awaiting approval or action</span>
      </article>
      <article class="hero-card">
        <p>SLA at Risk</p>
        <h3 style="color: var(--danger)">${metrics.slaRisk}</h3>
        <span>High/Critical priority unresolved</span>
      </article>
      <article class="hero-card">
        <p>Total Assets</p>
        <h3>${metrics.totalAssets}</h3>
        <span>${metrics.assignedAssets} assigned</span>
      </article>
    </div>

    <div class="content-grid">
      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="panel-label">Recent</p>
            <h3>Latest Incidents</h3>
          </div>
          <button class="secondary-btn" onclick="document.querySelector('[data-view=incidents]').click()">View All</button>
        </div>
        <div class="ticket-list">
          ${recentIncidents.length ? recentIncidents.map((inc) => `
            <article class="ticket-item">
              <div class="heading">
                <div>
                  <strong>${escapeHtml(inc.incidentId)} &middot; ${escapeHtml(inc.title)}</strong>
                  <div class="meta">Assigned to: ${escapeHtml(inc.assignedTo || "Unassigned")}</div>
                </div>
                <div style="display:flex;gap:6px;align-items:center">
                  ${badgeHtml(inc.priority)}
                  ${badgeHtml(inc.status)}
                </div>
              </div>
            </article>
          `).join("") : '<div class="empty-state"><p>No recent incidents</p></div>'}
        </div>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="panel-label">Recent</p>
            <h3>Latest Requests</h3>
          </div>
          <button class="secondary-btn" onclick="document.querySelector('[data-view=requests]').click()">View All</button>
        </div>
        <div class="ticket-list">
          ${recentRequests.length ? recentRequests.map((req) => `
            <article class="ticket-item">
              <div class="heading">
                <div>
                  <strong>${escapeHtml(req.requestId)} &middot; ${escapeHtml(req.title)}</strong>
                  <div class="meta">By: ${escapeHtml(req.requestedBy || "Unknown")}</div>
                </div>
                ${badgeHtml(req.status)}
              </div>
            </article>
          `).join("") : '<div class="empty-state"><p>No recent requests</p></div>'}
        </div>
      </article>
    </div>

    <div class="details-grid">
      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="panel-label">Workflow</p>
            <h3>Incident Handling</h3>
          </div>
        </div>
        <ol class="workflow">
          <li><strong>Report</strong><span>Employees submit issues with category, urgency, and impact.</span></li>
          <li><strong>Triage</strong><span>Support engineers classify, prioritize, and route.</span></li>
          <li><strong>Resolve</strong><span>Teams collaborate, document fixes, and close with notes.</span></li>
        </ol>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="panel-label">Coverage</p>
            <h3>Support Teams</h3>
          </div>
        </div>
        <div class="simple-list" id="dashTeamList"></div>
      </article>
    </div>
  `;

  const teams = await api("/teams");
  const teamList = container.querySelector("#dashTeamList");
  if (teamList) {
    teamList.innerHTML = teams.map((t) => `
      <article class="simple-item">
        <div class="heading"><strong>${escapeHtml(t.name)}</strong></div>
        <div class="meta">${escapeHtml(t.description)} &middot; ${t.memberCount} members</div>
      </article>
    `).join("");
  }

  updateSidebarMetrics(metrics);
}

function updateSidebarMetrics(m) {
  if (!m) return;
  $("#openIncidents").textContent = m.openIncidents ?? "-";
  $("#pendingRequests").textContent = m.pendingRequests ?? "-";
  const slaEl = $("#slaRisk");
  slaEl.textContent = m.slaRisk ?? "-";
  if (m.slaRisk > 0) slaEl.classList.add("danger");
}

// ── Incidents ──
async function renderIncidents(container) {
  const incidents = await api("/incidents");
  cache.incidents = incidents;

  container.innerHTML = `
    <div class="search-bar">
      <input class="search-input" id="incSearch" placeholder="Search incidents..." />
      <select class="filter-select" id="incStatusFilter">
        <option value="">All Status</option>
        <option value="OPEN">Open</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="RESOLVED">Resolved</option>
        <option value="CLOSED">Closed</option>
      </select>
      <select class="filter-select" id="incPriorityFilter">
        <option value="">All Priority</option>
        <option value="Critical">Critical</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>
    </div>
    <div class="panel">
      <div class="panel-header">
        <div><h3>All Incidents</h3><p class="panel-label">${incidents.length} total</p></div>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table" id="incTable">
          <thead>
            <tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Category</th><th>Assigned To</th><th>Actions</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  renderIncidentsTable(incidents);

  const filter = () => {
    const q = $("#incSearch").value.toLowerCase();
    const s = $("#incStatusFilter").value;
    const p = $("#incPriorityFilter").value;
    let filtered = incidents;
    if (q) filtered = filtered.filter((i) => i.title.toLowerCase().includes(q) || i.incidentId.toLowerCase().includes(q));
    if (s) filtered = filtered.filter((i) => i.status === s);
    if (p) filtered = filtered.filter((i) => i.priority === p);
    renderIncidentsTable(filtered);
  };

  $("#incSearch").addEventListener("input", filter);
  $("#incStatusFilter").addEventListener("change", filter);
  $("#incPriorityFilter").addEventListener("change", filter);
}

function renderIncidentsTable(incidents) {
  const tbody = $("#incTable tbody");
  if (!incidents.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><p>No incidents found</p></td></tr>';
    return;
  }
  tbody.innerHTML = incidents.map((i) => `
    <tr>
      <td><strong>${escapeHtml(i.incidentId)}</strong></td>
      <td>${escapeHtml(i.title)}</td>
      <td>${badgeHtml(i.priority)}</td>
      <td>${badgeHtml(i.status)}</td>
      <td>${escapeHtml(i.category)}</td>
      <td>${escapeHtml(i.assignedTo || "-")}</td>
      <td>
        <div class="actions-row">
          <button class="icon-btn" onclick="editIncident('${i._id}')" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn danger" onclick="deleteIncident('${i._id}')" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

window.editIncident = async function (id) {
  const incident = cache.incidents.find((i) => i._id === id);
  if (!incident) return;

  openModal("Edit Incident", `
    <div class="form-group"><label>Title</label><input id="fTitle" value="${escapeHtml(incident.title)}" /></div>
    <div class="form-group"><label>Description</label><textarea id="fDesc">${escapeHtml(incident.description)}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Priority</label>
        <select id="fPriority">
          ${["Critical", "High", "Medium", "Low"].map((p) => `<option value="${p}" ${incident.priority === p ? "selected" : ""}>${p}</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label>Status</label>
        <select id="fStatus">
          ${["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => `<option value="${s}" ${incident.status === s ? "selected" : ""}>${s.replace("_", " ")}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Category</label><input id="fCategory" value="${escapeHtml(incident.category)}" /></div>
      <div class="form-group"><label>Assigned To</label><input id="fAssigned" value="${escapeHtml(incident.assignedTo)}" /></div>
    </div>
    <div class="form-group"><label>Resolution</label><textarea id="fResolution">${escapeHtml(incident.resolution)}</textarea></div>
  `, `
    <button class="secondary-btn" onclick="closeModal()">Cancel</button>
    <button class="primary-btn" onclick="saveIncident('${id}')">Save Changes</button>
  `);
};

window.saveIncident = async function (id) {
  try {
    await api(`/incidents/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: $("#fTitle").value,
        description: $("#fDesc").value,
        priority: $("#fPriority").value,
        status: $("#fStatus").value,
        category: $("#fCategory").value,
        assignedTo: $("#fAssigned").value,
        resolution: $("#fResolution").value,
      }),
    });
    closeModal();
    toast("Incident updated successfully", "success");
    loadView("incidents");
  } catch (err) {
    toast("Failed to update: " + err.message, "error");
  }
};

window.deleteIncident = async function (id) {
  if (!confirm("Are you sure you want to delete this incident?")) return;
  try {
    await api(`/incidents/${id}`, { method: "DELETE" });
    toast("Incident deleted", "success");
    loadView("incidents");
  } catch (err) {
    toast("Failed to delete: " + err.message, "error");
  }
};

// ── Service Requests ──
async function renderRequests(container) {
  const requests = await api("/service-requests");
  cache.requests = requests;

  container.innerHTML = `
    <div class="search-bar">
      <input class="search-input" id="srSearch" placeholder="Search requests..." />
      <select class="filter-select" id="srStatusFilter">
        <option value="">All Status</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="COMPLETED">Completed</option>
        <option value="REJECTED">Rejected</option>
      </select>
    </div>
    <div class="panel">
      <div class="panel-header">
        <div><h3>All Service Requests</h3><p class="panel-label">${requests.length} total</p></div>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table" id="srTable">
          <thead>
            <tr><th>ID</th><th>Title</th><th>Type</th><th>Status</th><th>Requested By</th><th>Assigned To</th><th>Actions</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  renderRequestsTable(requests);

  const filter = () => {
    const q = $("#srSearch").value.toLowerCase();
    const s = $("#srStatusFilter").value;
    let filtered = requests;
    if (q) filtered = filtered.filter((r) => r.title.toLowerCase().includes(q) || r.requestId.toLowerCase().includes(q));
    if (s) filtered = filtered.filter((r) => r.status === s);
    renderRequestsTable(filtered);
  };

  $("#srSearch").addEventListener("input", filter);
  $("#srStatusFilter").addEventListener("change", filter);
}

function renderRequestsTable(requests) {
  const tbody = $("#srTable tbody");
  if (!requests.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><p>No requests found</p></td></tr>';
    return;
  }
  tbody.innerHTML = requests.map((r) => `
    <tr>
      <td><strong>${escapeHtml(r.requestId)}</strong></td>
      <td>${escapeHtml(r.title)}</td>
      <td>${escapeHtml(r.type)}</td>
      <td>${badgeHtml(r.status)}</td>
      <td>${escapeHtml(r.requestedBy)}</td>
      <td>${escapeHtml(r.assignedTo || "-")}</td>
      <td>
        <div class="actions-row">
          <button class="icon-btn" onclick="editRequest('${r._id}')" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn danger" onclick="deleteRequest('${r._id}')" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

window.editRequest = async function (id) {
  const req = cache.requests.find((r) => r._id === id);
  if (!req) return;

  openModal("Edit Service Request", `
    <div class="form-group"><label>Title</label><input id="fTitle" value="${escapeHtml(req.title)}" /></div>
    <div class="form-group"><label>Description</label><textarea id="fDesc">${escapeHtml(req.description)}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Type</label><input id="fType" value="${escapeHtml(req.type)}" /></div>
      <div class="form-group"><label>Status</label>
        <select id="fStatus">
          ${["PENDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"].map((s) => `<option value="${s}" ${req.status === s ? "selected" : ""}>${s.replace("_", " ")}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Assigned To</label><input id="fAssigned" value="${escapeHtml(req.assignedTo)}" /></div>
      <div class="form-group"><label>Approval</label>
        <select id="fApproval">
          ${["PENDING", "APPROVED", "REJECTED"].map((s) => `<option value="${s}" ${req.approvalStatus === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
    </div>
  `, `
    <button class="secondary-btn" onclick="closeModal()">Cancel</button>
    <button class="primary-btn" onclick="saveRequest('${id}')">Save Changes</button>
  `);
};

window.saveRequest = async function (id) {
  try {
    await api(`/service-requests/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: $("#fTitle").value,
        description: $("#fDesc").value,
        type: $("#fType").value,
        status: $("#fStatus").value,
        assignedTo: $("#fAssigned").value,
        approvalStatus: $("#fApproval").value,
      }),
    });
    closeModal();
    toast("Request updated successfully", "success");
    loadView("requests");
  } catch (err) {
    toast("Failed to update: " + err.message, "error");
  }
};

window.deleteRequest = async function (id) {
  if (!confirm("Are you sure you want to delete this request?")) return;
  try {
    await api(`/service-requests/${id}`, { method: "DELETE" });
    toast("Request deleted", "success");
    loadView("requests");
  } catch (err) {
    toast("Failed to delete: " + err.message, "error");
  }
};

// ── Assets ──
async function renderAssets(container) {
  const assets = await api("/assets");
  cache.assets = assets;

  container.innerHTML = `
    <div class="search-bar">
      <input class="search-input" id="astSearch" placeholder="Search assets..." />
      <select class="filter-select" id="astStatusFilter">
        <option value="">All Status</option>
        <option value="AVAILABLE">Available</option>
        <option value="ASSIGNED">Assigned</option>
        <option value="IN_REPAIR">In Repair</option>
        <option value="RETIRED">Retired</option>
      </select>
      <select class="filter-select" id="astTypeFilter">
        <option value="">All Types</option>
        <option value="Laptop">Laptop</option>
        <option value="Desktop">Desktop</option>
        <option value="Mobile">Mobile</option>
        <option value="Monitor">Monitor</option>
        <option value="Tablet">Tablet</option>
        <option value="Peripheral">Peripheral</option>
      </select>
    </div>
    <div class="panel">
      <div class="panel-header">
        <div><h3>All Assets</h3><p class="panel-label">${assets.length} total</p></div>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table" id="astTable">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Type</th><th>Model</th><th>Status</th><th>Assigned To</th><th>Actions</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  renderAssetsTable(assets);

  const filter = () => {
    const q = $("#astSearch").value.toLowerCase();
    const s = $("#astStatusFilter").value;
    const t = $("#astTypeFilter").value;
    let filtered = assets;
    if (q) filtered = filtered.filter((a) => a.name.toLowerCase().includes(q) || a.assetId.toLowerCase().includes(q));
    if (s) filtered = filtered.filter((a) => a.status === s);
    if (t) filtered = filtered.filter((a) => a.type === t);
    renderAssetsTable(filtered);
  };

  $("#astSearch").addEventListener("input", filter);
  $("#astStatusFilter").addEventListener("change", filter);
  $("#astTypeFilter").addEventListener("change", filter);
}

function renderAssetsTable(assets) {
  const tbody = $("#astTable tbody");
  if (!assets.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><p>No assets found</p></td></tr>';
    return;
  }
  tbody.innerHTML = assets.map((a) => `
    <tr>
      <td><strong>${escapeHtml(a.assetId)}</strong></td>
      <td>${escapeHtml(a.name)}</td>
      <td>${escapeHtml(a.type)}</td>
      <td>${escapeHtml(a.model)}</td>
      <td>${badgeHtml(a.status)}</td>
      <td>${escapeHtml(a.assignedTo || "-")}</td>
      <td>
        <div class="actions-row">
          <button class="icon-btn" onclick="editAsset('${a._id}')" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn danger" onclick="deleteAsset('${a._id}')" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

window.editAsset = async function (id) {
  const asset = cache.assets.find((a) => a._id === id);
  if (!asset) return;

  openModal("Edit Asset", `
    <div class="form-group"><label>Name</label><input id="fName" value="${escapeHtml(asset.name)}" /></div>
    <div class="form-row">
      <div class="form-group"><label>Type</label><input id="fType" value="${escapeHtml(asset.type)}" /></div>
      <div class="form-group"><label>Model</label><input id="fModel" value="${escapeHtml(asset.model)}" /></div>
    </div>
    <div class="form-group"><label>Serial Number</label><input id="fSerial" value="${escapeHtml(asset.serialNumber)}" /></div>
    <div class="form-row">
      <div class="form-group"><label>Status</label>
        <select id="fStatus">
          ${["AVAILABLE", "ASSIGNED", "IN_REPAIR", "RETIRED"].map((s) => `<option value="${s}" ${asset.status === s ? "selected" : ""}>${s.replace("_", " ")}</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label>Assigned To</label><input id="fAssigned" value="${escapeHtml(asset.assignedTo)}" /></div>
    </div>
  `, `
    <button class="secondary-btn" onclick="closeModal()">Cancel</button>
    <button class="primary-btn" onclick="saveAsset('${id}')">Save Changes</button>
  `);
};

window.saveAsset = async function (id) {
  try {
    await api(`/assets/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: $("#fName").value,
        type: $("#fType").value,
        model: $("#fModel").value,
        serialNumber: $("#fSerial").value,
        status: $("#fStatus").value,
        assignedTo: $("#fAssigned").value,
      }),
    });
    closeModal();
    toast("Asset updated successfully", "success");
    loadView("assets");
  } catch (err) {
    toast("Failed to update: " + err.message, "error");
  }
};

window.deleteAsset = async function (id) {
  if (!confirm("Are you sure you want to delete this asset?")) return;
  try {
    await api(`/assets/${id}`, { method: "DELETE" });
    toast("Asset deleted", "success");
    loadView("assets");
  } catch (err) {
    toast("Failed to delete: " + err.message, "error");
  }
};

// ── Employees ──
async function renderEmployees(container) {
  const users = await api("/users");
  cache.users = users;

  container.innerHTML = `
    <div class="search-bar">
      <input class="search-input" id="empSearch" placeholder="Search employees..." />
      <select class="filter-select" id="empRoleFilter">
        <option value="">All Roles</option>
        <option value="EMPLOYEE">Employee</option>
        <option value="SUPPORT_ENGINEER">Support Engineer</option>
        <option value="ADMIN">Admin</option>
      </select>
    </div>
    <div class="panel">
      <div class="panel-header">
        <div><h3>All Employees</h3><p class="panel-label">${users.length} total</p></div>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table" id="empTable">
          <thead>
            <tr><th>Username</th><th>Full Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  renderEmployeesTable(users);

  const filter = () => {
    const q = $("#empSearch").value.toLowerCase();
    const r = $("#empRoleFilter").value;
    let filtered = users;
    if (q) filtered = filtered.filter((u) => u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    if (r) filtered = filtered.filter((u) => u.role === r);
    renderEmployeesTable(filtered);
  };

  $("#empSearch").addEventListener("input", filter);
  $("#empRoleFilter").addEventListener("change", filter);
}

function renderEmployeesTable(users) {
  const tbody = $("#empTable tbody");
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><p>No employees found</p></td></tr>';
    return;
  }
  tbody.innerHTML = users.map((u) => `
    <tr>
      <td><strong>${escapeHtml(u.username)}</strong></td>
      <td>${escapeHtml(u.fullName)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${badgeHtml(u.role.replace("_", " "))}</td>
      <td>${escapeHtml(u.department)}</td>
      <td>${u.active ? '<span class="badge available">Active</span>' : '<span class="badge retired">Inactive</span>'}</td>
      <td>
        <div class="actions-row">
          <button class="icon-btn" onclick="editUser('${u._id}')" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn danger" onclick="deleteUser('${u._id}')" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

window.editUser = async function (id) {
  const user = cache.users.find((u) => u._id === id);
  if (!user) return;

  openModal("Edit Employee", `
    <div class="form-row">
      <div class="form-group"><label>Full Name</label><input id="fFullName" value="${escapeHtml(user.fullName)}" /></div>
      <div class="form-group"><label>Email</label><input id="fEmail" type="email" value="${escapeHtml(user.email)}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Department</label><input id="fDept" value="${escapeHtml(user.department)}" /></div>
      <div class="form-group"><label>Role</label>
        <select id="fRole">
          ${["EMPLOYEE", "SUPPORT_ENGINEER", "ADMIN"].map((r) => `<option value="${r}" ${user.role === r ? "selected" : ""}>${r.replace("_", " ")}</option>`).join("")}
        </select>
      </div>
    </div>
  `, `
    <button class="secondary-btn" onclick="closeModal()">Cancel</button>
    <button class="primary-btn" onclick="saveUser('${id}')">Save Changes</button>
  `);
};

window.saveUser = async function (id) {
  try {
    await api(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        fullName: $("#fFullName").value,
        email: $("#fEmail").value,
        department: $("#fDept").value,
        role: $("#fRole").value,
      }),
    });
    closeModal();
    toast("Employee updated successfully", "success");
    loadView("employees");
  } catch (err) {
    toast("Failed to update: " + err.message, "error");
  }
};

window.deleteUser = async function (id) {
  if (!confirm("Are you sure you want to delete this employee?")) return;
  try {
    await api(`/users/${id}`, { method: "DELETE" });
    toast("Employee deleted", "success");
    loadView("employees");
  } catch (err) {
    toast("Failed to delete: " + err.message, "error");
  }
};

// ── Teams ──
async function renderTeams(container) {
  const teams = await api("/teams");
  cache.teams = teams;

  container.innerHTML = `
    <div class="search-bar">
      <input class="search-input" id="teamSearch" placeholder="Search teams..." />
    </div>
    <div class="panel">
      <div class="panel-header">
        <div><h3>All Support Teams</h3><p class="panel-label">${teams.length} teams</p></div>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table" id="teamTable">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Description</th><th>Team Lead</th><th>Members</th><th>Actions</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  renderTeamsTable(teams);

  $("#teamSearch").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = teams.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    renderTeamsTable(filtered);
  });
}

function renderTeamsTable(teams) {
  const tbody = $("#teamTable tbody");
  if (!teams.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>No teams found</p></td></tr>';
    return;
  }
  tbody.innerHTML = teams.map((t) => `
    <tr>
      <td><strong>${escapeHtml(t.teamId)}</strong></td>
      <td>${escapeHtml(t.name)}</td>
      <td>${escapeHtml(t.description)}</td>
      <td>${escapeHtml(t.teamLead || "-")}</td>
      <td>${t.memberCount}</td>
      <td>
        <div class="actions-row">
          <button class="icon-btn" onclick="editTeam('${t._id}')" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn danger" onclick="deleteTeam('${t._id}')" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

window.editTeam = async function (id) {
  const team = cache.teams.find((t) => t._id === id);
  if (!team) return;

  openModal("Edit Team", `
    <div class="form-group"><label>Name</label><input id="fName" value="${escapeHtml(team.name)}" /></div>
    <div class="form-group"><label>Description</label><textarea id="fDesc">${escapeHtml(team.description)}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Team Lead</label><input id="fLead" value="${escapeHtml(team.teamLead)}" /></div>
      <div class="form-group"><label>Member Count</label><input id="fCount" type="number" value="${team.memberCount}" /></div>
    </div>
  `, `
    <button class="secondary-btn" onclick="closeModal()">Cancel</button>
    <button class="primary-btn" onclick="saveTeam('${id}')">Save Changes</button>
  `);
};

window.saveTeam = async function (id) {
  try {
    await api(`/teams/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: $("#fName").value,
        description: $("#fDesc").value,
        teamLead: $("#fLead").value,
        memberCount: parseInt($("#fCount").value) || 0,
      }),
    });
    closeModal();
    toast("Team updated successfully", "success");
    loadView("teams");
  } catch (err) {
    toast("Failed to update: " + err.message, "error");
  }
};

window.deleteTeam = async function (id) {
  if (!confirm("Are you sure you want to delete this team?")) return;
  try {
    await api(`/teams/${id}`, { method: "DELETE" });
    toast("Team deleted", "success");
    loadView("teams");
  } catch (err) {
    toast("Failed to delete: " + err.message, "error");
  }
};

// ── Knowledge Base ──
async function renderKnowledge(container) {
  const articles = await api("/knowledge");
  cache.knowledge = articles;

  container.innerHTML = `
    <div class="search-bar">
      <input class="search-input" id="kbSearch" placeholder="Search knowledge base..." />
      <select class="filter-select" id="kbCategoryFilter">
        <option value="">All Categories</option>
        <option value="Account">Account</option>
        <option value="Network">Network</option>
        <option value="Hardware">Hardware</option>
        <option value="Software">Software</option>
        <option value="Process">Process</option>
      </select>
    </div>
    <div class="panel">
      <div class="panel-header">
        <div><h3>Knowledge Articles</h3><p class="panel-label">${articles.length} articles</p></div>
      </div>
      <div class="ticket-list" id="kbList"></div>
    </div>
  `;

  renderKnowledgeList(articles);

  const filter = () => {
    const q = $("#kbSearch").value.toLowerCase();
    const c = $("#kbCategoryFilter").value;
    let filtered = articles;
    if (q) filtered = filtered.filter((a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q));
    if (c) filtered = filtered.filter((a) => a.category === c);
    renderKnowledgeList(filtered);
  };

  $("#kbSearch").addEventListener("input", filter);
  $("#kbCategoryFilter").addEventListener("change", filter);
}

function renderKnowledgeList(articles) {
  const list = $("#kbList");
  if (!articles.length) {
    list.innerHTML = '<div class="empty-state"><p>No articles found</p></div>';
    return;
  }
  list.innerHTML = articles.map((a) => `
    <article class="ticket-item">
      <div class="heading">
        <div>
          <strong>${escapeHtml(a.title)}</strong>
          <div class="meta">${escapeHtml(a.category)} &middot; By ${escapeHtml(a.createdBy || "Unknown")} &middot; ${a.viewCount} views</div>
        </div>
        <div class="actions-row">
          <button class="icon-btn" onclick="editArticle('${a._id}')" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn danger" onclick="deleteArticle('${a._id}')" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="meta">${escapeHtml(a.content).substring(0, 200)}${a.content.length > 200 ? "..." : ""}</div>
    </article>
  `).join("");
}

window.editArticle = async function (id) {
  const article = cache.knowledge.find((a) => a._id === id);
  if (!article) return;

  openModal("Edit Article", `
    <div class="form-group"><label>Title</label><input id="fTitle" value="${escapeHtml(article.title)}" /></div>
    <div class="form-group"><label>Content</label><textarea id="fContent" style="min-height:120px">${escapeHtml(article.content)}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Category</label>
        <select id="fCategory">
          ${["Account", "Network", "Hardware", "Software", "Process", "General"].map((c) => `<option value="${c}" ${article.category === c ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label>Created By</label><input id="fCreatedBy" value="${escapeHtml(article.createdBy)}" /></div>
    </div>
  `, `
    <button class="secondary-btn" onclick="closeModal()">Cancel</button>
    <button class="primary-btn" onclick="saveArticle('${id}')">Save Changes</button>
  `);
};

window.saveArticle = async function (id) {
  try {
    await api(`/knowledge/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: $("#fTitle").value,
        content: $("#fContent").value,
        category: $("#fCategory").value,
        createdBy: $("#fCreatedBy").value,
      }),
    });
    closeModal();
    toast("Article updated successfully", "success");
    loadView("knowledge");
  } catch (err) {
    toast("Failed to update: " + err.message, "error");
  }
};

window.deleteArticle = async function (id) {
  if (!confirm("Are you sure you want to delete this article?")) return;
  try {
    await api(`/knowledge/${id}`, { method: "DELETE" });
    toast("Article deleted", "success");
    loadView("knowledge");
  } catch (err) {
    toast("Failed to delete: " + err.message, "error");
  }
};

// ── Create Handlers ──
function handleCreate() {
  switch (currentView) {
    case "incidents": createIncident(); break;
    case "requests": createRequest(); break;
    case "assets": createAsset(); break;
    case "employees": createUser(); break;
    case "teams": createTeam(); break;
    case "knowledge": createArticle(); break;
  }
}

function createIncident() {
  openModal("Create Incident", `
    <div class="form-group"><label>Title</label><input id="fTitle" placeholder="Brief description of the incident" /></div>
    <div class="form-group"><label>Description</label><textarea id="fDesc" placeholder="Detailed description..."></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Priority</label>
        <select id="fPriority"><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option><option value="Low">Low</option></select>
      </div>
      <div class="form-group"><label>Category</label>
        <select id="fCategory"><option value="General">General</option><option value="Network">Network</option><option value="Hardware">Hardware</option><option value="Software">Software</option><option value="Email">Email</option><option value="Infrastructure">Infrastructure</option></select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Reported By</label><input id="fReportedBy" placeholder="Reporter name" /></div>
      <div class="form-group"><label>Assigned To</label><input id="fAssignedTo" placeholder="Engineer name" /></div>
    </div>
  `, `
    <button class="secondary-btn" onclick="closeModal()">Cancel</button>
    <button class="primary-btn" onclick="submitIncident()">Create Incident</button>
  `);
}

window.submitIncident = async function () {
  try {
    await api("/incidents", {
      method: "POST",
      body: JSON.stringify({
        title: $("#fTitle").value,
        description: $("#fDesc").value,
        priority: $("#fPriority").value,
        category: $("#fCategory").value,
        reportedBy: $("#fReportedBy").value,
        assignedTo: $("#fAssignedTo").value,
      }),
    });
    closeModal();
    toast("Incident created successfully", "success");
    loadView("incidents");
  } catch (err) {
    toast("Failed to create: " + err.message, "error");
  }
};

function createRequest() {
  openModal("Create Service Request", `
    <div class="form-group"><label>Title</label><input id="fTitle" placeholder="Request title" /></div>
    <div class="form-group"><label>Description</label><textarea id="fDesc" placeholder="Detailed description..."></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Type</label>
        <select id="fType"><option value="Access">Access</option><option value="Hardware">Hardware</option><option value="Software">Software</option><option value="General">General</option></select>
      </div>
      <div class="form-group"><label>Requested By</label><input id="fRequestedBy" placeholder="Requester name" /></div>
    </div>
  `, `
    <button class="secondary-btn" onclick="closeModal()">Cancel</button>
    <button class="primary-btn" onclick="submitRequest()">Create Request</button>
  `);
}

window.submitRequest = async function () {
  try {
    await api("/service-requests", {
      method: "POST",
      body: JSON.stringify({
        title: $("#fTitle").value,
        description: $("#fDesc").value,
        type: $("#fType").value,
        requestedBy: $("#fRequestedBy").value,
      }),
    });
    closeModal();
    toast("Request created successfully", "success");
    loadView("requests");
  } catch (err) {
    toast("Failed to create: " + err.message, "error");
  }
};

function createAsset() {
  openModal("Create Asset", `
    <div class="form-group"><label>Name</label><input id="fName" placeholder="Asset name" /></div>
    <div class="form-row">
      <div class="form-group"><label>Type</label>
        <select id="fType"><option value="Laptop">Laptop</option><option value="Desktop">Desktop</option><option value="Mobile">Mobile</option><option value="Monitor">Monitor</option><option value="Tablet">Tablet</option><option value="Peripheral">Peripheral</option></select>
      </div>
      <div class="form-group"><label>Model</label><input id="fModel" placeholder="Model name" /></div>
    </div>
    <div class="form-group"><label>Serial Number</label><input id="fSerial" placeholder="Serial number" /></div>
    <div class="form-row">
      <div class="form-group"><label>Assigned To</label><input id="fAssignedTo" placeholder="Employee name" /></div>
      <div class="form-group"><label>Status</label>
        <select id="fStatus"><option value="AVAILABLE">Available</option><option value="ASSIGNED">Assigned</option><option value="IN_REPAIR">In Repair</option></select>
      </div>
    </div>
  `, `
    <button class="secondary-btn" onclick="closeModal()">Cancel</button>
    <button class="primary-btn" onclick="submitAsset()">Create Asset</button>
  `);
}

window.submitAsset = async function () {
  try {
    await api("/assets", {
      method: "POST",
      body: JSON.stringify({
        name: $("#fName").value,
        type: $("#fType").value,
        model: $("#fModel").value,
        serialNumber: $("#fSerial").value,
        assignedTo: $("#fAssignedTo").value,
        status: $("#fStatus").value,
      }),
    });
    closeModal();
    toast("Asset created successfully", "success");
    loadView("assets");
  } catch (err) {
    toast("Failed to create: " + err.message, "error");
  }
};

function createUser() {
  openModal("Create Employee", `
    <div class="form-row">
      <div class="form-group"><label>Username</label><input id="fUsername" placeholder="username" /></div>
      <div class="form-group"><label>Full Name</label><input id="fFullName" placeholder="Full name" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Email</label><input id="fEmail" type="email" placeholder="email@company.com" /></div>
      <div class="form-group"><label>Password</label><input id="fPassword" type="password" placeholder="Password" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Department</label><input id="fDept" placeholder="Department" /></div>
      <div class="form-group"><label>Role</label>
        <select id="fRole"><option value="EMPLOYEE">Employee</option><option value="SUPPORT_ENGINEER">Support Engineer</option><option value="ADMIN">Admin</option></select>
      </div>
    </div>
  `, `
    <button class="secondary-btn" onclick="closeModal()">Cancel</button>
    <button class="primary-btn" onclick="submitUser()">Create Employee</button>
  `);
}

window.submitUser = async function () {
  try {
    await api("/users/register", {
      method: "POST",
      body: JSON.stringify({
        username: $("#fUsername").value,
        fullName: $("#fFullName").value,
        email: $("#fEmail").value,
        password: $("#fPassword").value,
        department: $("#fDept").value,
        role: $("#fRole").value,
      }),
    });
    closeModal();
    toast("Employee created successfully", "success");
    loadView("employees");
  } catch (err) {
    toast("Failed to create: " + err.message, "error");
  }
};

function createTeam() {
  openModal("Create Team", `
    <div class="form-group"><label>Team Name</label><input id="fName" placeholder="Team name" /></div>
    <div class="form-group"><label>Description</label><textarea id="fDesc" placeholder="Team description..."></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Team Lead</label><input id="fLead" placeholder="Team lead name" /></div>
      <div class="form-group"><label>Member Count</label><input id="fCount" type="number" value="0" /></div>
    </div>
  `, `
    <button class="secondary-btn" onclick="closeModal()">Cancel</button>
    <button class="primary-btn" onclick="submitTeam()">Create Team</button>
  `);
}

window.submitTeam = async function () {
  try {
    await api("/teams", {
      method: "POST",
      body: JSON.stringify({
        name: $("#fName").value,
        description: $("#fDesc").value,
        teamLead: $("#fLead").value,
        memberCount: parseInt($("#fCount").value) || 0,
      }),
    });
    closeModal();
    toast("Team created successfully", "success");
    loadView("teams");
  } catch (err) {
    toast("Failed to create: " + err.message, "error");
  }
};

function createArticle() {
  openModal("Create Article", `
    <div class="form-group"><label>Title</label><input id="fTitle" placeholder="Article title" /></div>
    <div class="form-group"><label>Content</label><textarea id="fContent" style="min-height:120px" placeholder="Article content..."></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Category</label>
        <select id="fCategory"><option value="General">General</option><option value="Account">Account</option><option value="Network">Network</option><option value="Hardware">Hardware</option><option value="Software">Software</option><option value="Process">Process</option></select>
      </div>
      <div class="form-group"><label>Created By</label><input id="fCreatedBy" placeholder="Author name" /></div>
    </div>
  `, `
    <button class="secondary-btn" onclick="closeModal()">Cancel</button>
    <button class="primary-btn" onclick="submitArticle()">Create Article</button>
  `);
}

window.submitArticle = async function () {
  try {
    await api("/knowledge", {
      method: "POST",
      body: JSON.stringify({
        title: $("#fTitle").value,
        content: $("#fContent").value,
        category: $("#fCategory").value,
        createdBy: $("#fCreatedBy").value,
      }),
    });
    closeModal();
    toast("Article created successfully", "success");
    loadView("knowledge");
  } catch (err) {
    toast("Failed to create: " + err.message, "error");
  }
};

// ── Global helpers for onclick in HTML ──
window.closeModal = closeModal;

// ── Init ──
async function init() {
  wireNav();
  wireMobileMenu();
  switchView("dashboard");
}

init();
