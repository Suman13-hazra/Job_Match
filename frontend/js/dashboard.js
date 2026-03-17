/* =====================================================
   dashboard.js – Dashboard page logic
   ===================================================== */

async function initDashboard() {
  const user = getStoredUser();
  if (!user) return;

  // Set welcome name
  const welcomeName = document.getElementById('welcomeName');
  if (welcomeName) welcomeName.textContent = user.first_name || 'User';

  loadDashboardStats();
  loadRecentApplications();
  loadRecommendationPreview();
  loadSkillsOverview();

  // Notifications
  const notifBtn = document.getElementById('notifBtn');
  const notifPanel = document.getElementById('notifPanel');
  if (notifBtn && notifPanel) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifPanel.style.display = notifPanel.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', () => { if (notifPanel) notifPanel.style.display = 'none'; });
  }
  const markAllRead = document.getElementById('markAllReadBtn');
  if (markAllRead) markAllRead.addEventListener('click', () => { showToast('success', 'Notifications cleared', ''); notifPanel.style.display = 'none'; });
}

async function loadDashboardStats() {
  try {
    const stats = await API.getDashboardStats();
    const els = {
      statMatches: stats.total_recommendations || 0,
      statApplied: stats.total_applications || 0,
      statSaved: stats.saved_jobs || 0,
      statViews: stats.profile_views || 0
    };
    Object.entries(els).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) animateCounter(el, val);
    });
    // Badge for recommendations
    const badge = document.getElementById('matchCountBadge');
    if (badge) badge.textContent = stats.total_recommendations || 0;

    // Profile completion
    const completion = stats.profile_completion || 30;
    const bar = document.getElementById('profileProgressBar');
    const text = document.getElementById('profileCompletionText');
    if (bar) setTimeout(() => { bar.style.width = `${completion}%`; }, 300);
    if (text) text.textContent = `Profile ${completion}% Complete`;

    if (stats.total_applications > 0) {
      const changeEl = document.getElementById('appliedChange');
      if (changeEl) changeEl.textContent = `${stats.recent_applications || 0} this week`;
    }
  } catch (err) {
    console.warn('Stats error:', err.message);
    // Show zeros
    ['statMatches','statApplied','statSaved','statViews'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
  }
}

