import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase Client
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

# Create a singleton instance of the client
supabase: Client = create_client(url, key)

def get_supabase():
    """Returns the Supabase client instance."""
    return supabase
