import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  // 初始化主题，提供默认值以确保在任何环境下都能正常工作
  const [theme, setTheme] = useState<Theme>('light');
  
  // 安全地初始化主题
  useEffect(() => {
    try {
      // 在服务器端或受限环境中，这些API可能不可用
      if (typeof window === 'undefined') return;
      
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme) {
        setTheme(savedTheme);
      } else if (window.matchMedia) {
        setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      }
    } catch (error) {
      console.error('Error initializing theme:', error);
      setTheme('light'); // 确保有一个回退值
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
      }
      if (typeof window !== 'undefined' && localStorage) {
        localStorage.setItem('theme', theme);
      }
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  };
}