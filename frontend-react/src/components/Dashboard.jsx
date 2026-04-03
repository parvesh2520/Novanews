import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

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
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const navigate = useNavigate();

  // Auto-rotate Featured Hero Story
  useEffect(() => {
    // Reset featured index when articles/category changes
    setFeaturedIndex(0);

    if (articles.length > 0 && selectedCategory === 'general' && !searchQuery) {
      const timer = setInterval(() => {
        setFeaturedIndex(prev => (prev + 1) % Math.min(articles.length, 5));
      }, 8000);
      return () => clearInterval(timer);
    }
  }, [articles.length, selectedCategory, searchQuery]);

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
    e.preventDefault();
    e.stopPropagation();

    const isCurrentlySaved = savedUrls.has(article.url);
    const apiUrl = isCurrentlySaved ? '/api/news/unsave' : '/api/news/save';
    
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
      if (isCurrentlySaved && selectedCategory === 'saved') {
        setArticles(prev => prev.filter(a => a.url !== article.url));
      }
    } catch (err) {
      console.error('Failed to toggle save:', err);
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
    <div className="min-h-screen bg-[#F9FAFB] font-sans flex relative overflow-hidden">
      {/* Universal Background Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.08)_0,transparent_50%),radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.08)_0,transparent_50%)]"></div>
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-100/10 rounded-full blur-[100px]"></div>
        {/* Gazette Depth Glow */}
        <div className="absolute bottom-[10%] right-[10%] w-[800px] h-[800px] bg-blue-50/5 rounded-full blur-[150px]"></div>
      </div>
      {/* Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 hidden md:flex flex-col z-20">
        <div className="h-16 flex items-center px-8 border-b border-slate-100">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">NovaNews</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="flex flex-col gap-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4">Discover</div>
            <NavItem icon="fa-solid fa-house" label="Home" active={selectedCategory === 'general'} onClick={() => { setSelectedCategory('general'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-bolt" label="Top Stories" active={selectedCategory === 'top'} onClick={() => { setSelectedCategory('top'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-bookmark" label="Saved" active={selectedCategory === 'saved'} onClick={() => { setSelectedCategory('saved'); setSearchQuery(''); }} />
            
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6 px-4">Categories</div>
            <NavItem icon="fa-solid fa-microchip" label="Technology" active={selectedCategory === 'technology'} onClick={() => { setSelectedCategory('technology'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-chart-line" label="Business" active={selectedCategory === 'business'} onClick={() => { setSelectedCategory('business'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-vial" label="Science" active={selectedCategory === 'science'} onClick={() => { setSelectedCategory('science'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-trophy" label="Sports" active={selectedCategory === 'sports'} onClick={() => { setSelectedCategory('sports'); setSearchQuery(''); }} />
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center w-full gap-3 px-4 py-2.5 text-sm font-medium text-slate-500 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors group">
            <i className="fa-solid fa-arrow-right-from-bracket text-slate-400 group-hover:text-slate-600"></i>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen relative z-10">
        {/* Header */}
        <header className="h-16 sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between">
          {/* NovaFlair Header Accent */}
          <div className="absolute bottom-[-1px] left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent pointer-events-none"></div>
          <div className="md:hidden flex items-center">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">N</span>
            </div>
          </div>

          <div className="flex-1 max-w-2xl hidden md:flex items-center">
            <form onSubmit={handleSearch} className="relative w-full">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..." 
                className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md text-sm transition-all outline-none" 
              />
            </form>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
              <i className="fa-regular fa-bell"></i>
            </button>
            
            <div className="relative">
              <div 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 cursor-pointer hover:border-slate-400 transition-colors"
              >
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1528&auto=format&fit=crop" alt="Profile" className="w-full h-full object-cover" />
              </div>

              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsProfileMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30">
                    <div className="px-4 py-2 border-b border-slate-50 mb-1">
                       <p className="text-xs font-bold text-slate-900">Parvesh Kumar</p>
                       <p className="text-[10px] text-slate-500 truncate">parvesh2520@gmail.com</p>
                    </div>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 font-medium">
                       <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 lg:p-12 max-w-6xl mx-auto w-full">
          {/* Hero Featured Story (Static) */}
          {!isLoading && articles.length > 0 && selectedCategory === 'general' && !searchQuery && articles[featuredIndex] && (
            <div 
              key={featuredIndex}
              className="mb-16 relative"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                  <div className="order-2 lg:order-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest block">Featured Report</span>
                      <div className="flex gap-1.5">
                        {[...Array(Math.min(articles.length, 5))].map((_, i) => (
                          <div 
                            key={i} 
                            onClick={() => setFeaturedIndex(i)}
                            className={cn(
                              "w-1 h-1 rounded-full transition-all cursor-pointer",
                              i === featuredIndex ? "bg-indigo-600 w-3" : "bg-slate-200 hover:bg-slate-300"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-[1.1] tracking-tight">
                      {articles[featuredIndex].title}
                    </h1>
                    <p className="text-slate-500 text-lg mb-8 leading-relaxed line-clamp-3">
                      {articles[featuredIndex].description}
                    </p>
                    <div className="flex items-center gap-4">
                      <a href={articles[featuredIndex].url} target="_blank" rel="noreferrer" className="px-6 py-2.5 bg-slate-900 text-white rounded-md font-medium text-sm hover:bg-slate-800 transition-colors">
                        Read Full Story
                      </a>
                      <button 
                        onClick={(e) => handleSummarize(e, articles[featuredIndex])}
                        disabled={summarizingUrls.has(articles[featuredIndex].url)}
                        className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-md font-medium text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                      >
                         {summarizingUrls.has(articles[featuredIndex].url) ? (
                           <div className="nova-spinner"></div>
                         ) : (
                           <i className="fa-solid fa-sparkles text-indigo-500"></i>
                         )}
                         {summaries[articles[featuredIndex].url] ? 'Summarized' : 'AI Summary'}
                      </button>
                    </div>
                  </div>
                  <div className="order-1 lg:order-2">
                    <div className="aspect-[16/9] rounded-xl overflow-hidden shadow-soft border border-slate-200">
                      <img src={articles[featuredIndex].urlToImage} className="w-full h-full object-cover" alt="Featured" />
                    </div>
                  </div>
                </div>
                
                {summaries[articles[featuredIndex].url] && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-10 p-6 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <p className="text-sm text-slate-800 leading-relaxed font-medium italic">
                       <i className="fa-solid fa-sparkles text-indigo-500 mr-2"></i>
                      {summaries[articles[featuredIndex].url]}
                    </p>
                  </motion.div>
                )}
            </div>
          )}

          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-bold text-slate-900">
               {selectedCategory === 'saved' ? 'Saved Articles' : 'Recent Updates'}
            </h2>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>

          <div 
             className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {isLoading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <div className="w-full aspect-[16/10] bg-slate-100 rounded-lg animate-pulse" />
                  <div className="w-full h-4 bg-slate-100 rounded animate-pulse" />
                  <div className="w-2/3 h-4 bg-slate-100 rounded animate-pulse" />
                </div>
              ))
            ) : (
              articles.map((article, index) => (
                <NewsCard 
                  key={article.url} 
                  article={article} 
                  index={index}
                  savedUrls={savedUrls}
                  toggleSaveArticle={toggleSaveArticle}
                  summaries={summaries}
                  summarizingUrls={summarizingUrls}
                  handleSummarize={handleSummarize}
                />
              ))
            )}
          </div>
        </div>
      </main>

      <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white border border-slate-200 rounded-xl px-6 py-3 flex justify-between items-center z-50 shadow-lg">
        <MobileNavItem icon="fa-solid fa-house" label="Home" active={selectedCategory === 'general'} onClick={() => { setSelectedCategory('general'); setSearchQuery(''); }} />
        <MobileNavItem icon="fa-solid fa-bookmark" label="Saved" active={selectedCategory === 'saved'} onClick={() => { setSelectedCategory('saved'); setSearchQuery(''); }} />
        <MobileNavItem icon="fa-solid fa-bars" label="Menu" active={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[60] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="relative w-72 h-full bg-white shadow-xl flex flex-col p-8">
                <nav className="flex flex-col gap-2">
                  <NavItem icon="fa-solid fa-microchip" label="Technology" active={selectedCategory === 'technology'} onClick={() => { setSelectedCategory('technology'); setIsMobileMenuOpen(false); }} />
                  <NavItem icon="fa-solid fa-chart-line" label="Business" active={selectedCategory === 'business'} onClick={() => { setSelectedCategory('business'); setIsMobileMenuOpen(false); }} />
                  <div className="h-px bg-slate-100 my-4"></div>
                  <button onClick={handleLogout} className="text-sm font-bold text-red-500 px-4 py-2 text-left">Sign out</button>
                </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-components
function NewsCard({ article, index, savedUrls, toggleSaveArticle, summaries, summarizingUrls, handleSummarize }) {
  return (
    <div
      className="group flex flex-col h-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
    >
      <div className="w-full aspect-[16/10] rounded-lg overflow-hidden mb-5 relative bg-slate-100 ring-1 ring-slate-900/5 shadow-inner">
        <img 
          src={article.urlToImage} 
          alt={article.title} 
          className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors pointer-events-none" />
        <button 
          onClick={(e) => toggleSaveArticle(e, article)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:scale-105 active:scale-95 transition-all z-20 shadow-sm"
        >
          <i className={savedUrls.has(article.url) ? "fa-solid fa-bookmark text-indigo-600" : "fa-regular fa-bookmark"}></i>
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 rounded-sm bg-slate-50 border border-slate-100/50 text-[9px] font-bold text-slate-500 uppercase tracking-[0.1em]">{article.source}</span>
        <span className="text-[10px] text-slate-400 font-medium tracking-tight">{article.publishedAt}</span>
      </div>

      <h3 className="text-[15px] font-bold text-slate-900 leading-snug mb-2.5 group-hover:text-indigo-600 transition-colors line-clamp-2">
        {article.title}
      </h3>
      
      <p className="text-[13px] text-slate-500 line-clamp-3 mb-6 leading-relaxed font-medium">
        {article.description}
      </p>

      {summaries[article.url] && (
        <div className="mb-6 p-4 bg-indigo-50/40 rounded-lg border border-indigo-100/50">
          <p className="text-xs font-semibold leading-relaxed text-slate-700 italic">
            <i className="fa-solid fa-sparkles text-indigo-500 mr-2 text-[10px]"></i>
            {summaries[article.url]}
          </p>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-5 border-t border-slate-50">
        <a 
          href={article.url} 
          target="_blank" 
          rel="noreferrer" 
          className="text-xs font-bold text-slate-400 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5"
        >
          Read Report <i className="fa-solid fa-arrow-right text-[9px] translate-x-0 group-hover:translate-x-0.5 transition-transform"></i>
        </a>
        <button 
          className="text-[11px] font-bold text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1.5"
          title="AI Summary"
          disabled={summarizingUrls.has(article.url)}
        >
          {summarizingUrls.has(article.url) ? (
            <div className="nova-spinner"></div>
          ) : (
            <i className={cn("fa-solid fa-sparkles text-[10px]", summaries[article.url] ? "text-indigo-600" : "text-slate-300")}></i>
          )}
          {summaries[article.url] ? 'Summarized' : 'AI Analysis'}
        </button>
      </div>
    </div>
  );
}

function MobileNavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={cn(
      "flex flex-col items-center gap-1 p-1 transition-colors",
      active ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
    )}>
       <i className={cn(icon, "text-lg")}></i>
       <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={(e) => { e.preventDefault(); onClick(); }} 
      className={cn(
        "flex items-center w-full gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
        active 
          ? "bg-slate-900 text-white" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <div className={cn("w-5 flex justify-center text-base", active ? "text-white" : "text-slate-400")}>
        <i className={icon}></i>
      </div>
      <span>{label}</span>
      {active && (
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        </div>
      )}
    </button>
  );
}
