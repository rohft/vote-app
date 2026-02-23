import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, MapPin, Vote, Users, Plus, Trash2, Edit2, X, Save,
  PieChart, BarChart3, Filter, Calendar, Heart, UserCheck, Type,
  Lightbulb, Target, TrendingUp, AlertTriangle, CheckCircle, Megaphone,
  Check, ChevronDown, Search, LayoutGrid, List, ArrowDownAZ, ArrowUpNarrowWide
} from 'lucide-react';
import { PieChart as RPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Voter } from '@/types';

interface AgeRange {
  id: string;
  label: string;
  min: number;
  max: number;
}

interface AgeRangeCard {
  id: string;
  name: string;
  ranges: AgeRange[];
}

const COLORS = [
  'hsl(215 80% 45%)', 'hsl(145 55% 42%)', 'hsl(28 85% 55%)',
  'hsl(280 60% 55%)', 'hsl(350 65% 55%)', 'hsl(180 50% 42%)',
  'hsl(60 70% 45%)', 'hsl(320 60% 50%)', 'hsl(100 50% 40%)',
  'hsl(200 70% 50%)',
];



const DEFAULT_AGE_RANGES: AgeRange[] = [
  { id: 'r1', label: '18-28', min: 18, max: 28 },
  { id: 'r2', label: '29-38', min: 29, max: 38 },
  { id: 'r3', label: '39-48', min: 39, max: 48 },
  { id: 'r4', label: '49-58', min: 49, max: 58 },
  { id: 'r5', label: '59-68', min: 59, max: 68 },
  { id: 'r6', label: '69+', min: 69, max: 150 },
];

