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
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-100 hidden md:flex flex-col z-20">
        <div className="h-20 flex items-center px-8">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center mr-3 shadow-sm">
            <span className="text-white font-bold text-sm tracking-tight">N</span>
          </div>
          <span className="text-[17px] font-bold text-slate-900 tracking-tight">NovaNews</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-8 px-6">
          <nav className="flex flex-col gap-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 px-2">Discover</div>
            <NavItem icon="fa-solid fa-house" label="Home" active={selectedCategory === 'general'} onClick={() => { setSelectedCategory('general'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-bolt" label="Top Stories" active={selectedCategory === 'top'} onClick={() => { setSelectedCategory('top'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-bookmark" label="Saved" active={selectedCategory === 'saved'} onClick={() => { setSelectedCategory('saved'); setSearchQuery(''); }} />
            
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 mt-8 px-2">Categories</div>
            <NavItem icon="fa-solid fa-microchip" label="Technology" active={selectedCategory === 'technology'} onClick={() => { setSelectedCategory('technology'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-chart-pie" label="Business" active={selectedCategory === 'business'} onClick={() => { setSelectedCategory('business'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-flask" label="Science" active={selectedCategory === 'science'} onClick={() => { setSelectedCategory('science'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-medal" label="Sports" active={selectedCategory === 'sports'} onClick={() => { setSelectedCategory('sports'); setSearchQuery(''); }} />
            <NavItem icon="fa-solid fa-clapperboard" label="Entertainment" active={selectedCategory === 'entertainment'} onClick={() => { setSelectedCategory('entertainment'); setSearchQuery(''); }} />
          </nav>
        </div>

        <div className="p-8">
          <button onClick={handleLogout} className="flex items-center w-full gap-3 px-2 py-2 text-[13px] font-semibold text-slate-400 hover:text-slate-900 transition-colors group">
            <i className="fa-solid fa-power-off text-slate-300 group-hover:text-slate-900 transition-colors"></i>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen relative z-10">
        {/* Header */}
        <header className="h-20 sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 flex items-center justify-between shadow-sm">
          <div className="md:hidden flex items-center">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center mr-3 shadow-md">
              <span className="text-white font-bold text-sm">N</span>
            </div>
          </div>

          {/* Mobile Search Icon Toggle */}
          <div className="md:hidden flex items-center">
             <button 
               onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
               className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
             >
               <i className={`fa-solid ${isMobileSearchOpen ? 'fa-xmark' : 'fa-search'} text-lg`}></i>
             </button>
          </div>

          {/* Desktop Search (Original) */}
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

          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <button className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:shadow-sm transition-all focus:outline-none">
              <i className="fa-regular fa-bell"></i>
            </button>
            
            {/* Profile Dropdown Container */}
            <div className="relative">
              <div 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 ring-2 ring-white cursor-pointer hover:ring-indigo-100 transition-all active:scale-95"
              >
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1528&auto=format&fit=crop" alt="Profile" className="w-full h-full object-cover" />
              </div>

              {/* Profile Menu Dropdown */}
              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsProfileMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-30 animate-scale-in">
                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                       <p className="text-[13px] font-bold text-gray-900">Parvesh Kumar</p>
                       <p className="text-[11px] text-gray-500 truncate">parvesh2520@gmail.com</p>
                    </div>
                    <button className="w-full text-left px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors flex items-center gap-3 font-medium">
                       <i className="fa-regular fa-user text-[14px]"></i>
                       My Profile
                    </button>
                    <button className="w-full text-left px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors flex items-center gap-3 font-medium">
                       <i className="fa-regular fa-gear text-[14px]"></i>
                       Settings
                    </button>
                    <div className="h-px bg-gray-50 my-1"></div>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors flex items-center gap-3 font-semibold"
                    >
                       <i className="fa-solid fa-right-from-bracket text-[14px]"></i>
                       Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Search Bar (Appears when toggled) */}
        {isMobileSearchOpen && (
          <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-16 z-10 animate-slide-down">
             <form onSubmit={(e) => { handleSearch(e); setIsMobileSearchOpen(false); }} className="relative w-full">
                <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search NovaNews..." 
                  className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-[15px] focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                  autoFocus
                />
             </form>
          </div>
        )}

        {/* Dashboard Content */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {/* Hero Featured Story */}
          <AnimatePresence mode="wait">
            {!isLoading && articles.length > 0 && selectedCategory === 'general' && !searchQuery && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="mb-16"
              >
                <div className="group relative w-full h-[500px] rounded-[1.5rem] overflow-hidden shadow-premium border border-slate-100">
                  <img src={articles[0].urlToImage} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" alt="Featured" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                  
                  <div className="absolute bottom-0 left-0 p-10 md:p-16 w-full md:w-2/3">
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-2 mb-6"
                    >
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                      <span className="text-[11px] font-bold text-white/70 uppercase tracking-[0.2em]">Featured Today</span>
                    </motion.div>
                    <motion.h1 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl md:text-5xl font-bold text-white mb-8 leading-[1.1] tracking-tight"
                    >
                      {articles[0].title}
                    </motion.h1>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-4"
                    >
                      <a href={articles[0].url} target="_blank" rel="noreferrer" className="px-8 py-3 bg-white text-slate-950 rounded-xl font-bold text-[14px] hover:bg-slate-50 transition-all shadow-xl">
                        Full Story
                      </a>
                      <button 
                        onClick={(e) => handleSummarize(e, articles[0])}
                        className="px-6 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-2"
                      >
                         <i className="fa-solid fa-sparkles text-indigo-300"></i>
                         <span className="font-bold text-[14px]">AI Analysis</span>
                      </button>
                    </motion.div>
                  </div>
                </div>
                
                {/* Hero AI Summary Overlay */}
                {summaries[articles[0].url] && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-10 bg-white rounded-[1.5rem] border border-slate-100 shadow-premium"
                  >
                    <p className="text-[17px] font-medium text-slate-800 leading-relaxed italic">
                      {summaries[articles[0].url]}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grid Header */}
          <div className="flex items-center justify-between mb-12">
             <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                   {selectedCategory === 'saved' ? 'Your Anthology' : 'Recent Updates'}
                </h2>
                <div className="h-px w-12 bg-slate-200"></div>
             </div>
          </div>

          <motion.div 
             layout
             className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-12"
          >
            {isLoading ? (
              // Refined Skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-6">
                  <div className="w-full h-64 bg-slate-100 rounded-2xl animate-pulse"></div>
                  <div className="space-y-4">
                    <div className="w-1/3 h-4 bg-slate-100 rounded-full animate-pulse"></div>
                    <div className="w-full h-6 bg-slate-100 rounded-lg animate-pulse"></div>
                    <div className="w-2/3 h-6 bg-slate-100 rounded-lg animate-pulse"></div>
                  </div>
                </div>
              ))
            ) : (
              // Minimal News Cards
              <AnimatePresence>
                {articles.map((article, index) => (
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
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        </div>
      </main>

      {/* Mobile Navigation (Minimalist) */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-slate-900 rounded-2xl px-8 py-5 flex justify-between items-center z-50 shadow-2xl border border-white/5">
        <MobileNavItem icon="fa-solid fa-house" label="Home" active={selectedCategory === 'general'} onClick={() => { setSelectedCategory('general'); setSearchQuery(''); }} />
        <MobileNavItem icon="fa-solid fa-bookmark" label="Saved" active={selectedCategory === 'saved'} onClick={() => { setSelectedCategory('saved'); setSearchQuery(''); }} />
        <MobileNavItem icon="fa-solid fa-magnifying-glass" label="Search" active={isMobileSearchOpen} onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)} />
        <MobileNavItem icon="fa-solid fa-bars" label="Menu" active={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
      </nav>

      {/* Mobile Side Menu/Drawer (Enhanced) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[60] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-80 h-full bg-white shadow-2xl flex flex-col p-10"
            >
                <div className="flex items-center justify-between mb-12">
                  <span className="text-2xl font-black text-slate-900 tracking-tight font-outfit">Topics</span>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
                      <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <nav className="flex flex-col gap-3 overflow-y-auto">
                  <NavItem icon="fa-solid fa-microchip" label="Technology" active={selectedCategory === 'technology'} onClick={() => { setSelectedCategory('technology'); setIsMobileMenuOpen(false); }} />
                  <NavItem icon="fa-solid fa-chart-pie" label="Business" active={selectedCategory === 'business'} onClick={() => { setSelectedCategory('business'); setIsMobileMenuOpen(false); }} />
                  <NavItem icon="fa-solid fa-vial-virus" label="Science" active={selectedCategory === 'science'} onClick={() => { setSelectedCategory('science'); setIsMobileMenuOpen(false); }} />
                  <NavItem icon="fa-solid fa-medal" label="Sports" active={selectedCategory === 'sports'} onClick={() => { setSelectedCategory('sports'); setIsMobileMenuOpen(false); }} />
                  <NavItem icon="fa-solid fa-clapperboard" label="Entertainment" active={selectedCategory === 'entertainment'} onClick={() => { setSelectedCategory('entertainment'); setIsMobileMenuOpen(false); }} />
                  <div className="h-px bg-slate-100 my-8"></div>
                  <button onClick={handleLogout} className="flex items-center gap-4 px-4 py-4 text-[15px] font-bold text-red-500 rounded-2xl hover:bg-red-50 transition-colors">
                      <i className="fa-solid fa-power-off"></i>
                      Sign out
                  </button>
                </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-components for better performance and Framer Motion logic
function NewsCard({ 
  article, 
  index, 
  savedUrls, 
  toggleSaveArticle, 
  summaries, 
  summarizingUrls, 
  handleSummarize 
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (index % 6) * 0.05 }}
      className="group flex flex-col h-full bg-white rounded-2xl p-5 border border-slate-100/60 transition-all hover:shadow-premium ring-1 ring-black/5"
    >
      <div className="w-full h-56 rounded-xl overflow-hidden mb-6 relative border border-slate-50">
        <img 
          src={article.urlToImage} 
          alt={article.title} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
        />
        
        {/* Bookmark Button */}
        <button 
          onClick={(e) => toggleSaveArticle(e, article)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-600 hover:text-slate-950 transition-all z-20"
        >
          <i className={savedUrls.has(article.url) ? "fa-solid fa-bookmark text-slate-900" : "fa-regular fa-bookmark"}></i>
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {article.category || 'Focus'}
        </span>
        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
        <span className="text-[11px] text-slate-400 font-medium">
          {article.publishedAt}
        </span>
      </div>

      <h2 className="text-[17px] font-bold text-slate-950 leading-[1.4] mb-3 group-hover:underline decoration-slate-200 transition-all line-clamp-2">
        {article.title}
      </h2>
      
      <p className="text-[14px] text-slate-500 line-clamp-2 mb-6 leading-relaxed">
        {article.description}
      </p>

      {/* AI Summary Section (Minimal) */}
      <AnimatePresence>
        {summaries[article.url] && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-slate-50 rounded-xl"
          >
            <p className="text-[12px] font-medium leading-relaxed text-slate-700 italic">
              {summaries[article.url]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto flex items-center gap-3 pt-6 border-t border-slate-50">
        <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
          {(article.author && article.author[0] !== 'h') ? article.author.charAt(0).toUpperCase() : 'N'}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[12px] font-bold text-slate-700 truncate">{article.author}</span>
          <span className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-tighter">{article.source}</span>
        </div>
        <button 
           onClick={(e) => handleSummarize(e, article)}
           className="ml-auto w-8 h-8 rounded-lg text-slate-300 hover:text-indigo-500 transition-colors"
        >
          <i className="fa-solid fa-sparkles text-[14px]"></i>
        </button>
      </div>
    </motion.div>
  );
}

// Helper Components
function MobileNavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={cn(
      "flex flex-col items-center gap-1 p-1 transition-all active:scale-95",
      active ? "text-white" : "text-slate-500"
    )}>
       <i className={cn(icon, "text-lg")}></i>
       <span className="text-[9px] font-bold uppercase tracking-tight">{label}</span>
    </button>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={(e) => { e.preventDefault(); onClick(); }} 
      className={cn(
        "flex items-center w-full group justify-start gap-4 px-4 py-2.5 text-[14px] font-semibold rounded-xl transition-all duration-200",
        active 
          ? "bg-slate-50 text-slate-950" 
          : "text-slate-400 hover:text-slate-900"
      )}
    >
      <div className={cn(
        "w-5 flex justify-center text-base",
        active ? "text-slate-900" : "text-slate-300 group-hover:text-slate-900"
      )}>
        <i className={icon}></i>
      </div>
      <span className="tracking-tight">{label}</span>
      {active && (
        <div className="ml-auto w-1 h-1 rounded-full bg-slate-900" />
      )}
    </button>
  );
}
