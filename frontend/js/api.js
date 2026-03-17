/* =====================================================
   api.js – Centralized API Client
   ===================================================== */

const API_BASE = 'http://localhost:5000/api';

const API = {
  // ---- Auth ----
  async register(formData) {
    return this._request('POST', '/auth/register', formData, true);
  },
  async login(email, password) {
    return this._request('POST', '/auth/login', { email, password });
  },
  async getMe() {
    return this._request('GET', '/auth/me');
  },
  async updatePassword(oldPass, newPass) {
    return this._request('PUT', '/auth/password', { old_password: oldPass, new_password: newPass });
  },

  // ---- CV ----
  async uploadCv(formData) {
    return this._request('POST', '/cv/upload', formData, true);
  },
  async getCvAnalysis() {
    return this._request('GET', '/cv/analysis');
  },

  // ---- Jobs ----
  async getJobs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._request('GET', `/jobs?${qs}`);
  },
  async getJobById(id) {
    return this._request('GET', `/jobs/${id}`);
  },
  async searchJobs(query, filters = {}) {
    return this._request('POST', '/jobs/search', { query, ...filters });
  },

  // ---- Recommendations ----
  async getRecommendations() {
    return this._request('GET', '/recommendations');
  },
  async analyzeJobMatch(jobId) {
    return this._request('GET', `/jobs/${jobId}/match`);
  },

  // ---- Applications ----
  async applyJob(jobId, coverLetter = '') {
    return this._request('POST', '/applications', { job_id: jobId, cover_letter: coverLetter });
  },
  async getApplications(status = '') {
    const qs = status ? `?status=${status}` : '';
    return this._request('GET', `/applications${qs}`);
  },
  async withdrawApplication(appId) {
    return this._request('DELETE', `/applications/${appId}`);
  },

  // ---- Profile ----
  async getProfile() {
    return this._request('GET', '/profile');
  },
  async updateProfile(data) {
    return this._request('PUT', '/profile', data);
  },
  async addExperience(data) {
    return this._request('POST', '/profile/experience', data);
  },
  async deleteExperience(id) {
    return this._request('DELETE', `/profile/experience/${id}`);
  },
  async addEducation(data) {
    return this._request('POST', '/profile/education', data);
  },
  async deleteEducation(id) {
    return this._request('DELETE', `/profile/education/${id}`);
  },
  async addSkill(data) {
    return this._request('POST', '/profile/skills', data);
  },
  async deleteSkill(id) {
    return this._request('DELETE', `/profile/skills/${id}`);
  },
  async addProject(data) {
    return this._request('POST', '/profile/projects', data);
  },
  async deleteProject(id) {
    return this._request('DELETE', `/profile/projects/${id}`);
  },

  // ---- Saved Jobs ----
  async getSavedJobs() {
    return this._request('GET', '/saved-jobs');
  },
  async saveJob(jobId) {
    return this._request('POST', '/saved-jobs', { job_id: jobId });
  },
  async unsaveJob(jobId) {
    return this._request('DELETE', `/saved-jobs/${jobId}`);
  },

  // ---- Stats ----
  async getDashboardStats() {
    return this._request('GET', '/stats/dashboard');
  },

  // ---- Core request handler ----
  async _request(method, path, data = null, isFormData = false) {
    const token = localStorage.getItem('jmp_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData && data) headers['Content-Type'] = 'application/json';

    const options = { method, headers };
    if (data) {
      options.body = isFormData ? data : JSON.stringify(data);
    }

    try {
      const response = await fetch(`${API_BASE}${path}`, options);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || json.message || 'Request failed');
      }
      return json;
    } catch (err) {
      throw err;
    }
  }
};
