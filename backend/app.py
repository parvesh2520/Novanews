import os
from dotenv import load_dotenv, find_dotenv
# Explicitly find and load the .env file even if running from a subfolder
load_dotenv(find_dotenv(), override=True)

from flask import Flask, session, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from models import db
from auth import auth
from news import news_bp

app = Flask(__name__)
# Enable CORS for cross-origin requests from Vercel
CORS(app, supports_credentials=True)


@app.before_request
def log_request_info():
    print(f"DEBUG: Incoming {request.method} request to {request.path}")

# Secret key is required to encrypt Flask sessions securely
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key')

# Check Supabase variables
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')

if not supabase_url or not supabase_key or "your-project-id" in supabase_url:
    print("WARNING: Supabase credentials are not set correctly in .env!")
    print("Please set SUPABASE_URL and SUPABASE_KEY to your project values.")
else:
    print(f"DEBUG: Supabase integrated with URL: {supabase_url}")

# Setup Database (PostgreSQL if DATABASE_URL exists, otherwise SQLite)
database_url = os.getenv('DATABASE_URL')
print(f"DEBUG: DATABASE_URL from environment: {database_url}")

if database_url:
    # Fix for newer SQLAlchemy postgresql:// vs postgres://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    print(f"DEBUG: Connecting to PostgreSQL: {database_url}")
else:
    # Fallback to SQLite
    basedir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(basedir, 'novanews.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    print(f"DEBUG: Falling back to SQLite at: {db_path}")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

# Register the authentication routes
app.register_blueprint(auth, url_prefix='/auth')

# Register the news API routes
app.register_blueprint(news_bp, url_prefix='/api/news')

# Create tables if they don't exist
with app.app_context():
    db.create_all()

@app.route('/')
def home():
    if 'user_id' in session:
        return {"status": "success", "message": "Authenticated"}, 200
    return {"status": "error", "error": "Not authenticated"}, 401

if __name__ == '__main__':
    # Use the PORT assigned by Render, or default to 5000
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, port=port, host='0.0.0.0')
