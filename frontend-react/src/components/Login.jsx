import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/auth/login', {
        email,
        password
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true // needed if relying on sessions/cookies
      });

      if (response.data.status === 'success') {
        const { user_id } = response.data;
        if (user_id) {
          localStorage.setItem('user_id', user_id);
        }
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to sign in';
      if (errorMsg.toLowerCase().includes('email not confirmed')) {
        setError('Your email is not confirmed in Supabase! Please go to your Supabase Dashboard -> Authentication -> Users and "Confirm User" manually.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative font-sans">
      {/* Background Glow & Patterns */}
      <div className="fixed inset-0 pointer-events-none flex justify-center items-center overflow-hidden z-0 bg-slate-50/50">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[600px] bg-indigo-300/30 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[500px] bg-blue-300/30 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="w-full max-w-[400px] relative z-10">
        <div className="bg-white/80 backdrop-blur-2xl rounded-2xl shadow-[0_16px_60px_rgba(0,0,0,0.08)] border border-white/60 p-8 overflow-hidden relative">
          {/* Top Brand Line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500"></div>

          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-900 to-black rounded-2xl flex items-center justify-center mb-5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] ring-4 ring-gray-900/5">
              <span className="text-white font-bold text-xl tracking-tighter">N</span>
            </div>
            <h1 className="text-[20px] font-bold text-gray-900 mb-1 tracking-tight">Sign in to NovaNews</h1>
            <p className="text-sm text-gray-500">Welcome back! Please sign in to continue</p>
          </div>

          {/* Social Auth */}
          <div className="flex gap-3 mb-6">
            <button type="button" className="group flex-1 flex items-center justify-center gap-2 h-9 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
              <i className="fa-brands fa-github text-[15px] group-hover:scale-110 transition-transform"></i>
              GitHub
            </button>
            <button type="button" className="group flex-1 flex items-center justify-center gap-2 h-9 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
              <img src="https://www.svgrepo.com/show/355037/google.svg" className="w-4 h-4 group-hover:scale-110 transition-transform" alt="Google" />
              Google
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-[1px] bg-gray-200"></div>
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Or</span>
            <div className="flex-1 h-[1px] bg-gray-200"></div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-lg">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="group">
              <label htmlFor="email" className="block text-[13px] font-semibold text-gray-700 mb-1.5 transition-colors group-focus-within:text-indigo-600">Email address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                className="w-full h-9 px-3 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-lg text-[14px] text-gray-900 shadow-sm placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="group">
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-[13px] font-semibold text-gray-700 transition-colors group-focus-within:text-indigo-600">Password</label>
                <Link to="#" className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 hover:underline">Forgot password?</Link>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full h-9 px-3 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-lg text-[14px] text-gray-900 shadow-sm placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 mt-2 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-lg text-[14px] font-medium hover:bg-black hover:shadow-lg hover:shadow-gray-900/20 hover:-translate-y-0.5 transition-all outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-80 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
            >
              {isLoading ? <div className="loader"></div> : <span>Sign in</span>}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-[13px] text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-gray-900 hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
