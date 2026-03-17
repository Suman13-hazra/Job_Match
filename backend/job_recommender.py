# job_recommender.py – Job recommendation and matching engine

class JobRecommender:
    """Calculates job-CV match scores and generates recommendations."""

    def calculate_match(self, user_skills: list, job_skills: list) -> dict:
        """
        Calculate match percentage between user skills and job requirements.
        Returns: {score, matching, missing, percentage}
        """
        if not job_skills:
            return {'score': 50, 'matching': [], 'missing': [], 'percentage': 50}
        if not user_skills:
            return {'score': 0, 'matching': [], 'missing': job_skills, 'percentage': 0}

        user_skills_lower = [s.lower() for s in user_skills]
        job_skills_lower = [s.lower() for s in job_skills]

        matching = []
        missing = []

        for js, js_lower in zip(job_skills, job_skills_lower):
            if js_lower in user_skills_lower:
                matching.append(js)
            else:
                # Fuzzy match – check partial names
                partial = any(js_lower in us or us in js_lower for us in user_skills_lower)
                if partial:
                    matching.append(js)
                else:
                    missing.append(js)

        if len(job_skills) == 0:
            score = 50
        else:
            score = int((len(matching) / len(job_skills)) * 100)

        return {
            'score': min(score, 100),
            'matching': matching,
            'missing': missing,
            'percentage': min(score, 100)
        }

    def rank_jobs(self, jobs: list, user_skills: list, user_domain: str = '') -> list:
        """Rank jobs by match score for the user."""
        scored = []
        for job in jobs:
            job_skills = job.get('skills', [])
            match = self.calculate_match(user_skills, job_skills)
            score = match['score']
            # Domain bonus
            if user_domain and job.get('domain') == user_domain:
                score = min(100, score + 10)
            job_copy = dict(job)
            job_copy['match_score'] = score
            job_copy['match_skills'] = match['matching']
            job_copy['missing_skills'] = match['missing']
            scored.append(job_copy)
        return sorted(scored, key=lambda x: x['match_score'], reverse=True)
