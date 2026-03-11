// ═══════════════════════════════════════════════════════════════════════════
// JobBot — Frontend Application
// ═══════════════════════════════════════════════════════════════════════════

const API = '';

// ── State ────────────────────────────────────────────────────────────────────

let currentPage = 'dashboard';
let preferences = {
  desired_roles: [],
  desired_locations: [],
  desired_skills: [],
  salary_min: 80000,
  salary_max: 200000,
  job_types: ['Full-time']
};

// ── Navigation ───────────────────────────────────────────────────────────────

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(link.dataset.page);
  });
});

document.getElementById('view-all-apps')?.addEventListener('click', (e) => {
  e.preventDefault();
  navigateTo('applications');
});

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`.nav-link[data-page="${page}"]`)?.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');

  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'jobs': loadJobs(); break;
    case 'applications': loadApplications(); break;
    case 'preferences': loadPreferences(); break;
    case 'reports': loadReports(); break;
  }
}

// ── Toast Notifications ──────────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Modal ────────────────────────────────────────────────────────────────────

function openModal(title, bodyHTML, footerHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-footer').innerHTML = footerHTML;
  document.getElementById('modal-overlay').classList.add('show');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// ── Utility ──────────────────────────────────────────────────────────────────

function formatSalary(amount) {
  if (!amount) return 'N/A';
  return '$' + Math.round(amount / 1000) + 'k';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadgeClass(status) {
  return `badge badge-${status.toLowerCase()}`;
}

async function api(endpoint, options = {}) {
  try {
    const res = await fetch(`${API}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (options.raw) return res;
    return await res.json();
  } catch (err) {
    console.error('API error:', err);
    showToast('Connection error. Is the server running?', 'error');
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

async function loadDashboard() {
  try {
    const [summary, apps] = await Promise.all([
      api('/api/reports/summary'),
      api('/api/applications')
    ]);

    // Stats
    animateNumber('stat-total-num', summary.totalApplications);
    animateNumber('stat-interviews-num', (summary.statusBreakdown['Interview'] || 0) + (summary.statusBreakdown['Screening'] || 0));
    animateNumber('stat-offers-num', summary.statusBreakdown['Offer'] || 0);
    document.getElementById('stat-rate-num').textContent = summary.responseRate + '%';

    // Funnel
    renderFunnel(summary.statusBreakdown, summary.totalApplications);

    // Recent
    renderRecentApplications(apps.slice(0, 5));
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  const start = parseInt(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function renderFunnel(statusMap, total) {
  const container = document.getElementById('funnel-chart');
  if (total === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No data yet</h3><p>Apply to jobs to see your funnel</p></div>';
    return;
  }

  const stages = [
    { label: 'Applied', key: 'Applied', color: 'blue' },
    { label: 'Screening', key: 'Screening', color: 'cyan' },
    { label: 'Interview', key: 'Interview', color: 'green' },
    { label: 'Offer', key: 'Offer', color: 'purple' },
    { label: 'Rejected', key: 'Rejected', color: 'red' }
  ];

  container.innerHTML = stages.map(s => {
    const count = statusMap[s.key] || 0;
    const pct = Math.max((count / total) * 100, count > 0 ? 8 : 0);
    return `
      <div class="funnel-bar">
        <span class="funnel-label">${s.label}</span>
        <div class="funnel-track">
          <div class="funnel-fill ${s.color}" style="width: ${pct}%">${count}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecentApplications(apps) {
  const container = document.getElementById('recent-applications');
  if (apps.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No applications yet</p></div>';
    return;
  }

  container.innerHTML = apps.map(app => `
    <div class="recent-item">
      <div class="recent-info">
        <h4>${app.job_title}</h4>
        <p>${app.company} · ${formatDate(app.applied_date)}</p>
      </div>
      <span class="${statusBadgeClass(app.status)}">${app.status}</span>
    </div>
  `).join('');
}

// Auto-apply button on dashboard
document.getElementById('btn-auto-apply').addEventListener('click', async () => {
  try {
    const result = await api('/api/preferences/auto-apply', { method: 'POST' });
    showToast(`${result.message}`, result.newApplications > 0 ? 'success' : 'info');
    loadDashboard();
  } catch (err) {
    showToast('Auto-apply failed', 'error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// JOB SEARCH
// ═══════════════════════════════════════════════════════════════════════════

async function loadJobs() {
  const keyword = document.getElementById('search-keyword').value;
  const location = document.getElementById('filter-location').value;
  const type = document.getElementById('filter-type').value;
  const salaryMin = document.getElementById('filter-salary-min').value;
  const salaryMax = document.getElementById('filter-salary-max').value;

  const params = new URLSearchParams();
  if (keyword) params.set('keyword', keyword);
  if (location) params.set('location', location);
  if (type) params.set('type', type);
  if (salaryMin) params.set('salary_min', salaryMin);
  if (salaryMax) params.set('salary_max', salaryMax);

  try {
    const data = await api(`/api/jobs?${params.toString()}`);
    document.getElementById('jobs-result-count').textContent = data.total;
    renderJobCards(data.jobs);
  } catch (err) {
    console.error('Failed to load jobs:', err);
  }
}

document.getElementById('btn-search-jobs').addEventListener('click', loadJobs);
document.getElementById('btn-clear-filters').addEventListener('click', () => {
  document.getElementById('search-keyword').value = '';
  document.getElementById('filter-location').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-salary-min').value = '';
  document.getElementById('filter-salary-max').value = '';
  loadJobs();
});

document.getElementById('search-keyword').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadJobs();
});

function renderJobCards(jobs) {
  const grid = document.getElementById('jobs-grid');

  if (jobs.length === 0) {
    grid.innerHTML = '<div class="empty-state"><h3>No jobs match your criteria</h3><p>Try broadening your search</p></div>';
    return;
  }

  grid.innerHTML = jobs.map(job => `
    <div class="job-card" id="job-card-${job.id}">
      <div class="job-card-header">
        <div>
          <h3>${job.title}</h3>
          <div class="job-company">${job.company}</div>
        </div>
        ${job.applied ? '<span class="applied-badge">✓ Applied</span>' : ''}
      </div>
      <div class="job-meta">
        <span class="job-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${job.location}
        </span>
        <span class="job-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          ${job.type}
        </span>
        <span class="job-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          ${formatSalary(job.salary_min)} – ${formatSalary(job.salary_max)}
        </span>
      </div>
      <p class="job-description">${job.description || ''}</p>
      <div class="job-skills">
        ${job.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>
      <div class="job-card-actions">
        ${job.applied
          ? '<button class="btn btn-secondary btn-sm" disabled>Already Applied</button>'
          : `<button class="btn btn-primary btn-sm" onclick="openApplyModal(${job.id}, '${escapeHtml(job.title)}', '${escapeHtml(job.company)}')">Apply Now</button>`
        }
        <button class="btn btn-ghost btn-sm" onclick="viewJobDetails(${job.id})">Details</button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function openApplyModal(jobId, title, company) {
  const body = `
    <p style="margin-bottom:16px;color:var(--text-secondary)">Applying to <strong>${title}</strong> at <strong>${company}</strong></p>
    <div class="form-field">
      <label for="apply-cover-letter">Cover Letter (optional)</label>
      <textarea id="apply-cover-letter" placeholder="Write a cover letter or leave blank for auto-generated..."></textarea>
    </div>
    <div class="form-field">
      <label for="apply-notes">Notes (optional)</label>
      <textarea id="apply-notes" style="min-height:60px" placeholder="Private notes about this application..."></textarea>
    </div>
  `;
  const footer = `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitApplication(${jobId})">Submit Application</button>
  `;
  openModal('Submit Application', body, footer);
}

async function submitApplication(jobId) {
  const coverLetter = document.getElementById('apply-cover-letter').value;
  const notes = document.getElementById('apply-notes').value;

  try {
    await api('/api/applications', {
      method: 'POST',
      body: JSON.stringify({ jobId, coverLetter, notes })
    });
    closeModal();
    showToast('Application submitted successfully!', 'success');
    loadJobs();
  } catch (err) {
    showToast('Failed to submit application', 'error');
  }
}

async function viewJobDetails(jobId) {
  try {
    const job = await api(`/api/jobs/${jobId}`);
    const body = `
      <div style="margin-bottom:14px">
        <h3 style="font-size:1.1rem;margin-bottom:4px">${job.title}</h3>
        <p style="color:var(--accent-blue);font-weight:500">${job.company}</p>
      </div>
      <div class="job-meta" style="margin-bottom:14px">
        <span class="job-meta-item">📍 ${job.location}</span>
        <span class="job-meta-item">💼 ${job.type}</span>
        <span class="job-meta-item">💰 ${formatSalary(job.salary_min)} – ${formatSalary(job.salary_max)}</span>
      </div>
      <p style="color:var(--text-secondary);line-height:1.7;margin-bottom:14px;font-size:0.87rem">${job.description}</p>
      <div class="job-skills">${job.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>
      ${job.application ? `<div style="margin-top:16px;padding:12px;background:rgba(16,185,129,0.1);border-radius:8px;font-size:0.82rem;color:var(--accent-green)">✓ Applied on ${formatDate(job.application.applied_date)} · Status: ${job.application.status}</div>` : ''}
    `;
    const footer = job.application
      ? '<button class="btn btn-ghost" onclick="closeModal()">Close</button>'
      : `<button class="btn btn-ghost" onclick="closeModal()">Close</button>
         <button class="btn btn-primary" onclick="closeModal(); openApplyModal(${job.id}, '${escapeHtml(job.title)}', '${escapeHtml(job.company)}')">Apply Now</button>`;
    openModal('Job Details', body, footer);
  } catch (err) {
    showToast('Failed to load job details', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// APPLICATIONS TRACKER
// ═══════════════════════════════════════════════════════════════════════════

let appFilterStatus = '';

document.getElementById('app-filter-tabs').addEventListener('click', (e) => {
  if (e.target.classList.contains('tab')) {
    document.querySelectorAll('#app-filter-tabs .tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    appFilterStatus = e.target.dataset.status;
    loadApplications();
  }
});

async function loadApplications() {
  try {
    const params = appFilterStatus ? `?status=${appFilterStatus}` : '';
    const apps = await api(`/api/applications${params}`);
    renderApplicationsTable(apps);
  } catch (err) {
    console.error('Failed to load applications:', err);
  }
}

function renderApplicationsTable(apps) {
  const tbody = document.getElementById('applications-tbody');
  const empty = document.getElementById('applications-empty');
  const table = document.getElementById('applications-table');

  if (apps.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  table.style.display = 'table';
  empty.style.display = 'none';

  tbody.innerHTML = apps.map(app => `
    <tr id="app-row-${app.id}">
      <td class="td-title">${app.job_title}</td>
      <td class="td-company">${app.company}</td>
      <td>${app.location}</td>
      <td class="td-salary">${formatSalary(app.salary_min)} – ${formatSalary(app.salary_max)}</td>
      <td><span class="${statusBadgeClass(app.status)}">${app.status}</span></td>
      <td>${formatDate(app.applied_date)}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-secondary btn-sm" onclick="openUpdateStatusModal(${app.id}, '${app.status}', '${escapeHtml(app.job_title)}')">Update</button>
          <button class="btn btn-danger btn-sm" onclick="withdrawApplication(${app.id}, '${escapeHtml(app.job_title)}')">Withdraw</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openUpdateStatusModal(appId, currentStatus, title) {
  const statuses = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];
  const body = `
    <p style="margin-bottom:16px;color:var(--text-secondary)">Update status for <strong>${title}</strong></p>
    <div class="form-field">
      <label for="update-status">Status</label>
      <select id="update-status">
        ${statuses.map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-field">
      <label for="update-notes">Notes (optional)</label>
      <textarea id="update-notes" style="min-height:80px" placeholder="Add notes about this status change..."></textarea>
    </div>
  `;
  const footer = `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="updateApplicationStatus(${appId})">Update Status</button>
  `;
  openModal('Update Application', body, footer);
}

async function updateApplicationStatus(appId) {
  const status = document.getElementById('update-status').value;
  const notes = document.getElementById('update-notes').value;

  try {
    await api(`/api/applications/${appId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes: notes || undefined })
    });
    closeModal();
    showToast(`Status updated to ${status}`, 'success');
    loadApplications();
  } catch (err) {
    showToast('Failed to update status', 'error');
  }
}

async function withdrawApplication(appId, title) {
  if (!confirm(`Withdraw application for "${title}"?`)) return;

  try {
    await api(`/api/applications/${appId}`, { method: 'DELETE' });
    showToast('Application withdrawn', 'info');
    loadApplications();
  } catch (err) {
    showToast('Failed to withdraw application', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════

async function loadPreferences() {
  try {
    const prefs = await api('/api/preferences');
    preferences = prefs;

    renderTags('roles-tags', prefs.desired_roles);
    renderTags('locations-tags', prefs.desired_locations);
    renderTags('skills-tags', prefs.desired_skills);
    document.getElementById('pref-salary-min').value = prefs.salary_min;
    document.getElementById('pref-salary-max').value = prefs.salary_max;

    // Set checkboxes
    document.querySelectorAll('#job-types-group input[type="checkbox"]').forEach(cb => {
      cb.checked = prefs.job_types.includes(cb.value);
    });
  } catch (err) {
    console.error('Failed to load preferences:', err);
  }
}

function renderTags(containerId, tags) {
  const container = document.getElementById(containerId);
  container.innerHTML = tags.map(tag => `
    <span class="tag">${tag}<button class="tag-remove" data-container="${containerId}" onclick="removeTag(this, '${tag}')">&times;</button></span>
  `).join('');
}

function removeTag(btn, tag) {
  const containerId = btn.dataset.container;
  const field = containerToField(containerId);
  preferences[field] = preferences[field].filter(t => t !== tag);
  renderTags(containerId, preferences[field]);
}

function containerToField(containerId) {
  const map = {
    'roles-tags': 'desired_roles',
    'locations-tags': 'desired_locations',
    'skills-tags': 'desired_skills'
  };
  return map[containerId];
}

// Tag inputs
['role-input', 'location-input', 'skill-input'].forEach(inputId => {
  const input = document.getElementById(inputId);
  const fieldMap = {
    'role-input': { field: 'desired_roles', container: 'roles-tags' },
    'location-input': { field: 'desired_locations', container: 'locations-tags' },
    'skill-input': { field: 'desired_skills', container: 'skills-tags' }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value.trim();
      if (val && !preferences[fieldMap[inputId].field].includes(val)) {
        preferences[fieldMap[inputId].field].push(val);
        renderTags(fieldMap[inputId].container, preferences[fieldMap[inputId].field]);
      }
      input.value = '';
    }
  });
});

document.getElementById('preferences-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await savePreferences();
});

document.getElementById('btn-auto-apply-pref').addEventListener('click', async () => {
  await savePreferences();
  try {
    const result = await api('/api/preferences/auto-apply', { method: 'POST' });
    showToast(`${result.message}`, result.newApplications > 0 ? 'success' : 'info');
  } catch (err) {
    showToast('Auto-apply failed', 'error');
  }
});

async function savePreferences() {
  const jobTypes = [];
  document.querySelectorAll('#job-types-group input[type="checkbox"]:checked').forEach(cb => {
    jobTypes.push(cb.value);
  });

  const data = {
    desired_roles: preferences.desired_roles,
    desired_locations: preferences.desired_locations,
    desired_skills: preferences.desired_skills,
    salary_min: parseInt(document.getElementById('pref-salary-min').value) || 0,
    salary_max: parseInt(document.getElementById('pref-salary-max').value) || 999999,
    job_types: jobTypes
  };

  try {
    await api('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    showToast('Preferences saved!', 'success');
  } catch (err) {
    showToast('Failed to save preferences', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════

async function loadReports() {
  try {
    const summary = await api('/api/reports/summary');
    renderStatusChart(summary.statusBreakdown);
    renderBarChart('companies-chart', summary.topCompanies, 'company');
    renderBarChart('locations-chart', summary.topLocations, 'location');
    renderSummaryStats(summary);
  } catch (err) {
    console.error('Failed to load reports:', err);
  }
}

function renderStatusChart(statusMap) {
  const container = document.getElementById('status-chart');
  const total = Object.values(statusMap).reduce((a, b) => a + b, 0);

  if (total === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No data yet</h3><p>Apply to jobs to see status distribution</p></div>';
    return;
  }

  const colors = {
    Applied: '#3b82f6',
    Screening: '#06b6d4',
    Interview: '#10b981',
    Offer: '#8b5cf6',
    Rejected: '#ef4444',
    Withdrawn: '#64748b'
  };

  // Build donut chart with SVG
  const size = 160;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = Object.entries(statusMap).map(([status, count]) => {
    const pct = count / total;
    const dashArray = `${pct * circumference} ${circumference}`;
    const rotation = offset * 360;
    offset += pct;
    return `<circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="${colors[status] || '#64748b'}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" stroke-dashoffset="0" transform="rotate(${rotation - 90} ${size/2} ${size/2})" style="transition: all 0.8s ease" />`;
  }).join('');

  const legend = Object.entries(statusMap).map(([status, count]) => `
    <div class="legend-item">
      <span class="legend-color" style="background:${colors[status] || '#64748b'}"></span>
      <span class="legend-label">${status}</span>
      <span class="legend-value">${count}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="donut-chart">
      <svg class="donut-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${segments}
        <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="central" fill="var(--text-primary)" font-size="24" font-weight="800">${total}</text>
      </svg>
      <div class="donut-legend">${legend}</div>
    </div>
  `;
}

function renderBarChart(containerId, data, labelKey) {
  const container = document.getElementById(containerId);

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No data yet</p></div>';
    return;
  }

  const max = Math.max(...data.map(d => d.count));

  container.innerHTML = data.map(item => `
    <div class="bar-item">
      <span class="bar-label">${item[labelKey]}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${(item.count / max) * 100}%">${item.count}</div>
      </div>
    </div>
  `).join('');
}

function renderSummaryStats(summary) {
  const container = document.getElementById('summary-stats');
  container.innerHTML = `
    <div class="summary-item">
      <span class="summary-item-label">Total Jobs in Database</span>
      <span class="summary-item-value">${summary.totalJobs}</span>
    </div>
    <div class="summary-item">
      <span class="summary-item-label">Total Applications</span>
      <span class="summary-item-value">${summary.totalApplications}</span>
    </div>
    <div class="summary-item">
      <span class="summary-item-label">Average Target Salary</span>
      <span class="summary-item-value">${formatSalary(summary.averageSalary)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-item-label">Response Rate</span>
      <span class="summary-item-value">${summary.responseRate}%</span>
    </div>
    <div class="summary-item">
      <span class="summary-item-label">Offers Received</span>
      <span class="summary-item-value" style="color:var(--accent-green)">${summary.statusBreakdown['Offer'] || 0}</span>
    </div>
  `;
}

// CSV Export
document.getElementById('btn-export-csv').addEventListener('click', async () => {
  try {
    const res = await fetch(`${API}/api/reports/export`);
    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || 'Export failed', 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'applications_export.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully!', 'success');
  } catch (err) {
    showToast('Export failed', 'error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

loadDashboard();
