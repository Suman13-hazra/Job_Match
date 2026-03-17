/* cv-analysis.js */
async function initCvAnalysisPage() {
  await loadCvAnalysis();
  initFileDropZone('updateCvZone', 'updateCvFile', async (file) => {
    if (file.size > 10 * 1024 * 1024) { showToast('error','Too large','Max 10MB'); return; }
    await uploadNewCv(file);
  });
}
async function loadCvAnalysis() {
  try {
    const data = await API.getCvAnalysis();
    const analysis = data.analysis || {};
    renderCvAnalysis(analysis);
    if (analysis.warning) {
      showToast('warning', 'CV text extraction issue', analysis.warning, 7000);
    }
    // Current CV info
    const cvInfo = document.getElementById('currentCvInfo');
    if (cvInfo && data.cv_filename) {
      cvInfo.innerHTML = `
        <div style="padding:1rem;background:var(--bg-primary);border-radius:12px;border:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <i class="fas fa-file-pdf" style="font-size:2rem;color:var(--danger);"></i>
            <div><div style="font-weight:700;font-size:0.9rem;">${escapeHtml(data.cv_filename)}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);">Uploaded ${formatDate(data.cv_uploaded_at)}</div></div>
          </div>
        </div>`;
    }
  } catch {
    const section = document.getElementById('analysisSection');
    if (section) section.innerHTML = `<div class="card" style="padding:3rem;text-align:center;grid-column:1/-1;"><div class="empty-state-icon"><i class="fas fa-file-upload"></i></div><h3>No CV uploaded yet</h3><p>Upload your CV to see the analysis</p></div>`;
  }
}
function renderCvAnalysis(analysis) {
  const skills = analysis.skills || [];
  const missing = analysis.missing_skills || [];
  const score = analysis.score || 0;
  const domain = analysis.domain || '';
  const experience = analysis.experience || [];

  // Score
  document.getElementById('cvScorePercent').textContent = `${score}%`;
  const badge = document.getElementById('cvScoreBadge');
  if (badge) { badge.textContent = score >= 80 ? '🌟 Excellent' : score >= 60 ? '👍 Good' : score >= 40 ? '⚡ Fair' : '📚 Needs Improvement'; }
  const ring = document.getElementById('cvScoreRing');
  if (ring) {
    const c = 314;
    setTimeout(() => { ring.style.strokeDashoffset = c - (score / 100) * c; ring.style.stroke = matchColor(score); }, 300);
  }
  // Score breakdown
  const breakdown = document.getElementById('cvScoreBreakdown');
  if (breakdown) {
    const items = [['Skills', analysis.skill_score||0], ['Experience', analysis.experience_score||0], ['Education', analysis.education_score||0]];
    breakdown.innerHTML = items.map(([label,val]) => `
      <div class="skill-match-item" style="margin-bottom:0.5rem;">
        <div class="skill-match-name" style="width:100px;">${label}</div>
        <div class="skill-match-bar"><div class="progress"><div class="progress-bar progress-primary" style="width:${val}%;"></div></div></div>
        <div class="skill-match-percent">${val}%</div>
      </div>`).join('');
  }
  // Extracted info
  const extracted = document.getElementById('extractedInfo');
  if (extracted) {
    extracted.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:0.75rem;">
        ${analysis.name ? `<div style="display:flex;gap:0.75rem;"><i class="fas fa-user" style="color:var(--primary);width:18px;"></i><div><div style="font-size:0.75rem;color:var(--text-muted);">Name</div><div style="font-weight:600;font-size:0.9rem;">${escapeHtml(analysis.name)}</div></div></div>` : ''}
        ${analysis.email ? `<div style="display:flex;gap:0.75rem;"><i class="fas fa-envelope" style="color:var(--primary);width:18px;"></i><div><div style="font-size:0.75rem;color:var(--text-muted);">Email</div><div style="font-weight:600;font-size:0.9rem;">${escapeHtml(analysis.email)}</div></div></div>` : ''}
        ${analysis.phone ? `<div style="display:flex;gap:0.75rem;"><i class="fas fa-phone" style="color:var(--primary);width:18px;"></i><div><div style="font-size:0.75rem;color:var(--text-muted);">Phone</div><div style="font-weight:600;font-size:0.9rem;">${escapeHtml(analysis.phone)}</div></div></div>` : ''}
        ${analysis.years_experience !== undefined ? `<div style="display:flex;gap:0.75rem;"><i class="fas fa-clock" style="color:var(--primary);width:18px;"></i><div><div style="font-size:0.75rem;color:var(--text-muted);">Experience</div><div style="font-weight:600;font-size:0.9rem;">${analysis.years_experience} year${analysis.years_experience!==1?'s':''}</div></div></div>` : ''}
        ${analysis.education_level ? `<div style="display:flex;gap:0.75rem;"><i class="fas fa-graduation-cap" style="color:var(--primary);width:18px;"></i><div><div style="font-size:0.75rem;color:var(--text-muted);">Education</div><div style="font-weight:600;font-size:0.9rem;">${escapeHtml(analysis.education_level)}</div></div></div>` : ''}
      </div>`;
  }
  // Skills
  const skillsEl = document.getElementById('detectedSkills');
  if (skillsEl) {
    document.getElementById('skillCountBadge').textContent = `${skills.length} skills`;
    skillsEl.innerHTML = skills.length > 0 ? skills.map(s=>`<span class="skill-tag">${escapeHtml(s)}</span>`).join('') : '<p style="font-size:0.85rem;color:var(--text-muted);">No skills detected</p>';
  }
  // Domain
  const domainEl = document.getElementById('domainDetection');
  if (domainEl) {
    const domainNames = { software_engineering:'Software Engineering', data_science:'Data Science & AI/ML', product_management:'Product Management', design:'UI/UX Design', devops:'DevOps & Cloud', cybersecurity:'Cybersecurity', marketing:'Digital Marketing', finance:'Finance & Accounting', sales:'Sales', hr:'Human Resources' };
    const domains = analysis.detected_domains || (domain ? [{ domain, confidence: analysis.domain_confidence || 0.8 }] : []);
    domainEl.innerHTML = domains.length > 0 ? domains.map((d,i) => `
      <div style="margin-bottom:0.75rem;">
        <div style="display:flex;justify-content:space-between;margin-bottom:0.35rem;">
          <span style="font-weight:600;font-size:0.88rem;">${domainNames[d.domain]||d.domain}</span>
          <span style="font-size:0.82rem;font-weight:700;color:var(--primary);">${Math.round((d.confidence||0)*100)}%</span>
        </div>
        <div class="progress"><div class="progress-bar" style="background:${i===0?'var(--primary)':'var(--text-muted)'};width:${Math.round((d.confidence||0)*100)}%;"></div></div>
      </div>`).join('') : '<p style="font-size:0.85rem;color:var(--text-muted);">Domain not detected</p>';
  }
  // Experience
  const expEl = document.getElementById('detectedExperience');
  if (expEl) {
    expEl.innerHTML = experience.length > 0 ? `<div class="timeline">${experience.map(e=>`
      <div class="timeline-item"><div class="timeline-dot"><i class="fas fa-briefcase" style="font-size:0.75rem;"></i></div>
      <div class="timeline-content"><div class="timeline-title">${escapeHtml(e.title||'')}</div>
      <div class="timeline-subtitle">${escapeHtml(e.company||'')}</div>
      <div class="timeline-date">${escapeHtml(e.duration||'')}</div></div></div>`).join('')}</div>` : '<p style="font-size:0.85rem;color:var(--text-muted);">No work experience detected</p>';
  }
  // Skills gap
  const haveEl = document.getElementById('skillsHave');
  const missEl = document.getElementById('skillsMissing');
  if (haveEl) haveEl.innerHTML = skills.length > 0 ? skills.map(s=>`<span class="skill-tag match">${escapeHtml(s)}</span>`).join('') : '<p style="color:var(--text-muted);font-size:0.85rem;">No skills found</p>';
  if (missEl) missEl.innerHTML = missing.length > 0 ? missing.map(s=>`<span class="skill-tag missing">${escapeHtml(s)}</span>`).join('') : '<p style="color:var(--text-muted);font-size:0.85rem;">Looking good! No critical gaps</p>';
}
async function uploadNewCv(file) {
  const formData = new FormData();
  formData.append('cv', file);
  const alertEl = document.getElementById('updateCvAlert');
  alertEl.innerHTML = `<div class="recommendation-loading"><div class="typing-dots"><span></span><span></span><span></span></div> Uploading and analyzing CV...</div>`;
  try {
    await API.uploadCv(formData);
    alertEl.innerHTML = '';
    showToast('success','CV Updated!','Re-analyzing your profile...');
    setTimeout(() => loadCvAnalysis(), 1500);
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-danger"><i class="fas fa-times-circle"></i><div>${err.message}</div></div>`;
  }
}
