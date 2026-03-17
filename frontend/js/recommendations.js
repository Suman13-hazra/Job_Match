/* =====================================================
   recommendations.js – AI Recommendations page
   ===================================================== */

let allRecs = [];

async function initRecommendationsPage() {
  await loadRecommendations();
  initFilterChips('[data-rec-filter]', filterRecs);
  document.getElementById('closeJobModal')?.addEventListener('click', () => closeModal('jobDetailModal'));
}

async function loadRecommendations() {
  const grid = document.getElementById('recommendationsGrid');
  if (!grid) return;
  grid.innerHTML = `<div style="grid-column:1/-1;"><div class="ai-loading"><div class="ai-loading-rings"><div class="ai-loading-ring"></div><div class="ai-loading-ring"></div><div class="ai-loading-ring"></div><div class="ai-loading-center"><i class="fas fa-robot"></i></div></div><div class="ai-loading-text">Analyzing your profile...</div></div></div>`;

  try {
    const data = await API.getRecommendations();
    allRecs = data.recommendations || [];

    // Update stats
    const total = allRecs.length;
    const avg = total > 0 ? Math.round(allRecs.reduce((s,r) => s+(r.match_score||0),0)/total) : 0;
    const perfect = allRecs.filter(r => (r.match_score||0) >= 90).length;
    document.getElementById('totalMatchesCount').textContent = total;
    document.getElementById('avgMatchScore').textContent = total > 0 ? `${avg}%` : '-';
    document.getElementById('perfectMatchCount').textContent = perfect;

    renderRecs(allRecs);
  } catch (err) {
    grid.innerHTML = `<div class="card" style="padding:3rem;text-align:center;grid-column:1/-1;">
      <div class="empty-state-icon"><i class="fas fa-robot"></i></div>
      <h3>Could not load recommendations</h3>
      <p>${err.message || 'Please upload your CV first'}</p>
      <a href="cv-analysis.html" class="btn btn-primary btn-sm" style="margin-top:1rem;">Upload CV</a>
    </div>`;
  }
}

function filterRecs(filter) {
  let filtered = [...allRecs];
  if (filter === '90') filtered = filtered.filter(r => (r.match_score||0) >= 90);
  else if (filter === '70') filtered = filtered.filter(r => (r.match_score||0) >= 70);
  else if (filter === '50') filtered = filtered.filter(r => (r.match_score||0) >= 50);
  else if (filter === 'new') {
    const yesterday = new Date(Date.now() - 86400000);
    filtered = filtered.filter(r => r.created_at && new Date(r.created_at) > yesterday);
  }
  renderRecs(filtered);
}

function renderRecs(jobs) {
  const grid = document.getElementById('recommendationsGrid');
  if (!grid) return;
  if (jobs.length === 0) {
    grid.innerHTML = `<div class="card" style="padding:3rem;text-align:center;grid-column:1/-1;">
      <div class="empty-state-icon" style="font-size:3rem;"><i class="fas fa-search"></i></div>
      <h3>No matches in this range</h3>
      <p>Try a different filter or improve your profile</p>
    </div>`;
    return;
  }
  grid.innerHTML = jobs.map(job => buildRecCard(job)).join('');
  attachRecCardEvents(grid);
}

