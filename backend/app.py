# =====================================================
# app.py – JobMatch Pro Flask Backend
# =====================================================

import os
import json
import uuid
import re
import hashlib
import hmac
import base64
import datetime
from functools import wraps
from flask import Flask, request, jsonify, g, send_from_directory
from flask_cors import CORS
from database import init_db, get_db

# NOTE: This backend uses plain SQLite queries (no ORM models).
from cv_analyzer import CVAnalyzer
from job_recommender import JobRecommender
from config import Config

app = Flask(__name__, static_folder='../frontend', static_url_path='')
app.config.from_object(Config)
# We use Bearer tokens (Authorization header), not cookies, so credentials are not required.
# Allow cross-origin requests for local development (including opening frontend as a file).
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=False)

# Initialize DB
init_db(app)

cv_analyzer = CVAnalyzer()
recommender = JobRecommender()

# =====================================================
# AUTH HELPERS
# =====================================================

def generate_token(user_id):
    """Simple JWT-like token generation"""
    payload = json.dumps({
        'user_id': str(user_id),
        'exp': (datetime.datetime.utcnow() + datetime.timedelta(days=30)).isoformat()
    })
    encoded = base64.b64encode(payload.encode()).decode()
    signature = hmac.new(app.config['SECRET_KEY'].encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"

def verify_token(token):
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        encoded, signature = parts
        expected = hmac.new(app.config['SECRET_KEY'].encode(), encoded.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return None
        payload = json.loads(base64.b64decode(encoded).decode())
        exp = datetime.datetime.fromisoformat(payload['exp'])
        if exp < datetime.datetime.utcnow():
            return None
        return payload
    except Exception:
        return None

def hash_password(password):
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
    return base64.b64encode(salt + key).decode()

def verify_password(password, stored):
    try:
        stored_bytes = base64.b64decode(stored)
        salt = stored_bytes[:16]
        stored_key = stored_bytes[16:]
        key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
        return hmac.compare_digest(key, stored_key)
    except Exception:
        return False

def validate_password(password):
    """Check password meets requirements"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain an uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain a lowercase letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain a number"
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>/?]', password):
        return False, "Password must contain a special character (!@#$%...)"
    return True, "OK"

def optional_auth(f):
    """If token is present, set g.user_id; otherwise allow as guest."""
    @wraps(f)
    def decorated(*args, **kwargs):
        g.user_id = None
        auth = request.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            token = auth[7:]
            payload = verify_token(token)
            if payload:
                g.user_id = payload.get('user_id')
        return f(*args, **kwargs)
    return decorated


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        token = auth[7:]
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        g.user_id = payload['user_id']
        return f(*args, **kwargs)
    return decorated

# =====================================================
# AUTHENTICATION ROUTES
# =====================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        first_name = request.form.get('first_name', '').strip()
        last_name = request.form.get('last_name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        domain = request.form.get('domain', '')
        phone = request.form.get('phone', '').strip()

        # Validate
        if not all([first_name, last_name, email, password]):
            return jsonify({'error': 'All fields are required'}), 400
        if not email.endswith('@gmail.com'):
            return jsonify({'error': 'Must be a valid Gmail address'}), 400

        valid, msg = validate_password(password)
        if not valid:
            return jsonify({'error': msg}), 400

        db = get_db()
        # Check existing
        if db.execute('SELECT id FROM users WHERE email=?', (email,)).fetchone():
            return jsonify({'error': 'Email already registered'}), 409

        user_id = str(uuid.uuid4())
        hashed = hash_password(password)

        db.execute('''INSERT INTO users (id, first_name, last_name, email, phone, password, domain, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                   (user_id, first_name, last_name, email, phone, hashed, domain,
                    datetime.datetime.utcnow().isoformat()))

        # Create empty profile
        db.execute('''INSERT INTO profiles (id, user_id, created_at) VALUES (?, ?, ?)''',
                   (str(uuid.uuid4()), user_id, datetime.datetime.utcnow().isoformat()))

        # Handle CV upload
        cv_file = request.files.get('cv')
        cv_filename = None
        analysis = {}
        if cv_file:
            allowed = {'.pdf', '.docx', '.txt'}
            ext = os.path.splitext(cv_file.filename)[1].lower()
            if ext not in allowed:
                return jsonify({'error': f'CV file type not allowed. Use: {", ".join(sorted(allowed))}'}), 400

            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            cv_filename = f"{user_id}_{cv_file.filename}"
            cv_path = os.path.join(app.config['UPLOAD_FOLDER'], cv_filename)
            cv_file.save(cv_path)

            # Analyze CV
            analysis = cv_analyzer.analyze(cv_path)
            if analysis.get('raw_text_length', 0) < 50:
                analysis['warning'] = (
                    'We could not extract enough text from your CV. '
                    'If this is a scanned PDF (image), please upload a text-based PDF or a DOCX/TXT.'
                )

            # Store analysis (Upsert)
            db.execute('''
                INSERT INTO cv_analyses (id, user_id, filename, analysis, uploaded_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    filename=excluded.filename,
                    analysis=excluded.analysis,
                    uploaded_at=excluded.uploaded_at
            ''', (str(uuid.uuid4()), user_id, cv_filename, json.dumps(analysis), datetime.datetime.utcnow().isoformat()))

        db.commit()

        token = generate_token(user_id)
        return jsonify({
            'token': token,
            'user': {'id': user_id, 'first_name': first_name, 'last_name': last_name, 'email': email, 'domain': domain}
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        if not email.endswith('@gmail.com'):
            return jsonify({'error': 'Must be a valid Gmail address'}), 400

        db = get_db()
        user = db.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
        if not user or not verify_password(password, user['password']):
            return jsonify({'error': 'Invalid email or password'}), 401

        token = generate_token(user['id'])
        return jsonify({
            'token': token,
            'user': {'id': user['id'], 'first_name': user['first_name'], 'last_name': user['last_name'], 'email': user['email'], 'domain': user['domain']}
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_me():
    db = get_db()
    user = db.execute('SELECT id, first_name, last_name, email, phone, domain, created_at FROM users WHERE id=?', (g.user_id,)).fetchone()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': dict(user)})


@app.route('/api/auth/password', methods=['PUT'])
@require_auth
def update_password():
    data = request.get_json() or {}
    old_pass = data.get('old_password', '')
    new_pass = data.get('new_password', '')
    db = get_db()
    user = db.execute('SELECT password FROM users WHERE id=?', (g.user_id,)).fetchone()
    if not user or not verify_password(old_pass, user['password']):
        return jsonify({'error': 'Current password is incorrect'}), 401
    valid, msg = validate_password(new_pass)
    if not valid:
        return jsonify({'error': msg}), 400
    db.execute('UPDATE users SET password=? WHERE id=?', (hash_password(new_pass), g.user_id))
    db.commit()
    return jsonify({'message': 'Password updated successfully'})

# =====================================================
# CV ROUTES
# =====================================================

@app.route('/api/cv/upload', methods=['POST'])
@require_auth
def upload_cv():
    cv_file = request.files.get('cv')
    if not cv_file:
        return jsonify({'error': 'No CV file provided'}), 400

    # Some browsers send empty filename; guard it.
    if not cv_file.filename:
        return jsonify({'error': 'Invalid file (missing filename)'}), 400

    allowed = {'.pdf', '.docx', '.txt'}
    ext = os.path.splitext(cv_file.filename)[1].lower()
    if ext not in allowed:
        return jsonify({'error': f'File type not allowed. Use: {", ".join(sorted(allowed))}'}), 400

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    cv_filename = f"{g.user_id}_{cv_file.filename}"
    cv_path = os.path.join(app.config['UPLOAD_FOLDER'], cv_filename)
    cv_file.save(cv_path)

    analysis = cv_analyzer.analyze(cv_path)
    # Add a helpful warning if PDF is scanned or unreadable
    if analysis.get('raw_text_length', 0) < 50:
        analysis['warning'] = (
            'We could not extract enough text from your CV. '
            'If this is a scanned PDF (image), please upload a text-based PDF or a DOCX/TXT.'
        )

    db = get_db()
    # Upsert on user_id (unique)
    db.execute('''
        INSERT INTO cv_analyses (id, user_id, filename, analysis, uploaded_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            filename=excluded.filename,
            analysis=excluded.analysis,
            uploaded_at=excluded.uploaded_at
    ''', (str(uuid.uuid4()), g.user_id, cv_filename, json.dumps(analysis), datetime.datetime.utcnow().isoformat()))
    db.commit()

    return jsonify({'message': 'CV uploaded and analyzed', 'analysis': analysis})


@app.route('/api/cv/analysis', methods=['GET'])
@require_auth
def get_cv_analysis():
    db = get_db()
    row = db.execute('SELECT * FROM cv_analyses WHERE user_id=?', (g.user_id,)).fetchone()
    if not row:
        return jsonify({'error': 'No CV analysis found'}), 404
    analysis = json.loads(row['analysis']) if row['analysis'] else {}
    return jsonify({'analysis': analysis, 'cv_filename': row['filename'], 'cv_uploaded_at': row['uploaded_at']})

# =====================================================
# JOBS ROUTES
# =====================================================

@app.route('/api/jobs', methods=['GET'])
@optional_auth
def get_jobs():
    db = get_db()
    q = request.args.get('q', '').strip()
    location = request.args.get('location', '').strip()
    domain = request.args.get('domain', '').strip()
    job_type = request.args.get('job_type', '').strip()
    experience = request.args.get('experience', '').strip()

    query = 'SELECT * FROM jobs WHERE 1=1'
    params = []
    if q:
        query += ' AND (title LIKE ? OR company_name LIKE ? OR description LIKE ? OR skills LIKE ?)'
        params.extend([f'%{q}%', f'%{q}%', f'%{q}%', f'%{q}%'])
    if location:
        query += ' AND location LIKE ?'
        params.append(f'%{location}%')
    if domain:
        query += ' AND domain = ?'
        params.append(domain)
    if job_type:
        query += ' AND job_type LIKE ?'
        params.append(f'%{job_type}%')
    if experience:
        query += ' AND experience_level = ?'
        params.append(experience)
    query += ' ORDER BY created_at DESC LIMIT 100'

    jobs_raw = db.execute(query, params).fetchall()
    # If logged in, compute match score from user's CV skills
    user_skills = []
    saved = set()
    applied = set()
    if g.user_id:
        cv_row = db.execute('SELECT analysis FROM cv_analyses WHERE user_id=?', (g.user_id,)).fetchone()
        if cv_row:
            analysis = json.loads(cv_row['analysis'])
            user_skills = analysis.get('skills', [])
        saved = {r['job_id'] for r in db.execute('SELECT job_id FROM saved_jobs WHERE user_id=?', (g.user_id,)).fetchall()}
        applied = {r['job_id'] for r in db.execute('SELECT job_id FROM applications WHERE user_id=?', (g.user_id,)).fetchall()}

    jobs = []
    for j in jobs_raw:
        job = dict(j)
        job['skills'] = json.loads(job['skills']) if job.get('skills') else []
        if user_skills:
            match_data = recommender.calculate_match(user_skills, job['skills'])
            job['match_score'] = match_data['score']
            job['match_skills'] = match_data['matching']
            job['missing_skills'] = match_data['missing']
        else:
            job['match_score'] = 0
            job['match_skills'] = []
            job['missing_skills'] = []
        job['is_saved'] = j['id'] in saved
        job['is_applied'] = j['id'] in applied
        jobs.append(job)

    return jsonify({'jobs': jobs, 'total': len(jobs)})


@app.route('/api/jobs/<job_id>', methods=['GET'])
@optional_auth
def get_job(job_id):
    db = get_db()
    job_raw = db.execute('SELECT * FROM jobs WHERE id=?', (job_id,)).fetchone()
    if not job_raw:
        return jsonify({'error': 'Job not found'}), 404
    job = dict(job_raw)
    job['skills'] = json.loads(job['skills']) if job.get('skills') else []
    # Calculate match only if user is logged in & has CV
    user_skills = []
    if g.user_id:
        cv_row = db.execute('SELECT analysis FROM cv_analyses WHERE user_id=?', (g.user_id,)).fetchone()
        if cv_row:
            analysis = json.loads(cv_row['analysis'])
            user_skills = analysis.get('skills', [])
    if user_skills:
        match_data = recommender.calculate_match(user_skills, job['skills'])
        job['match_score'] = match_data['score']
        job['match_skills'] = match_data['matching']
        job['missing_skills'] = match_data['missing']
    else:
        job['match_score'] = 0
        job['match_skills'] = []
        job['missing_skills'] = []
    return jsonify({'job': job})


@app.route('/api/jobs/<job_id>/match', methods=['GET'])
@require_auth
def analyze_job_match(job_id):
    db = get_db()
    job_raw = db.execute('SELECT * FROM jobs WHERE id=?', (job_id,)).fetchone()
    if not job_raw:
        return jsonify({'error': 'Job not found'}), 404
    job = dict(job_raw)
    job['skills'] = json.loads(job['skills']) if job.get('skills') else []
    cv_row = db.execute('SELECT analysis FROM cv_analyses WHERE user_id=?', (g.user_id,)).fetchone()
    if not cv_row:
        return jsonify({'error': 'Please upload your CV first'}), 400
    analysis = json.loads(cv_row['analysis'])
    user_skills = analysis.get('skills', [])
    match_data = recommender.calculate_match(user_skills, job['skills'])
    score = match_data['score']
    if score >= 80:
        summary = "Excellent match! Your skills align very well with this position."
        recs = "You're a strong candidate. Apply with confidence!"
    elif score >= 60:
        summary = "Good match! You have most of the required skills."
        recs = f"Consider learning {', '.join(match_data['missing'][:2])} to strengthen your application." if match_data['missing'] else "Apply now to increase your chances."
    elif score >= 40:
        summary = "Fair match. You have some relevant skills but gaps exist."
        recs = f"Focus on learning: {', '.join(match_data['missing'][:3])}." if match_data['missing'] else "Highlight your transferable skills."
    else:
        summary = "This role requires skills you're still developing."
        recs = f"Key skills to learn: {', '.join(match_data['missing'][:4])}." if match_data['missing'] else "Consider roles that better match your current skill set."
    return jsonify({'match': {'score': score, 'matching_skills': match_data['matching'], 'missing_skills': match_data['missing'], 'summary': summary, 'recommendations': recs}})

# =====================================================
# RECOMMENDATIONS ROUTES
# =====================================================

@app.route('/api/recommendations', methods=['GET'])
@require_auth
def get_recommendations():
    db = get_db()
    cv_row = db.execute('SELECT analysis FROM cv_analyses WHERE user_id=?', (g.user_id,)).fetchone()
    if not cv_row:
        return jsonify({'recommendations': []})
    analysis = json.loads(cv_row['analysis'])
    user_skills = analysis.get('skills', [])
    user = db.execute('SELECT domain FROM users WHERE id=?', (g.user_id,)).fetchone()
    user_domain = user['domain'] if user else ''
    jobs_raw = db.execute('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 200').fetchall()
    saved = {r['job_id'] for r in db.execute('SELECT job_id FROM saved_jobs WHERE user_id=?', (g.user_id,)).fetchall()}
    applied = {r['job_id'] for r in db.execute('SELECT job_id FROM applications WHERE user_id=?', (g.user_id,)).fetchall()}
    recommendations = []
    for j in jobs_raw:
        job = dict(j)
        job['skills'] = json.loads(job['skills']) if job.get('skills') else []
        match_data = recommender.calculate_match(user_skills, job['skills'])
        score = match_data['score']
        # Domain bonus
        if user_domain and job.get('domain') == user_domain:
            score = min(100, score + 10)
        if score >= 30:
            job['match_score'] = score
            job['match_skills'] = match_data['matching']
            job['missing_skills'] = match_data['missing']
            job['is_saved'] = j['id'] in saved
            job['is_applied'] = j['id'] in applied
            recommendations.append(job)
    recommendations.sort(key=lambda x: x['match_score'], reverse=True)
    return jsonify({'recommendations': recommendations[:50]})

# =====================================================
# APPLICATIONS ROUTES
# =====================================================

@app.route('/api/applications', methods=['POST'])
@require_auth
def apply_job():
    data = request.get_json() or {}
    job_id = data.get('job_id')
    cover_letter = data.get('cover_letter', '')
    if not job_id:
        return jsonify({'error': 'Job ID required'}), 400
    db = get_db()
    if not db.execute('SELECT id FROM jobs WHERE id=?', (job_id,)).fetchone():
        return jsonify({'error': 'Job not found'}), 404
    if db.execute('SELECT id FROM applications WHERE user_id=? AND job_id=?', (g.user_id, job_id)).fetchone():
        return jsonify({'error': 'Already applied to this job'}), 409
    job = db.execute('SELECT title, company_name, domain FROM jobs WHERE id=?', (job_id,)).fetchone()
    cv_row = db.execute('SELECT analysis FROM cv_analyses WHERE user_id=?', (g.user_id,)).fetchone()
    match_score = 0
    if cv_row:
        analysis = json.loads(cv_row['analysis'])
        job_data = db.execute('SELECT skills FROM jobs WHERE id=?', (job_id,)).fetchone()
        job_skills = json.loads(job_data['skills']) if job_data and job_data['skills'] else []
        match_data = recommender.calculate_match(analysis.get('skills',[]), job_skills)
        match_score = match_data['score']
    app_id = str(uuid.uuid4())
    db.execute('''INSERT INTO applications (id, user_id, job_id, job_title, company_name, domain, status, match_score, cover_letter, applied_at)
                  VALUES (?, ?, ?, ?, ?, ?, 'applied', ?, ?, ?)''',
               (app_id, g.user_id, job_id, job['title'] if job else '', job['company_name'] if job else '',
                job['domain'] if job else '', match_score, cover_letter, datetime.datetime.utcnow().isoformat()))
    db.commit()
    return jsonify({'message': 'Application submitted', 'application_id': app_id}), 201


@app.route('/api/applications', methods=['GET'])
@require_auth
def get_applications():
    db = get_db()
    status = request.args.get('status', '')
    q = 'SELECT * FROM applications WHERE user_id=?'
    p = [g.user_id]
    if status:
        q += ' AND status=?'
        p.append(status)
    q += ' ORDER BY applied_at DESC'
    apps = [dict(a) for a in db.execute(q, p).fetchall()]
    return jsonify({'applications': apps})


@app.route('/api/applications/<app_id>', methods=['DELETE'])
@require_auth
def withdraw_application(app_id):
    db = get_db()
    app_row = db.execute('SELECT id FROM applications WHERE id=? AND user_id=?', (app_id, g.user_id)).fetchone()
    if not app_row:
        return jsonify({'error': 'Application not found'}), 404
    db.execute("UPDATE applications SET status='withdrawn' WHERE id=?", (app_id,))
    db.commit()
    return jsonify({'message': 'Application withdrawn'})

# =====================================================
# PROFILE ROUTES
# =====================================================

@app.route('/api/profile', methods=['GET'])
@require_auth
def get_profile():
    db = get_db()
    profile = db.execute('SELECT * FROM profiles WHERE user_id=?', (g.user_id,)).fetchone()
    if not profile:
        return jsonify({'profile': {}})
    p = dict(profile)
    p['experiences'] = [dict(e) for e in db.execute('SELECT * FROM experiences WHERE user_id=? ORDER BY start_date DESC', (g.user_id,)).fetchall()]
    p['educations'] = [dict(e) for e in db.execute('SELECT * FROM educations WHERE user_id=? ORDER BY start_year DESC', (g.user_id,)).fetchall()]
    p['skills'] = [dict(s) for s in db.execute('SELECT * FROM skills WHERE user_id=?', (g.user_id,)).fetchall()]
    p['projects'] = [dict(pr) for pr in db.execute('SELECT * FROM projects WHERE user_id=?', (g.user_id,)).fetchall()]
    apps = db.execute('SELECT COUNT(*) as cnt FROM applications WHERE user_id=?', (g.user_id,)).fetchone()
    p['applications_count'] = apps['cnt'] if apps else 0
    scores = db.execute('SELECT AVG(match_score) as avg FROM applications WHERE user_id=?', (g.user_id,)).fetchone()
    p['avg_match_score'] = round(scores['avg'] or 0) if scores else 0
    user = db.execute('SELECT first_name, last_name, email FROM users WHERE id=?', (g.user_id,)).fetchone()
    if user:
        p['first_name'] = p.get('first_name') or user['first_name']
        p['last_name'] = p.get('last_name') or user['last_name']
    return jsonify({'profile': p})


@app.route('/api/profile', methods=['PUT'])
@require_auth
def update_profile():
    data = request.get_json() or {}
    db = get_db()
    allowed = ['first_name','last_name','title','location','bio','linkedin','github','website','open_to_work','expected_salary','job_preferences']
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({'error': 'No valid fields to update'}), 400
    profile = db.execute('SELECT id FROM profiles WHERE user_id=?', (g.user_id,)).fetchone()
    if not profile:
        pid = str(uuid.uuid4())
        db.execute('INSERT INTO profiles (id, user_id) VALUES (?, ?)', (pid, g.user_id))
    sets = ', '.join([f'{k}=?' for k in updates])
    db.execute(f'UPDATE profiles SET {sets} WHERE user_id=?', list(updates.values()) + [g.user_id])
    if 'first_name' in updates or 'last_name' in updates:
        uup = {}
        if 'first_name' in updates: uup['first_name'] = updates['first_name']
        if 'last_name' in updates: uup['last_name'] = updates['last_name']
        uset = ', '.join([f'{k}=?' for k in uup])
        db.execute(f'UPDATE users SET {uset} WHERE id=?', list(uup.values()) + [g.user_id])
    db.commit()
    return jsonify({'message': 'Profile updated'})


@app.route('/api/profile/experience', methods=['POST'])
@require_auth
def add_experience():
    data = request.get_json() or {}
    if not data.get('title') or not data.get('company'):
        return jsonify({'error': 'Title and company are required'}), 400
    exp_id = str(uuid.uuid4())
    db = get_db()
    db.execute('''INSERT INTO experiences (id, user_id, title, company, location, start_date, end_date, current, description)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
               (exp_id, g.user_id, data['title'], data['company'], data.get('location',''),
                data.get('start_date',''), data.get('end_date',''), 1 if data.get('current') else 0, data.get('description','')))
    db.commit()
    return jsonify({'id': exp_id, 'message': 'Experience added'}), 201


@app.route('/api/profile/experience/<exp_id>', methods=['DELETE'])
@require_auth
def delete_experience(exp_id):
    db = get_db()
    db.execute('DELETE FROM experiences WHERE id=? AND user_id=?', (exp_id, g.user_id))
    db.commit()
    return jsonify({'message': 'Deleted'})


@app.route('/api/profile/education', methods=['POST'])
@require_auth
def add_education():
    data = request.get_json() or {}
    if not data.get('institution') or not data.get('field'):
        return jsonify({'error': 'Institution and field are required'}), 400
    edu_id = str(uuid.uuid4())
    db = get_db()
    db.execute('''INSERT INTO educations (id, user_id, institution, degree, field, start_year, end_year, gpa)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
               (edu_id, g.user_id, data['institution'], data.get('degree','Bachelor\'s'), data['field'],
                data.get('start_year',''), data.get('end_year',''), data.get('gpa','')))
    db.commit()
    return jsonify({'id': edu_id, 'message': 'Education added'}), 201


@app.route('/api/profile/education/<edu_id>', methods=['DELETE'])
@require_auth
def delete_education(edu_id):
    db = get_db()
    db.execute('DELETE FROM educations WHERE id=? AND user_id=?', (edu_id, g.user_id))
    db.commit()
    return jsonify({'message': 'Deleted'})


@app.route('/api/profile/skills', methods=['POST'])
@require_auth
def add_skill():
    data = request.get_json() or {}
    if not data.get('name'):
        return jsonify({'error': 'Skill name required'}), 400
    skill_id = str(uuid.uuid4())
    db = get_db()
    db.execute('INSERT INTO skills (id, user_id, name, level) VALUES (?, ?, ?, ?)',
               (skill_id, g.user_id, data['name'], data.get('level', 60)))
    db.commit()
    return jsonify({'id': skill_id, 'message': 'Skill added'}), 201


@app.route('/api/profile/skills/<skill_id>', methods=['DELETE'])
@require_auth
def delete_skill(skill_id):
    db = get_db()
    db.execute('DELETE FROM skills WHERE id=? AND user_id=?', (skill_id, g.user_id))
    db.commit()
    return jsonify({'message': 'Deleted'})


@app.route('/api/profile/projects', methods=['POST'])
@require_auth
def add_project():
    data = request.get_json() or {}
    if not data.get('name'):
        return jsonify({'error': 'Project name required'}), 400
    proj_id = str(uuid.uuid4())
    db = get_db()
    db.execute('''INSERT INTO projects (id, user_id, name, description, github, demo, technologies)
                  VALUES (?, ?, ?, ?, ?, ?, ?)''',
               (proj_id, g.user_id, data['name'], data.get('description',''),
                data.get('github',''), data.get('demo',''), json.dumps(data.get('technologies',[]))))
    db.commit()
    return jsonify({'id': proj_id, 'message': 'Project added'}), 201


@app.route('/api/profile/projects/<proj_id>', methods=['DELETE'])
@require_auth
def delete_project(proj_id):
    db = get_db()
    db.execute('DELETE FROM projects WHERE id=? AND user_id=?', (proj_id, g.user_id))
    db.commit()
    return jsonify({'message': 'Deleted'})

# =====================================================
# SAVED JOBS
# =====================================================

@app.route('/api/saved-jobs', methods=['GET'])
@require_auth
def get_saved_jobs():
    db = get_db()
    saved = db.execute('''SELECT j.*, sj.saved_at FROM saved_jobs sj
                          JOIN jobs j ON sj.job_id = j.id
                          WHERE sj.user_id=? ORDER BY sj.saved_at DESC''', (g.user_id,)).fetchall()
    jobs = []
    for j in saved:
        job = dict(j)
        job['skills'] = json.loads(job['skills']) if job.get('skills') else []
        jobs.append(job)
    return jsonify({'saved_jobs': jobs})


@app.route('/api/saved-jobs', methods=['POST'])
@require_auth
def save_job():
    data = request.get_json() or {}
    job_id = data.get('job_id')
    if not job_id:
        return jsonify({'error': 'Job ID required'}), 400
    db = get_db()
    if db.execute('SELECT id FROM saved_jobs WHERE user_id=? AND job_id=?', (g.user_id, job_id)).fetchone():
        return jsonify({'message': 'Already saved'})
    db.execute('INSERT INTO saved_jobs (id, user_id, job_id, saved_at) VALUES (?, ?, ?, ?)',
               (str(uuid.uuid4()), g.user_id, job_id, datetime.datetime.utcnow().isoformat()))
    db.commit()
    return jsonify({'message': 'Job saved'}), 201


@app.route('/api/saved-jobs/<job_id>', methods=['DELETE'])
@require_auth
def unsave_job(job_id):
    db = get_db()
    db.execute('DELETE FROM saved_jobs WHERE user_id=? AND job_id=?', (g.user_id, job_id))
    db.commit()
    return jsonify({'message': 'Job removed from saved'})

# =====================================================
# STATS
# =====================================================

@app.route('/api/stats/dashboard', methods=['GET'])
@require_auth
def dashboard_stats():
    db = get_db()
    total_apps = db.execute('SELECT COUNT(*) as cnt FROM applications WHERE user_id=?', (g.user_id,)).fetchone()['cnt']
    saved_jobs = db.execute('SELECT COUNT(*) as cnt FROM saved_jobs WHERE user_id=?', (g.user_id,)).fetchone()['cnt']
    week_ago = (datetime.datetime.utcnow() - datetime.timedelta(days=7)).isoformat()
    recent_apps = db.execute('SELECT COUNT(*) as cnt FROM applications WHERE user_id=? AND applied_at>=?', (g.user_id, week_ago)).fetchone()['cnt']
    profile = db.execute('SELECT * FROM profiles WHERE user_id=?', (g.user_id,)).fetchone()
    profile_dict = dict(profile) if profile else {}
    completion_fields = ['title', 'location', 'bio', 'linkedin']
    completed = sum(1 for f in completion_fields if profile_dict.get(f))
    has_exp = db.execute('SELECT COUNT(*) as cnt FROM experiences WHERE user_id=?', (g.user_id,)).fetchone()['cnt'] > 0
    has_edu = db.execute('SELECT COUNT(*) as cnt FROM educations WHERE user_id=?', (g.user_id,)).fetchone()['cnt'] > 0
    has_cv = db.execute('SELECT COUNT(*) as cnt FROM cv_analyses WHERE user_id=?', (g.user_id,)).fetchone()['cnt'] > 0
    total_checks = len(completion_fields) + 3
    completed_checks = completed + sum([has_exp, has_edu, has_cv])
    profile_completion = int((completed_checks / total_checks) * 100)
    cv_row = db.execute('SELECT analysis FROM cv_analyses WHERE user_id=?', (g.user_id,)).fetchone()
    total_recs = 0
    if cv_row:
        analysis = json.loads(cv_row['analysis'])
        user_skills = analysis.get('skills', [])
        if user_skills:
            job_count = db.execute('SELECT COUNT(*) as cnt FROM jobs').fetchone()['cnt']
            total_recs = min(job_count, max(10, len(user_skills) * 3))
    return jsonify({
        'total_applications': total_apps,
        'saved_jobs': saved_jobs,
        'recent_applications': recent_apps,
        'profile_views': total_apps * 3 + 12,
        'profile_completion': profile_completion,
        'total_recommendations': total_recs
    })

# =====================================================
# SERVE FRONTEND
# =====================================================

@app.route('/')
def serve_frontend():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend', path)

# =====================================================
# MAIN
# =====================================================

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(host='0.0.0.0',port=int(os.environ.get("PORT", 10000)))
