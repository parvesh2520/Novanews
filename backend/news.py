import os
import requests
from flask import Blueprint, jsonify, request, session
import uuid
import sys
import google.generativeai as genai
from db import supabase
from supabase import create_client, ClientOptions

# Configuration will happen inside the summarize function to ensure .env is ready

def get_current_user_id():
    """Returns the current user_id from session or X-User-ID header for cross-domain support."""
    user_id = session.get('user_id')
    if not user_id:
        user_id = request.headers.get('X-User-ID')
    return user_id

def get_auth_supabase():
    """Returns a Supabase client authenticated as the current user, to bypass RLS errors."""
    access_token = session.get('access_token')
    if access_token:
        options = ClientOptions(headers={"Authorization": f"Bearer {access_token}"})
        return create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"), options=options)
    return supabase

news_bp = Blueprint('news', __name__)

MOCK_ARTICLES = [
    {
        "id": "1",
        "title": "The Future of AI: How New Language Models are Changing Software Development",
        "description": "An in-depth look at how the latest generation of large language models is fundamentally altering the day-to-day workflow of software engineers globally.",
        "author": "Marcus Devlin",
        "source": "TechWeekly",
        "urlToImage": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1565&auto=format&fit=crop",
        "publishedAt": "2 hours ago",
        "category": "Technology"
    },
    {
        "id": "2",
        "title": "Global Markets Rally as Inflation Cools Faster Than Expected",
        "description": "Stock indices closed at record highs today following new economic data suggesting that inflation is cooling much faster than central banks had predicted.",
        "author": "Elena Rostova",
        "source": "MarketWatch",
        "urlToImage": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1470&auto=format&fit=crop",
        "publishedAt": "4 hours ago",
        "category": "Business"
    },
    {
        "id": "3",
        "title": "Revolutionary Solid-State Battery Tech Unveiled",
        "description": "A major automotive manufacturer has finally unveiled their highly anticipated solid-state battery technology, promising 500-mile ranges and 10-minute charge times.",
        "author": "Sarah Chen",
        "source": "AutoNews",
        "urlToImage": "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=1472&auto=format&fit=crop",
        "publishedAt": "6 hours ago",
        "category": "Science"
    },
    {
        "id": "4",
        "title": "Design Systems in 2026: The Shift Beyond Components",
        "description": "Exploring how modern design systems are moving from simple component libraries to holistic frameworks governing motion, accessibility, and AI generation.",
        "author": "Javier Gonzalez",
        "source": "Design in Tech",
        "urlToImage": "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1528&auto=format&fit=crop",
        "publishedAt": "8 hours ago",
        "category": "Design"
    },
    {
        "id": "5",
        "title": "The Rise of Specialized Small Language Models (SLMs)",
        "description": "Why enterprises are ditching massive generic models in favor of highly specialized, efficient SLMs running directly on edge devices.",
        "author": "Alex Kim",
        "source": "AI Weekly",
        "urlToImage": "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1632&auto=format&fit=crop",
        "publishedAt": "12 hours ago",
        "category": "Technology"
    },
    {
        "id": "6",
        "title": "Sustainable Aviation Fuel Achieves Major Milestone",
        "description": "The first transatlantic commercial flight powered entirely by 100% sustainable aviation fuel landed successfully this morning.",
        "author": "Priya Patel",
        "source": "EcoTransport",
        "urlToImage": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1474&auto=format&fit=crop",
        "publishedAt": "Yesterday",
        "category": "Environment"
    }
]

def format_newsapi_article(article, category="General"):
    """Format a NewsAPI article to match our frontend schema."""
    # Provide a stylish fallback image if the article has no image
    fallback_image = "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=1470&auto=format&fit=crop"
    
    return {
        "id": str(uuid.uuid4()),
        "title": article.get('title') or 'Untitled',
        "description": article.get('description') or 'No description available for this article.',
        "author": article.get('author') or 'Unknown Author',
        "source": article.get('source', {}).get('name', 'News Source'),
        "urlToImage": article.get('urlToImage') or fallback_image,
        "publishedAt": article.get('publishedAt', '').split('T')[0] if article.get('publishedAt') else 'Recent',
        "url": article.get('url'),
        "category": category.capitalize()
    }

