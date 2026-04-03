import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // 1. Check for modern PKCE flow (Code in query params: ?code=...)
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get('code');

      if (code) {
        try {
          const res = await axios.post('/auth/exchange-code', { code }, { withCredentials: true });
          if (res.data.status === 'success') {
            if (res.data.user_id) localStorage.setItem('user_id', res.data.user_id);
            navigate('/dashboard');
            return;
          }
        } catch (err) {
          console.error('Code Exchange Error:', err);
        }
      }

      // 2. Fallback to Legacy Implicit flow (Tokens in fragment: #access_token=...)
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        
        if (accessToken) {
          try {
            const res = await axios.post('/auth/verify-session', { access_token: accessToken }, { withCredentials: true });
            if (res.data.status === 'success') {
              if (res.data.user_id) localStorage.setItem('user_id', res.data.user_id);
              navigate('/dashboard');
              return;
            }
          } catch (err) {
            console.error('Session Sync Error:', err);
          }
        }
      }

      // If no valid auth data found or both failed
      navigate('/login');
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center font-sans">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-6"></div>
      <h2 className="text-xl font-bold text-slate-900 tracking-tight">Authenticating...</h2>
      <p className="text-xs text-slate-500 mt-2">Preparing your professional news portal</p>
    </div>
  );
}