const Segments: React.FC = () => {
  const { t, language } = useLanguage();
  const { municipalities, ethnicityMappings, setEthnicityMappings, getSurnameMapping, bulkAssignEthnicity, renameSurname } = useData();

  const [selectedMunId, setSelectedMunId] = useState<string>('all');
  const [selectedWardId, setSelectedWardId] = useState<string>('all');
  const [selectedBoothId, setSelectedBoothId] = useState<string>('all');
  // Age range cards state (multi-card system)
  const [ageRangeCards, setAgeRangeCards] = useState<AgeRangeCard[]>([
    { id: 'default', name: language === 'ne' ? 'उमेर दायरा' : 'Age Range', ranges: DEFAULT_AGE_RANGES },
    { id: 'generation', name: language === 'ne' ? 'पुस्ता वितरण' : 'Generation Distribution', ranges: [
      { id: 'gen-z', label: 'Gen-Z (18-28)', min: 18, max: 28 },
      { id: 'millennials', label: 'Millennials (29-44)', min: 29, max: 44 },
      { id: 'gen-x', label: 'Gen-X (45-60)', min: 45, max: 60 },
      { id: 'boomers', label: 'Boomers (61-78)', min: 61, max: 78 },
      { id: 'silent', label: 'Silent (79+)', min: 79, max: 150 },
    ]},
  ]);
  const [newCardName, setNewCardName] = useState('');
  const [newRange, setNewRange] = useState<Record<string, { label: string; min: string; max: string }>>({});
  const [editingRange, setEditingRange] = useState<{ cardId: string; rangeId: string } | null>(null);
  const [editRange, setEditRange] = useState({ label: '', min: '', max: '' });
  const [editingCardName, setEditingCardName] = useState<string | null>(null);
  const [editCardName, setEditCardName] = useState('');

  // Surname editing state
  const [editingSurname, setEditingSurname] = useState<string | null>(null);
  const [surnameEdit, setSurnameEdit] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryEdit, setCategoryEdit] = useState({ caste: '', ethnicity: '' });
  const [surnameSearch, setSurnameSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortMode, setSortMode] = useState<'count' | 'alpha'>('count');
  const [pendingChanges, setPendingChanges] = useState<Map<string, { newName?: string; caste?: string; ethnicity?: string }>>(new Map());

  const selectedMun = municipalities.find(m => m.id === selectedMunId);
  const selectedWard = selectedMun?.wards.find(w => w.id === selectedWardId);

  const filteredVoters = useMemo((): Voter[] => {
    let voters: Voter[] = [];
    const muns = selectedMunId === 'all' ? municipalities : municipalities.filter(m => m.id === selectedMunId);
    for (const m of muns) {
      const wards = selectedWardId === 'all' ? m.wards : m.wards.filter(w => w.id === selectedWardId);
      for (const w of wards) {
        const booths = selectedBoothId === 'all' ? w.booths : w.booths.filter(b => b.id === selectedBoothId);
        for (const b of booths) {
          voters = voters.concat(b.voters);
        }
      }
    }
    return voters;
  }, [municipalities, selectedMunId, selectedWardId, selectedBoothId]);

  // Data computations
  const genderData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredVoters.forEach(v => { const g = v.gender || 'अज्ञात'; counts[g] = (counts[g] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredVoters]);

  // (ageData computed per-card now, not globally)

  const ethnicityData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredVoters.forEach(v => { const e = v.ethnicity || 'N/A'; counts[e] = (counts[e] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredVoters]);

  const casteData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredVoters.forEach(v => { const c = v.caste || 'N/A'; counts[c] = (counts[c] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredVoters]);

  const surnameData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredVoters.forEach(v => { const s = v.surname || 'N/A'; counts[s] = (counts[s] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredVoters]);

  // Card CRUD
  const addCard = () => {
    if (!newCardName.trim()) return;
    setAgeRangeCards(prev => [...prev, { id: Date.now().toString(), name: newCardName.trim(), ranges: [] }]);
    setNewCardName('');
  };
  const deleteCard = (cardId: string) => setAgeRangeCards(prev => prev.filter(c => c.id !== cardId));
  const startEditCardName = (card: AgeRangeCard) => { setEditingCardName(card.id); setEditCardName(card.name); };
  const saveCardName = () => {
    if (!editingCardName || !editCardName.trim()) return;
    setAgeRangeCards(prev => prev.map(c => c.id === editingCardName ? { ...c, name: editCardName.trim() } : c));
    setEditingCardName(null);
  };

  // Range CRUD within cards
  const addRangeToCard = (cardId: string) => {
    const nr = newRange[cardId];
    if (!nr || !nr.label || !nr.min || !nr.max) return;
    setAgeRangeCards(prev => prev.map(c => c.id !== cardId ? c : {
      ...c, ranges: [...c.ranges, { id: Date.now().toString(), label: nr.label, min: parseInt(nr.min), max: parseInt(nr.max) }]
    }));
    setNewRange(prev => ({ ...prev, [cardId]: { label: '', min: '', max: '' } }));
  };
  const deleteRangeFromCard = (cardId: string, rangeId: string) => {
    setAgeRangeCards(prev => prev.map(c => c.id !== cardId ? c : { ...c, ranges: c.ranges.filter(r => r.id !== rangeId) }));
  };
  const startEditRangeInCard = (cardId: string, r: AgeRange) => {
    setEditingRange({ cardId, rangeId: r.id });
    setEditRange({ label: r.label, min: r.min.toString(), max: r.max.toString() });
  };
  const saveEditRangeInCard = () => {
    if (!editingRange) return;
    setAgeRangeCards(prev => prev.map(c => c.id !== editingRange.cardId ? c : {
      ...c, ranges: c.ranges.map(r => r.id !== editingRange.rangeId ? r : {
        ...r, label: editRange.label, min: parseInt(editRange.min), max: parseInt(editRange.max)
      })
    }));
    setEditingRange(null);
  };

  // Surname helpers
  const surnameWithMapping = useMemo(() => {
    return surnameData.map(s => {
      const pending = pendingChanges.get(s.name);
      const mapping = getSurnameMapping(s.name);
      return {
        ...s,
        caste: pending?.caste ?? mapping?.caste ?? '',
        ethnicity: pending?.ethnicity ?? mapping?.ethnicity ?? '',
        pendingName: pending?.newName,
        hasPending: !!pending,
      };
    });
  }, [surnameData, getSurnameMapping, pendingChanges]);

  const filteredSurnameCards = useMemo(() => {
    let result = surnameWithMapping;
    
    // 1. Filter
    if (surnameSearch) {
      const q = surnameSearch.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.caste.toLowerCase().includes(q) ||
        s.ethnicity.toLowerCase().includes(q)
      );
    }

    // 2. Sort
    return result.sort((a, b) => {
      if (sortMode === 'count') {
        return b.value - a.value; // High to Low
      } else {
        return a.name.localeCompare(b.name, language === 'ne' ? 'ne' : 'en'); // Alphabetical
      }
    });
  }, [surnameWithMapping, surnameSearch, sortMode, language]);

  const startSurnameEdit = (surname: string) => {
    setEditingSurname(surname);
    setSurnameEdit(pendingChanges.get(surname)?.newName ?? surname);
  };

  const saveSurnameEdit = () => {
    if (!editingSurname || !surnameEdit.trim()) return;
    if (surnameEdit.trim() !== editingSurname) {
      setPendingChanges(prev => {
        const next = new Map(prev);
        const existing = next.get(editingSurname) || {};
        next.set(editingSurname, { ...existing, newName: surnameEdit.trim() });
        return next;
      });
    }
    setEditingSurname(null);
  };

  const startCategoryEdit = (surname: string) => {
    const mapping = getSurnameMapping(surname);
    const pending = pendingChanges.get(surname);
    setEditingCategory(surname);
    setCategoryEdit({
      caste: pending?.caste ?? mapping?.caste ?? '',
      ethnicity: pending?.ethnicity ?? mapping?.ethnicity ?? '',
    });
  };

  const saveCategoryEdit = () => {
    if (!editingCategory) return;
    setPendingChanges(prev => {
      const next = new Map(prev);
      const existing = next.get(editingCategory) || {};
      next.set(editingCategory, { ...existing, caste: categoryEdit.caste, ethnicity: categoryEdit.ethnicity });
      return next;
    });
    setEditingCategory(null);
  };

  const saveAllChanges = () => {
    let currentMappings = [...ethnicityMappings.map(e => ({ ...e, castes: e.castes.map(c => ({ ...c, surnames: [...c.surnames] })) }))];

    pendingChanges.forEach((changes, surname) => {
      if (changes.caste || changes.ethnicity) {
        const caste = changes.caste || '';
        const ethnicity = changes.ethnicity || '';
        const targetName = changes.newName || surname;
        bulkAssignEthnicity(targetName, caste, ethnicity);
        // Remove from old location
        currentMappings = currentMappings.map(eth => ({
          ...eth,
          castes: eth.castes.map(c => ({
            ...c,
            surnames: c.surnames.filter(s => s !== surname && s !== targetName),
          })),
        }));
        // Add to new location
        if (ethnicity && caste) {
          const ethIdx = currentMappings.findIndex(e => e.ethnicity === ethnicity);
          if (ethIdx >= 0) {
            const casteIdx = currentMappings[ethIdx].castes.findIndex(c => c.caste === caste);
            if (casteIdx >= 0) {
              currentMappings[ethIdx].castes[casteIdx].surnames.push(targetName);
            } else {
              currentMappings[ethIdx].castes.push({ caste, surnames: [targetName] });
            }
          } else {
            currentMappings.push({ ethnicity, castes: [{ caste, surnames: [targetName] }] });
          }
        }
      }
      if (changes.newName) {
        renameSurname(surname, changes.newName);
        // Also update in our local mappings copy
        currentMappings = currentMappings.map(eth => ({
          ...eth,
          castes: eth.castes.map(c => ({
            ...c,
            surnames: c.surnames.map(s => s === surname ? changes.newName! : s),
          })),
        }));
      }
    });

    setEthnicityMappings(currentMappings);
    setPendingChanges(new Map());
  };

  const allEthnicities = useMemo(() => ethnicityMappings.map(e => e.ethnicity), [ethnicityMappings]);
  const castesForEthnicity = useMemo(() => {
    if (!categoryEdit.ethnicity) return [];
    const eth = ethnicityMappings.find(e => e.ethnicity === categoryEdit.ethnicity);
    return eth?.castes.map(c => c.caste) || [];
  }, [categoryEdit.ethnicity, ethnicityMappings]);

  const renderTable = (data: { name: string; value: number }[], title: string) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <h3 className="font-bold text-sm">{title}</h3>
        <span className="text-xs text-muted-foreground">{data.length} {language === 'ne' ? 'प्रकार' : 'types'}</span>
      </div>
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">{title}</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">{language === 'ne' ? 'संख्या' : 'Count'}</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {item.name}
                </td>
                <td className="text-right px-4 py-2 font-semibold">{item.value}</td>
                <td className="text-right px-4 py-2 text-muted-foreground">
                  {filteredVoters.length ? ((item.value / filteredVoters.length) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Filter className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{language === 'ne' ? 'डाटा सेग्मेन्ट' : 'Data Segment'}</h1>
          <p className="text-sm text-muted-foreground">{language === 'ne' ? 'मतदाता डाटा विश्लेषण र खण्डीकरण' : 'Voter data analysis & segmentation'}</p>
        </div>
      </motion.div>

      {/* Filter bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            <Building2 className="w-3 h-3 inline mr-1" />{t('municipalities')}
          </label>
          <select value={selectedMunId} onChange={e => { setSelectedMunId(e.target.value); setSelectedWardId('all'); setSelectedBoothId('all'); }}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
            <option value="all">{t('all')}</option>
            {municipalities.map(m => <option key={m.id} value={m.id}>{language === 'ne' ? m.nameNe : m.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            <MapPin className="w-3 h-3 inline mr-1" />{t('ward')}
          </label>
          <select value={selectedWardId} onChange={e => { setSelectedWardId(e.target.value); setSelectedBoothId('all'); }}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background" disabled={selectedMunId === 'all'}>
            <option value="all">{t('all')}</option>
            {selectedMun?.wards.map(w => <option key={w.id} value={w.id}>{t('ward')} {w.number}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            <Vote className="w-3 h-3 inline mr-1" />{t('booth')}
          </label>
          <select value={selectedBoothId} onChange={e => setSelectedBoothId(e.target.value)}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background" disabled={selectedWardId === 'all'}>
            <option value="all">{t('all')}</option>
            {selectedWard?.booths.map(b => <option key={b.id} value={b.id}>{language === 'ne' ? b.nameNe : b.name}</option>)}
          </select>
        </div>
        <div className="bg-primary/10 rounded-lg px-4 py-2 text-center">
          <p className="text-xs text-muted-foreground">{t('totalVoters')}</p>
          <p className="text-xl font-bold text-primary">{filteredVoters.length}</p>
        </div>
      </motion.div>

      {/* Tabbed Segments */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Tabs defaultValue="age" className="w-full">
          <TabsList className="w-full justify-start gap-1 bg-muted/50 p-1 rounded-xl h-auto flex-wrap">
            <TabsTrigger value="age" className="flex items-center gap-2 px-4 py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              <Calendar className="w-4 h-4" />
              {language === 'ne' ? 'उमेर' : 'Age'}
            </TabsTrigger>
            <TabsTrigger value="gender" className="flex items-center gap-2 px-4 py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              <Users className="w-4 h-4" />
              {language === 'ne' ? 'लिङ्ग' : 'Gender'}
            </TabsTrigger>
            <TabsTrigger value="ethnicity" className="flex items-center gap-2 px-4 py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              <Heart className="w-4 h-4" />
              {language === 'ne' ? 'जाति' : 'Ethnicity'}
            </TabsTrigger>
            <TabsTrigger value="caste" className="flex items-center gap-2 px-4 py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              <UserCheck className="w-4 h-4" />
              {language === 'ne' ? 'जात' : 'Caste'}
            </TabsTrigger>
            <TabsTrigger value="surname" className="flex items-center gap-2 px-4 py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              <Type className="w-4 h-4" />
              {language === 'ne' ? 'थर' : 'Surname'}
            </TabsTrigger>
          </TabsList>

          {/* AGE TAB */}
          <TabsContent value="age" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {language === 'ne' ? 'उमेर दायरा' : 'Age Range'}
              </h2>
            </div>

            {/* Add new card */}
            <div className="flex gap-2 items-center">
              <input
                placeholder={language === 'ne' ? 'नयाँ दायराको नाम...' : 'New range name...'}
                value={newCardName}
                onChange={e => setNewCardName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCard()}
                className="border border-input rounded-lg px-3 py-2 text-sm bg-background flex-1 max-w-xs"
              />
              <button onClick={addCard}
                className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium">
                <Plus className="w-4 h-4" /> {language === 'ne' ? 'नयाँ दायरा थप्नुहोस्' : 'Add New Range'}
              </button>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence>
                {ageRangeCards.map(card => {
                  const cardAgeData = card.ranges.map(r => ({
                    name: r.label,
                    value: filteredVoters.filter(v => v.age >= r.min && v.age <= r.max).length,
                  }));
                  const totalInCard = cardAgeData.reduce((s, d) => s + d.value, 0);
                  const nr = newRange[card.id] || { label: '', min: '', max: '' };

                  return (
                    <motion.div key={card.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-card rounded-xl border border-border p-5 flex flex-col">
                      {/* Card header */}
                      <div className="flex items-center justify-between mb-4">
                        {editingCardName === card.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input value={editCardName} onChange={e => setEditCardName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveCardName()}
                              className="border border-input rounded px-2 py-1 text-sm bg-background flex-1" autoFocus />
                            <button onClick={saveCardName} className="text-primary hover:text-primary/80"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditingCardName(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <>
                            <h3 className="font-bold text-sm">{card.name}</h3>
                            <div className="flex items-center gap-1">
                              <button onClick={() => startEditCardName(card)} className="text-muted-foreground hover:text-primary p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteCard(card.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Chart */}
                      {cardAgeData.length > 0 && cardAgeData.some(d => d.value > 0) && (
                        <ResponsiveContainer width="100%" height={Math.max(180, cardAgeData.length * 32)}>
                          <BarChart data={cardAgeData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                              {cardAgeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}

                      {/* Ranges list with voter counts */}
                      <div className="space-y-1.5 mt-3 max-h-[300px] overflow-y-auto">
                        <AnimatePresence>
                          {card.ranges.map(r => {
                            const count = filteredVoters.filter(v => v.age >= r.min && v.age <= r.max).length;
                            return (
                              <motion.div key={r.id} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                                className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg px-3 py-2 group hover:bg-muted/50 transition-colors">
                                {editingRange?.cardId === card.id && editingRange?.rangeId === r.id ? (
                                  <>
                                    <input value={editRange.label} onChange={e => setEditRange(p => ({ ...p, label: e.target.value }))}
                                      className="flex-1 border border-input rounded px-2 py-1 text-xs bg-background" />
                                    <input type="number" value={editRange.min} onChange={e => setEditRange(p => ({ ...p, min: e.target.value }))}
                                      className="w-12 border border-input rounded px-1 py-1 text-xs bg-background text-center" />
                                    <span className="text-muted-foreground">–</span>
                                    <input type="number" value={editRange.max} onChange={e => setEditRange(p => ({ ...p, max: e.target.value }))}
                                      className="w-12 border border-input rounded px-1 py-1 text-xs bg-background text-center" />
                                    <button onClick={saveEditRangeInCard} className="text-primary hover:text-primary/80"><Save className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => setEditingRange(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                                  </>
                                ) : (
                                  <>
                                    <span className="flex-1 truncate">{r.label}</span>
                                    <span className="text-xs font-semibold text-primary">{count} {language === 'ne' ? 'मतदाता' : 'voters'}</span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{r.min}–{r.max} yrs</span>
                                    <button onClick={() => startEditRangeInCard(card.id, r)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deleteRangeFromCard(card.id, r.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </>
                                )}
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>

                      {/* Total count */}
                      {cardAgeData.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground text-right font-medium">
                          {language === 'ne' ? 'कुल' : 'Total'}: <span className="text-foreground font-bold">{totalInCard}</span> {language === 'ne' ? 'मतदाता' : 'voters'}
                        </div>
                      )}

                      {/* Add range to this card */}
                      <div className="border-t border-border pt-3 mt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">{language === 'ne' ? 'नयाँ दायरा थप्नुहोस्' : 'Add New Range'}</p>
                        <input placeholder={language === 'ne' ? 'लेबल (जस्तै: 18-25)' : 'Label (e.g. 18-25)'} value={nr.label}
                          onChange={e => setNewRange(prev => ({ ...prev, [card.id]: { ...nr, label: e.target.value } }))}
                          className="w-full border border-input rounded-lg px-3 py-1.5 text-xs bg-background" />
                        <div className="flex gap-2">
                          <input type="number" placeholder="Min" value={nr.min}
                            onChange={e => setNewRange(prev => ({ ...prev, [card.id]: { ...nr, min: e.target.value } }))}
                            className="flex-1 border border-input rounded-lg px-3 py-1.5 text-xs bg-background" />
                          <input type="number" placeholder="Max" value={nr.max}
                            onChange={e => setNewRange(prev => ({ ...prev, [card.id]: { ...nr, max: e.target.value } }))}
                            className="flex-1 border border-input rounded-lg px-3 py-1.5 text-xs bg-background" />
                        </div>
                        <button onClick={() => addRangeToCard(card.id)}
                          className="w-full flex items-center justify-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium">
                          <Plus className="w-3.5 h-3.5" /> {language === 'ne' ? '+ दायरा थप्नुहोस्' : '+ Add Range'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* GENDER TAB */}
          <TabsContent value="gender" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  {t('genderDistribution')}
                </h3>
                {genderData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <RPieChart>
                      <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </RPieChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-center py-8">{t('noData')}</p>}
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {genderData.map((g, i) => (
                    <div key={g.name} className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg px-3 py-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{g.name}: <strong>{g.value}</strong></span>
                    </div>
                  ))}
                </div>
              </motion.div>
              {renderTable(genderData, language === 'ne' ? 'लिङ्ग वितरण' : 'Gender Distribution')}
            </div>
          </TabsContent>

          {/* ETHNICITY TAB */}
          <TabsContent value="ethnicity" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  {language === 'ne' ? 'जाति वितरण' : 'Ethnicity Distribution'}
                </h3>
                {ethnicityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <RPieChart>
                      <Pie data={ethnicityData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {ethnicityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </RPieChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-center py-8">{t('noData')}</p>}
              </motion.div>
              {renderTable(ethnicityData, language === 'ne' ? 'जाति (Ethnicity)' : 'Ethnicity (जाति)')}
            </div>
          </TabsContent>

          {/* CASTE TAB */}
          <TabsContent value="caste" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  {language === 'ne' ? 'जात वितरण' : 'Caste Distribution'}
                </h3>
                {casteData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={casteData.slice(0, 15)}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {casteData.slice(0, 15).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-center py-8">{t('noData')}</p>}
              </motion.div>
              {renderTable(casteData, language === 'ne' ? 'जात (Caste)' : 'Caste (जात)')}
            </div>
          </TabsContent>

          {/* SURNAME TAB */}
          <TabsContent value="surname" className="mt-4 space-y-4">
            {/* Chart + Save bar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" />
                  {language === 'ne' ? 'थर वितरण' : 'Surname Distribution'}
                </h3>
                {surnameData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={surnameData.slice(0, 15)}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {surnameData.slice(0, 15).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-center py-8">{t('noData')}</p>}
              </motion.div>

              {/* Save & Search panel */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-primary" />
                    {language === 'ne' ? 'थर व्यवस्थापन' : 'Surname Management'}
                  </h3>
                  
                  {/* View Toggles */}
                  <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      title={language === 'ne' ? 'ग्रिड दृश्य' : 'Grid View'}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      title={language === 'ne' ? 'सूची दृश्य' : 'List View'}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={language === 'ne' ? 'थर खोज्नुहोस्...' : 'Search surname...'}
                      value={surnameSearch}
                      onChange={e => setSurnameSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  
                  {/* Sort Toggle */}
                  <button 
                    onClick={() => setSortMode(current => current === 'count' ? 'alpha' : 'count')}
                    className="flex items-center gap-1.5 px-3 border border-border rounded-lg text-xs font-medium hover:bg-muted transition-colors whitespace-nowrap"
                    title={language === 'ne' ? 'क्रमबद्ध गर्नुहोस्' : 'Sort'}
                  >
                    {sortMode === 'count' ? <ArrowUpNarrowWide className="w-4 h-4" /> : <ArrowDownAZ className="w-4 h-4" />}
                    {sortMode === 'count' 
                      ? (language === 'ne' ? 'संख्या' : 'Count') 
                      : (language === 'ne' ? 'वर्णमाला' : 'A-Z')}
                  </button>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{language === 'ne' ? 'कुल थर प्रकार' : 'Total surname types'}: <strong>{surnameData.length}</strong></p>
                  <p>{language === 'ne' ? 'म्यापिङ भएको' : 'Mapped'}: <strong>{surnameWithMapping.filter(s => s.caste).length}</strong></p>
                  <p>{language === 'ne' ? 'म्यापिङ नभएको' : 'Unmapped'}: <strong className="text-destructive">{surnameWithMapping.filter(s => !s.caste).length}</strong></p>
                </div>
                {pendingChanges.size > 0 && (
                  <div className="mt-auto space-y-2">
                    <p className="text-xs text-accent-foreground font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {pendingChanges.size} {language === 'ne' ? 'परिवर्तन बाँकी' : 'pending changes'}
                    </p>
                    <Button onClick={saveAllChanges} className="w-full gap-2" size="sm">
                      <Save className="w-4 h-4" />
                      {language === 'ne' ? 'सबै परिवर्तन सुरक्षित गर्नुहोस्' : 'Save All Changes'}
                    </Button>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Surname Cards Grid or List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <AnimatePresence mode='popLayout'>
                  {filteredSurnameCards.map((s, i) => (
                    <motion.div
                      layout
                      key={s.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className={`bg-card rounded-xl border p-4 hover:shadow-md transition-all group ${
                        s.hasPending ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'
                      }`}
                    >
                      {/* Surname header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            {editingSurname === s.name ? (
                              <div className="flex items-center gap-1 flex-1">
                                <Input
                                  value={surnameEdit}
                                  onChange={e => setSurnameEdit(e.target.value)}
                                  className="h-7 text-sm"
                                  autoFocus
                                  onKeyDown={e => e.key === 'Enter' && saveSurnameEdit()}
                                />
                                <button onClick={saveSurnameEdit} className="text-primary hover:text-primary/80"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingSurname(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <span className="font-bold text-sm">
                                {s.pendingName ? (
                                  <span>
                                    <span className="line-through text-muted-foreground">{s.name}</span>
                                    {' → '}
                                    <span className="text-primary">{s.pendingName}</span>
                                  </span>
                                ) : s.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 ml-5">
                            {s.value} {language === 'ne' ? 'मतदाता' : 'voters'} ({filteredVoters.length ? ((s.value / filteredVoters.length) * 100).toFixed(1) : 0}%)
                          </p>
                        </div>
                        {editingSurname !== s.name && (
                          <button
                            onClick={() => startSurnameEdit(s.name)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all p-1"
                            title={language === 'ne' ? 'थर सम्पादन' : 'Edit surname'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Caste & Ethnicity badges */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {s.ethnicity ? (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {language === 'ne' ? 'जाति' : 'Eth'}: {s.ethnicity}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-dashed">
                            {language === 'ne' ? 'जाति: N/A' : 'Eth: N/A'}
                          </Badge>
                        )}
                        {s.caste ? (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {language === 'ne' ? 'जात' : 'Caste'}: {s.caste}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-dashed">
                            {language === 'ne' ? 'जात: N/A' : 'Caste: N/A'}
                          </Badge>
                        )}
                      </div>

                      {/* Change category button */}
                      <button
                        onClick={() => startCategoryEdit(s.name)}
                        className="w-full text-xs text-center py-1.5 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
                      >
                        {language === 'ne' ? 'वर्ग परिवर्तन गर्नुहोस्' : 'Change Category'}
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{language === 'ne' ? 'थर' : 'Surname'}</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">{language === 'ne' ? 'संख्या' : 'Count'}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{language === 'ne' ? 'जाति' : 'Ethnicity'}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{language === 'ne' ? 'जात' : 'Caste'}</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredSurnameCards.map((s, i) => (
                        <tr key={s.name} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-4 py-3">
                             <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                               {editingSurname === s.name ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={surnameEdit}
                                      onChange={e => setSurnameEdit(e.target.value)}
                                      className="h-7 text-sm w-32"
                                      autoFocus
                                      onKeyDown={e => e.key === 'Enter' && saveSurnameEdit()}
                                    />
                                    <button onClick={saveSurnameEdit} className="text-primary hover:text-primary/80"><Check className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => setEditingSurname(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {s.pendingName ? (
                                        <span>
                                          <span className="line-through text-muted-foreground">{s.name}</span>
                                          {' → '}
                                          <span className="text-primary">{s.pendingName}</span>
                                        </span>
                                      ) : s.name}
                                    </span>
                                    {editingSurname !== s.name && (
                                      <button onClick={() => startSurnameEdit(s.name)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all">
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                )}
                             </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{s.value}</td>
                          <td className="px-4 py-3">
                            {s.ethnicity ? <Badge variant="secondary" className="text-xs font-normal">{s.ethnicity}</Badge> : <span className="text-muted-foreground text-xs">-</span>}
                          </td>
                          <td className="px-4 py-3">
                            {s.caste ? <Badge variant="outline" className="text-xs font-normal">{s.caste}</Badge> : <span className="text-muted-foreground text-xs">-</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                             <button onClick={() => startCategoryEdit(s.name)} className="text-xs text-primary hover:underline">
                               {language === 'ne' ? 'सम्पादन' : 'Edit'}
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {filteredSurnameCards.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{language === 'ne' ? 'कुनै थर फेला परेन' : 'No surnames found'}</p>
              </div>
            )}
          </TabsContent>

          {/* Category Edit Dialog */}
          <Dialog open={!!editingCategory} onOpenChange={open => !open && setEditingCategory(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  {language === 'ne' ? 'वर्ग परिवर्तन' : 'Change Category'} — {editingCategory}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-xs mb-1.5 block">{language === 'ne' ? 'जाति (Ethnicity)' : 'Ethnicity (जाति)'}</Label>
                  <Select value={categoryEdit.ethnicity} onValueChange={v => setCategoryEdit({ ethnicity: v, caste: '' })}>
                    <SelectTrigger><SelectValue placeholder={language === 'ne' ? 'जाति छान्नुहोस्' : 'Select ethnicity'} /></SelectTrigger>
                    <SelectContent>
                      {allEthnicities.map(e => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{language === 'ne' ? 'जात (Caste)' : 'Caste (जात)'}</Label>
                  <Select value={categoryEdit.caste} onValueChange={v => setCategoryEdit(p => ({ ...p, caste: v }))} disabled={!categoryEdit.ethnicity}>
                    <SelectTrigger><SelectValue placeholder={language === 'ne' ? 'जात छान्नुहोस्' : 'Select caste'} /></SelectTrigger>
                    <SelectContent>
                      {castesForEthnicity.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categoryEdit.ethnicity && castesForEthnicity.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'ne' ? 'यो जातिमा कुनै जात छैन' : 'No castes defined for this ethnicity'}
                    </p>
                  )}
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                  {language === 'ne'
                    ? `"${editingCategory}" थर भएका सबै मतदाताको जाति/जात बदलिनेछ।`
                    : `This will update caste/ethnicity for all voters with surname "${editingCategory}".`}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingCategory(null)}>
                  {language === 'ne' ? 'रद्द' : 'Cancel'}
                </Button>
                <Button onClick={saveCategoryEdit} disabled={!categoryEdit.ethnicity || !categoryEdit.caste}>
                  <Check className="w-4 h-4 mr-1" />
                  {language === 'ne' ? 'लागू गर्नुहोस्' : 'Apply'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Tabs>
      </motion.div>

      {/* Election Report Section */}
      {filteredVoters.length > 0 && (
        <ElectionReport voters={filteredVoters} language={language} />
      )}
    </div>
  );
};

// Election Report Component
const ElectionReport: React.FC<{ voters: import('@/types').Voter[]; language: string }> = ({ voters, language }) => {
  const ne = language === 'ne';
  const total = voters.length;
  const maleCount = voters.filter(v => v.gender === 'पुरुष').length;
  const femaleCount = voters.filter(v => v.gender === 'महिला').length;
  const maleRatio = maleCount / total;
  const femaleRatio = femaleCount / total;

  const youth = voters.filter(v => v.age >= 18 && v.age <= 35).length;
  const middleAge = voters.filter(v => v.age >= 36 && v.age <= 55).length;
  const senior = voters.filter(v => v.age > 55).length;
  const youthPct = (youth / total * 100).toFixed(1);
  const seniorPct = (senior / total * 100).toFixed(1);

  const ethCounts: Record<string, number> = {};
  voters.forEach(v => { if (v.ethnicity) ethCounts[v.ethnicity] = (ethCounts[v.ethnicity] || 0) + 1; });
  const topEthnicities = Object.entries(ethCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const surCounts: Record<string, number> = {};
  voters.forEach(v => { if (v.surname) surCounts[v.surname] = (surCounts[v.surname] || 0) + 1; });
  const topSurname = Object.entries(surCounts).sort((a, b) => b[1] - a[1])[0];

  const tips: { icon: React.ReactNode; title: string; desc: string; type: 'info' | 'warning' | 'success' }[] = [];

  if (femaleRatio > 0.45) tips.push({ icon: <Users className="w-4 h-4" />, title: ne ? 'महिला शक्ति' : 'Women Power', desc: ne ? `${(femaleRatio * 100).toFixed(0)}% महिला — महिला सशक्तिकरण कार्यक्रम चलाउनुहोस्` : `${(femaleRatio * 100).toFixed(0)}% female — run women empowerment programs`, type: 'success' });
  if (maleRatio > 0.55) tips.push({ icon: <Users className="w-4 h-4" />, title: ne ? 'पुरुष बहुमत' : 'Male Majority', desc: ne ? `रोजगार र पूर्वाधार विकासमा ध्यान दिनुहोस्` : `Focus on employment & infrastructure development`, type: 'info' });
  if (parseFloat(youthPct) > 30) tips.push({ icon: <TrendingUp className="w-4 h-4" />, title: ne ? 'युवा लक्ष्य' : 'Youth Target', desc: ne ? `${youthPct}% युवा — सामाजिक सञ्जाल अभियान र कौशल विकास` : `${youthPct}% youth — social media campaign & skill development`, type: 'success' });
  if (parseFloat(seniorPct) > 20) tips.push({ icon: <AlertTriangle className="w-4 h-4" />, title: ne ? 'ज्येष्ठ ध्यान' : 'Senior Focus', desc: ne ? `${seniorPct}% ज्येष्ठ — स्वास्थ्य शिविर र ज्येष्ठ भत्ता प्रचार` : `${seniorPct}% seniors — health camps & senior allowance promotion`, type: 'warning' });
  if (topEthnicities.length > 0) tips.push({ icon: <Megaphone className="w-4 h-4" />, title: ne ? 'जातीय पहुँच' : 'Ethnic Outreach', desc: ne ? `प्रमुख: ${topEthnicities.map(([e, c]) => `${e}(${c})`).join(', ')}` : `Top: ${topEthnicities.map(([e, c]) => `${e}(${c})`).join(', ')}`, type: 'info' });
  if (topSurname && topSurname[1] > total * 0.1) tips.push({ icon: <CheckCircle className="w-4 h-4" />, title: ne ? 'थर केन्द्रित' : 'Surname Focus', desc: ne ? `"${topSurname[0]}" ${((topSurname[1] / total) * 100).toFixed(0)}% — लक्षित अभियान` : `"${topSurname[0]}" is ${((topSurname[1] / total) * 100).toFixed(0)}% — targeted campaign`, type: 'success' });

  const programs = [
    { title: ne ? '🎯 घरदैलो अभियान' : '🎯 Door-to-Door', desc: ne ? `${total} मतदातासँग प्रत्यक्ष सम्पर्क` : `Direct contact with ${total} voters` },
    { title: ne ? '📱 डिजिटल प्रचार' : '📱 Digital Campaign', desc: ne ? 'सामाजिक सञ्जालमा युवा लक्षित' : 'Youth-targeted social media' },
    { title: ne ? '🏥 स्वास्थ्य शिविर' : '🏥 Health Camp', desc: ne ? 'निःशुल्क स्वास्थ्य जाँच' : 'Free health checkup' },
    { title: ne ? '💼 रोजगार मेला' : '💼 Job Fair', desc: ne ? 'कौशल विकास र रोजगार' : 'Skill development & jobs' },
  ];

  const tipStyles = { info: 'border-primary/30 bg-primary/5', warning: 'border-accent/30 bg-accent/5', success: 'border-secondary/30 bg-secondary/5' };
  const tipIconStyles = { info: 'text-primary', warning: 'text-accent', success: 'text-secondary' };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-accent" />
          {ne ? 'निर्वाचन रणनीति र सुझाव' : 'Election Strategy & Tips'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tips.map((tip, i) => (
            <div key={i} className={`rounded-lg border p-4 ${tipStyles[tip.type]}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={tipIconStyles[tip.type]}>{tip.icon}</span>
                <h4 className="text-sm font-bold">{tip.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          {ne ? 'सुझाव गरिएका कार्यक्रम' : 'Recommended Programs'}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {programs.map((p, i) => (
            <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border hover:border-primary/30 transition-colors">
              <h4 className="text-sm font-bold mb-1">{p.title}</h4>
              <p className="text-xs text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Segments;
