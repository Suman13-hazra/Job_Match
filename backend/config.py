# config.py – Application configuration

import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'jobmatch-pro-super-secret-key-2024-change-in-production')
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB max upload
    DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'data', 'jobmatch.db')
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))
    # NOTE: .doc (legacy Word) is not reliably parseable without extra system deps.
    # Use PDF, DOCX, or TXT.
    ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt'}
    CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:5000']

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
    SECRET_KEY = os.environ.get('SECRET_KEY', 'change-this-in-production!')

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
