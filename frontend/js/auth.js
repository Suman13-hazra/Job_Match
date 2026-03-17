/* =====================================================
   auth.js – Login & Register Logic
   ===================================================== */

// ---- Login Page ----
function initLoginPage() {
  const form = document.getElementById('loginForm');
  const togglePass = document.getElementById('toggleLoginPass');
  const passInput = document.getElementById('loginPassword');
  const forgotBtn = document.getElementById('forgotPassBtn');
  const closeForgot = document.getElementById('closeForgotModal');
  const cancelForgot = document.getElementById('cancelForgotBtn');
  const sendResetBtn = document.getElementById('sendResetBtn');
  const googleBtn = document.getElementById('googleSignInBtn');

  if (togglePass) {
    togglePass.addEventListener('click', () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      togglePass.classList.toggle('fa-eye', !isPass);
      togglePass.classList.toggle('fa-eye-slash', isPass);
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert('loginAlert');
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      let valid = true;

      // Validate email
      if (!email || !email.endsWith('@gmail.com')) {
        document.getElementById('loginEmailError').textContent = '⚠ Please enter a valid Gmail address (@gmail.com)';
        document.getElementById('loginEmail').classList.add('is-invalid');
        valid = false;
      } else {
        document.getElementById('loginEmail').classList.remove('is-invalid');
        document.getElementById('loginEmailError').textContent = '';
      }

      if (!password) {
        document.getElementById('loginPassError').textContent = '⚠ Password is required';
        document.getElementById('loginPassword').classList.add('is-invalid');
        valid = false;
      } else {
        document.getElementById('loginPassword').classList.remove('is-invalid');
        document.getElementById('loginPassError').textContent = '';
      }

      if (!valid) return;

      const btn = document.getElementById('loginBtn');
      btn.classList.add('btn-loading');
      btn.disabled = true;

      try {
        const result = await API.login(email, password);
        localStorage.setItem('jmp_token', result.token);
        localStorage.setItem('jmp_user', JSON.stringify(result.user));
        showToast('success', 'Welcome back!', `Signed in as ${result.user.first_name}`);
        setTimeout(() => window.location.href = 'dashboard.html', 800);
      } catch (err) {
        showAlert('loginAlert', 'danger', err.message || 'Invalid credentials. Please try again.');
        document.getElementById('loginPassword').classList.add('is-invalid');
      } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
      }
    });
  }

  if (forgotBtn) {
    forgotBtn.addEventListener('click', (e) => { e.preventDefault(); openModal('forgotPassModal'); });
  }
  if (closeForgot) closeForgot.addEventListener('click', () => closeModal('forgotPassModal'));
  if (cancelForgot) cancelForgot.addEventListener('click', () => closeModal('forgotPassModal'));
  if (sendResetBtn) {
    sendResetBtn.addEventListener('click', () => {
      const email = document.getElementById('resetEmail').value.trim();
      if (!email) { showToast('warning', 'Email required', 'Please enter your email address'); return; }
      showToast('success', 'Reset link sent!', 'Check your inbox for the reset link');
      closeModal('forgotPassModal');
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      showToast('info', 'Google Sign-in', 'Redirecting to Google authentication...');
      setTimeout(() => { window.location.href = 'http://localhost:5000/api/auth/google'; }, 1000);
    });
  }
}

