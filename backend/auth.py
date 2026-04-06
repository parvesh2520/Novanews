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

@auth.route('/authorize/<provider>')
def authorize(provider):
    """Initiates Supabase OAuth flow and returns the redirect URL."""
    try:
        # provider is 'google' or 'github'
        # redirectTo should be the frontend callback route
        # Dynamically determine the redirect URI based on explicit query param or request origin
        origin = request.args.get('origin') or request.headers.get('Origin') or 'http://localhost:5173'
        redirect_uri = f"{origin}/social-callback"

        res = supabase.auth.sign_in_with_oauth({
            "provider": provider,
            "options": {
                "redirect_to": redirect_uri
            }
        })
        return {"status": "success", "url": res.url}, 200
    except Exception as e:
        return {"status": "error", "error": str(e)}, 500

@auth.route('/verify-session', methods=['POST'])
def verify_session():
    """Synchronizes the Flask session with a validated Supabase session from the frontend."""
    data = request.json or {}
    access_token = data.get('access_token')

    if not access_token:
        return {"status": "error", "error": "Invalid session data"}, 400

    try:
        # Verify token and get user from Supabase
        user_res = supabase.auth.get_user(access_token)
        if not user_res.user:
            return {"status": "error", "error": "Invalid token"}, 401
            
        user = user_res.user
        
        # Set session
        session['user_id'] = user.id
        session['access_token'] = access_token
        
        # Ensure local user exists
        local_user = User.query.filter_by(id=user.id).first()
        if not local_user:
            new_user = User(id=user.id, email=user.email, password_hash="SOCIAL_AUTH")
            db.session.add(new_user)
            db.session.commit()
            print(f"DEBUG: Created local user for social {user.email}")

        return {"status": "success", "user_id": user.id}, 200
    except Exception as e:
        print(f"DEBUG: Session verification error: {str(e)}")
        return {"status": "error", "error": str(e)}, 500

@auth.route('/exchange-code', methods=['POST'])
def exchange_code():
    """Exchanges an OAuth authorization code for a Supabase session (PKCE flow)."""
    data = request.json or {}
    code = data.get('code')

    if not code:
        return {"status": "error", "error": "Authorization code missing"}, 400

    try:
        # Exchange code for session
        res = supabase.auth.exchange_code_for_session({
            "auth_code": code
        })
        
        if not res.user:
            return {"status": "error", "error": "Invalid or expired code"}, 401
            
        # Set session
        session['user_id'] = res.user.id
        session['access_token'] = res.session.access_token
        
        # Ensure local user exists
        local_user = User.query.filter_by(id=res.user.id).first()
        if not local_user:
            new_user = User(id=res.user.id, email=res.user.email, password_hash="SOCIAL_AUTH")
            db.session.add(new_user)
            db.session.commit()
            print(f"DEBUG: Created local user for social {res.user.email}")

        return {"status": "success", "user_id": res.user.id}, 200
    except Exception as e:
        print(f"DEBUG: Code exchange error: {str(e)}")
        return {"status": "error", "error": str(e)}, 500
