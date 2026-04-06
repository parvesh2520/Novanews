# NovaNews

NovaNews is a full-stack, AI-enhanced news portal that provides personalized news feeds, AI summarization of articles, user authentication, and bookmarking.

## Architecture

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion
- **Backend:** Python, Flask, Google Generative AI (Gemini), Supabase
- **Database:** PostgreSQL (via Supabase)

## Prerequisites

Before running the application, make sure you have the following installed:
- Node.js (v18+)
- Python 3.9+

You will also need API keys for:
- [NewsAPI](https://newsapi.org/)
- [Google Gemini API](https://aistudio.google.com/)
- [Supabase](https://supabase.com/) (URL and Key)

## Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/parvesh2520/Novanews.git
cd Novanews
```

### 2. Backend Setup
Navigate to the root directory and set up the Python environment:
```bash
cd backend
python -m venv venv_new

# On Windows:
venv_new\Scripts\activate
# On macOS/Linux:
# source venv_new/bin/activate

pip install -r requirements.txt
```

Set up your `.env` file in the root directory of the project with your credentials:
```env
DATABASE_URL=your_database_url
SECRET_KEY=your_secret_key
NEWS_API_KEY=your_news_api_key
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

Run the Flask application (make sure you are in the `backend` directory):
```bash
python app.py
```
The backend should now be running on `http://127.0.0.1:5000`.

### 3. Database Setup (Supabase / PostgreSQL)
If you are setting up your own database, you must create the necessary tables. You can run the following SQL queries directly in the Supabase SQL Editor (or your local PostgreSQL CLI):

```sql
-- 1. Enable UUID generation (usually active by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the `users` table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

-- 3. Create the `saved_articles` table for the bookmarking feature
CREATE TABLE IF NOT EXISTS public.saved_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    url_to_image TEXT,
    author TEXT,
    source_name TEXT,
    published_at TEXT,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, url)
);

-- Optional: Disable Row Level Security (RLS) if resolving permission issues
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_articles DISABLE ROW LEVEL SECURITY;
```

### 4. Frontend Setup
Open a new terminal, navigate to the frontend directory:
```bash
cd frontend-react
npm install
```

Start the Vite development server:
```bash
npm run dev
```

The frontend should now be running. Usually, this is at `http://localhost:5173`. Open this URL in your browser to access NovaNews!

## Features
- Real-time news fetching using NewsAPI
- AI-generated summaries of news articles using Gemini
- User authentication
- Save / Bookmark favorite articles
- Modern, responsive UI with Tailwind CSS