// ---- Register Page ----
function initRegisterPage() {
  let currentStep = 1;
  let cvFile = null;

  const nextStep1 = document.getElementById('nextStep1Btn');
  const nextStep2 = document.getElementById('nextStep2Btn');
  const prevStep2 = document.getElementById('prevStep2Btn');
  const prevStep3 = document.getElementById('prevStep3Btn');
  const form = document.getElementById('registerForm');
  const toggleRegPass = document.getElementById('toggleRegPass');
  const toggleConfirmPass = document.getElementById('toggleConfirmPass');
  const regPassInput = document.getElementById('regPassword');
  const confirmPassInput = document.getElementById('confirmPassword');

  // Password toggle
  if (toggleRegPass) {
    toggleRegPass.addEventListener('click', () => {
      const isPass = regPassInput.type === 'password';
      regPassInput.type = isPass ? 'text' : 'password';
      toggleRegPass.classList.toggle('fa-eye', !isPass);
      toggleRegPass.classList.toggle('fa-eye-slash', isPass);
    });
  }
  if (toggleConfirmPass) {
    toggleConfirmPass.addEventListener('click', () => {
      const isPass = confirmPassInput.type === 'password';
      confirmPassInput.type = isPass ? 'text' : 'password';
      toggleConfirmPass.classList.toggle('fa-eye', !isPass);
      toggleConfirmPass.classList.toggle('fa-eye-slash', isPass);
    });
  }

  // Password strength checker
  if (regPassInput) {
    regPassInput.addEventListener('input', () => checkPasswordStrength(regPassInput.value));
  }

  // File drop zone
  initFileDropZone('cvDropZone', 'cvFile', (file) => {
    if (file.size > 10 * 1024 * 1024) { showToast('error', 'File too large', 'Max file size is 10MB'); return; }
    cvFile = file;
    document.getElementById('cvDropZone').classList.add('file-selected');
    document.getElementById('cvDropZone').querySelector('.file-upload-icon').innerHTML = '<i class="fas fa-check-circle" style="color:var(--success);"></i>';
    const infoEl = document.getElementById('cvFileInfo');
    infoEl.style.display = 'flex';
    document.getElementById('cvFileName').textContent = file.name;
    document.getElementById('cvFileSize').textContent = formatBytes(file.size);
    document.getElementById('cvError').textContent = '';
  });

  const removeCvBtn = document.getElementById('removeCvBtn');
  if (removeCvBtn) {
    removeCvBtn.addEventListener('click', () => {
      cvFile = null;
      document.getElementById('cvDropZone').classList.remove('file-selected');
      document.getElementById('cvDropZone').querySelector('.file-upload-icon').innerHTML = '<i class="fas fa-cloud-upload-alt"></i>';
      document.getElementById('cvFileInfo').style.display = 'none';
      document.getElementById('cvFile').value = '';
    });
  }

  function goToStep(n) {
    document.getElementById(`step${currentStep}`).style.display = 'none';
    currentStep = n;
    document.getElementById(`step${currentStep}`).style.display = 'block';
    document.getElementById(`step${currentStep}`).style.animation = 'fadeInRight 0.3s ease';
    // Update step indicator
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
      dot.style.background = i < n ? 'var(--primary)' : 'var(--border)';
    });
  }

  if (nextStep1) {
    nextStep1.addEventListener('click', () => {
      if (!validateStep1()) return;
      goToStep(2);
    });
  }
  if (nextStep2) {
    nextStep2.addEventListener('click', () => {
      if (!validateStep2()) return;
      goToStep(3);
    });
  }
  if (prevStep2) prevStep2.addEventListener('click', () => goToStep(1));
  if (prevStep3) prevStep3.addEventListener('click', () => goToStep(2));

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateStep3()) return;
      const btn = document.getElementById('registerBtn');
      btn.classList.add('btn-loading');
      btn.disabled = true;
      clearAlert('registerAlert');

      const formData = new FormData();
      formData.append('first_name', document.getElementById('firstName').value.trim());
      formData.append('last_name', document.getElementById('lastName').value.trim());
      formData.append('email', document.getElementById('regEmail').value.trim());
      formData.append('phone', document.getElementById('phone').value.trim());
      formData.append('password', document.getElementById('regPassword').value);
      formData.append('domain', document.getElementById('domain').value);
      if (cvFile) formData.append('cv', cvFile);

      try {
        const result = await API.register(formData);
        localStorage.setItem('jmp_token', result.token);
        localStorage.setItem('jmp_user', JSON.stringify(result.user));
        showToast('success', 'Account created!', 'Welcome to JobMatch Pro 🎉');
        setTimeout(() => window.location.href = 'dashboard.html', 1000);
      } catch (err) {
        showAlert('registerAlert', 'danger', err.message || 'Registration failed. Please try again.');
      } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
      }
    });
  }

  function validateStep1() {
    let valid = true;
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();

    if (!firstName) {
      document.getElementById('firstNameError').textContent = '⚠ First name is required';
      document.getElementById('firstName').classList.add('is-invalid');
      valid = false;
    } else {
      document.getElementById('firstNameError').textContent = '';
      document.getElementById('firstName').classList.remove('is-invalid');
    }
    if (!lastName) {
      document.getElementById('lastNameError').textContent = '⚠ Last name is required';
      document.getElementById('lastName').classList.add('is-invalid');
      valid = false;
    } else {
      document.getElementById('lastNameError').textContent = '';
      document.getElementById('lastName').classList.remove('is-invalid');
    }
    if (!email || !email.endsWith('@gmail.com')) {
      document.getElementById('regEmailError').textContent = '⚠ Must be a valid Gmail address (@gmail.com)';
      document.getElementById('regEmail').classList.add('is-invalid');
      valid = false;
    } else {
      document.getElementById('regEmailError').textContent = '';
      document.getElementById('regEmail').classList.remove('is-invalid');
    }
    return valid;
  }

  function validateStep2() {
    let valid = true;
    const pass = document.getElementById('regPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const { strong } = getPassStrength(pass);

    if (!pass || !strong) {
      document.getElementById('regPassError').textContent = '⚠ Password must meet all requirements';
      document.getElementById('regPassword').classList.add('is-invalid');
      valid = false;
    } else {
      document.getElementById('regPassError').textContent = '';
      document.getElementById('regPassword').classList.remove('is-invalid');
    }
    if (pass !== confirm) {
      document.getElementById('confirmPassError').textContent = '⚠ Passwords do not match';
      document.getElementById('confirmPassword').classList.add('is-invalid');
      valid = false;
    } else {
      document.getElementById('confirmPassError').textContent = '';
      document.getElementById('confirmPassword').classList.remove('is-invalid');
    }
    return valid;
  }

  function validateStep3() {
    let valid = true;
    if (!cvFile) {
      document.getElementById('cvError').textContent = '⚠ Please upload your CV';
      valid = false;
    }
    if (!document.getElementById('domain').value) {
      document.getElementById('domainError').textContent = '⚠ Please select your domain';
      document.getElementById('domain').classList.add('is-invalid');
      valid = false;
    } else {
      document.getElementById('domain').classList.remove('is-invalid');
      document.getElementById('domainError').textContent = '';
    }
    if (!document.getElementById('agreeTerms').checked) {
      document.getElementById('termsError').textContent = '⚠ You must agree to the Terms of Service';
      valid = false;
    } else {
      document.getElementById('termsError').textContent = '';
    }
    return valid;
  }
}

