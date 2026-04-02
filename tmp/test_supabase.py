import os
from dotenv import load_dotenv
from supabase import create_client

# This script tests the Supabase table schema for expected columns
load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("Missing Supabase credentials in .env")
    exit(1)

supabase = create_client(url, key)

try:
    print("Checking 'saved_articles' table...")
    # Try a simple select with columns we use
    cols = ['id', 'user_id', 'url', 'title', 'description', 'url_to_image', 'author', 'source_name', 'published_at', 'category', 'created_at']
    for col in cols:
        try:
            supabase.table("saved_articles").select(col).limit(1).execute()
            print(f"  [OK] Column '{col}' exists.")
        except Exception as e:
            print(f"  [FAIL] Column '{col}' missing or inaccessible: {str(e)}")
            
except Exception as e:
    print(f"\nCRITICAL ERROR: {str(e)}")
