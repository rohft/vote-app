import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import { Search, Command, Sun, Moon, Sparkles, Eye, EyeOff, User } from 'lucide-react';
import { motion } from 'framer-motion';

const themes: { key: ThemeName; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'light', label: 'Light', icon: Sun, color: 'hsl(38, 92%, 50%)' },
  { key: 'dark', label: 'Dark', icon: Moon, color: 'hsl(215, 80%, 55%)' },
  { key: 'aurora', label: 'Aurora', icon: Sparkles, color: 'hsl(174, 72%, 50%)' },
];

const TopBar: React.FC = () => {
  const { language } = useLanguage();
  const { theme, setTheme, reduceMotion, setReduceMotion } = useTheme();

  return (
    <header className="glass-panel h-14 flex items-center justify-between px-4 gap-4 rounded-xl mb-6">
      {/* Search trigger */}
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors flex-1 max-w-xs"
      >
        <Search className="w-4 h-4" />
        <span>{language === 'ne' ? 'खोज्नुहोस्...' : 'Search...'}</span>
        <kbd className="ml-auto text-[10px] bg-background/60 border border-border rounded px-1.5 py-0.5 font-english">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-3">
        {/* Theme switcher */}
        <div className="flex items-center glass-panel rounded-pill p-0.5 gap-0.5">
          {themes.map(t => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs transition-all duration-300 ${
                theme === t.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={t.label}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Reduce motion toggle */}
        <button
          onClick={() => setReduceMotion(!reduceMotion)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title={reduceMotion ? 'Enable motion' : 'Reduce motion'}
        >
          {reduceMotion ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        {/* Profile avatar */}
        <div className="w-8 h-8 rounded-pill bg-primary/10 border border-primary/20 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
