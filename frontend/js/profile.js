/* =====================================================
   profile.js – Job Profile page
   ===================================================== */

async function initProfilePage() {
  await loadProfileData();
  initProfileModals();
  initTabs();
  document.getElementById('saveBasicInfoBtn')?.addEventListener('click', saveBasicInfo);
  document.getElementById('openToWork')?.addEventListener('change', (e) => {
    const badge = document.getElementById('openToWorkBadge');
    if (badge) badge.style.display = e.target.checked ? 'inline-flex' : 'none';
    savePreference('open_to_work', e.target.checked);
  });
  document.getElementById('editProfileBtn')?.addEventListener('click', () => {
    document.querySelector('[data-tab="info"]')?.click();
  });
  document.getElementById('downloadResumeBtn')?.addEventListener('click', () => {
    showToast('info', 'Downloading...', 'Preparing your resume for download');
  });
}

async function loadProfileData() {
  try {
    const data = await API.getProfile();
    const profile = data.profile || {};
    const user = getStoredUser() || {};

    // Display info
    setProfileDisplay(profile, user);
    // Populate forms
    populateBasicInfoForm(profile, user);
    // Load sections
    renderExperience(profile.experiences || []);
    renderEducation(profile.educations || []);
    renderSkills(profile.skills || []);
    renderProjects(profile.projects || []);
    // Stats
    document.getElementById('statAppliedCount').textContent = profile.applications_count || 0;
    document.getElementById('statMatchScore').textContent = profile.avg_match_score ? `${profile.avg_match_score}%` : '-';
    document.getElementById('statProfileViews').textContent = profile.profile_views || 0;

    // Profile completion
    const completeness = calculateCompletion(profile);
    if (completeness < 80) {
      document.getElementById('profileIncompleteAlert').style.display = 'flex';
    }
    // Preferences
    if (profile.open_to_work) {
      document.getElementById('openToWork').checked = true;
      document.getElementById('openToWorkBadge').style.display = 'inline-flex';
    }
    if (profile.expected_salary) {
      document.getElementById('salaryPref').textContent = `$${profile.expected_salary.toLocaleString()}/year`;
    }
  } catch (err) {
    // Use stored user data as fallback
    const user = getStoredUser() || {};
    setProfileDisplay({}, user);
    populateBasicInfoForm({}, user);
  }
}

function setProfileDisplay(profile, user) {
  const name = `${user.first_name || profile.first_name || ''} ${user.last_name || profile.last_name || ''}`.trim();
  document.getElementById('profileNameDisplay').textContent = name || 'Your Name';
  document.getElementById('profileTitleDisplay').textContent = profile.title || 'Add your professional title';
  document.getElementById('profileLocationDisplay').textContent = profile.location || 'Add location';
  document.getElementById('profileBioDisplay').textContent = profile.bio || '';
  const avatar = document.getElementById('profileAvatarDisplay');
  if (avatar) avatar.textContent = (user.first_name || 'U')[0].toUpperCase();
}

