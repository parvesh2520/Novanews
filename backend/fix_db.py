import sys
import os

# Add the current directory to sys.path to allow imports
sys.path.append(os.getcwd())

from app import app
from models import db
from sqlalchemy import text

print("Fixing database schema...")
with app.app_context():
    try:
        # Drop the table that has the wrong data type for ID
        db.session.execute(text("DROP TABLE IF EXISTS users CASCADE"))
        db.session.commit()
        print("Dropped 'users' table.")
        
        # Recreate it using the new schema (String ID)
        db.create_all()
        print("Recreated tables with correct UUID support.")
    except Exception as e:
        print(f"Error fixing database: {e}")
        db.session.rollback()
