import React, { useState, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import { Voter } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, MapPin, Vote, Search, Download, Upload, ChevronDown,
  Edit, Trash2, X, ChevronLeft, ChevronRight, Printer, Eye, EyeOff,
  Filter, Columns, Users, Plus, AlignLeft, AlignCenter, AlignRight, Globe, Sparkles
} from 'lucide-react';
import { readExcelFile, writeExcelFile } from '@/lib/excel';
import { matchExcelHeaders, parseVoterRow } from '@/lib/excelHeaderMatch';
import { transliterateToEnglish } from '@/lib/transliteration';

const VoterTable: React.FC = () => {
  const { t, language } = useLanguage();
  const { municipalities, columnConfigs, setColumnConfigs, updateVoter, deleteVoter, addVotersToBooth, getSurnameMapping, ethnicityMappings, localityConfigs, bulkAssignEthnicity } = useData();

  const [selectedMunId, setSelectedMunId] = useState(municipalities[0]?.id || '');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedBoothId, setSelectedBoothId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingVoter, setEditingVoter] = useState<Voter | null>(null);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 20;
  const tableRef = useRef<HTMLDivElement>(null);
  const [autoWidth, setAutoWidth] = useState(true);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [tableLanguage, setTableLanguage] = useState<'ne' | 'en'>(language);

  const selectedMun = municipalities.find(m => m.id === selectedMunId);
  const selectedWard = selectedMun?.wards.find(w => w.id === selectedWardId);
  const selectedBooth = selectedWard?.booths.find(b => b.id === selectedBoothId);

  React.useEffect(() => {
    if (selectedMun && !selectedWardId) {
      const firstWard = selectedMun.wards[0];
      if (firstWard) {
        setSelectedWardId(firstWard.id);
        if (firstWard.booths[0]) setSelectedBoothId(firstWard.booths[0].id);
      }
    }
  }, [selectedMun, selectedWardId]);

  React.useEffect(() => {
    if (selectedWard && !selectedBoothId && selectedWard.booths[0]) {
      setSelectedBoothId(selectedWard.booths[0].id);
    }
  }, [selectedWard, selectedBoothId]);

  // Helper function to transliterate/translate content
  const translateContent = (content: string | number, lang: 'ne' | 'en') => {
    if (content === null || content === undefined) return '';
    const str = String(content);
    
    // If target is Nepali, use basic number conversion (extend this for text if needed)
    if (lang === 'ne') {
      return str.replace(/[0-9]/g, d => '०१२३४५६७८९'[parseInt(d)]);
    }
    
    // If target is English, use improved transliteration
    if (lang === 'en') {
      return transliterateToEnglish(str);
    }
    
    return str;
  };

  const voters = selectedBooth?.voters || [];
  const visibleCols = columnConfigs.filter(c => c.visible).sort((a, b) => a.order - b.order);

  const filteredVoters = useMemo(() => {
    let result = voters;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.surname.toLowerCase().includes(q) ||
        v.voterIdNo.includes(q)
      );
    }
    Object.entries(columnFilters).forEach(([key, val]) => {
      if (val) {
        result = result.filter(v => String(v[key] ?? '').toLowerCase().includes(val.toLowerCase()));
      }
    });
    return result;
  }, [voters, searchQuery, columnFilters]);

  const totalPages = Math.ceil(filteredVoters.length / pageSize);
  const paginatedVoters = filteredVoters.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleColumnVisibility = (key: string) => {
    setColumnConfigs(
      columnConfigs.map(c => c.key === key ? { ...c, visible: !c.visible } : c)
    );
  };

  const toggleAutoWidth = () => {
    setAutoWidth(!autoWidth);
  };

  const cycleTextAlign = () => {
    setTextAlign(current => {
      if (current === 'left') return 'center';
      if (current === 'center') return 'right';
      return 'left';
    });
  };

  const toggleTableLanguage = () => {
    setTableLanguage(current => current === 'ne' ? 'en' : 'ne');
  };

  const handleExport = async () => {
    const headers = visibleCols.map(c => language === 'ne' ? c.labelNe : c.labelEn);
    const rows = filteredVoters.map(v => visibleCols.map(c => v[c.key] ?? ''));
    await writeExcelFile([headers, ...rows], 'Voters', 'voters_export.xlsx');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMunId || !selectedWardId || !selectedBoothId) return;
    const jsonData = await readExcelFile(file);
    if (jsonData.length < 2) return;

    // Use fuzzy header matching
    const excelHeaders = jsonData[0].map(h => String(h || ''));
    const headerMapping = matchExcelHeaders(excelHeaders, columnConfigs);

    const wardIdx = selectedMun?.wards.findIndex(w => w.id === selectedWardId) ?? 0;
    const boothIdx = selectedWard?.booths.findIndex(b => b.id === selectedBoothId) ?? 0;

    const newVoters: Voter[] = jsonData.slice(1).map((row, idx) => {
      const rowStrings = row.map(cell => String(cell || ''));
      return parseVoterRow(rowStrings, headerMapping, idx, wardIdx, boothIdx) as unknown as Voter;
    });

    addVotersToBooth(selectedMunId, selectedWardId, selectedBoothId, newVoters);
    e.target.value = '';
  };

  const handleDownloadTemplate = async () => {
    const headers = columnConfigs.map(c => c.labelNe);
    await writeExcelFile([headers], 'Template', 'voter_template.xlsx');
  };

  const openEditDialog = (voter: Voter, index: number) => {
    const copy = { ...voter };
    // Auto-fill caste/ethnicity from surname mapping if missing
    if (copy.surname) {
      const mapping = getSurnameMapping(copy.surname);
      if (mapping) {
        if (!copy.caste) copy.caste = mapping.caste;
        if (!copy.ethnicity) copy.ethnicity = mapping.ethnicity;
      }
    }
    setEditingVoter(copy);
    setEditingIndex(index);
  };

  const handleSaveEdit = () => {
    if (editingVoter && selectedMunId && selectedWardId && selectedBoothId) {
      updateVoter(selectedMunId, selectedWardId, selectedBoothId, editingVoter);
      setEditingVoter(null);
      setEditingIndex(-1);
    }
  };

  const navigateEdit = (direction: 'prev' | 'next') => {
    if (!editingVoter) return;
    handleSaveEdit();
    const newIdx = direction === 'prev' ? editingIndex - 1 : editingIndex + 1;
    if (newIdx >= 0 && newIdx < filteredVoters.length) {
      setTimeout(() => openEditDialog(filteredVoters[newIdx], newIdx), 50);
    }
  };

  const handleDeleteVoter = (voterId: string) => {
    if (selectedMunId && selectedWardId && selectedBoothId) {
      deleteVoter(selectedMunId, selectedWardId, selectedBoothId, voterId);
    }
  };

  const handlePrint = () => {
    const printContent = tableRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Print</title>
      <style>table{width:100%;border-collapse:collapse;font-family:Kalimati,sans-serif}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:12px}
      th{background:#f5f5f5;font-weight:bold}</style>
      </head><body>${printContent.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const [showBulkPrompt, setShowBulkPrompt] = useState<{ surname: string; caste: string; ethnicity: string } | null>(null);

  const handleSurnameChange = (surname: string) => {
    if (!editingVoter) return;
    const mapping = getSurnameMapping(surname);
    setEditingVoter({
      ...editingVoter,
      surname,
      ...(mapping ? { caste: mapping.caste, ethnicity: mapping.ethnicity } : {}),
    });
  };

  const handleSuggestFamily = () => {
    if (!editingVoter || !selectedMunId || !selectedWardId) return;

    // 1. Gather context from current voter
    const currentSurname = editingVoter.surname?.trim().toLowerCase();
    const currentName = editingVoter.name?.trim().toLowerCase();
    const currentSpouse = editingVoter.spouseName?.trim().toLowerCase();
    const currentParents = editingVoter.parentsName?.trim().toLowerCase();
    
    if (!currentSurname) {
      alert(language === 'ne' ? 'कृपया पहिले थर प्रविष्ट गर्नुहोस्' : 'Please enter a surname first');
      return;
    }

    // 2. Find potential family members in the same ward/booth
    const allWardVoters = selectedMun?.wards.find(w => w.id === selectedWardId)?.booths.flatMap(b => b.voters) || [];
    
    const matches = allWardVoters.filter(v => {
      if (v.id === editingVoter.id) return false; // Skip self
      if (!v.family) return false; // Skip those without family ID

      const vSurname = v.surname?.toLowerCase();
      const vName = v.name?.toLowerCase();
      const vSpouse = v.spouseName?.toLowerCase();
      const vParents = v.parentsName?.toLowerCase();

      // Rule 1: Same Surname is mandatory
      if (vSurname !== currentSurname) return false;

      // Rule 2: Check relationships
      // A. Spouse Match: My spouse is them OR Their spouse is me
      const isSpouse = (currentSpouse && currentSpouse.includes(vName)) || (vSpouse && vSpouse.includes(currentName));
      
      // B. Parent/Child Match: My parent is them OR Their parent is me
      const isParentChild = (currentParents && currentParents.includes(vName)) || (vParents && vParents.includes(currentName));
      
      // C. Sibling Match: We have the same parents
      const isSibling = currentParents && vParents && currentParents === vParents;

      return isSpouse || isParentChild || isSibling;
    });

    // 3. Extract potential matches with relationships
    const familyOptions = matches.map(v => {
      let relation = 'Relative';
      const vName = v.name?.toLowerCase();
      const vSpouse = v.spouseName?.toLowerCase();
      const vParents = v.parentsName?.toLowerCase();

      if ((currentSpouse && currentSpouse.includes(vName)) || (vSpouse && vSpouse.includes(currentName))) {
        relation = language === 'ne' ? 'जीवनसाथी' : 'Spouse';
      } else if (currentParents && currentParents.includes(vName)) {
        relation = language === 'ne' ? 'आमा/बुबा' : 'Parent';
      } else if (vParents && vParents.includes(currentName)) {
        relation = language === 'ne' ? 'छोरा/छोरी' : 'Child';
      } else if (currentParents && vParents && currentParents === vParents) {
        relation = language === 'ne' ? 'दाजु/भाई/दिदी/बहिनी' : 'Sibling';
      }
      
      return { id: v.family, name: v.name, relation };
    });

    // Remove duplicates based on Family ID
    const distinctOptions = Array.from(new Map(familyOptions.map(item => [item.id, item])).values());

    if (distinctOptions.length === 0) {
       // No match found - Suggest a new Family ID
       const surCode = editingVoter.surname.substring(0, 3).toUpperCase();
       const nameCode = editingVoter.name.substring(0, 3).toUpperCase();
       const random = Math.floor(1000 + Math.random() * 9000);
       const newId = `${surCode}-${nameCode}-${random}`;
       
       if (confirm(language === 'ne' 
           ? 'कुनै सम्बन्धित परिवार भेटिएन। नयाँ परिवार ID सिर्जना गर्ने?' 
           : 'No related family found. Create a new Family ID?')) {
         setEditingVoter({ ...editingVoter, family: newId });
       }
    } else if (distinctOptions.length === 1) {
      // One match found
      const match = distinctOptions[0];
      if (confirm(language === 'ne' 
          ? `सुझाव: ${match.name} (${match.relation}) को परिवारमा जोड्ने?` 
          : `Suggestion: Join family of ${match.name} (${match.relation})?`)) {
        setEditingVoter({ ...editingVoter, family: match.id });
      }
    } else {
      // Multiple matches found
      const message = language === 'ne' 
        ? 'धेरै परिवारहरू भेटिए:\n' + distinctOptions.map((o, i) => `${i+1}. ${o.name} (${o.relation})`).join('\n') + '\n\nकुन छान्ने? (1, 2, ...)'
        : 'Multiple families found:\n' + distinctOptions.map((o, i) => `${i+1}. ${o.name} (${o.relation})`).join('\n') + '\n\nWhich one? (1, 2, ...)';
      
      const choice = prompt(message);
      if (choice) {
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < distinctOptions.length) {
          setEditingVoter({ ...editingVoter, family: distinctOptions[index].id });
        }
      }
    }
  };

  const getSurnameConstraint = (surname: string) => {
    for (const eth of ethnicityMappings) {
      for (const c of eth.castes) {
        if (c.surnames.includes(surname)) {
          return { ethnicity: eth.ethnicity, caste: c.caste };
        }
      }
    }
    return null;
  };

  const handleSaveEditWithBulk = () => {
    if (!editingVoter || !selectedMunId || !selectedWardId || !selectedBoothId) return;
    updateVoter(selectedMunId, selectedWardId, selectedBoothId, editingVoter);

    // Check if other voters with same surname are missing caste/ethnicity
    if (editingVoter.surname && editingVoter.caste && editingVoter.ethnicity) {
      const allVoters = municipalities.flatMap(m => m.wards.flatMap(w => w.booths.flatMap(b => b.voters)));
      const needsUpdate = allVoters.filter(v =>
        v.id !== editingVoter.id &&
        v.surname === editingVoter.surname &&
        (!v.caste || !v.ethnicity)
      );
      if (needsUpdate.length > 0) {
        setShowBulkPrompt({
          surname: editingVoter.surname,
          caste: editingVoter.caste,
          ethnicity: editingVoter.ethnicity,
        });
        setEditingVoter(null);
        setEditingIndex(-1);
        return;
      }
    }

    setEditingVoter(null);
    setEditingIndex(-1);
  };

  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-bold">{t('voters')}</h1>
      </motion.div>

      {/* Large Icon Selectors */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Municipality Card */}
        <div className="bg-card rounded-xl border-2 border-primary/20 p-4 hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t('selectMunicipality')}</p>
              <p className="text-sm font-semibold">{selectedMun ? (language === 'ne' ? selectedMun.nameNe : selectedMun.name) : '-'}</p>
            </div>
          </div>
          <div className="relative">
            <select
              value={selectedMunId}
              onChange={e => { setSelectedMunId(e.target.value); setSelectedWardId(''); setSelectedBoothId(''); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-primary/30 focus:outline-none"
            >
              {municipalities.map(m => (
                <option key={m.id} value={m.id}>{language === 'ne' ? m.nameNe : m.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Ward Card */}
        <div className="bg-card rounded-xl border-2 border-secondary/20 p-4 hover:border-secondary/40 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t('selectWard')}</p>
              <p className="text-sm font-semibold">{selectedWard ? `${t('ward')} ${selectedWard.number}` : '-'}</p>
            </div>
          </div>
          <div className="relative">
            <select
              value={selectedWardId}
              onChange={e => { setSelectedWardId(e.target.value); setSelectedBoothId(''); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-secondary/30 focus:outline-none"
            >
              <option value="">{t('selectWard')}</option>
              {selectedMun?.wards.map(w => (
                <option key={w.id} value={w.id}>{t('ward')} {w.number}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Booth Card */}
        <div className="bg-card rounded-xl border-2 border-accent/20 p-4 hover:border-accent/40 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Vote className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t('selectBooth')}</p>
              <p className="text-sm font-semibold">{selectedBooth ? (language === 'ne' ? selectedBooth.nameNe : selectedBooth.name) : '-'}</p>
            </div>
          </div>
          <div className="relative">
            <select
              value={selectedBoothId}
              onChange={e => { setSelectedBoothId(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-accent/30 focus:outline-none"
            >
              <option value="">{t('selectBooth')}</option>
              {selectedWard?.booths.map(b => (
                <option key={b.id} value={b.id}>{language === 'ne' ? b.nameNe : b.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </motion.div>

      {/* Voter count badge */}
      {selectedBooth && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{voters.length} {t('totalVoters')}</span>
        </motion.div>
      )}

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap items-center gap-2"
      >
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('search') + '...'}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${
            activeFilterCount > 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border hover:bg-muted'
          }`}
        >
          <Filter className="w-4 h-4" />
          {t('filters')}{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </button>

        <button
          onClick={cycleTextAlign}
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
          title={t('textAlign')}
        >
          {textAlign === 'left' && <AlignLeft className="w-4 h-4" />}
          {textAlign === 'center' && <AlignCenter className="w-4 h-4" />}
          {textAlign === 'right' && <AlignRight className="w-4 h-4" />}
          {t('align')}
        </button>

        <button
          onClick={toggleAutoWidth}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${
            autoWidth ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border hover:bg-muted'
          }`}
        >
          <Columns className="w-4 h-4" />
          {autoWidth ? t('compact') : t('fitContent')}
        </button>

        <button
          onClick={() => setShowColumnPicker(!showColumnPicker)}
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
        >
          <Columns className="w-4 h-4" />
          {t('columns')}
        </button>

        <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity">
          <Download className="w-4 h-4" />
          {t('downloadTemplate')}
        </button>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
          <Download className="w-4 h-4" />
          {t('export')}
        </button>
        <button onClick={toggleTableLanguage} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
          <Globe className="w-4 h-4" />
          {tableLanguage === 'ne' ? 'English' : 'नेपाली'}
        </button>
      </motion.div>

      {/* Column Picker Dropdown */}
      <AnimatePresence>
        {showColumnPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-xl border border-border p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{t('columns')}</h3>
              <button onClick={() => setShowColumnPicker(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {columnConfigs.sort((a, b) => a.order - b.order).map(col => (
                <button
                  key={col.key}
                  onClick={() => toggleColumnVisibility(col.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    col.visible
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-muted text-muted-foreground border border-transparent'
                  }`}
                >
                  {col.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {language === 'ne' ? col.labelNe : col.labelEn}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Column Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-xl border border-border p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{t('filters')}</h3>
              <div className="flex gap-2">
                {activeFilterCount > 0 && (
                  <button onClick={() => setColumnFilters({})} className="text-xs text-destructive hover:underline">{t('clearFilters')}</button>
                )}
                <button onClick={() => setShowFilters(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {visibleCols.map(col => (
                <div key={col.key}>
                  <label className="text-xs text-muted-foreground mb-1 block">{language === 'ne' ? col.labelNe : col.labelEn}</label>
                  {col.type === 'single-choice' && col.choices ? (
                    <select
                      value={columnFilters[col.key] || ''}
                      onChange={e => { setColumnFilters({ ...columnFilters, [col.key]: e.target.value }); setCurrentPage(1); }}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background focus:ring-1 focus:ring-primary/30 focus:outline-none"
                    >
                      <option value="">{t('all')}</option>
                      {col.choices.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={columnFilters[col.key] || ''}
                      onChange={e => { setColumnFilters({ ...columnFilters, [col.key]: e.target.value }); setCurrentPage(1); }}
                      placeholder="..."
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background focus:ring-1 focus:ring-primary/30 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-xl border border-border overflow-hidden"
      >
        <div className="overflow-x-auto" ref={tableRef}>
          <table className={`w-full text-sm ${autoWidth ? 'table-auto' : 'table-fixed'}`}>
            <thead>
              <tr className="bg-primary/5 border-b-2 border-primary/20">
                <th className="px-3 py-3 text-left font-bold text-xs text-primary whitespace-nowrap w-12">#</th>
                {visibleCols.map(col => (
                  <th
                    key={col.key}
                    className={`px-3 py-3 font-bold text-xs text-primary whitespace-nowrap ${
                      autoWidth ? '' : 'w-48'
                    } ${
                      textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {tableLanguage === 'ne' ? col.labelNe : col.labelEn}
                  </th>
                ))}
                <th className="px-3 py-3 text-left font-bold text-xs text-primary w-24">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVoters.length === 0 ? (
                <tr><td colSpan={visibleCols.length + 2} className="px-3 py-12 text-center text-muted-foreground">{t('noData')}</td></tr>
              ) : (
                paginatedVoters.map((voter, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx;
                  return (
                    <tr key={voter.id} className="border-b border-border/40 hover:bg-muted/40 transition-colors even:bg-muted/10">
                      <td className="px-3 py-2.5 text-muted-foreground text-xs w-12">
                        {translateContent(globalIdx + 1, tableLanguage)}
                      </td>
                      {visibleCols.map(col => (
                        <td
                          key={col.key}
                          className={`px-3 py-2.5 text-sm ${
                            autoWidth ? 'whitespace-nowrap' : 'truncate max-w-[200px]'
                          } ${
                            textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {col.key === 'mobileNumber' && voter[col.key] ? (
                            <span>{tableLanguage === 'ne' ? '🇳🇵' : '🇳🇵'} {translateContent(voter[col.key] || '', tableLanguage)}</span>
                          ) : (
                            translateContent(voter[col.key] ?? '', tableLanguage)
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 w-24">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditDialog(voter, globalIdx)}
                            className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"
                            title={t('edit')}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteVoter(voter.id)}
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {t('showing')} {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredVoters.length)} {t('of')} {filteredVoters.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page = i + 1;
                if (totalPages > 5) {
                  page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-md text-sm transition-colors ${
                      currentPage === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Edit Dialog with Prev/Next */}
      <AnimatePresence>
        {editingVoter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setEditingVoter(null); setEditingIndex(-1); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-xl border border-border p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl"
            >
              {/* Header with nav */}
              <div className="flex items-center justify-between mb-6 border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold">{t('voterRecord')}</h2>
                  <p className="text-sm text-muted-foreground">#{editingIndex + 1} / {filteredVoters.length}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-muted/50 rounded-lg p-1 mr-2">
                    <button
                      onClick={() => navigateEdit('prev')}
                      disabled={editingIndex <= 0}
                      className="p-2 rounded-md hover:bg-background hover:shadow-sm disabled:opacity-30 transition-all"
                      title={t('previous')}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <button
                      onClick={() => navigateEdit('next')}
                      disabled={editingIndex >= filteredVoters.length - 1}
                      className="p-2 rounded-md hover:bg-background hover:shadow-sm disabled:opacity-30 transition-all"
                      title={t('next')}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <button onClick={() => { setEditingVoter(null); setEditingIndex(-1); }} className="p-2 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {columnConfigs.map(col => {
                  const surnameConstraint = getSurnameConstraint(editingVoter.surname);

                  // If surname has a known mapping, lock ethnicity/caste
                  const getEthnicityOptions = () => {
                    if (surnameConstraint) return [surnameConstraint.ethnicity];
                    return ethnicityMappings.map(e => e.ethnicity);
                  };

                  const getCasteChoices = () => {
                    if (surnameConstraint) return [surnameConstraint.caste];
                    const selEth = editingVoter.ethnicity;
                    if (selEth) {
                      const ethMap = ethnicityMappings.find(e => e.ethnicity === selEth);
                      return ethMap ? ethMap.castes.map(c => c.caste) : [];
                    }
                    return ethnicityMappings.flatMap(e => e.castes.map(c => c.caste));
                  };

                  return (
                  <div key={col.key}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {language === 'ne' ? col.labelNe : col.labelEn}
                    </label>
                    {col.key === 'surname' ? (
                      <input
                        type="text"
                        value={String(editingVoter[col.key] || '')}
                        onChange={e => handleSurnameChange(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      />
                    ) : col.key === 'ethnicity' ? (
                      <div>
                        <select
                          value={String(editingVoter.ethnicity || '')}
                          onChange={e => {
                            const newEth = e.target.value;
                            setEditingVoter({ ...editingVoter, ethnicity: newEth, caste: '' });
                          }}
                          disabled={!!surnameConstraint}
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-70"
                        >
                          <option value="">-</option>
                          {getEthnicityOptions().map(e => (
                            <option key={e} value={e}>{e}</option>
                          ))}
                        </select>
                        {surnameConstraint && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">थर बाट स्वचालित</p>
                        )}
                      </div>
                    ) : col.key === 'caste' ? (
                      <div>
                        <select
                          value={String(editingVoter.caste || '')}
                          onChange={e => setEditingVoter({ ...editingVoter, caste: e.target.value })}
                          disabled={!!surnameConstraint}
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-70"
                        >
                          <option value="">-</option>
                          {getCasteChoices().map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {surnameConstraint && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">थर बाट स्वचालित</p>
                        )}
                      </div>
                    ) : col.key === 'mobileNumber' ? (
                      <div className="space-y-2">
                        {(String(editingVoter[col.key] || '').split(',') || ['']).map((number, idx, arr) => (
                          <div key={idx} className="flex gap-2">
                            <div className="flex flex-1">
                              <span className="flex items-center px-3 bg-muted border border-r-0 border-border rounded-l-lg text-sm">🇳🇵 +977</span>
                              <input
                                type="tel"
                                value={number.trim()}
                                onChange={e => {
                                  const newNumbers = [...arr];
                                  newNumbers[idx] = e.target.value;
                                  setEditingVoter({ ...editingVoter, [col.key]: newNumbers.join(',') });
                                }}
                                className="w-full px-3 py-2 border border-border rounded-r-lg text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none"
                              />
                            </div>
                            {arr.length > 1 && (
                              <button
                                onClick={() => {
                                  const newNumbers = arr.filter((_, i) => i !== idx);
                                  setEditingVoter({ ...editingVoter, [col.key]: newNumbers.join(',') });
                                }}
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                title="Remove number"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const current = String(editingVoter[col.key] || '');
                            setEditingVoter({ ...editingVoter, [col.key]: current ? `${current},` : '' });
                          }}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Plus className="w-3 h-3" /> Add another number
                        </button>
                      </div>
                    ) : col.key === 'locality' ? (() => {
                      // Get localities for selected municipality/ward
                      const locConfig = localityConfigs.find(lc => lc.municipalityId === selectedMunId);
                      const ward = selectedWard;
                      const wardLocalities = locConfig?.wards.find(w => w.wardNumber === ward?.number)?.localities || [];
                      if (wardLocalities.length > 0) {
                        return (
                          <select
                            value={String(editingVoter.locality || '')}
                            onChange={e => setEditingVoter({ ...editingVoter, locality: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none"
                          >
                            <option value="">-</option>
                            {wardLocalities.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        );
                      }
                      return (
                        <input
                          type="text"
                          value={String(editingVoter.locality || '')}
                          onChange={e => setEditingVoter({ ...editingVoter, locality: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none"
                        />
                      );
                    })() : col.key === 'family' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={String(editingVoter[col.key] || '')}
                          onChange={e => setEditingVoter({ ...editingVoter, family: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none"
                          placeholder={language === 'ne' ? 'परिवार ID' : 'Family ID'}
                        />
                        <button
                          onClick={handleSuggestFamily}
                          className="p-2 bg-accent/20 text-accent-foreground rounded-lg hover:bg-accent/30 transition-colors"
                          title={language === 'ne' ? 'AI सुझाव' : 'AI Suggest'}
                        >
                          <Sparkles className="w-4 h-4 text-orange-500" />
                        </button>
                      </div>
                    ) : col.type === 'single-choice' && col.choices ? (
                      <select
                        value={String(editingVoter[col.key] || '')}
                        onChange={e => setEditingVoter({ ...editingVoter, [col.key]: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      >
                        <option value="">-</option>
                        {col.choices.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : col.type === 'single-choice-logo' && col.choices ? (
                      <select
                        value={String(editingVoter[col.key] || '')}
                        onChange={e => setEditingVoter({ ...editingVoter, [col.key]: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      >
                        <option value="">-</option>
                        {col.choices.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input
                        type={col.type === 'number' ? 'number' : col.type === 'email' ? 'email' : 'text'}
                        value={String(editingVoter[col.key] || '')}
                        onChange={e => setEditingVoter({
                          ...editingVoter,
                          [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value,
                        })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      />
                    )}
                  </div>
                  );
                })}
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-8 pt-4 border-t">
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => navigateEdit('prev')}
                    disabled={editingIndex <= 0}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> {t('previous')}
                  </button>
                  <button
                    onClick={() => navigateEdit('next')}
                    disabled={editingIndex >= filteredVoters.length - 1}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    {t('next')} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button onClick={() => { setEditingVoter(null); setEditingIndex(-1); }} className="flex-1 sm:flex-initial px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
                    {t('cancel')}
                  </button>
                  <button onClick={handleSaveEditWithBulk} className="flex-1 sm:flex-initial px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity font-medium shadow-sm">
                    {t('save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Update Prompt */}
      <AnimatePresence>
        {showBulkPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{language === 'ne' ? 'बल्क अपडेट' : 'Bulk Update'}</h3>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ne'
                      ? `"${showBulkPrompt.surname}" थर भएका अन्य मतदाताहरूमा जात/जाति छैन। सबैमा अपडेट गर्ने?`
                      : `Other voters with surname "${showBulkPrompt.surname}" are missing caste/ethnicity. Update all?`}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4 bg-muted/50 rounded-lg p-2">
                {language === 'ne' ? 'जात' : 'Caste'}: <span className="font-semibold text-foreground">{showBulkPrompt.caste}</span> &nbsp;|&nbsp;
                {language === 'ne' ? 'जाति' : 'Ethnicity'}: <span className="font-semibold text-foreground">{showBulkPrompt.ethnicity}</span>
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowBulkPrompt(null)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => {
                    bulkAssignEthnicity(showBulkPrompt.surname, showBulkPrompt.caste, showBulkPrompt.ethnicity);
                    setShowBulkPrompt(null);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
                >
                  {language === 'ne' ? 'सबै अपडेट गर्नुहोस्' : 'Update All'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoterTable;