async function loadRecentApplications() {
  const tbody = document.getElementById('appliedTableBody');
  if (!tbody) return;
  try {
    const data = await API.getApplications();
    const apps = data.applications || [];
    if (apps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:2rem;">
        <div class="empty-state-icon"><i class="fas fa-briefcase"></i></div>
        <h3>No applications yet</h3><p>Start applying to jobs that match your skills</p>
        <a href="jobs.html" class="btn btn-primary btn-sm">Browse Jobs</a>
      </div></td></tr>`;
      return;
    }
    const recent = apps.slice(0, 5);
    tbody.innerHTML = recent.map(app => `
      <tr class="animate-fadeInUp">
        <td><div style="display:flex;align-items:center;gap:0.75rem;">
          <div class="company-logo" style="width:36px;height:36px;font-size:0.9rem;flex-shrink:0;">${(app.company_name||'C')[0]}</div>
          <span style="font-weight:600;font-size:0.88rem;">${escapeHtml(app.company_name||'Unknown')}</span>
        </div></td>
        <td style="font-weight:500;font-size:0.88rem;">${escapeHtml(app.job_title||'')}</td>
        <td><span class="badge badge-primary" style="font-size:0.72rem;">${escapeHtml(app.domain||'')}</span></td>
        <td style="font-size:0.82rem;color:var(--text-muted);">${formatDate(app.applied_at)}</td>
        <td>${statusBadge(app.status)}</td>
        <td><span style="font-weight:700;font-size:0.88rem;color:${matchColor(app.match_score||0)};">${app.match_score||0}%</span></td>
        <td><button class="btn btn-sm btn-ghost" onclick="viewApplicationDetail('${app.id}')"><i class="fas fa-eye"></i></button></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="alert alert-warning" style="margin:1rem;">Could not load applications</div></td></tr>`;
  }
}

async function loadRecommendationPreview() {
  const container = document.getElementById('recommendationsPreview');
  if (!container) return;
  try {
    const data = await API.getRecommendations();
    const jobs = data.recommendations || [];
    if (jobs.length === 0) {
      container.innerHTML = `<div class="card" style="padding:2rem;text-align:center;grid-column:1/-1;">
        <div class="empty-state-icon"><i class="fas fa-robot"></i></div>
        <h3>No recommendations yet</h3>
        <p>Upload your CV to get AI-powered job matches</p>
        <a href="cv-analysis.html" class="btn btn-primary btn-sm">Analyze CV</a>
      </div>`;
      return;
    }
    container.innerHTML = jobs.slice(0,4).map(job => buildJobCard(job, true)).join('');
    // Attach events
    attachJobCardEvents(container);
    // Update badge
    const badge = document.getElementById('matchCountBadge');
    if (badge) badge.textContent = jobs.length;
  } catch (err) {
    container.innerHTML = `<div class="card" style="padding:2rem;grid-column:1/-1;text-align:center;">
      <i class="fas fa-robot" style="font-size:2rem;color:var(--text-muted);margin-bottom:1rem;display:block;"></i>
      <p>Upload your CV to unlock AI recommendations</p>
      <a href="cv-analysis.html" class="btn btn-primary btn-sm" style="margin-top:0.75rem;">Upload CV</a>
    </div>`;
  }
}

async function loadSkillsOverview() {
  try {
    const data = await API.getCvAnalysis();
    const analysis = data.analysis || {};
    const skills = analysis.skills || [];
    const missing = analysis.missing_skills || [];

    const topSkillsEl = document.getElementById('topSkillsList');
    if (topSkillsEl) {
      if (skills.length > 0) {
        topSkillsEl.innerHTML = skills.slice(0, 8).map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('');
      } else {
        topSkillsEl.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);">Upload your CV to see skills</p>';
      }
    }
    const missingEl = document.getElementById('missingSkillsList');
    if (missingEl) {
      if (missing.length > 0) {
        missingEl.innerHTML = missing.slice(0, 8).map(s => `<span class="skill-tag missing">${escapeHtml(s)}</span>`).join('');
      } else {
        missingEl.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);">Skills analysis will appear here</p>';
      }
    }
  } catch {
    const topSkillsEl = document.getElementById('topSkillsList');
    if (topSkillsEl) topSkillsEl.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);">Upload your CV to see skills</p>';
  }
}

function statusBadge(status) {
  const map = {
    applied: ['badge-info', '📤 Applied'],
    in_review: ['badge-warning', '🔍 In Review'],
    interview: ['badge-success', '🗣 Interview'],
    offer: ['badge-success', '🎉 Offer'],
    rejected: ['badge-danger', '❌ Rejected'],
    withdrawn: ['badge-gray', '↩ Withdrawn']
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return `<span class="badge ${cls}" style="font-size:0.72rem;">${label}</span>`;
}

function attachJobCardEvents(container) {
  // Save buttons
  container.querySelectorAll('.saved-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const jobId = btn.dataset.saveId;
      try {
        if (btn.classList.contains('active')) {
          await API.unsaveJob(jobId);
          btn.classList.remove('active');
          showToast('info', 'Job removed', 'Removed from saved jobs');
        } else {
          await API.saveJob(jobId);
          btn.classList.add('active');
          btn.classList.add('animate-heartbeat');
          setTimeout(() => btn.classList.remove('animate-heartbeat'), 1500);
          showToast('success', 'Job saved!', 'Added to your saved jobs');
        }
      } catch (err) { showToast('error', 'Error', err.message); }
    });
  });

  // Click card to open detail
  container.querySelectorAll('.job-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      if (e.target.closest('.saved-btn')) return;
      openJobDetail(card.dataset.jobId);
    });
  });
}

async function openJobDetail(jobId) {
  try {
    const data = await API.getJobById(jobId);
    const job = data.job;
    document.getElementById('modalJobTitle').textContent = job.title;
    document.getElementById('modalCompanyName').textContent = job.company_name;
    const logo = document.getElementById('modalCompanyLogo');
    logo.textContent = (job.company_name || 'C')[0].toUpperCase();
    document.getElementById('jobModalContent').innerHTML = buildJobDetailContent(job);
    openModal('jobDetailModal');

    const saveBtn = document.getElementById('saveJobModalBtn');
    const applyBtn = document.getElementById('applyJobModalBtn');
    if (saveBtn) saveBtn.onclick = async () => {
      try {
        await API.saveJob(jobId);
        showToast('success', 'Saved!', 'Job added to saved list');
      } catch (e) { showToast('error', 'Error', e.message); }
    };
    if (applyBtn) applyBtn.onclick = () => applyToJob(jobId);
    document.getElementById('closeJobModal')?.addEventListener('click', () => closeModal('jobDetailModal'));
  } catch (err) { showToast('error', 'Error', 'Could not load job details'); }
}

async function applyToJob(jobId) {
  try {
    await API.applyJob(jobId);
    showToast('success', 'Applied! 🎉', 'Your application has been submitted');
    closeModal('jobDetailModal');
    loadRecentApplications();
    loadDashboardStats();
  } catch (err) { showToast('error', 'Error', err.message); }
}

// Expose globally
window.openJobDetail = openJobDetail;
window.applyToJob = applyToJob;
window.viewApplicationDetail = (id) => showToast('info', 'View', `Application ${id}`);
