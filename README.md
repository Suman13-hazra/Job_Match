================================================================================
  JOBMATCH PRO – AI-Powered Job Recommendation Website
  Full Stack: HTML/CSS/JavaScript (Frontend) + Python Flask (Backend)
================================================================================

📌 PROJECT OVERVIEW
-------------------
JobMatch Pro is a full-stack job recommendation website where users can:
  ✅ Register with Gmail + secure password (special chars required)
  ✅ Upload their CV (PDF, DOC, DOCX, TXT)
  ✅ AI-powered CV analysis and skill extraction
  ✅ Personalized job recommendations based on CV
  ✅ Dashboard with applied jobs tracker
  ✅ Job search with CV fit analysis
  ✅ Job profile creation (experience, education, skills, projects)
  ✅ Light / Dark theme toggle with animations
  ✅ User-friendly modern UI with smooth animations


📁 PROJECT STRUCTURE
--------------------
job-website/
├── frontend/                   ← HTML/CSS/JS Frontend
│   ├── index.html              ← Login page
│   ├── register.html           ← Registration (3-step)
│   ├── dashboard.html          ← Main dashboard
│   ├── jobs.html               ← Job search
│   ├── recommendations.html    ← AI recommendations
│   ├── applications.html       ← Application tracker
│   ├── profile.html            ← Job profile creator
│   ├── cv-analysis.html        ← CV analysis results
│   ├── css/
│   │   ├── style.css           ← Main stylesheet
│   │   └── animations.css      ← Animation styles
│   └── js/
│       ├── api.js              ← API client
│       ├── main.js             ← Core utilities, theme, sidebar
│       ├── auth.js             ← Login/Register logic
│       ├── dashboard.js        ← Dashboard functionality
│       ├── jobs.js             ← Job search logic
│       ├── profile.js          ← Profile management
│       ├── recommendations.js  ← AI recommendations
│       ├── applications.js     ← Application tracker
│       └── cv-analysis.js      ← CV analysis display
│
├── backend/                    ← Python Flask Backend
│   ├── app.py                  ← Main Flask app + all API routes
│   ├── database.py             ← SQLite DB setup + seeding
│   ├── cv_analyzer.py          ← CV parsing + skill extraction
│   ├── job_recommender.py      ← Job matching algorithm
│   ├── config.py               ← Configuration
│   ├── uploads/                ← CV files (auto-created)
│   └── data/                   ← SQLite database (auto-created)
│       └── jobmatch.db
│
├── requirements.txt            ← Python dependencies
└── README.txt                  ← This file


🚀 QUICK START (5 MINUTES)
---------------------------

STEP 1: Install Python dependencies
  cd job-website
  pip install -r requirements.txt

STEP 2: Start the backend server
  cd backend
  python app.py

  You should see:
  ✅ Seeded 16 sample jobs
   * Running on http://0.0.0.0:5000

STEP 3: Open the website
  Option A: Open frontend/index.html in browser (direct file)
  Option B: Visit http://localhost:5000 (served by Flask)

STEP 4: Register and start exploring!
  - Click "Create Account"
  - Enter your Gmail address
  - Create a secure password (must have uppercase, lowercase, number, special char)
  - Upload your CV (PDF, DOC, DOCX, or TXT)
  - Select your domain
  - Login and get AI-powered job recommendations!


📦 REQUIREMENTS
--------------
  - Python 3.8+
  - pip (Python package manager)
  - Modern web browser (Chrome, Firefox, Safari, Edge)
  - Internet connection (for Google Fonts and Font Awesome CDN)


