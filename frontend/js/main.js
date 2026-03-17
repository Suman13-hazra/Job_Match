/* =====================================================
   main.js – Core utilities, theme, sidebar, toasts
   ===================================================== */

// ---- Theme Management ----
function initTheme() {
  const saved = localStorage.getItem('jmp_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const toggles = document.querySelectorAll('.theme-toggle');
  toggles.forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('jmp_theme', next);
}

// ---- Page Loader ----
function hideLoader() {
  setTimeout(() => {
    const loader = document.getElementById('pageLoader');
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(() => loader.remove(), 500);
    }
  }, 400);
}

// ---- Toast Notifications ----
function showToast(type, title, message, duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || 'fa-info-circle'} toast-icon"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <i class="fas fa-times toast-close"></i>
  `;
  container.appendChild(toast);
  const closeBtn = toast.querySelector('.toast-close');
  const dismiss = () => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  };
  closeBtn.addEventListener('click', dismiss);
  setTimeout(dismiss, duration);
}

// ---- Alert helper ----
function showAlert(containerId, type, message, html = false) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const icons = { success: 'fa-check-circle', danger: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  el.innerHTML = `
    <div class="alert alert-${type} animate-slideDown">
      <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
      <div>${html ? message : escapeHtml(message)}</div>
    </div>
  `;
}

function clearAlert(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '';
}

// ---- Auth Guard ----
function requireAuth() {
  const token = localStorage.getItem('jmp_token');
  if (!token) {
    window.location.href = 'index.html';
    return false;
  }
  // Load user info for topbar/sidebar
  loadUserInfo();
  initSidebar();
  return true;
}

function loadUserInfo() {
  const user = getStoredUser();
  if (!user) return;
  // Sidebar
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const sidebarName = document.getElementById('sidebarName');
  const sidebarEmail = document.getElementById('sidebarEmail');
  const topbarAvatar = document.getElementById('topbarAvatar');
  if (sidebarAvatar) sidebarAvatar.textContent = (user.first_name || 'U')[0].toUpperCase();
  if (sidebarName) sidebarName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (sidebarEmail) sidebarEmail.textContent = user.email || '';
  if (topbarAvatar) topbarAvatar.textContent = (user.first_name || 'U')[0].toUpperCase();
}

function getStoredUser() {
  try {
    const u = localStorage.getItem('jmp_user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

function isLoggedIn() {
  return !!localStorage.getItem('jmp_token');
}

function ensureLoggedIn({ redirectTo = 'index.html', message = 'Please login to continue.' } = {}) {
  if (isLoggedIn()) return true;
  showToast('info', 'Login required', message);
  setTimeout(() => { window.location.href = redirectTo; }, 800);
  return false;
}

function logout() {
  localStorage.removeItem('jmp_token');
  localStorage.removeItem('jmp_user');
  window.location.href = 'index.html';
}

// ---- Sidebar ----
function initPublicShell() {
  // Initialize sidebar interactions even for guests
  initSidebar();
  // If no user info, show Guest placeholders and convert logout to login
  if (!isLoggedIn()) {
    const sidebarName = document.getElementById('sidebarName');
    const sidebarEmail = document.getElementById('sidebarEmail');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const topbarAvatar = document.getElementById('topbarAvatar');
    if (sidebarName) sidebarName.textContent = 'Guest';
    if (sidebarEmail) sidebarEmail.textContent = 'Sign in to apply';
    if (sidebarAvatar) sidebarAvatar.textContent = 'G';
    if (topbarAvatar) topbarAvatar.textContent = 'G';

    // Replace logout behavior with login redirect
    document.querySelectorAll('#logoutBtn, #ddLogout').forEach(btn => {
      btn.removeEventListener('click', logout);
      btn.addEventListener('click', () => ensureLoggedIn({ message: 'Please login to access your account.' }));
    });
  } else {
    loadUserInfo();
  }
}


function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const toggleBtn = document.getElementById('toggleSidebar');
  if (!sidebar) return;

  // Restore collapsed state
  const collapsed = localStorage.getItem('jmp_sidebar') === 'collapsed';
  if (collapsed) {
    sidebar.classList.add('collapsed');
    if (mainContent) mainContent.classList.add('expanded');
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      if (mainContent) mainContent.classList.toggle('expanded');
      localStorage.setItem('jmp_sidebar', sidebar.classList.contains('collapsed') ? 'collapsed' : 'open');
    });
  }

  // Logout buttons
  document.querySelectorAll('#logoutBtn, #ddLogout').forEach(btn => {
    btn.addEventListener('click', logout);
  });

  // User dropdown
  const userDropdown = document.getElementById('userDropdown');
  if (userDropdown) {
    const avatar = userDropdown.querySelector('.avatar');
    if (avatar) avatar.addEventListener('click', () => userDropdown.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!userDropdown.contains(e.target)) userDropdown.classList.remove('open');
    });
  }
}

// ---- Modal ----
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
}
function initModals() {
  document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) { overlay.classList.remove('active'); document.body.style.overflow = ''; }
    });
  });
}

// ---- Tabs ----
function initTabs(container = document) {
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabGroup = btn.closest('.tabs');
      if (!tabGroup) return;
      tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      if (!tabId) return;
      const panes = document.querySelectorAll('.tab-pane');
      panes.forEach(p => {
        p.classList.remove('active');
        if (p.id === `tab-${tabId}`) p.classList.add('active');
      });
    });
  });
}

// ---- Filter Chips ----
function initFilterChips(selector, callback) {
  document.querySelectorAll(selector).forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll(selector).forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (callback) callback(chip.dataset.filter || chip.dataset.recFilter || chip.dataset.appFilter);
    });
  });
}

// ---- Scroll Reveal ----
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right').forEach(el => observer.observe(el));
}

// ---- Helper: Escape HTML ----
function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Helper: Format Date ----
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---- Helper: Time Ago ----
function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
  return formatDate(dateStr);
}

// ---- Helper: Format salary ----
function formatSalary(min, max, currency = 'USD') {
  const fmt = (n) => n >= 1000 ? `${(n/1000).toFixed(0)}K` : n;
  if (min && max) return `$${fmt(min)} - $${fmt(max)}`;
  if (min) return `From $${fmt(min)}`;
  if (max) return `Up to $${fmt(max)}`;
  return 'Salary not disclosed';
}

// ---- Match Score Color ----
function matchColor(score) {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

// ---- Match Score Badge ----
function matchBadge(score) {
  if (score >= 80) return `<span class="badge badge-success">${score}% Match</span>`;
  if (score >= 60) return `<span class="badge badge-warning">${score}% Match</span>`;
  return `<span class="badge badge-danger">${score}% Match</span>`;
}

// ---- Build Job Card ----
function buildJobCard(job, showMatch = true) {
  const match = job.match_score || 0;
  const color = matchColor(match);
  const typeColors = {
    'Full-time': 'badge-info', 'Part-time': 'badge-warning',
    'Remote': 'badge-success', 'Internship': 'badge-primary', 'Contract': 'badge-gray'
  };
  const typeColor = typeColors[job.job_type] || 'badge-gray';
  const logoLetter = (job.company_name || 'C')[0].toUpperCase();
  return `
    <div class="job-card card-hover animate-fadeInUp" data-job-id="${job.id}">
      <div class="job-card-header">
        <div class="company-logo" style="background:${job.company_color || 'var(--gradient-card)'};">
          ${job.company_logo ? `<img src="${job.company_logo}" alt="${job.company_name}" />` : logoLetter}
        </div>
        <div class="job-card-info" style="flex:1;">
          <h4 style="font-size:1rem;">${escapeHtml(job.title)}</h4>
          <div class="company-name"><i class="fas fa-building"></i> ${escapeHtml(job.company_name)}</div>
        </div>
        <button class="saved-btn ${job.is_saved ? 'active' : ''}" data-save-id="${job.id}" title="Save job">
          <i class="fas fa-bookmark"></i>
        </button>
      </div>
      <div class="job-meta">
        <span class="job-meta-item"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(job.location || 'Remote')}</span>
        <span class="job-meta-item"><i class="fas fa-clock"></i> <span class="badge ${typeColor} job-type-badge">${escapeHtml(job.job_type || 'Full-time')}</span></span>
        ${job.experience_level ? `<span class="job-meta-item"><i class="fas fa-layer-group"></i> ${escapeHtml(job.experience_level)}</span>` : ''}
      </div>
      ${job.skills ? `
        <div class="skills-container" style="margin:0.5rem 0;">
          ${job.skills.slice(0,4).map(s => `<span class="skill-tag" style="font-size:0.72rem;">${escapeHtml(s)}</span>`).join('')}
          ${job.skills.length > 4 ? `<span class="skill-tag" style="font-size:0.72rem;background:var(--border);">+${job.skills.length-4} more</span>` : ''}
        </div>
      ` : ''}
      <div class="job-card-footer">
        <div class="job-salary">${formatSalary(job.salary_min, job.salary_max)}</div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          ${showMatch && match > 0 ? `<span style="font-size:0.78rem;font-weight:700;color:${color};">${match}% match</span>` : ''}
          <span style="font-size:0.75rem;color:var(--text-muted);">${timeAgo(job.created_at || new Date())}</span>
        </div>
      </div>
    </div>
  `;
}

// ---- Job Detail Modal Content ----
function buildJobDetailContent(job) {
  const match = job.match_score || 0;
  const matchPercent = match;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (matchPercent / 100) * circumference;
  return `
    <div>
      <div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap;margin-bottom:1.5rem;">
        <div class="match-ring" style="width:100px;height:100px;flex-shrink:0;">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle class="ring-bg" cx="50" cy="50" r="40" stroke-width="8"/>
            <circle class="ring-fill" cx="50" cy="50" r="40" stroke-width="8"
              stroke="${matchColor(match)}"
              style="stroke-dasharray:${circumference};stroke-dashoffset:${offset};transition:stroke-dashoffset 1.2s ease;"
            />
          </svg>
          <div class="ring-text">
            <div class="ring-percent" style="color:${matchColor(match)};">${matchPercent}%</div>
            <div class="ring-label">MATCH</div>
          </div>
        </div>
        <div>
          <div class="job-meta" style="flex-wrap:wrap;">
            <span class="job-meta-item"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(job.location || 'Remote')}</span>
            <span class="job-meta-item"><i class="fas fa-clock"></i> ${escapeHtml(job.job_type || 'Full-time')}</span>
            <span class="job-meta-item"><i class="fas fa-layer-group"></i> ${escapeHtml(job.experience_level || 'All levels')}</span>
            <span class="job-meta-item"><i class="fas fa-dollar-sign"></i> ${formatSalary(job.salary_min, job.salary_max)}</span>
          </div>
          ${job.match_skills ? `
            <div style="margin-top:0.75rem;">
              <div style="font-size:0.8rem;font-weight:700;margin-bottom:0.4rem;color:var(--text-secondary);">MATCHING SKILLS</div>
              <div class="skills-container">
                ${job.match_skills.map(s => `<span class="skill-tag match">${escapeHtml(s)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
          ${job.missing_skills && job.missing_skills.length > 0 ? `
            <div style="margin-top:0.75rem;">
              <div style="font-size:0.8rem;font-weight:700;margin-bottom:0.4rem;color:var(--warning);">SKILLS TO LEARN</div>
              <div class="skills-container">
                ${job.missing_skills.map(s => `<span class="skill-tag missing">${escapeHtml(s)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="divider"><span class="divider-text">Job Description</span></div>
      <div style="font-size:0.9rem;line-height:1.8;color:var(--text-secondary);white-space:pre-wrap;">${escapeHtml(job.description || 'No description provided.')}</div>
      ${job.requirements ? `
        <div style="margin-top:1.25rem;">
          <h5 style="margin-bottom:0.5rem;">Requirements</h5>
          <div style="font-size:0.9rem;line-height:1.8;color:var(--text-secondary);white-space:pre-wrap;">${escapeHtml(job.requirements)}</div>
        </div>
      ` : ''}
      ${job.skills && job.skills.length > 0 ? `
        <div style="margin-top:1.25rem;">
          <h5 style="margin-bottom:0.5rem;">Required Skills</h5>
          <div class="skills-container">${job.skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}</div>
        </div>
      ` : ''}
    </div>
  `;
}

// ---- Animated Counter ----
function animateCounter(el, target, duration = 1200) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { start = target; clearInterval(timer); }
    el.textContent = Math.floor(start);
  }, 16);
}

// ---- Progress Ring Animation ----
function animateRing(ringEl, percent, circumference = 314) {
  const offset = circumference - (percent / 100) * circumference;
  requestAnimationFrame(() => {
    ringEl.style.strokeDasharray = circumference;
    ringEl.style.strokeDashoffset = offset;
  });
}

// ---- Drag & Drop file zone ----
function initFileDropZone(zoneId, inputId, onFile) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;

  input.addEventListener('change', () => {
    if (input.files[0]) onFile(input.files[0]);
  });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragging'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragging');
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  });
}

// ---- Init on DOM Ready ----
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initModals();
  initTabs();
  initScrollReveal();
});
