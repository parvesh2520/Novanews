import os
import google.generativeai as genai
from dotenv import load_dotenv

# Diagnostics for Gemini API
load_dotenv()

key = os.getenv("GEMINI_API_KEY")
print(f"DEBUG: Key found (first 5 chars): {key[:5] if key else 'None'}")

if not key or "your_gemini_api_key_here" in key:
    print("FAILED: API Key is either missing or still the placeholder.")
    exit(1)

genai.configure(api_key=key)

try:
    print("Attempting to list models...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"  Available model: {m.name}")
    
    print("\nAttempting to generate test content with gemini-1.5-flash...")
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Say 'Gemini is online' in 3 words.")
    print(f"SUCCESS: Result -> {response.text}")

except Exception as e:
    print(f"\nCRITICAL ERROR: {str(e)}")
    if "API_KEY_INVALID" in str(e):
        print("ACTION: Your API Key is invalid. Please check for extra spaces or typos.")
    elif "quota" in str(e).lower():
        print("ACTION: You have hit the Gemini API quota limits.")
    elif "model not found" in str(e).lower():
        print("ACTION: The model name 'gemini-1.5-flash' might be unavailable in your region.")
