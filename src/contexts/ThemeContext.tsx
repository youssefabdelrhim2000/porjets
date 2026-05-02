import React, { createContext, useContext, useEffect, ReactNode, useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  showStars: boolean;
  setShowStars: (show: boolean) => void;
  isThemeLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getLocalTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('app_global_theme_fallback');
    return (saved === 'dark' || saved === 'light') ? saved : 'dark';
  } catch {
    return 'dark';
  }
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  // جلب الثيم من السيرفر في الـ background فقط —
  // initialData من localStorage عشان الـ UI لا يستنى API أبدًا
  const { data: globalTheme = getLocalTheme(), isLoading: isThemeLoading } = useQuery({
    queryKey: ['global_theme_settings'],
    queryFn: async () => {
      const response = await api.get('/settings/theme');
      return (response.data?.theme as Theme) || 'dark';
    },
    initialData: getLocalTheme,       // يعرض فوراً من localStorage بدون request
    staleTime: 1000 * 60 * 60,        // يعتبر الداتا طازجة ساعة كاملة
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnMount: false,            // يمنع الـ double-fetch في StrictMode
    refetchOnWindowFocus: false,
  });

  // Mutation لتغيير الثيم — بدون invalidateQueries بعدها لأن optimistic update كافي
  const themeMutation = useMutation({
    mutationFn: async (newTheme: Theme) => {
      await api.post('/settings/theme', { theme: newTheme });
      return newTheme;
    },
    onMutate: async (newTheme) => {
      await queryClient.cancelQueries({ queryKey: ['global_theme_settings'] });
      queryClient.setQueryData(['global_theme_settings'], newTheme);
    },
    // لا حاجة لـ onSettled + invalidateQueries —
    // الـ optimistic update كافي، والـ invalidation كانت سبب الـ request المكرر
  });

  // Stars Logic (هنسيبها Local لأنها ملهاش تأثير قوي، إلا لو عايز تخليها Global هي كمان)
  const [showStars, setShowStarsState] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_show_stars');
    return saved !== null ? saved === 'true' : true;
  });

  // 4. Apply Theme to DOM & Update Fallback
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(globalTheme);
    
    // حفظ نسخة احتياطية في اللوكال ستوريدج للفتحة اللي جاية
    localStorage.setItem('app_global_theme_fallback', globalTheme);
  }, [globalTheme]);

  useEffect(() => {
    localStorage.setItem('app_show_stars', String(showStars));
  }, [showStars]);

  // Handlers
  const toggleTheme = useCallback(() => {
    const newTheme = globalTheme === 'dark' ? 'light' : 'dark';
    themeMutation.mutate(newTheme);
  }, [globalTheme, themeMutation]);

  const setTheme = useCallback((newTheme: Theme) => {
    if (globalTheme !== newTheme) {
      themeMutation.mutate(newTheme);
    }
  }, [globalTheme, themeMutation]);

  const setShowStars = useCallback((show: boolean) => {
    setShowStarsState(show);
  }, []);

  const value = useMemo(() => ({
    theme: globalTheme,
    toggleTheme,
    setTheme,
    showStars,
    setShowStars,
    isThemeLoading
  }), [globalTheme, toggleTheme, setTheme, showStars, setShowStars, isThemeLoading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};