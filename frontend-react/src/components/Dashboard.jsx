import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
   const [isMockData, setIsMockData] = useState(false);
  const [savedUrls, setSavedUrls] = useState(new Set());
  const [summaries, setSummaries] = useState({}); // { articleUrl: 'Summary content' }
  const [summarizingUrls, setSummarizingUrls] = useState(new Set());
  const navigate = useNavigate();

  // Initial fetch of saved articles to sync bookmarks
  useEffect(() => {
    const fetchSavedState = async () => {
      try {
        const userId = localStorage.getItem('user_id');
        const res = await axios.get('/api/news/saved', { 
          headers: { 'X-User-ID': userId },
          withCredentials: true 
        });
        if (res.data.status === 'success') {
          const urls = new Set(res.data.articles.map(a => a.url));
          setSavedUrls(urls);
        }
      } catch (err) {}
    };
    fetchSavedState();
  }, []);

  useEffect(() => {
    fetchHeadlines();
  }, [selectedCategory]);

  const fetchHeadlines = async (query = '') => {
    setIsLoading(true);
    setError('');
    try {
      // Small artificial delay to show off our stunning skeletons securely
      await new Promise(r => setTimeout(r, 600));
      
      let url = '/api/news/headlines';
      let params = { category: selectedCategory };

      if (selectedCategory === 'saved') {
        url = '/api/news/saved';
        params = {};
      } else if (query) {
        url = '/api/news/search';
        params = { q: query };
      }

      const userId = localStorage.getItem('user_id');
      const res = await axios.get(url, { 
        params, 
        headers: { 'X-User-ID': userId },
        withCredentials: true 
      });
      if (res.data.status === 'success') {
        setArticles(res.data.articles);
        if (res.data.is_mock !== undefined) {
          setIsMockData(res.data.is_mock);
        } else {
          setIsMockData(false);
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
         // Not authenticated
         navigate('/login');
      } else {
         setError('Failed to fetch news. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchHeadlines(searchQuery);
    }
  };

  const toggleSaveArticle = async (e, article) => {
    e.preventDefault(); // Prevent navigating to article link
    e.stopPropagation();

    const isCurrentlySaved = savedUrls.has(article.url);
    const apiUrl = isCurrentlySaved ? '/api/news/unsave' : '/api/news/save';
    
    // Optimistic UI Update
    setSavedUrls(prev => {
      const newMap = new Set(prev);
      if (isCurrentlySaved) newMap.delete(article.url);
      else newMap.add(article.url);
      return newMap;
    });

    try {
      const userId = localStorage.getItem('user_id');
      await axios({
        method: isCurrentlySaved ? 'delete' : 'post',
        url: apiUrl,
        data: article,
        headers: { 'X-User-ID': userId },
        withCredentials: true
      });
      // Filter out article immediately if we are viewing the 'saved' tab and we just unsaved it
      if (isCurrentlySaved && selectedCategory === 'saved') {
        setArticles(prev => prev.filter(a => a.url !== article.url));
      }
    } catch (err) {
      console.error('Failed to toggle save:', err);
      // Revert on fail
      setSavedUrls(prev => {
        const newMap = new Set(prev);
        if (isCurrentlySaved) newMap.add(article.url);
        else newMap.delete(article.url);
        return newMap;
      });
    }
  };

  const handleSummarize = async (e, article) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (summaries[article.url] || summarizingUrls.has(article.url)) return;
    
    setSummarizingUrls(prev => new Set(prev).add(article.url));
    
    try {
      const userId = localStorage.getItem('user_id');
      const res = await axios.post('/api/news/summarize', {
        title: article.title,
        description: article.description
      }, { 
        headers: { 'X-User-ID': userId },
        withCredentials: true 
      });
      
      if (res.data.status === 'success') {
        setSummaries(prev => ({ ...prev, [article.url]: res.data.summary }));
      }
    } catch (err) {
      console.error('AI summary failed:', err);
    } finally {
      setSummarizingUrls(prev => {
        const next = new Set(prev);
        next.delete(article.url);
        return next;
      });
    }
  };

  const handleLogout = async () => {
    try {
      await axios.get('/auth/logout', { withCredentials: true });
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex">
      {/* Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200/60 hidden md:flex flex-col z-20">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-gradient-to-br from-gray-900 to-black rounded-lg flex items-center justify-center mr-3 shadow-sm ring-2 ring-gray-900/5">
            <span className="text-white font-bold text-sm tracking-tighter">N</span>
          </div>
          <span className="text-[17px] font-bold text-gray-900 tracking-tight">NovaNews</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="flex flex-col gap-1">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Discover</div>
            <NavItem icon="fa-solid fa-house" label="Home" active={selectedCategory === 'general'} onClick={() => { setSelectedCategory('general'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-fire" label="Top Stories" active={selectedCategory === 'top'} onClick={() => { setSelectedCategory('top'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-bookmark" label="Saved" active={selectedCategory === 'saved'} onClick={() => { setSelectedCategory('saved'); setSearchQuery(''); }} />
            
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-2">Categories</div>
            <NavItem icon="fa-solid fa-microchip" label="Technology" active={selectedCategory === 'technology'} onClick={() => { setSelectedCategory('technology'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-chart-line" label="Business" active={selectedCategory === 'business'} onClick={() => { setSelectedCategory('business'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-flask" label="Science" active={selectedCategory === 'science'} onClick={() => { setSelectedCategory('science'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-running" label="Sports" active={selectedCategory === 'sports'} onClick={() => { setSelectedCategory('sports'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-film" label="Entertainment" active={selectedCategory === 'entertainment'} onClick={() => { setSelectedCategory('entertainment'); setSearchQuery(''); }} />
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="flex items-center w-full gap-3 px-3 py-2 text-[13px] font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors group">
            <i className="fa-solid fa-arrow-right-from-bracket text-gray-400 group-hover:text-gray-600"></i>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-6 flex items-center justify-between">
          <div className="md:hidden flex items-center">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">N</span>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-xl hidden md:flex items-center">
            <form onSubmit={handleSearch} className="relative w-full">
              <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for news, topics, or sources..." 
                className="w-full h-9 pl-10 pr-4 bg-gray-100/50 hover:bg-gray-100 border border-transparent focus:bg-white focus:border-indigo-500/30 focus:ring-2 focus:ring-indigo-500/20 rounded-full text-[14px] transition-all outline-none" 
              />
            </form>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:shadow-sm transition-all focus:outline-none">
              <i className="fa-regular fa-bell"></i>
            </button>
            <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 ring-2 ring-white cursor-pointer hover:ring-indigo-100 transition-all">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1528&auto=format&fit=crop" alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
                {searchQuery ? `Search Results for "${searchQuery}"` : (selectedCategory === 'general' ? 'Good Morning' : (selectedCategory === 'saved' ? 'Saved Articles' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} News`))}
              </h1>
              <p className="text-[14px] text-gray-500">
                {selectedCategory === 'saved' ? 'Your personally curated collection of stories.' : (isMockData ? 'Currently viewing layout mock data (News API not configured).' : 'Here are the top stories tailored for you today.')}
              </p>
            </div>
            <div className="hidden sm:flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
              <button className="px-3 py-1.5 text-[12px] font-medium rounded-md bg-gray-100 text-gray-900">Latest</button>
              <button className="px-3 py-1.5 text-[12px] font-medium rounded-md text-gray-500 hover:text-gray-900">Trending</button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-3">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoading ? (
              // Loading Skeletons
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="w-full h-48 bg-gray-200 rounded-xl animate-pulse"></div>
                  <div className="flex gap-2">
                    <div className="w-16 h-5 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="w-24 h-5 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                  <div className="w-full h-5 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="w-3/4 h-5 bg-gray-200 rounded-md animate-pulse"></div>
                </div>
              ))
            ) : (
              // News Cards
              articles.map(article => (
                <a href={article.url} target="_blank" rel="noopener noreferrer" key={article.id} className="group cursor-pointer flex flex-col h-full">
                  <div className="w-full h-48 rounded-xl overflow-hidden mb-4 relative shadow-sm border border-gray-100/50">
                    <img 
                      src={article.urlToImage} 
                      alt={article.title} 
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Bookmark Button */}
                    <button 
                      onClick={(e) => toggleSaveArticle(e, article)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-gray-700 hover:text-indigo-600 hover:bg-white transition-all shadow-sm z-20"
                    >
                      <i className={savedUrls.has(article.url) ? "fa-solid fa-bookmark text-indigo-600" : "fa-regular fa-bookmark"}></i>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-semibold tracking-wide uppercase">
                      {article.category || 'News'}
                    </span>
                    <span className="text-[12px] text-gray-400 flex items-center gap-1">
                      <i className="fa-regular fa-clock text-[10px]"></i>
                      {article.publishedAt}
                    </span>
                  </div>
                  <h2 className="text-[16px] font-bold text-gray-900 leading-snug mb-2 group-hover:text-indigo-600 transition-colors line-clamp-3">
                    {article.title}
                  </h2>
                  <p className="text-[14px] text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                    {article.description}
                  </p>
                  
                  {/* AI Summary Section */}
                  {summarizingUrls.has(article.url) ? (
                    <div className="mb-4 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 animate-pulse flex items-center gap-2">
                       <i className="fa-solid fa-sparkles text-indigo-500 animate-spin text-[12px]"></i>
                       <span className="text-[12px] font-medium text-indigo-700">AI is thinking...</span>
                    </div>
                  ) : summaries[article.url] ? (
                    <div className="mb-4 p-3 bg-indigo-50/50 rounded-lg border border-indigo-200 relative group/summary">
                       <p className="text-[12.5px] font-medium leading-relaxed text-indigo-900">
                         <i className="fa-solid fa-sparkles text-indigo-500 mr-2"></i>
                         {summaries[article.url]}
                       </p>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => handleSummarize(e, article)}
                      className="mb-4 self-start px-3 py-1.5 rounded-full bg-white border border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center gap-2 text-[12px] font-semibold text-indigo-600 shadow-sm"
                    >
                      <i className="fa-solid fa-sparkles text-[10px]"></i>
                      AI Summary
                    </button>
                  )}

                  <div className="flex items-center gap-2 mt-auto pt-4 border-t border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                      {(article.author && article.author[0] !== 'h') ? article.author.charAt(0).toUpperCase() : 'N'}
                    </div>
                    <span className="text-[13px] font-medium text-gray-700 truncate">{article.author}</span>
                    <span className="text-gray-300 text-[10px]">•</span>
                    <span className="text-[13px] text-gray-500 truncate">{article.source}</span>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper Component
function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={(e) => { e.preventDefault(); onClick(); }} className={`flex items-center w-full justify-start gap-3 px-3 py-2 text-[14px] font-medium rounded-lg transition-all ${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 group'}`}>
      <div className={`w-6 flex justify-center ${active ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
        <i className={icon}></i>
      </div>
      {label}
    </button>
  );
}
