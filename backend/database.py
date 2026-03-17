# database.py – Database initialization and connection

import sqlite3
import os
from flask import g

DATABASE = os.path.join(os.path.dirname(__file__), 'data', 'jobmatch.db')

def get_db():
    if 'db' not in g:
        os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
        g.db = sqlite3.connect(DATABASE, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
        g.db.execute("PRAGMA journal_mode = WAL")
        g.db.execute("PRAGMA busy_timeout = 5000")  # help with locked DB during uploads
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db(app):
    app.teardown_appcontext(close_db)
    with app.app_context():
        db = get_db()
        create_tables(db)
        seed_sample_jobs(db)

def create_tables(db):
    db.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            password TEXT NOT NULL,
            domain TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE,
            title TEXT,
            location TEXT,
            bio TEXT,
            linkedin TEXT,
            github TEXT,
            website TEXT,
            open_to_work INTEGER DEFAULT 0,
            expected_salary REAL,
            job_preferences TEXT,
            profile_views INTEGER DEFAULT 0,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS experiences (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            location TEXT,
            start_date TEXT,
            end_date TEXT,
            current INTEGER DEFAULT 0,
            description TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS educations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            institution TEXT NOT NULL,
            degree TEXT,
            field TEXT NOT NULL,
            start_year TEXT,
            end_year TEXT,
            gpa TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS skills (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            level INTEGER DEFAULT 60,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            github TEXT,
            demo TEXT,
            technologies TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS cv_analyses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE,
            filename TEXT,
            analysis TEXT,
            uploaded_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            company_name TEXT NOT NULL,
            company_logo TEXT,
            location TEXT,
            job_type TEXT DEFAULT "Full-time",
            domain TEXT,
            experience_level TEXT,
            description TEXT,
            requirements TEXT,
            skills TEXT,
            salary_min REAL,
            salary_max REAL,
            is_remote INTEGER DEFAULT 0,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS applications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            job_title TEXT,
            company_name TEXT,
            domain TEXT,
            status TEXT DEFAULT "applied",
            match_score INTEGER DEFAULT 0,
            cover_letter TEXT,
            applied_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (job_id) REFERENCES jobs(id),
            UNIQUE(user_id, job_id)
        );

        CREATE TABLE IF NOT EXISTS saved_jobs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            saved_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (job_id) REFERENCES jobs(id),
            UNIQUE(user_id, job_id)
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT,
            message TEXT,
            type TEXT DEFAULT "info",
            read INTEGER DEFAULT 0,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    ''')
    db.commit()

def seed_sample_jobs(db):
    """Seed sample jobs if none exist"""
    count = db.execute('SELECT COUNT(*) as cnt FROM jobs').fetchone()['cnt']
    if count > 0:
        return  # Already seeded

    import uuid, datetime, json

    sample_jobs = [
        {
            'title': 'Senior Full Stack Developer',
            'company_name': 'TechCorp Solutions',
            'location': 'San Francisco, CA',
            'job_type': 'Full-time',
            'domain': 'software_engineering',
            'experience_level': 'senior',
            'description': 'We are looking for a Senior Full Stack Developer to join our dynamic team. You will work on cutting-edge web applications using modern technologies.',
            'requirements': '5+ years of experience in full-stack development. Strong knowledge of React, Node.js, and databases.',
            'skills': ['JavaScript', 'React', 'Node.js', 'Python', 'PostgreSQL', 'Docker', 'AWS', 'REST API'],
            'salary_min': 120000, 'salary_max': 160000
        },
        {
            'title': 'Machine Learning Engineer',
            'company_name': 'AI Innovations Inc',
            'location': 'New York, NY',
            'job_type': 'Full-time',
            'domain': 'data_science',
            'experience_level': 'mid',
            'description': 'Join our ML team to build and deploy production-grade machine learning models. Work with large datasets and cutting-edge algorithms.',
            'requirements': '3+ years of ML experience. Proficiency in Python and deep learning frameworks.',
            'skills': ['Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Deep Learning', 'SQL', 'Pandas', 'NumPy'],
            'salary_min': 110000, 'salary_max': 150000
        },
        {
            'title': 'Frontend React Developer',
            'company_name': 'WebStudio Agency',
            'location': 'Remote',
            'job_type': 'Remote',
            'domain': 'software_engineering',
            'experience_level': 'mid',
            'description': 'Build beautiful, responsive web applications using React and modern CSS frameworks.',
            'requirements': '2+ years React experience, strong CSS skills.',
            'skills': ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'Redux', 'Git'],
            'salary_min': 80000, 'salary_max': 110000
        },
        {
            'title': 'DevOps Engineer',
            'company_name': 'CloudBase Systems',
            'location': 'Austin, TX',
            'job_type': 'Full-time',
            'domain': 'devops',
            'experience_level': 'mid',
            'description': 'Manage cloud infrastructure and CI/CD pipelines. Ensure high availability and performance.',
            'requirements': '3+ years DevOps experience with AWS or GCP.',
            'skills': ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Linux', 'Python', 'Git'],
            'salary_min': 100000, 'salary_max': 135000
        },
        {
            'title': 'Data Scientist',
            'company_name': 'DataDriven Analytics',
            'location': 'Seattle, WA',
            'job_type': 'Full-time',
            'domain': 'data_science',
            'experience_level': 'mid',
            'description': 'Analyze complex datasets to drive business decisions. Build predictive models and visualizations.',
            'requirements': '3+ years data science experience.',
            'skills': ['Python', 'R', 'SQL', 'Machine Learning', 'Statistics', 'Tableau', 'Pandas', 'Scikit-learn'],
            'salary_min': 95000, 'salary_max': 130000
        },
        {
            'title': 'UI/UX Designer',
            'company_name': 'Creative Digital Studio',
            'location': 'Los Angeles, CA',
            'job_type': 'Full-time',
            'domain': 'design',
            'experience_level': 'mid',
            'description': 'Design beautiful and intuitive user interfaces for web and mobile applications.',
            'requirements': '3+ years UX design experience.',
            'skills': ['Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'User Research', 'CSS', 'HTML'],
            'salary_min': 75000, 'salary_max': 105000
        },
        {
            'title': 'Backend Python Developer',
            'company_name': 'StartupXYZ',
            'location': 'Boston, MA',
            'job_type': 'Full-time',
            'domain': 'software_engineering',
            'experience_level': 'mid',
            'description': 'Build scalable backend services using Python and Flask/Django. Design RESTful APIs.',
            'requirements': '3+ years Python development experience.',
            'skills': ['Python', 'Django', 'Flask', 'PostgreSQL', 'Redis', 'Docker', 'REST API'],
            'salary_min': 85000, 'salary_max': 115000
        },
        {
            'title': 'Cybersecurity Analyst',
            'company_name': 'SecureNet Corp',
            'location': 'Washington, DC',
            'job_type': 'Full-time',
            'domain': 'cybersecurity',
            'experience_level': 'mid',
            'description': 'Protect our systems and data from cyber threats. Conduct security assessments and incident response.',
            'requirements': '3+ years cybersecurity experience. CISSP or CEH preferred.',
            'skills': ['Network Security', 'Penetration Testing', 'SIEM', 'Python', 'Firewall', 'Linux', 'Risk Assessment'],
            'salary_min': 90000, 'salary_max': 125000
        },
        {
            'title': 'Product Manager',
            'company_name': 'InnovateTech',
            'location': 'Chicago, IL',
            'job_type': 'Full-time',
            'domain': 'product_management',
            'experience_level': 'senior',
            'description': 'Lead product strategy and roadmap. Work with cross-functional teams to deliver amazing products.',
            'requirements': '5+ years product management experience.',
            'skills': ['Product Strategy', 'Agile', 'Scrum', 'JIRA', 'SQL', 'Analytics', 'Roadmapping', 'User Research'],
            'salary_min': 115000, 'salary_max': 155000
        },
        {
            'title': 'Junior Software Developer',
            'company_name': 'CodeHouse Agency',
            'location': 'Remote',
            'job_type': 'Remote',
            'domain': 'software_engineering',
            'experience_level': 'entry',
            'description': 'Great opportunity for fresh graduates. Learn and grow with a supportive team.',
            'requirements': 'CS degree or equivalent bootcamp. Basic programming skills.',
            'skills': ['JavaScript', 'HTML', 'CSS', 'React', 'Git', 'Node.js'],
            'salary_min': 55000, 'salary_max': 75000
        },
        {
            'title': 'Cloud Architect',
            'company_name': 'CloudFirst Solutions',
            'location': 'Denver, CO',
            'job_type': 'Full-time',
            'domain': 'devops',
            'experience_level': 'lead',
            'description': 'Design and oversee cloud architecture for enterprise clients. Lead cloud migration projects.',
            'requirements': '8+ years experience, AWS/Azure/GCP certifications required.',
            'skills': ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Terraform', 'Docker', 'Microservices', 'Python'],
            'salary_min': 150000, 'salary_max': 200000
        },
        {
            'title': 'NLP Research Engineer',
            'company_name': 'LinguaAI Labs',
            'location': 'San Jose, CA',
            'job_type': 'Full-time',
            'domain': 'data_science',
            'experience_level': 'senior',
            'description': 'Research and develop NLP models for language understanding and generation.',
            'requirements': 'PhD or MS in CS/ML, NLP expertise.',
            'skills': ['Python', 'NLP', 'BERT', 'Transformers', 'PyTorch', 'Machine Learning', 'Deep Learning'],
            'salary_min': 140000, 'salary_max': 180000
        },
        {
            'title': 'Digital Marketing Manager',
            'company_name': 'BrandBoost Agency',
            'location': 'Miami, FL',
            'job_type': 'Full-time',
            'domain': 'marketing',
            'experience_level': 'mid',
            'description': 'Lead digital marketing campaigns across multiple channels. Drive growth through data-driven strategies.',
            'requirements': '4+ years digital marketing experience.',
            'skills': ['SEO', 'SEM', 'Google Analytics', 'Social Media', 'Content Marketing', 'Email Marketing', 'PPC'],
            'salary_min': 70000, 'salary_max': 95000
        },
        {
            'title': 'iOS Developer',
            'company_name': 'MobileFirst Apps',
            'location': 'San Francisco, CA',
            'job_type': 'Full-time',
            'domain': 'software_engineering',
            'experience_level': 'mid',
            'description': 'Build high-quality iOS applications using Swift and SwiftUI.',
            'requirements': '3+ years iOS development experience.',
            'skills': ['Swift', 'SwiftUI', 'Xcode', 'iOS', 'REST API', 'Git', 'Core Data'],
            'salary_min': 100000, 'salary_max': 135000
        },
        {
            'title': 'Data Engineer',
            'company_name': 'PipelineHub',
            'location': 'Atlanta, GA',
            'job_type': 'Full-time',
            'domain': 'data_science',
            'experience_level': 'mid',
            'description': 'Build and maintain data pipelines for analytics and ML teams.',
            'requirements': '3+ years data engineering experience.',
            'skills': ['Python', 'Apache Spark', 'Kafka', 'SQL', 'Airflow', 'AWS', 'Hadoop', 'ETL'],
            'salary_min': 95000, 'salary_max': 130000
        },
        {
            'title': 'Software Engineering Intern',
            'company_name': 'TechGiants Corp',
            'location': 'Mountain View, CA',
            'job_type': 'Internship',
            'domain': 'software_engineering',
            'experience_level': 'entry',
            'description': 'Summer internship for CS students. Work on real products with experienced mentors.',
            'requirements': 'Currently enrolled in CS or related degree.',
            'skills': ['Python', 'Java', 'Algorithms', 'Data Structures', 'Git'],
            'salary_min': 40000, 'salary_max': 55000
        },
    ]

    now = datetime.datetime.utcnow().isoformat()
    for job in sample_jobs:
        job_id = str(uuid.uuid4())
        db.execute('''INSERT INTO jobs (id, title, company_name, location, job_type, domain, experience_level,
                      description, requirements, skills, salary_min, salary_max, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                   (job_id, job['title'], job['company_name'], job['location'], job['job_type'],
                    job['domain'], job['experience_level'], job['description'], job['requirements'],
                    json.dumps(job['skills']), job['salary_min'], job['salary_max'], now))
    db.commit()
    print(f"✅ Seeded {len(sample_jobs)} sample jobs")
