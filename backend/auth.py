from flask import Blueprint, request, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
from db import supabase

# Create a Blueprint for authentication routes
auth = Blueprint('auth', __name__)

@auth.route('/login', methods=['POST'])
def login():
    """Handles parsing the login form and authenticating against Supabase."""
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return {"status": "error", "error": "Missing email or password. Please try again."}, 400
        
    try:
        # Sign in with Supabase
        response = supabase.auth.sign_in_with_password({"email": email, "password": password})
        
        if response.user:
            # Create a secure session token
            session['user_id'] = response.user.id
            session['access_token'] = response.session.access_token
            print(f"DEBUG: Successfully logged in user {email} via Supabase")
            return {"status": "success", "user_id": response.user.id}, 200
        else:
            return {"status": "error", "error": "Invalid credentials. Please go back and try again."}, 401
    except Exception as e:
        error_msg = str(e)
        if "Email not confirmed" in error_msg:
            print(f"DEBUG: Supabase login blocked - Email not confirmed for {email}")
        else:
            print(f"DEBUG: Supabase Login error: {error_msg}")
        return {"status": "error", "error": f"Authentication error: {error_msg}"}, 401

@auth.route('/register', methods=['POST'])
def register():
    """Handles creating a new user account with Supabase."""
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')
    
    print(f"DEBUG: Registration attempt for email: {email}")
    
    if not email or not password:
        print("DEBUG: Missing email or password")
        return {"status": "error", "error": "Missing email or password."}, 400
        
    try:
        # Sign up with Supabase
        response = supabase.auth.sign_up({"email": email, "password": password})
        
        if response.user:
            print(f"DEBUG: Successfully registered user {email} in Supabase")
            
            # Create local user record if it doesn't exist (optional)
            # This helps if you want to keep using SQLAlchemy for relations
            local_user = User.query.filter_by(email=email).first()
            if not local_user:
                # We don't store the password hash locally anymore, Supabase handles it
                new_user = User(id=response.user.id, email=email, password_hash="SUPABASE_AUTH")
                db.session.add(new_user)
                db.session.commit()
            
            # Automatically log them in after registering
            session['user_id'] = response.user.id
            return {"status": "success", "user_id": response.user.id}, 201
        else:
            return {"status": "error", "error": "Registration failed. Please try again."}, 400
            
    except Exception as e:
        print(f"DEBUG: Supabase Registration error: {str(e)}")
        return {"status": "error", "error": f"Registration error: {str(e)}"}, 400

@auth.route('/logout')
def logout():
    """Clears the session and signs out from Supabase."""
    try:
        supabase.auth.sign_out()
    except:
        pass
    session.pop('user_id', None)
    session.pop('access_token', None)
    return {"status": "success", "message": "Logged out successfully"}, 200
