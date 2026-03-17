# cv_analyzer.py – CV parsing and analysis engine

import re
import os
import json

class CVAnalyzer:
    """Analyzes CV files to extract skills, experience, education, and other info."""

    # Comprehensive skill database
    SKILLS_DB = {
        'programming_languages': [
            'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'C', 'Go', 'Rust',
            'Swift', 'Kotlin', 'PHP', 'Ruby', 'Scala', 'R', 'MATLAB', 'Perl', 'Shell',
            'Bash', 'PowerShell', 'Dart', 'Elixir', 'Haskell', 'Lua', 'Assembly'
        ],
        'web_frontend': [
            'React', 'Vue.js', 'Angular', 'HTML', 'CSS', 'SASS', 'SCSS', 'Bootstrap',
            'Tailwind CSS', 'Next.js', 'Nuxt.js', 'jQuery', 'Redux', 'Webpack', 'Vite',
            'GraphQL', 'WebPack', 'Three.js', 'Svelte', 'Ember.js'
        ],
        'web_backend': [
            'Node.js', 'Django', 'Flask', 'FastAPI', 'Express.js', 'Spring Boot', 'Laravel',
            'Ruby on Rails', 'ASP.NET', 'Nest.js', 'Fiber', 'Gin', 'REST API', 'GraphQL API'
        ],
        'databases': [
            'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'Microsoft SQL Server',
            'Cassandra', 'DynamoDB', 'Elasticsearch', 'Neo4j', 'Firebase', 'CouchDB',
            'InfluxDB', 'MariaDB', 'SQL', 'NoSQL'
        ],
        'cloud_devops': [
            'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform',
            'Ansible', 'Jenkins', 'CI/CD', 'GitHub Actions', 'CircleCI', 'Helm', 'Nginx',
            'Apache', 'Linux', 'Unix', 'Vagrant', 'Chef', 'Puppet'
        ],
        'data_science_ml': [
            'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn',
            'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'Jupyter', 'NLTK', 'NLP', 'Computer Vision',
            'OpenCV', 'Hugging Face', 'BERT', 'Transformers', 'XGBoost', 'LightGBM',
            'Data Analysis', 'Statistics', 'Tableau', 'Power BI', 'Apache Spark', 'Hadoop',
            'Kafka', 'Airflow', 'ETL', 'R', 'SAS'
        ],
        'mobile': [
            'iOS', 'Android', 'React Native', 'Flutter', 'Swift', 'Kotlin', 'Xamarin',
            'SwiftUI', 'Xcode', 'Android Studio', 'Dart'
        ],
        'tools_methodologies': [
            'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 'Trello',
            'Agile', 'Scrum', 'Kanban', 'TDD', 'BDD', 'Microservices', 'REST', 'SOAP',
            'gRPC', 'WebSockets', 'OAuth', 'JWT', 'Linux', 'Vim', 'VS Code'
        ],
        'cybersecurity': [
            'Penetration Testing', 'SIEM', 'Firewall', 'Network Security', 'Cryptography',
            'Vulnerability Assessment', 'OWASP', 'Wireshark', 'Metasploit', 'Nmap',
            'Risk Assessment', 'CISSP', 'CEH', 'CompTIA Security+', 'ISO 27001', 'SOC'
        ],
        'design': [
            'Figma', 'Adobe XD', 'Sketch', 'Adobe Photoshop', 'Adobe Illustrator',
            'InDesign', 'Prototyping', 'Wireframing', 'User Research', 'Usability Testing',
            'Information Architecture', 'Design Systems', 'Zeplin'
        ],
        'marketing': [
            'SEO', 'SEM', 'Google Analytics', 'Google Ads', 'Facebook Ads', 'Social Media',
            'Content Marketing', 'Email Marketing', 'HubSpot', 'Salesforce', 'Marketo',
            'PPC', 'CRM', 'A/B Testing', 'Copywriting', 'Marketing Automation'
        ],
        'soft_skills': [
            'Leadership', 'Communication', 'Team Management', 'Problem Solving',
            'Critical Thinking', 'Project Management', 'Presentation', 'Collaboration'
        ]
    }

    DOMAIN_SKILLS = {
        'software_engineering': ['JavaScript', 'Python', 'React', 'Node.js', 'Java', 'Git', 'Docker', 'AWS', 'SQL', 'REST API'],
        'data_science': ['Python', 'Machine Learning', 'SQL', 'Statistics', 'Pandas', 'TensorFlow', 'Scikit-learn', 'R', 'Deep Learning'],
        'devops': ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform', 'Linux', 'Jenkins', 'Ansible'],
        'design': ['Figma', 'Adobe XD', 'Prototyping', 'User Research', 'CSS', 'HTML', 'Sketch'],
        'cybersecurity': ['Network Security', 'Penetration Testing', 'Linux', 'Python', 'Firewall', 'SIEM'],
        'marketing': ['SEO', 'Google Analytics', 'Content Marketing', 'Social Media', 'Email Marketing'],
        'product_management': ['Agile', 'Scrum', 'JIRA', 'SQL', 'Analytics', 'User Research', 'Roadmapping'],
    }

    def analyze(self, file_path: str) -> dict:
        """Main analysis entry point"""
        text = self._extract_text(file_path)
        if not text:
            return self._empty_analysis()

        skills = self._extract_skills(text)
        name, email, phone = self._extract_contact(text)
        experience = self._extract_experience(text)
        education = self._extract_education(text)
        years_exp = self._estimate_years_experience(experience)
        domain, domain_confidence, detected_domains = self._detect_domain(skills)
        education_level = self._get_education_level(education)
        missing_skills = self._get_missing_skills(skills, domain)

        # Score calculation
        skill_score = min(100, len(skills) * 5)
        exp_score = min(100, years_exp * 15)
        edu_score = {'phd': 100, 'master': 85, 'bachelor': 70, 'associate': 50, 'high_school': 30}.get(education_level, 50)
        overall = int(skill_score * 0.5 + exp_score * 0.3 + edu_score * 0.2)

        return {
            'name': name,
            'email': email,
            'phone': phone,
            'skills': skills,
            'experience': experience,
            'education': education,
            'years_experience': years_exp,
            'domain': domain,
            'domain_confidence': domain_confidence,
            'detected_domains': detected_domains,
            'education_level': education_level,
            'missing_skills': missing_skills,
            'score': overall,
            'skill_score': skill_score,
            'experience_score': exp_score,
            'education_score': edu_score,
            'raw_text_length': len(text)
        }

    def _extract_text(self, file_path: str) -> str:
        """Extract text from CV file"""
        ext = os.path.splitext(file_path)[1].lower()
        try:
            if ext == '.pdf':
                return self._extract_pdf(file_path)
            elif ext in ['.doc', '.docx']:
                return self._extract_docx(file_path)
            elif ext == '.txt':
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read()
        except Exception as e:
            print(f"Error extracting text: {e}")
        return ''

    def _extract_pdf(self, file_path: str) -> str:
        """Best-effort PDF text extraction with multiple fallbacks.

        Order:
          1) PyMuPDF (fitz) – robust for many PDFs
          2) pdfplumber – good layout-aware extraction
          3) PyPDF2 – basic fallback

        Note: scanned-image PDFs still need OCR (not included).
        """
        # 1) PyMuPDF
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            parts = []
            for page in doc:
                parts.append(page.get_text("text") or "")
            return "\n".join(parts)
        except Exception:
            pass

        # 2) pdfplumber
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                return "\n".join([(page.extract_text() or "") for page in pdf.pages])
        except Exception:
            pass

        # 3) PyPDF2
        try:
            import PyPDF2
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                return "\n".join([(page.extract_text() or "") for page in reader.pages])
        except Exception:
            return ''

    def _extract_docx(self, file_path: str) -> str:
        try:
            import docx
            doc = docx.Document(file_path)
            return ' '.join([p.text for p in doc.paragraphs])
        except:
            return ''

    def _extract_skills(self, text: str) -> list:
        """Extract skills from text using pattern matching"""
        found_skills = set()
        text_lower = text.lower()
        all_skills = []
        for category, skills in self.SKILLS_DB.items():
            all_skills.extend(skills)

        for skill in all_skills:
            # Case-insensitive whole-word match
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                found_skills.add(skill)

        # Also check for skill abbreviations
        abbreviations = {
            'js': 'JavaScript', 'ts': 'TypeScript', 'py': 'Python',
            'k8s': 'Kubernetes', 'tf': 'TensorFlow', 'ml': 'Machine Learning',
            'dl': 'Deep Learning', 'nlp': 'NLP', 'cv': 'Computer Vision'
        }
        for abbr, full in abbreviations.items():
            if re.search(r'\b' + abbr + r'\b', text_lower):
                found_skills.add(full)

        return sorted(list(found_skills))

    def _extract_contact(self, text: str):
        """Extract name, email, phone"""
        # Email
        email_match = re.search(r'[\w.+-]+@[\w-]+\.\w+', text)
        email = email_match.group(0) if email_match else ''
        # Phone
        phone_match = re.search(r'(\+?\d[\d\s\-().]{7,15}\d)', text)
        phone = phone_match.group(0).strip() if phone_match else ''
        # Name (first non-empty line is often the name)
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        name = lines[0] if lines and len(lines[0].split()) <= 5 else ''
        return name, email, phone

    def _extract_experience(self, text: str) -> list:
        """Extract work experience entries"""
        experience = []
        # Look for common job title patterns
        job_titles = ['developer', 'engineer', 'analyst', 'designer', 'manager', 'architect',
                      'consultant', 'specialist', 'coordinator', 'director', 'lead', 'intern']
        lines = text.split('\n')
        for i, line in enumerate(lines):
            line_lower = line.lower()
            if any(title in line_lower for title in job_titles) and len(line) < 100:
                # Find date pattern near this line
                context = ' '.join(lines[max(0,i-2):min(len(lines),i+3)])
                date_match = re.search(r'(20\d\d|19\d\d)', context)
                if date_match:
                    experience.append({
                        'title': line.strip()[:80],
                        'company': lines[i+1].strip()[:80] if i+1 < len(lines) else '',
                        'duration': date_match.group(0)
                    })
        return experience[:5]  # Max 5 entries

    def _extract_education(self, text: str) -> list:
        """Extract education info"""
        education = []
        degree_patterns = ['bachelor', 'master', 'phd', 'doctorate', 'associate', 'diploma', 'b.s.', 'm.s.', 'b.e.', 'm.e.', 'b.tech', 'm.tech']
        lines = text.split('\n')
        for line in lines:
            line_lower = line.lower()
            if any(deg in line_lower for deg in degree_patterns) and len(line) < 150:
                education.append({'degree': line.strip()[:100]})
        return education[:3]

    def _estimate_years_experience(self, experience: list) -> int:
        """Estimate years of experience from extracted data"""
        if not experience:
            return 0
        # Simple heuristic based on number of experiences
        return min(len(experience) * 2, 15)

    def _detect_domain(self, skills: list) -> tuple:
        """Detect the professional domain based on skills"""
        if not skills:
            return '', 0.5, []
        skills_lower = [s.lower() for s in skills]
        domain_scores = {}
        for domain, domain_skills in self.DOMAIN_SKILLS.items():
            matches = sum(1 for ds in domain_skills if ds.lower() in skills_lower)
            if matches > 0:
                domain_scores[domain] = matches / len(domain_skills)

        if not domain_scores:
            return 'software_engineering', 0.3, []

        sorted_domains = sorted(domain_scores.items(), key=lambda x: x[1], reverse=True)
        top_domain = sorted_domains[0][0]
        top_confidence = sorted_domains[0][1]
        detected = [{'domain': d, 'confidence': round(c, 2)} for d, c in sorted_domains[:3]]
        return top_domain, round(top_confidence, 2), detected

    def _get_education_level(self, education: list) -> str:
        """Determine education level"""
        if not education:
            return 'bachelor'
        text = ' '.join([e.get('degree', '') for e in education]).lower()
        if 'phd' in text or 'doctorate' in text:
            return 'phd'
        if 'master' in text or 'm.s.' in text or 'm.tech' in text:
            return 'master'
        if 'bachelor' in text or 'b.s.' in text or 'b.tech' in text or 'b.e.' in text:
            return 'bachelor'
        if 'associate' in text:
            return 'associate'
        return 'bachelor'

    def _get_missing_skills(self, skills: list, domain: str) -> list:
        """Identify missing skills for the detected domain"""
        if not domain:
            return []
        domain_skills = self.DOMAIN_SKILLS.get(domain, [])
        skills_lower = [s.lower() for s in skills]
        missing = [ds for ds in domain_skills if ds.lower() not in skills_lower]
        return missing[:8]

    def _empty_analysis(self) -> dict:
        return {
            'name': '', 'email': '', 'phone': '', 'skills': [],
            'experience': [], 'education': [], 'years_experience': 0,
            'domain': '', 'domain_confidence': 0, 'detected_domains': [],
            'education_level': '', 'missing_skills': [], 'score': 0,
            'skill_score': 0, 'experience_score': 0, 'education_score': 0
        }
