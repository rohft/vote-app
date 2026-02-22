import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard, Building2, PlusCircle, Users, BarChart3,
  Settings, Filter, Search, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const commands = [
    { label: t('dashboard'), icon: LayoutDashboard, path: '/', keywords: ['home', 'dashboard', 'ड्यासबोर्ड'] },
    { label: t('municipalities'), icon: Building2, path: '/municipalities', keywords: ['municipality', 'नगरपालिका'] },
    { label: t('voters'), icon: Users, path: '/voters', keywords: ['voter', 'मतदाता'] },
    { label: language === 'ne' ? 'सेग्मेन्ट' : 'Segments', icon: Filter, path: '/segments', keywords: ['segment', 'सेग्मेन्ट'] },
    { label: t('analytics'), icon: BarChart3, path: '/analytics', keywords: ['analytics', 'विश्लेषण'] },
    { label: t('settings'), icon: Settings, path: '/settings', keywords: ['settings', 'सेटिङ'] },
  ];

  const filtered = commands.filter(cmd => {
    const q = query.toLowerCase();
    return !q || cmd.label.toLowerCase().includes(q) || cmd.keywords.some(k => k.includes(q));
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setQuery('');
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery('');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-foreground/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[101] w-full max-w-lg"
          >
            <div className="glass-panel-elevated rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={language === 'ne' ? 'पेज खोज्नुहोस्...' : 'Search pages...'}
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
                />
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto py-2">
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {language === 'ne' ? 'कुनै परिणाम भेटिएन' : 'No results found'}
                  </p>
                )}
                {filtered.map((cmd, i) => (
                  <button
                    key={cmd.path}
                    onClick={() => go(cmd.path)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <cmd.icon className="w-4 h-4 text-muted-foreground" />
                    <span>{cmd.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground opacity-50">
                      {language === 'ne' ? 'जानुहोस्' : 'Go'}
                    </span>
                  </button>
                ))}
              </div>
              <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>↑↓ Navigate</span>
                <span>⏎ Select</span>
                <span>ESC Close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