function populateBasicInfoForm(profile, user) {
  const fields = {
    pFirstName: user.first_name || profile.first_name || '',
    pLastName: user.last_name || profile.last_name || '',
    pTitle: profile.title || '',
    pLocation: profile.location || '',
    pBio: profile.bio || '',
    pLinkedin: profile.linkedin || '',
    pGithub: profile.github || '',
    pWebsite: profile.website || ''
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
}

function calculateCompletion(profile) {
  const checks = [profile.title, profile.location, profile.bio, profile.linkedin,
    (profile.experiences||[]).length > 0, (profile.educations||[]).length > 0, (profile.skills||[]).length > 0];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

async function saveBasicInfo() {
  const data = {
    first_name: document.getElementById('pFirstName').value.trim(),
    last_name: document.getElementById('pLastName').value.trim(),
    title: document.getElementById('pTitle').value.trim(),
    location: document.getElementById('pLocation').value.trim(),
    bio: document.getElementById('pBio').value.trim(),
    linkedin: document.getElementById('pLinkedin').value.trim(),
    github: document.getElementById('pGithub').value.trim(),
    website: document.getElementById('pWebsite').value.trim()
  };
  try {
    const btn = document.getElementById('saveBasicInfoBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Saving...';
    await API.updateProfile(data);
    // Update local storage user
    const user = getStoredUser() || {};
    Object.assign(user, { first_name: data.first_name, last_name: data.last_name });
    localStorage.setItem('jmp_user', JSON.stringify(user));
    setProfileDisplay(data, user);
    showToast('success', 'Profile updated!', 'Your information has been saved');
  } catch (err) {
    showToast('error', 'Error', err.message);
  } finally {
    const btn = document.getElementById('saveBasicInfoBtn');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Info';
  }
}

// ---- Experience ----
function renderExperience(experiences) {
  const container = document.getElementById('experienceTimeline');
  if (!container) return;
  if (experiences.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:2rem;"><div class="empty-state-icon"><i class="fas fa-briefcase"></i></div><p>No experience added yet</p><button class="btn btn-sm btn-primary" onclick="document.getElementById('addExpBtn').click()">Add Experience</button></div>`;
    return;
  }
  container.innerHTML = experiences.map(exp => `
    <div class="timeline-item animate-fadeInUp">
      <div class="timeline-dot"><i class="fas fa-briefcase" style="font-size:0.75rem;"></i></div>
      <div class="timeline-content">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <div class="timeline-title">${escapeHtml(exp.title)}</div>
            <div class="timeline-subtitle"><i class="fas fa-building"></i> ${escapeHtml(exp.company)}${exp.location ? ` · ${escapeHtml(exp.location)}` : ''}</div>
            <div class="timeline-date">${formatMonthYear(exp.start_date)} – ${exp.current ? 'Present' : formatMonthYear(exp.end_date)}</div>
          </div>
          <button class="btn btn-sm btn-ghost" onclick="deleteExperience('${exp.id}')"><i class="fas fa-trash" style="color:var(--danger);"></i></button>
        </div>
        ${exp.description ? `<p style="font-size:0.85rem;margin-top:0.5rem;">${escapeHtml(exp.description)}</p>` : ''}
      </div>
    </div>
  `).join('');
}

function renderEducation(educations) {
  const container = document.getElementById('educationTimeline');
  if (!container) return;
  if (educations.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:2rem;"><div class="empty-state-icon"><i class="fas fa-graduation-cap"></i></div><p>No education added yet</p><button class="btn btn-sm btn-primary" onclick="document.getElementById('addEduBtn').click()">Add Education</button></div>`;
    return;
  }
  container.innerHTML = educations.map(edu => `
    <div class="timeline-item animate-fadeInUp">
      <div class="timeline-dot" style="background:var(--success);"><i class="fas fa-graduation-cap" style="font-size:0.75rem;"></i></div>
      <div class="timeline-content">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <div class="timeline-title">${escapeHtml(edu.institution)}</div>
            <div class="timeline-subtitle">${escapeHtml(edu.degree)} in ${escapeHtml(edu.field)}</div>
            <div class="timeline-date">${edu.start_year} – ${edu.end_year || 'Present'} ${edu.gpa ? `· GPA: ${escapeHtml(edu.gpa)}` : ''}</div>
          </div>
          <button class="btn btn-sm btn-ghost" onclick="deleteEducation('${edu.id}')"><i class="fas fa-trash" style="color:var(--danger);"></i></button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderSkills(skills) {
  const container = document.getElementById('skillsContainer');
  const profContainer = document.getElementById('skillProficiencyList');
  if (!container) return;
  if (skills.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:2rem;width:100%;"><div class="empty-state-icon"><i class="fas fa-code"></i></div><p>No skills added yet</p></div>`;
    if (profContainer) profContainer.innerHTML = '';
    return;
  }
  container.innerHTML = skills.map(s => `
    <div style="display:flex;align-items:center;gap:4px;">
      <span class="skill-tag">${escapeHtml(s.name)}</span>
      <button style="border:none;background:none;cursor:pointer;color:var(--text-muted);font-size:0.7rem;padding:2px;" onclick="deleteSkillFromProfile('${s.id}')">×</button>
    </div>
  `).join('');
  if (profContainer) {
    profContainer.innerHTML = skills.slice(0,5).map(s => `
      <div class="skill-match-item">
        <div class="skill-match-name">${escapeHtml(s.name)}</div>
        <div class="skill-match-bar"><div class="progress"><div class="progress-bar progress-primary" style="width:${s.level||60}%;"></div></div></div>
        <div class="skill-match-percent">${s.level||60}%</div>
      </div>
    `).join('');
  }
}

function renderProjects(projects) {
  const container = document.getElementById('projectsList');
  if (!container) return;
  if (projects.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:2rem;"><div class="empty-state-icon"><i class="fas fa-folder-open"></i></div><p>No projects added yet</p><button class="btn btn-sm btn-primary" onclick="document.getElementById('addProjectBtn').click()">Add Project</button></div>`;
    return;
  }
  container.innerHTML = projects.map(p => `
    <div class="card animate-fadeInUp" style="padding:1.25rem;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;">
        <h4 style="font-size:1rem;">${escapeHtml(p.name)}</h4>
        <div style="display:flex;gap:0.5rem;">
          ${p.github ? `<a href="${escapeHtml(p.github)}" target="_blank" class="btn btn-sm btn-ghost" style="padding:0.3rem 0.7rem;"><i class="fab fa-github"></i></a>` : ''}
          ${p.demo ? `<a href="${escapeHtml(p.demo)}" target="_blank" class="btn btn-sm btn-ghost" style="padding:0.3rem 0.7rem;"><i class="fas fa-external-link-alt"></i></a>` : ''}
          <button class="btn btn-sm btn-ghost" onclick="deleteProject('${p.id}')"><i class="fas fa-trash" style="color:var(--danger);"></i></button>
        </div>
      </div>
      <p style="font-size:0.85rem;margin:0.5rem 0;">${escapeHtml(p.description)}</p>
      ${p.technologies && p.technologies.length > 0 ? `
        <div class="skills-container">
          ${p.technologies.map(t => `<span class="skill-tag" style="font-size:0.72rem;">${escapeHtml(t)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

// ---- Modals ----
function initProfileModals() {
  document.getElementById('addExpBtn')?.addEventListener('click', () => openModal('addExpModal'));
  document.getElementById('closeExpModal')?.addEventListener('click', () => closeModal('addExpModal'));
  document.getElementById('cancelExpModal')?.addEventListener('click', () => closeModal('addExpModal'));
  document.getElementById('saveExpBtn')?.addEventListener('click', saveExperience);

  document.getElementById('addEduBtn')?.addEventListener('click', () => openModal('addEduModal'));
  document.getElementById('closeEduModal')?.addEventListener('click', () => closeModal('addEduModal'));
  document.getElementById('cancelEduModal')?.addEventListener('click', () => closeModal('addEduModal'));
  document.getElementById('saveEduBtn')?.addEventListener('click', saveEducation);

  document.getElementById('addSkillBtn')?.addEventListener('click', () => openModal('addSkillModal'));
  document.getElementById('closeSkillModal')?.addEventListener('click', () => closeModal('addSkillModal'));
  document.getElementById('cancelSkillModal')?.addEventListener('click', () => closeModal('addSkillModal'));
  document.getElementById('saveSkillBtn')?.addEventListener('click', saveSkill);

  document.getElementById('addProjectBtn')?.addEventListener('click', () => openModal('addProjectModal'));
  document.getElementById('closeProjectModal')?.addEventListener('click', () => closeModal('addProjectModal'));
  document.getElementById('cancelProjectModal')?.addEventListener('click', () => closeModal('addProjectModal'));
  document.getElementById('saveProjectBtn')?.addEventListener('click', saveProject);

  // Current job checkbox
  document.getElementById('expCurrentJob')?.addEventListener('change', (e) => {
    document.getElementById('expEnd').disabled = e.target.checked;
    if (e.target.checked) document.getElementById('expEnd').value = '';
  });
}

async function saveExperience() {
  const title = document.getElementById('expTitle').value.trim();
  const company = document.getElementById('expCompany').value.trim();
  if (!title || !company) { showToast('warning', 'Required', 'Job title and company are required'); return; }
  try {
    const data = {
      title, company,
      location: document.getElementById('expLocation').value.trim(),
      start_date: document.getElementById('expStart').value,
      end_date: document.getElementById('expCurrentJob').checked ? null : document.getElementById('expEnd').value,
      current: document.getElementById('expCurrentJob').checked,
      description: document.getElementById('expDescription').value.trim()
    };
    await API.addExperience(data);
    closeModal('addExpModal');
    showToast('success', 'Experience added!', '');
    loadProfileData();
  } catch (err) { showToast('error', 'Error', err.message); }
}

async function saveEducation() {
  const institution = document.getElementById('eduInstitution').value.trim();
  const field = document.getElementById('eduField').value.trim();
  if (!institution || !field) { showToast('warning', 'Required', 'Institution and field of study are required'); return; }
  try {
    await API.addEducation({
      institution,
      degree: document.getElementById('eduDegree').value,
      field,
      start_year: document.getElementById('eduStart').value,
      end_year: document.getElementById('eduEnd').value,
      gpa: document.getElementById('eduGpa').value.trim()
    });
    closeModal('addEduModal');
    showToast('success', 'Education added!', '');
    loadProfileData();
  } catch (err) { showToast('error', 'Error', err.message); }
}

async function saveSkill() {
  const name = document.getElementById('skillName').value.trim();
  if (!name) { showToast('warning', 'Required', 'Skill name is required'); return; }
  try {
    await API.addSkill({ name, level: parseInt(document.getElementById('skillLevel').value) });
    closeModal('addSkillModal');
    document.getElementById('skillName').value = '';
    showToast('success', 'Skill added!', '');
    loadProfileData();
  } catch (err) { showToast('error', 'Error', err.message); }
}

async function saveProject() {
  const name = document.getElementById('projectName').value.trim();
  if (!name) { showToast('warning', 'Required', 'Project name is required'); return; }
  const techStr = document.getElementById('projectTech').value;
  const techs = techStr ? techStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  try {
    await API.addProject({
      name,
      description: document.getElementById('projectDesc').value.trim(),
      github: document.getElementById('projectGithub').value.trim(),
      demo: document.getElementById('projectDemo').value.trim(),
      technologies: techs
    });
    closeModal('addProjectModal');
    showToast('success', 'Project added!', '');
    loadProfileData();
  } catch (err) { showToast('error', 'Error', err.message); }
}

async function savePreference(key, value) {
  try { await API.updateProfile({ [key]: value }); }
  catch {}
}

// Delete functions
window.deleteExperience = async (id) => {
  if (!confirm('Delete this experience?')) return;
  try { await API.deleteExperience(id); showToast('success', 'Deleted', ''); loadProfileData(); }
  catch (e) { showToast('error', 'Error', e.message); }
};
window.deleteEducation = async (id) => {
  if (!confirm('Delete this education?')) return;
  try { await API.deleteEducation(id); showToast('success', 'Deleted', ''); loadProfileData(); }
  catch (e) { showToast('error', 'Error', e.message); }
};
window.deleteSkillFromProfile = async (id) => {
  try { await API.deleteSkill(id); loadProfileData(); }
  catch (e) { showToast('error', 'Error', e.message); }
};
window.deleteProject = async (id) => {
  if (!confirm('Delete this project?')) return;
  try { await API.deleteProject(id); showToast('success', 'Deleted', ''); loadProfileData(); }
  catch (e) { showToast('error', 'Error', e.message); }
};

function formatMonthYear(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + '-01');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}