🔐 PASSWORD REQUIREMENTS
------------------------
  Passwords must contain:
  ✅ Minimum 8 characters
  ✅ At least 1 uppercase letter (A-Z)
  ✅ At least 1 lowercase letter (a-z)
  ✅ At least 1 number (0-9)
  ✅ At least 1 special character (!@#$%^&*...)


📊 DATABASE
-----------
  Uses SQLite (no installation needed)
  Database auto-created at: backend/data/jobmatch.db
  Pre-seeded with 16 sample jobs across domains:
    - Software Engineering (Full Stack, Frontend, Backend, iOS, Intern)
    - Data Science & AI/ML (Data Scientist, ML Engineer, NLP, Data Engineer)
    - DevOps & Cloud (DevOps Engineer, Cloud Architect)
    - UI/UX Design, Cybersecurity, Product Management, Digital Marketing

  TO ADD YOUR OWN JOB DATASET:
  Option 1: Import via SQL
    - Open backend/data/jobmatch.db with SQLite browser
    - Insert records into the 'jobs' table

  Option 2: Edit database.py
    - Modify the seed_sample_jobs() function
    - Add more jobs to the sample_jobs list

  Option 3: CSV import (add to database.py)
    import csv
    with open('jobs.csv', 'r') as f:
      reader = csv.DictReader(f)
      for row in reader:
        # Insert row into jobs table


🌐 API ENDPOINTS
----------------
  POST /api/auth/register     - Register new user
  POST /api/auth/login        - Login
  GET  /api/auth/me           - Get current user

  POST /api/cv/upload         - Upload/update CV
  GET  /api/cv/analysis       - Get CV analysis results

  GET  /api/jobs              - Search/list jobs
  GET  /api/jobs/:id          - Get job details
  GET  /api/jobs/:id/match    - CV match analysis for job

  GET  /api/recommendations   - Get AI job recommendations

  POST /api/applications      - Apply to a job
  GET  /api/applications      - List user's applications
  DELETE /api/applications/:id - Withdraw application

  GET  /api/profile           - Get user profile
  PUT  /api/profile           - Update profile
  POST /api/profile/experience - Add work experience
  POST /api/profile/education  - Add education
  POST /api/profile/skills     - Add skill
  POST /api/profile/projects   - Add project

  POST /api/saved-jobs        - Save a job
  GET  /api/saved-jobs        - List saved jobs
  DELETE /api/saved-jobs/:id  - Unsave a job

  GET  /api/stats/dashboard   - Dashboard statistics


🎨 THEME & UI FEATURES
-----------------------
  Light/Dark theme toggle (persists between sessions)
  
  Color Palette:
    Primary: #4f46e5 (Indigo)
    Accent:  #f59e0b (Amber/Gold)
    Success: #10b981 (Emerald)
    Dark BG: #0f0f1a
    Light BG: #f8fafc

  Animation Features:
    - Page entrance animations (fadeIn, slideIn)
    - Hover effects on cards
    - Animated progress/match rings
    - AI loading animation with rotating rings
    - Toast notifications with slide animations
    - Staggered card loading
    - Scroll reveal animations
    - Button ripple effects
    - Sidebar collapse animation
    - Theme transition animation


🔧 CUSTOMIZATION
----------------
  1. Colors: Edit CSS variables in frontend/css/style.css (:root section)
  2. Add Jobs: Edit seed_sample_jobs() in backend/database.py
  3. Extend Skills: Add to SKILLS_DB in backend/cv_analyzer.py
  4. Add API endpoint: Add route in backend/app.py


⚠️ KNOWN LIMITATIONS
---------------------
  - CV parsing works best with text-based PDFs (not scanned images)
  - Google OAuth requires additional setup (clientId in frontend/js/auth.js)
  - For production deployment, change SECRET_KEY in backend/config.py
  - File uploads are stored locally; use S3/cloud storage for production


🛠️ NEXT PLANNED FEATURES (Tell us when to implement)
------------------------------------------------------
  - Real-time job notifications
  - Email notifications for application updates
  - Interview scheduling calendar
  - Resume builder with templates
  - Company profiles and reviews
  - LinkedIn import
  - Job market analytics dashboard
  - Mobile app version


📞 TECH STACK
-------------
  Frontend:  HTML5, CSS3, Vanilla JavaScript (ES6+)
  Backend:   Python 3.8+, Flask, SQLite
  Libraries: Font Awesome 6, Google Fonts (Inter)
  CV Parse:  PyMuPDF (fitz), pdfplumber, PyPDF2, python-docx
  Auth:      Custom JWT-like tokens with HMAC-SHA256
  DB:        SQLite (via Python sqlite3 module)


================================================================================
  Made with ❤️ for JobMatch Pro
  Version: 1.0.0
================================================================================