@news_bp.route('/headlines', methods=['GET'])
def get_headlines():
    api_key = os.getenv('NEWS_API_KEY')
    category = request.args.get('category', 'general')
    
    if not api_key or api_key == 'your_news_api_key_here':
        print("DEBUG: Using mock data for headlines (no valid API key)")
        return jsonify({
            "status": "success",
            "articles": MOCK_ARTICLES,
            "is_mock": True
        })

    try:
        # NewsAPI requires either country or sources or category. We'll use country=us + category
        url = f"https://newsapi.org/v2/top-headlines?country=us&category={category}&apiKey={api_key}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            articles = [format_newsapi_article(a, category) for a in data.get('articles', []) if a.get('title') != '[Removed]']
            
            # If API is alive but returned 0 articles (rare), fallback
            if not articles:
                return jsonify({"status": "success", "articles": MOCK_ARTICLES, "is_mock": True})
                
            return jsonify({
                "status": "success",
                "articles": articles,
                "is_mock": False
            })
        else:
            print(f"DEBUG: NewsAPI returned error code {response.status_code}: {response.text}")
            return jsonify({"status": "error", "error": "NewsAPI error", "details": response.text}), response.status_code

    except Exception as e:
        print(f"ERROR: Failed to fetch from NewsAPI: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@news_bp.route('/search', methods=['GET'])
def search_news():
    api_key = os.getenv('NEWS_API_KEY')
    query = request.args.get('q', '')
    
    if not query:
        return jsonify({"status": "error", "error": "Query parameter 'q' is required for search"}), 400

    if not api_key or api_key == 'your_news_api_key_here':
        print("DEBUG: Using mock data for search (no valid API key)")
        return jsonify({
            "status": "success",
            "articles": MOCK_ARTICLES[:3],
            "is_mock": True
        })

    try:
        url = f"https://newsapi.org/v2/everything?q={query}&sortBy=publishedAt&apiKey={api_key}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            articles = [format_newsapi_article(a, 'Search Result') for a in data.get('articles', []) if a.get('title') != '[Removed]']
            return jsonify({
                "status": "success",
                "articles": articles,
                "is_mock": False
            })
        else:
            return jsonify({"status": "error", "error": "NewsAPI error", "details": response.text}), response.status_code

    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@news_bp.route('/summarize', methods=['POST'])
def summarize_article():
    """Uses Google Gemini to provide a 2-sentence summary of the article."""
    # Force reload environment to ensure we aren't using a stale key from process memory
    from dotenv import load_dotenv, find_dotenv
    load_dotenv(find_dotenv(), override=True)
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or "your_gemini_api_key_here" in api_key:
        return jsonify({"status": "error", "error": "AI API Key missing or invalid"}), 500
        
    genai.configure(api_key=api_key)
    ai_model = genai.GenerativeModel('gemma-3-27b-it')  # Using Gemma 3 - confirmed available quota

    data = request.json
    title = data.get('title', '')
    description = data.get('description', '')
    
    if not title and not description:
        return jsonify({"status": "error", "error": "No content to summarize"}), 400
        
    try:
        prompt = f"Summarize this news article in exactly 2 concise, professional sentences. Title: {title}. Content: {description}. Do not include any other text."
        response = ai_model.generate_content(prompt)
        summary_text = response.text.strip()
        
        return jsonify({
            "status": "success",
            "summary": summary_text
        }), 200
    except Exception as e:
        sys.stderr.write(f"DEBUG: Gemini AI error: {str(e)}\n\n")
        sys.stderr.flush()
        return jsonify({"status": "error", "error": f"AI Error: {str(e)}"}), 500

@news_bp.route('/save', methods=['POST'])
def save_article():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"status": "error", "error": "Not authenticated"}), 401
        
    data = request.json
    url = data.get('url')
    if not url:
        return jsonify({"status": "error", "error": "URL is required"}), 400
        
    # Check if already saved
    try:
        user_supabase = get_auth_supabase()
        existing = user_supabase.table('saved_articles').select('*', count='exact').eq('user_id', user_id).eq('url', url).execute()
        if existing.count > 0:
            return jsonify({"status": "success", "message": "Already saved"}), 200
    except Exception as e:
        print(f"DEBUG: Supabase lookup error: {e}")
        # continue to try save anyway
        pass
        
    try:
        new_data = {
            "user_id": user_id,
            "url": url,
            "title": data.get('title', 'Untitled'),
            "description": data.get('description', ''),
            "url_to_image": data.get('urlToImage', ''),
            "author": data.get('author', ''),
            "source_name": data.get('source', ''),
            "published_at": data.get('publishedAt', ''),
            "category": data.get('category', 'General')
        }
        user_supabase = get_auth_supabase()
        user_supabase.table('saved_articles').insert(new_data).execute()
        return jsonify({"status": "success", "message": "Article saved to Supabase"}), 201
    except Exception as e:
        sys.stderr.write(f"DEBUG: Critical Error saving to Supabase: {str(e)}\n\n")
        sys.stderr.flush()
        return jsonify({"status": "error", "error": f"Database write failed: {str(e)}"}), 500

@news_bp.route('/unsave', methods=['DELETE'])
def unsave_article():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"status": "error", "error": "Not authenticated"}), 401
        
    data = request.json
    url = data.get('url')
    if not url:
        return jsonify({"status": "error", "error": "URL is required"}), 400
        
    try:
        user_supabase = get_auth_supabase()
        user_supabase.table('saved_articles').delete().eq('user_id', user_id).eq('url', url).execute()
        return jsonify({"status": "success", "message": "Article removed from Supabase"}), 200
    except Exception as e:
        print(f"DEBUG: Critical Error deleting from Supabase: {str(e)}")
        return jsonify({"status": "error", "error": f"Database delete failed: {str(e)}"}), 500

@news_bp.route('/saved', methods=['GET'])
def get_saved_articles():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"status": "error", "error": "Not authenticated"}), 401
        
    try:
        user_supabase = get_auth_supabase()
        res = user_supabase.table('saved_articles').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        # Format back to frontend schema
        articles = []
        for s in res.data:
            articles.append({
                "id": str(s.get('id', uuid.uuid4())), 
                "title": s.get('title', 'Untitled'),
                "description": s.get('description', ''),
                "author": s.get('author', 'Unknown Author'),
                "source": s.get('source_name', 'News Source'),
                "urlToImage": s.get('url_to_image') or "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=1470&auto=format&fit=crop",
                "publishedAt": s.get('published_at', 'Recent'),
                "url": s.get('url'),
                "category": s.get('category', 'Saved'),
                "isSaved": True
            })
            
        return jsonify({
            "status": "success",
            "articles": articles
        }), 200
    except Exception as e:
        print(f"DEBUG: Critical Error getting from Supabase: {str(e)}")
        # Check if it is a missing table error
        if "relation \"public.saved_articles\" does not exist" in str(e):
             return jsonify({"status": "error", "error": "The 'saved_articles' table does not exist in your Supabase database. Please run the SQL snippet from the implementation plan."}), 500
        return jsonify({"status": "error", "error": f"Database fetch failed: {str(e)}"}), 500
