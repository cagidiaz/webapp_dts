import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';

import logoWhite from '../../assets/Logodts_white.svg';
import logoColor from '../../assets/LogodTS.svg';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();

  // Initialize theme from system or local storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = savedTheme === 'dark' || (!savedTheme && systemDark);
    
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300 font-sans">
      {/* Background Radial Gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Light Mode: White to soft blue radial */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#FFFFFF_0%,_#F0F4F8_60%,_#D7E2EA_100%)] dark:hidden"></div>
        
        {/* Dark Mode: Focused deep blue to surface dark radial */}
        <div className="hidden dark:block absolute inset-0 bg-[radial-gradient(circle_at_center,_#003E51_0%,_#002A38_50%,_#001C25_100%)]"></div>
        
        {/* Subtle dTS Secondary accent glow (Radial) */}
        <div className="absolute inset-0 opacity-10 dark:opacity-5 bg-[radial-gradient(circle_at_70%_30%,_var(--color-dts-secondary)_0%,_transparent_50%)]"></div>
      </div>

      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:opacity-80 transition-all shadow-sm"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-700" />}
        </button>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <img 
          src={isDark ? logoWhite : logoColor} 
          alt="dTS Instruments Logo" 
          className="h-24 w-auto mb-8 transition-all duration-300 opacity-90 hover:opacity-100"
        />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[#003E51] dark:text-[#00B0B9]">
          Acceder a su cuenta
        </h2>
      </div>

      <div className="mt-8 relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[var(--color-surface-card-dark)] py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-transparent dark:border-gray-800">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Correo electrónico
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#00B0B9] focus:border-[#00B0B9] sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#00B0B9] focus:border-[#00B0B9] sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00B0B9] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00B0B9] transition-all"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