function buildRecCard(job) {
  const match = job.match_score || 0;
  const color = matchColor(match);
  const c = 2 * Math.PI * 28;
  const offset = c - (match / 100) * c;
  return `
    <div class="job-card card-hover animate-fadeInUp" style="cursor:pointer;" data-job-id="${job.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;">
        <div class="company-logo" style="width:48px;height:48px;font-size:1.1rem;">${(job.company_name||'C')[0].toUpperCase()}</div>
        <div style="text-align:center;position:relative;width:70px;height:70px;flex-shrink:0;">
          <svg width="70" height="70" viewBox="0 0 70 70" style="transform:rotate(-90deg);">
            <circle fill="none" stroke="var(--border)" stroke-width="7" cx="35" cy="35" r="28"/>
            <circle fill="none" stroke="${color}" stroke-width="7" cx="35" cy="35" r="28"
              stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
              stroke-linecap="round"/>
          </svg>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
            <div style="font-size:0.95rem;font-weight:800;color:${color};line-height:1;">${match}%</div>
            <div style="font-size:0.55rem;color:var(--text-muted);text-transform:uppercase;">match</div>
          </div>
        </div>
      </div>
      <h4 style="font-size:0.95rem;margin-bottom:0.3rem;">${escapeHtml(job.title)}</h4>
      <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.75rem;display:flex;align-items:center;gap:4px;">
        <i class="fas fa-building"></i> ${escapeHtml(job.company_name)} &nbsp;·&nbsp;
        <i class="fas fa-map-marker-alt"></i> ${escapeHtml(job.location||'Remote')}
      </div>
      <div class="skills-container" style="margin-bottom:0.75rem;">
        ${(job.match_skills||[]).slice(0,3).map(s=>`<span class="skill-tag match" style="font-size:0.7rem;">${escapeHtml(s)}</span>`).join('')}
        ${(job.missing_skills||[]).slice(0,2).map(s=>`<span class="skill-tag missing" style="font-size:0.7rem;">${escapeHtml(s)}</span>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border-light);">
        <span style="font-weight:700;font-size:0.88rem;color:var(--success);">${formatSalary(job.salary_min,job.salary_max)}</span>
        <div style="display:flex;gap:0.5rem;">
          <button class="btn btn-sm btn-ghost saved-btn ${job.is_saved?'active':''}" data-save-id="${job.id}"><i class="fas fa-bookmark"></i></button>
          <button class="btn btn-sm btn-primary apply-quick-btn" data-apply-id="${job.id}">Apply</button>
        </div>
      </div>
    </div>
  `;
}

function attachRecCardEvents(container) {
  container.querySelectorAll('.saved-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        if (btn.classList.contains('active')) { await API.unsaveJob(btn.dataset.saveId); btn.classList.remove('active'); showToast('info','Removed',''); }
        else { await API.saveJob(btn.dataset.saveId); btn.classList.add('active'); showToast('success','Saved!',''); }
      } catch (err) { showToast('error','Error',err.message); }
    });
  });
  container.querySelectorAll('.apply-quick-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        if (!ensureLoggedIn({ message: 'Login is required to apply for jobs.' })) return;
        await API.applyJob(btn.dataset.applyId);
        btn.textContent = '✓ Applied';
        btn.disabled = true;
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-success');
        showToast('success','Applied! 🎉','Application submitted');
      } catch (err) { showToast('error','Error',err.message); }
    });
  });
  container.querySelectorAll('.job-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.saved-btn') || e.target.closest('.apply-quick-btn')) return;
      openRecJobDetail(card.dataset.jobId);
    });
  });
}

async function openRecJobDetail(jobId) {
  try {
    const data = await API.getJobById(jobId);
    const job = data.job;
    document.getElementById('modalJobTitle').textContent = job.title;
    document.getElementById('modalCompanyName').textContent = job.company_name;
    document.getElementById('modalCompanyLogo').textContent = (job.company_name||'C')[0].toUpperCase();
    document.getElementById('jobModalContent').innerHTML = buildJobDetailContent(job);
    openModal('jobDetailModal');
    document.getElementById('saveJobModalBtn').onclick = async () => { try { await API.saveJob(jobId); showToast('success','Saved!',''); } catch(e){showToast('error','Error',e.message);} };
    document.getElementById('applyJobModalBtn').onclick = async () => {
      if (!ensureLoggedIn({ message: 'Login is required to apply for jobs.' })) return;
      try { 
        await API.applyJob(jobId); 
        showToast('success','Applied! 🎉',''); 
        closeModal('jobDetailModal');
      }
      catch (e) { 
        const msg = e.message || 'Could not apply';
        showToast('error','Error',msg);
        if (msg.toLowerCase().includes('complete your job profile')) {
          setTimeout(() => window.location.href = 'profile.html', 800);
        }
      }
    };
  } catch { showToast('error','Error','Could not load job details'); }
}