// ---- Password Strength ----
function getPassStrength(password) {
  const checks = {
    len: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    num: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
  const score = Object.values(checks).filter(Boolean).length;
  const strong = score === 5;
  return { checks, score, strong };
}

function checkPasswordStrength(password) {
  const { checks, score, strong } = getPassStrength(password);

  // Update requirement indicators
  const reqMap = { len: 'req-len', upper: 'req-upper', lower: 'req-lower', num: 'req-num', special: 'req-special' };
  Object.entries(reqMap).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const icon = el.querySelector('i');
    if (checks[key]) {
      icon.className = 'fas fa-check-circle';
      icon.style.color = 'var(--success)';
      el.style.color = 'var(--success)';
    } else {
      icon.className = 'fas fa-circle-xmark';
      icon.style.color = 'var(--danger)';
      el.style.color = 'var(--text-muted)';
    }
  });

  // Strength bar
  const meter = document.getElementById('strengthMeter');
  const fill = document.getElementById('strengthFill');
  const text = document.getElementById('strengthText');
  if (!meter || !fill || !text) return;

  meter.className = 'password-strength';
  if (!password) {
    fill.style.width = '0';
    text.textContent = 'Enter a password';
    return;
  }
  if (score <= 2) {
    meter.classList.add('strength-weak');
    text.textContent = '⚠ Weak – Add more variety';
    text.style.color = 'var(--danger)';
  } else if (score <= 4) {
    meter.classList.add('strength-medium');
    text.textContent = '◎ Medium – Almost there!';
    text.style.color = 'var(--warning)';
  } else {
    meter.classList.add('strength-strong');
    text.textContent = '✓ Strong password!';
    text.style.color = 'var(--success)';
  }
}

// ---- Utility ----
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
