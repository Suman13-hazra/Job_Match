/* =====================================================
   jobs.js – Job Search page
   ===================================================== */

let allJobs = [];
let currentPage = 1;
const JOBS_PER_PAGE = 10;
let listView = false;
let currentJobId = null;

async function initJobsPage() {
  loadJobs();

  document.getElementById('searchBtn')?.addEventListener('click', () => { currentPage = 1; loadJobs(); });
  document.getElementById('jobSearchInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') { currentPage = 1; loadJobs(); } });
  document.getElementById('applyFilterBtn')?.addEventListener('click', () => { currentPage = 1; loadJobs(); });
  document.getElementById('clearFilterBtn')?.addEventListener('click', clearFilters);
  document.getElementById('sortBy')?.addEventListener('change', () => renderJobs());
  document.getElementById('toggleView')?.addEventListener('click', () => {
    listView = !listView;
    const icon = document.getElementById('viewIcon');
    if (icon) icon.className = listView ? 'fas fa-list' : 'fas fa-th-large';
    renderJobs();
  });

  initFilterChips('[data-filter]', (filter) => { currentPage = 1; loadJobs(); });

  document.getElementById('closeJobModal')?.addEventListener('click', () => closeModal('jobDetailModal'));
  document.getElementById('closeCvMatchModal')?.addEventListener('click', () => closeModal('cvMatchModal'));
}

async function loadJobs() {
  const container = document.getElementById('jobListings');
  if (!container) return;
  container.innerHTML = buildSkeletonCards(4);

  const query = document.getElementById('jobSearchInput')?.value.trim() || '';
  const location = document.getElementById('locationInput')?.value.trim() || '';
  const domain = document.getElementById('domainFilter')?.value || '';
  const experience = document.getElementById('expFilter')?.value || '';
  const salMin = document.getElementById('salaryMin')?.value || '';
  const salMax = document.getElementById('salaryMax')?.value || '';
  const datePosted = document.getElementById('dateFilter')?.value || '';
  const activeChip = document.querySelector('[data-filter].active');
  const jobType = activeChip?.dataset.filter === 'all' ? '' : (activeChip?.dataset.filter || '');

  const params = { q: query, location, domain, experience, job_type: jobType, salary_min: salMin, salary_max: salMax, days: datePosted };
  // Remove empty
  Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });

  try {
    const data = await API.getJobs(params);
    allJobs = data.jobs || [];
    document.getElementById('resultsCount').textContent = `${allJobs.length} job${allJobs.length !== 1 ? 's' : ''} found`;
    renderJobs();
  } catch (err) {
    container.innerHTML = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i><div>${err.message || 'Could not load jobs'}</div></div>`;
  }
}

function renderJobs() {
  const container = document.getElementById('jobListings');
  if (!container) return;

  // Sort
  const sortBy = document.getElementById('sortBy')?.value || 'relevance';
  let sorted = [...allJobs];
  if (sortBy === 'date') sorted.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  if (sortBy === 'salary') sorted.sort((a,b) => (b.salary_max || 0) - (a.salary_max || 0));
  if (sortBy === 'match') sorted.sort((a,b) => (b.match_score || 0) - (a.match_score || 0));

  // Paginate
  const total = sorted.length;
  const totalPages = Math.ceil(total / JOBS_PER_PAGE);
  const start = (currentPage - 1) * JOBS_PER_PAGE;
  const paginated = sorted.slice(start, start + JOBS_PER_PAGE);

  if (paginated.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-search"></i></div><h3>No jobs found</h3><p>Try different keywords or adjust your filters</p></div>`;
    document.getElementById('paginationContainer').innerHTML = '';
    return;
  }

  if (listView) {
    container.style.flexDirection = 'column';
    container.innerHTML = paginated.map(job => buildJobListItem(job)).join('');
  } else {
    container.style.flexDirection = 'column';
    container.innerHTML = paginated.map(job => buildJobCardHorizontal(job)).join('');
  }

  attachJobCardEvents(container);
  renderPagination(totalPages);
}

