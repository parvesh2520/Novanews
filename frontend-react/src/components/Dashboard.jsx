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
    <div className="min-h-screen bg-white font-sans flex text-slate-900">
      {/* Editorial Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-100 hidden md:flex flex-col z-20">
        <div className="h-16 flex items-center px-8">
          <span className="text-[15px] font-bold tracking-[0.2em] uppercase text-slate-950">NovaNews</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-10 px-8">
          <nav className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <NavItem icon="fa-solid fa-house" label="Overview" active={selectedCategory === 'general'} onClick={() => { setSelectedCategory('general'); setSearchQuery(''); }} />
              <NavItem icon="fa-solid fa-bolt" label="Latest" active={selectedCategory === 'top'} onClick={() => { setSelectedCategory('top'); setSearchQuery(''); }} />
              <NavItem icon="fa-solid fa-bookmark" label="Archive" active={selectedCategory === 'saved'} onClick={() => { setSelectedCategory('saved'); setSearchQuery(''); }} />
            </div>
            
            <div className="pt-6 border-t border-slate-50">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Focus</div>
              <div className="flex flex-col gap-1">
                <NavItem icon="" label="Technology" active={selectedCategory === 'technology'} onClick={() => { setSelectedCategory('technology'); setSearchQuery(''); }} />
                <NavItem icon="" label="Business" active={selectedCategory === 'business'} onClick={() => { setSelectedCategory('business'); setSearchQuery(''); }} />
                <NavItem icon="" label="Science" active={selectedCategory === 'science'} onClick={() => { setSelectedCategory('science'); setSearchQuery(''); }} />
                <NavItem icon="" label="Sports" active={selectedCategory === 'sports'} onClick={() => { setSelectedCategory('sports'); setSearchQuery(''); }} />
                <NavItem icon="" label="Culture" active={selectedCategory === 'entertainment'} onClick={() => { setSelectedCategory('entertainment'); setSearchQuery(''); }} />
              </div>
            </div>
          </nav>
        </div>

        <div className="p-8 border-t border-slate-50">
          <button onClick={handleLogout} className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors">
            Exit Portal
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Minimal Header */}
        <header className="h-16 sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-50 px-8 flex items-center justify-between">
          <div className="md:hidden">
            <span className="text-[13px] font-black tracking-widest text-slate-900">NN</span>
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

          {/* Search Field */}
          <div className="flex-1 max-w-sm hidden md:flex items-center">
            <form onSubmit={handleSearch} className="w-full">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find a story..." 
                className="w-full h-8 bg-transparent text-[13px] border-b border-transparent focus:border-slate-900 transition-all outline-none" 
              />
            </form>
          </div>
          
          <div className="flex items-center gap-6 ml-auto">
            <button className="text-slate-400 hover:text-slate-900 transition-colors">
              <i className="fa-regular fa-bell text-[14px]"></i>
            </button>
            
            <div 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="relative flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-7 h-7 bg-slate-100 rounded-full overflow-hidden border border-slate-100 grayscale hover:grayscale-0 transition-all">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1528&auto=format&fit=crop" alt="Profile" className="w-full h-full object-cover" />
              </div>
              <span className="text-[12px] font-bold text-slate-900 hidden lg:block">Parvesh K.</span>
              
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-full mt-4 w-44 bg-white border border-slate-100 py-2 shadow-2xl z-50">
                  <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-500">Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-8 md:p-16 max-w-7xl mx-auto w-full">
          {/* Editorial Hero Area */}
          <AnimatePresence mode="wait">
            {!isLoading && articles.length > 0 && selectedCategory === 'general' && !searchQuery && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-24 flex flex-col lg:flex-row gap-12 lg:items-center"
              >
                <div className="w-full lg:w-3/5">
                  <div className="relative aspect-[16/10] overflow-hidden grayscale hover:grayscale-0 transition-all duration-700">
                    <img src={articles[0].urlToImage} className="w-full h-full object-cover" alt="Cover" />
                  </div>
                </div>
                
                <div className="w-full lg:w-2/5 py-4">
                  <div className="flex flex-col gap-6">
                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Lead Story</div>
                    <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 leading-[1.15] tracking-tight">
                      {articles[0].title}
                    </h1>
                    <p className="text-slate-500 text-[15px] leading-relaxed">
                      {articles[0].description}
                    </p>
                    <div className="flex items-center gap-8 pt-4">
                      <a href={articles[0].url} target="_blank" rel="noreferrer" className="text-[12px] font-bold uppercase tracking-widest text-slate-950 border-b border-slate-950 pb-1">
                        Read Online
                      </a>
                      <button 
                        onClick={(e) => handleSummarize(e, articles[0])}
                        className="text-[12px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-950 transition-colors"
                      >
                         AI Synopsis
                      </button>
                    </div>
                  </div>
                  
                  {summaries[articles[0].url] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-10 p-8 bg-slate-50 border-l border-slate-900"
                    >
                      <p className="text-[14px] text-slate-700 leading-relaxed italic">
                        {summaries[articles[0].url]}
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-px bg-slate-100 mb-16"></div>

          {/* Grid Layout Filter Bar */}
          <div className="flex items-center justify-between mb-12">
             <div className="flex flex-col gap-1">
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Current Feed</h2>
                <span className="text-[15px] font-semibold text-slate-900">{selectedCategory === 'saved' ? 'Curated Archives' : 'Global Pulse'}</span>
             </div>
          </div>

          <motion.div 
             layout
             className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-20 gap-x-12"
          >
            {isLoading ? (
              // Enhanced Editorial Skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-6">
                  <div className="w-full h-56 bg-slate-50"></div>
                  <div className="space-y-3">
                    <div className="w-16 h-3 bg-slate-50"></div>
                    <div className="w-full h-10 bg-slate-50"></div>
                  </div>
                </div>
              ))
            ) : (
              // Editorial News Cards
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

      {/* Mobile Nav Refinement */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-slate-950 rounded-full px-8 py-4 flex justify-between items-center z-50 shadow-2xl">
        <MobileNavItem icon="fa-solid fa-house" label="" active={selectedCategory === 'general'} onClick={() => { setSelectedCategory('general'); setSearchQuery(''); }} />
        <MobileNavItem icon="fa-solid fa-bookmark" label="" active={selectedCategory === 'saved'} onClick={() => { setSelectedCategory('saved'); setSearchQuery(''); }} />
        <MobileNavItem icon="fa-solid fa-magnifying-glass" label="" active={isMobileSearchOpen} onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)} />
        <MobileNavItem icon="fa-solid fa-bars" label="" active={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: (index % 6) * 0.05 }}
      className="group flex flex-col h-full bg-white transition-all overflow-hidden"
    >
      <div className="w-full aspect-[4/3] overflow-hidden mb-6 relative grayscale hover:grayscale-0 transition-all duration-700">
        <img 
          src={article.urlToImage} 
          alt={article.title} 
          className="w-full h-full object-cover"
        />
        
        {/* Minimal Bookmark */}
        <button 
          onClick={(e) => toggleSaveArticle(e, article)}
          className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-white mix-blend-difference hover:scale-110 transition-transform z-20"
        >
          <i className={savedUrls.has(article.url) ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark"}></i>
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          {article.source}
        </span>
      </div>

      <h2 className="text-[18px] font-semibold text-slate-950 leading-[1.3] mb-4 tracking-tight group-hover:text-slate-600 transition-colors">
        {article.title}
      </h2>
      
      {/* AI Summary Subsection */}
      <AnimatePresence>
        {summaries[article.url] && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-slate-50 border-l border-slate-900"
          >
            <p className="text-[12px] font-medium leading-relaxed text-slate-700 italic">
              {summaries[article.url]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{article.publishedAt}</span>
        <button 
           onClick={(e) => handleSummarize(e, article)}
           className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-950 flex items-center gap-2 transition-colors"
        >
          Analysis
        </button>
      </div>
    </motion.div>
  );
}

// Helper Components
function MobileNavItem({ icon, active, onClick }) {
  return (
    <button onClick={onClick} className={cn(
      "p-3 rounded-full transition-all active:scale-90",
      active ? "text-white bg-white/10" : "text-slate-500"
    )}>
       <i className={cn(icon, "text-xl")}></i>
    </button>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={(e) => { e.preventDefault(); onClick(); }} 
      className={cn(
        "flex items-center w-full group justify-start gap-4 py-1 text-[13px] font-bold uppercase tracking-[0.1em] transition-all",
        active 
          ? "text-slate-950" 
          : "text-slate-400 hover:text-slate-950"
      )}
    >
      {icon && <i className={cn(icon, active ? "text-slate-900" : "text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity")}></i>}
      <span className="tracking-tight">{label}</span>
    </button>
  );
}
