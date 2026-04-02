from flask_sqlalchemy import SQLAlchemy

# Initialize the SQLAlchemy instance
db = SQLAlchemy()

class User(db.Model):
    """
    Database model for NovaNews Users.
    Stores the user's email and a securely hashed password.
    """
    __tablename__ = 'users'
    
    id = db.Column(db.String(100), primary_key=True) # Supabase UUID
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    
    def __repr__(self):
        return f"<User {self.email}>"