function buildJobCardHorizontal(job) {
  const match = job.match_score || 0;
  const color = matchColor(match);
  return `
    <div class="card card-hover animate-fadeInUp" style="padding:1.25rem;cursor:pointer;" data-job-id="${job.id}">
      <div style="display:flex;align-items:flex-start;gap:1rem;flex-wrap:wrap;">
        <div class="company-logo" style="width:52px;height:52px;font-size:1.25rem;flex-shrink:0;">${(job.company_name||'C')[0].toUpperCase()}</div>
        <div style="flex:1;min-width:200px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
            <div>
              <h4 style="font-size:1rem;margin-bottom:0.2rem;">${escapeHtml(job.title)}</h4>
              <div style="font-size:0.85rem;color:var(--text-secondary);display:flex;align-items:center;gap:0.5rem;">
                <i class="fas fa-building"></i> ${escapeHtml(job.company_name)} &nbsp;·&nbsp;
                <i class="fas fa-map-marker-alt"></i> ${escapeHtml(job.location||'Remote')}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;">
              ${match > 0 ? `<div style="padding:0.35rem 0.85rem;background:${match>=80?'var(--success)':match>=60?'var(--warning)':'var(--danger)'};color:#fff;border-radius:20px;font-size:0.78rem;font-weight:700;">${match}% Match</div>` : ''}
              <button class="saved-btn ${job.is_saved?'active':''}" data-save-id="${job.id}"><i class="fas fa-bookmark"></i></button>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin:0.65rem 0;">
            <span class="badge badge-primary" style="font-size:0.72rem;">${escapeHtml(job.job_type||'Full-time')}</span>
            ${job.experience_level ? `<span class="badge badge-info" style="font-size:0.72rem;">${escapeHtml(job.experience_level)}</span>` : ''}
            ${job.domain ? `<span class="badge badge-gray" style="font-size:0.72rem;">${escapeHtml(job.domain)}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
            <div class="skills-container">
              ${(job.skills||[]).slice(0,3).map(s=>`<span class="skill-tag" style="font-size:0.72rem;">${escapeHtml(s)}</span>`).join('')}
            </div>
            <div style="display:flex;align-items:center;gap:1rem;">
              <span style="font-weight:700;color:var(--success);font-size:0.9rem;">${formatSalary(job.salary_min,job.salary_max)}</span>
              <span style="font-size:0.75rem;color:var(--text-muted);">${timeAgo(job.created_at)}</span>
              <button class="btn btn-sm btn-outline check-match-btn" data-job-id="${job.id}" title="Check CV match" style="padding:0.3rem 0.7rem;">
                <i class="fas fa-chart-bar"></i> CV Fit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildJobListItem(job) {
  return buildJobCardHorizontal(job);
}

function renderPagination(totalPages) {
  const container = document.getElementById('paginationContainer');
  if (!container || totalPages <= 1) { if (container) container.innerHTML = ''; return; }
  let html = '';
  html += `<button class="page-btn" onclick="changePage(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="fas fa-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
      html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="changePage(${i})">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 3) {
      html += `<span style="padding:0 0.3rem;color:var(--text-muted);">...</span>`;
    }
  }
  html += `<button class="page-btn" onclick="changePage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}><i class="fas fa-chevron-right"></i></button>`;
  container.innerHTML = html;
}

window.changePage = (page) => {
  const totalPages = Math.ceil(allJobs.length / JOBS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderJobs();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function clearFilters() {
  document.getElementById('domainFilter').value = '';
  document.getElementById('expFilter').value = '';
  document.getElementById('salaryMin').value = '';
  document.getElementById('salaryMax').value = '';
  document.getElementById('dateFilter').value = '';
  document.getElementById('cvMatchFilter').checked = false;
  document.querySelectorAll('[data-filter]').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-filter="all"]')?.classList.add('active');
  currentPage = 1;
  loadJobs();
}

function buildSkeletonCards(n) {
  return Array(n).fill(0).map(() => `
    <div class="card" style="padding:1.25rem;margin-bottom:1rem;">
      <div style="display:flex;gap:1rem;">
        <div class="skeleton" style="width:52px;height:52px;border-radius:12px;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="skeleton skeleton-title" style="width:60%;"></div>
          <div class="skeleton skeleton-text" style="width:40%;"></div>
          <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
            <div class="skeleton skeleton-text" style="width:70px;height:22px;border-radius:20px;"></div>
            <div class="skeleton skeleton-text" style="width:80px;height:22px;border-radius:20px;"></div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
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
          showToast('info', 'Removed', 'Job removed from saved');
        } else {
          await API.saveJob(jobId);
          btn.classList.add('active');
          showToast('success', 'Saved!', 'Job added to saved list');
        }
      } catch (err) { showToast('error', 'Error', err.message); }
    });
  });

  // CV Match check
  container.querySelectorAll('.check-match-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const jobId = btn.dataset.jobId;
      await showCvMatchModal(jobId);
    });
  });

  // Card click – open detail
  container.querySelectorAll('[data-job-id]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.saved-btn') || e.target.closest('.check-match-btn')) return;
      openJobDetail(card.dataset.jobId);
    });
  });
}

async function openJobDetail(jobId) {
  try {
    const data = await API.getJobById(jobId);
    const job = data.job;
    currentJobId = jobId;
    document.getElementById('modalJobTitle').textContent = job.title;
    document.getElementById('modalCompanyName').textContent = job.company_name;
    document.getElementById('modalCompanyLogo').textContent = (job.company_name||'C')[0].toUpperCase();
    document.getElementById('jobModalContent').innerHTML = buildJobDetailContent(job);
    openModal('jobDetailModal');

    document.getElementById('saveJobModalBtn').onclick = async () => {
      try { await API.saveJob(jobId); showToast('success', 'Saved!', ''); }
      catch (e) { showToast('error', 'Error', e.message); }
    };
    document.getElementById('applyJobModalBtn').onclick = async () => {
      if (!ensureLoggedIn({ message: 'Login is required to apply for jobs.' })) return;
      try {
        await API.applyJob(jobId);
        showToast('success', 'Applied! 🎉', 'Application submitted successfully');
        closeModal('jobDetailModal');
      } catch (e) {
        const msg = e.message || 'Could not apply';
        showToast('error', 'Error', msg);
        if (msg.toLowerCase().includes('complete your job profile')) {
          setTimeout(() => window.location.href = 'profile.html', 800);
        }
      }
    };
  } catch (err) { showToast('error', 'Error', 'Could not load job details'); }
}

async function showCvMatchModal(jobId) {
  const content = document.getElementById('cvMatchContent');
  if (!content) return;
  // CV match requires login + CV
  if (!isLoggedIn()) {
    openModal('cvMatchModal');
    content.innerHTML = `
      <div class="card" style="padding:1.5rem;background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;">
        <h3 style="margin-bottom:0.5rem;"><i class="fas fa-lock" style="color:var(--primary);"></i> Login required</h3>
        <p style="color:var(--text-secondary);margin-bottom:1rem;">To check CV fit, please login and upload your CV.</p>
        <button class="btn btn-primary" onclick="ensureLoggedIn({message:'Please login to use CV match.'})"><i class="fas fa-sign-in-alt"></i> Login</button>
      </div>
    `;
    return;
  }

  openModal('cvMatchModal');
  content.innerHTML = `<div class="ai-loading"><div class="ai-loading-rings"><div class="ai-loading-ring"></div><div class="ai-loading-ring"></div><div class="ai-loading-ring"></div><div class="ai-loading-center"><i class="fas fa-robot"></i></div></div><div class="ai-loading-text">Analyzing your CV against this job...</div></div>`;
  try {
    const data = await API.analyzeJobMatch(jobId);
    const match = data.match || {};
    const score = match.score || 0;
    const c = 2 * Math.PI * 45;
    const offset = c - (score / 100) * c;
    content.innerHTML = `
      <div style="text-align:center;margin-bottom:1.5rem;">
        <div style="width:120px;height:120px;position:relative;margin:0 auto 1rem;">
          <svg width="120" height="120" viewBox="0 0 120 120" style="transform:rotate(-90deg);">
            <circle fill="none" stroke="var(--border)" stroke-width="10" cx="60" cy="60" r="45"/>
            <circle fill="none" stroke="${matchColor(score)}" stroke-width="10" cx="60" cy="60" r="45"
              stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"
              style="transition:stroke-dashoffset 1.2s ease;"/>
          </svg>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
            <div style="font-size:1.5rem;font-weight:800;color:${matchColor(score)};">${score}%</div>
            <div style="font-size:0.62rem;color:var(--text-muted);text-transform:uppercase;">Match</div>
          </div>
        </div>
        <h3 style="font-size:1.1rem;">${score >= 80 ? '🎉 Excellent Match!' : score >= 60 ? '👍 Good Match' : score >= 40 ? '⚡ Fair Match' : '📚 Needs Work'}</h3>
        <p style="color:var(--text-secondary);font-size:0.88rem;">${match.summary || 'Based on your CV analysis'}</p>
      </div>
      <div class="grid-2" style="gap:1rem;">
        ${match.matching_skills && match.matching_skills.length > 0 ? `
          <div>
            <h5 style="font-size:0.88rem;color:var(--success);margin-bottom:0.5rem;"><i class="fas fa-check-circle"></i> Skills You Have (${match.matching_skills.length})</h5>
            <div class="skills-container">${match.matching_skills.map(s=>`<span class="skill-tag match">${escapeHtml(s)}</span>`).join('')}</div>
          </div>
        ` : ''}
        ${match.missing_skills && match.missing_skills.length > 0 ? `
          <div>
            <h5 style="font-size:0.88rem;color:var(--warning);margin-bottom:0.5rem;"><i class="fas fa-exclamation-circle"></i> Skills to Learn (${match.missing_skills.length})</h5>
            <div class="skills-container">${match.missing_skills.map(s=>`<span class="skill-tag missing">${escapeHtml(s)}</span>`).join('')}</div>
          </div>
        ` : ''}
      </div>
      ${match.recommendations ? `
        <div style="margin-top:1.25rem;padding:1rem;background:var(--badge-bg);border-radius:12px;">
          <h5 style="font-size:0.88rem;margin-bottom:0.5rem;color:var(--badge-text);"><i class="fas fa-lightbulb"></i> AI Recommendations</h5>
          <p style="font-size:0.85rem;color:var(--text-secondary);">${escapeHtml(match.recommendations)}</p>
        </div>
      ` : ''}
      <div style="margin-top:1.25rem;display:flex;gap:0.75rem;justify-content:flex-end;">
        <button class="btn btn-ghost" onclick="closeModal('cvMatchModal')">Close</button>
        <button class="btn btn-primary" onclick="applyFromMatch('${jobId}')"><i class="fas fa-paper-plane"></i> Apply Now</button>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i><div>${err.message || 'Could not analyze CV match'}</div></div>`;
  }
}

window.openJobDetail = openJobDetail;
window.applyFromMatch = async (jobId) => {
  if (!ensureLoggedIn({ message: 'Login is required to apply for jobs.' })) return;
  try {
    await API.applyJob(jobId);
    showToast('success', 'Applied! 🎉', 'Application submitted');
    closeModal('cvMatchModal');
  } catch (e) {
    const msg = e.message || 'Could not apply';
    showToast('error', 'Error', msg);
    if (msg.toLowerCase().includes('complete your job profile')) {
      setTimeout(() => window.location.href = 'profile.html', 800);
    }
  }
};
