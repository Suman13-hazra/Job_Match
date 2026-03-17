/* applications.js */
let allApps = [];
async function initApplicationsPage() {
  await loadApplications();
  initFilterChips('[data-app-filter]', filterApplications);
  document.getElementById('appSearchInput')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allApps.filter(a => a.job_title?.toLowerCase().includes(q) || a.company_name?.toLowerCase().includes(q));
    renderApplications(filtered);
  });
  document.getElementById('closeAppModal')?.addEventListener('click', () => closeModal('appDetailModal'));
  document.getElementById('cancelAppBtn')?.addEventListener('click', () => closeModal('appDetailModal'));
}
async function loadApplications() {
  try {
    const data = await API.getApplications();
    allApps = data.applications || [];
    updateAppStats(allApps);
    renderApplications(allApps);
  } catch (err) {
    document.getElementById('applicationsTableBody').innerHTML = `<tr><td colspan="7"><div class="alert alert-warning" style="margin:1rem;">${err.message}</div></td></tr>`;
  }
}
function updateAppStats(apps) {
  document.getElementById('totalApplied').textContent = apps.length;
  document.getElementById('inReview').textContent = apps.filter(a=>a.status==='in_review').length;
  document.getElementById('interviewed').textContent = apps.filter(a=>a.status==='interview').length;
  document.getElementById('rejected').textContent = apps.filter(a=>a.status==='rejected').length;
}
function filterApplications(filter) {
  const filtered = filter === 'all' ? allApps : allApps.filter(a => a.status === filter);
  renderApplications(filtered);
}
function renderApplications(apps) {
  const tbody = document.getElementById('applicationsTableBody');
  if (!tbody) return;
  if (apps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:3rem;"><div class="empty-state-icon"><i class="fas fa-clipboard-list"></i></div><h3>No applications</h3><p>Start applying to jobs</p><a href="jobs.html" class="btn btn-primary">Browse Jobs</a></div></td></tr>`;
    return;
  }
  tbody.innerHTML = apps.map(app => `
    <tr class="animate-fadeInUp">
      <td><div style="display:flex;align-items:center;gap:0.75rem;"><div class="company-logo" style="width:36px;height:36px;font-size:0.9rem;flex-shrink:0;">${(app.company_name||'C')[0]}</div><span style="font-weight:600;font-size:0.88rem;">${escapeHtml(app.company_name||'')}</span></div></td>
      <td style="font-weight:500;font-size:0.88rem;">${escapeHtml(app.job_title||'')}</td>
      <td><span class="badge badge-primary" style="font-size:0.72rem;">${escapeHtml(app.domain||'')}</span></td>
      <td style="font-size:0.82rem;color:var(--text-muted);">${formatDate(app.applied_at)}</td>
      <td><span style="font-weight:700;font-size:0.88rem;color:${matchColor(app.match_score||0)};">${app.match_score||0}%</span></td>
      <td>${statusBadge(app.status)}</td>
      <td>
        <div style="display:flex;gap:0.35rem;">
          <button class="btn btn-sm btn-ghost" onclick="viewAppDetail('${app.id}')" title="View"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-ghost" onclick="withdrawApp('${app.id}')" title="Withdraw" style="color:var(--danger);"><i class="fas fa-times"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}
function statusBadge(status) {
  const map = { applied:['badge-info','📤 Applied'], in_review:['badge-warning','🔍 In Review'], interview:['badge-success','🗣 Interview'], offer:['badge-success','🎉 Offer'], rejected:['badge-danger','❌ Rejected'], withdrawn:['badge-gray','↩ Withdrawn'] };
  const [cls,label] = map[status]||['badge-gray',status];
  return `<span class="badge ${cls}" style="font-size:0.72rem;">${label}</span>`;
}
window.viewAppDetail = (id) => {
  const app = allApps.find(a=>a.id==id);
  if (!app) return;
  const content = document.getElementById('appDetailContent');
  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;">
      <div class="company-logo" style="width:56px;height:56px;font-size:1.25rem;">${(app.company_name||'C')[0]}</div>
      <div><h4>${escapeHtml(app.job_title)}</h4><div style="font-size:0.85rem;color:var(--text-secondary);">${escapeHtml(app.company_name)}</div></div>
    </div>
    <div class="grid-2" style="gap:1rem;margin-bottom:1rem;">
      <div><div style="font-size:0.78rem;color:var(--text-muted);">Applied On</div><div style="font-weight:600;">${formatDate(app.applied_at)}</div></div>
      <div><div style="font-size:0.78rem;color:var(--text-muted);">Status</div>${statusBadge(app.status)}</div>
      <div><div style="font-size:0.78rem;color:var(--text-muted);">Match Score</div><div style="font-weight:700;color:${matchColor(app.match_score||0)};">${app.match_score||0}%</div></div>
      <div><div style="font-size:0.78rem;color:var(--text-muted);">Domain</div><div style="font-weight:600;">${escapeHtml(app.domain||'-')}</div></div>
    </div>
    ${app.cover_letter ? `<div><div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.5rem;">Cover Letter</div><p style="font-size:0.88rem;background:var(--bg-primary);padding:1rem;border-radius:10px;">${escapeHtml(app.cover_letter)}</p></div>` : ''}
  `;
  const withdrawBtn = document.getElementById('withdrawAppBtn');
  if (withdrawBtn) withdrawBtn.onclick = () => withdrawApp(id);
  openModal('appDetailModal');
};
window.withdrawApp = async (id) => {
  if (!confirm('Withdraw this application?')) return;
  try {
    await API.withdrawApplication(id);
    showToast('info','Withdrawn','Application has been withdrawn');
    closeModal('appDetailModal');
    loadApplications();
  } catch (err) { showToast('error','Error',err.message); }
};
