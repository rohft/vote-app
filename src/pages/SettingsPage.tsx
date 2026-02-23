import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import { useData } from '@/contexts/DataContext';
import { ColumnConfig, Municipality, LocalityConfig, LocalityWard } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, Eye, EyeOff, GripVertical, Download, Upload,
  Plus, X, Trash2, ChevronDown, ChevronRight, Edit, Users, Type, ArrowUp, ArrowDown,
  Image, MapPin, Building2, Save, Check, Pencil, AlertTriangle, FileText,
  Sun, Moon, Sparkles, Clipboard
} from 'lucide-react';
import { readExcelFile, writeExcelFile } from '@/lib/excel';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SettingsPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { theme, setTheme, reduceMotion, setReduceMotion } = useTheme();
  const {
    columnConfigs, setColumnConfigs, addColumnConfig, removeColumnConfig, updateColumnConfig, moveColumnConfig,
    ethnicityMappings, setEthnicityMappings, bulkAssignEthnicity, getAllVoters,
    municipalities, localityConfigs, setLocalityConfigs
  } = useData();

  const [activeTab, setActiveTab] = useState<'columns' | 'ethnicity' | 'locality' | 'fonts'>('columns');
  const [fontLibrary, setFontLibrary] = useState<{ name: string; url: string }[]>(() => {
    const saved = localStorage.getItem('fontLibrary');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedNepaliFont, setSelectedNepaliFont] = useState<string | null>(() => localStorage.getItem('selectedNepaliFont'));
  const [selectedEnglishFont, setSelectedEnglishFont] = useState<string | null>(() => localStorage.getItem('selectedEnglishFont'));

  // Column CRUD state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnConfig | null>(null);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);
  const [newCol, setNewCol] = useState({ labelNe: '', labelEn: '', type: 'text' as ColumnConfig['type'] });
  const [newChoices, setNewChoices] = useState<string[]>([]);
  const [newChoiceInput, setNewChoiceInput] = useState('');
  const [choiceLogoFile, setChoiceLogoFile] = useState<string>('');
  const [editChoiceInput, setEditChoiceInput] = useState('');
  const [editChoiceLogo, setEditChoiceLogo] = useState<string>('');

  // Ethnicity state
  const [expandedEthnicity, setExpandedEthnicity] = useState<string | null>(null);
  const [newEthnicity, setNewEthnicity] = useState('');
  const [newCaste, setNewCaste] = useState('');
  const [newSurname, setNewSurname] = useState('');

  // Bulk Paste State
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteType, setPasteType] = useState<'ethnicity' | 'caste' | 'surname' | null>(null);
  const [pasteTargetEthnicity, setPasteTargetEthnicity] = useState<string>('');
  const [pasteTargetCaste, setPasteTargetCaste] = useState<string>('');
  const [pasteContent, setPasteContent] = useState('');

  const [saveMessage, setSaveMessage] = useState('');

  const toggleVisibility = (key: string) => {
    updateColumnConfig(key, { visible: !columnConfigs.find(c => c.key === key)?.visible });
  };

  // Add column
  const handleAddColumn = () => {
    if (!newCol.labelNe || !newCol.labelEn) return;
    const key = `custom_${Date.now()}`;
    addColumnConfig({
      key,
      labelNe: newCol.labelNe,
      labelEn: newCol.labelEn,
      type: newCol.type,
      visible: true,
      order: columnConfigs.length,
      choices: ['single-choice', 'single-choice-logo', 'multiple-choice'].includes(newCol.type) ? newChoices : undefined,
      isCustom: true,
    });
    setNewCol({ labelNe: '', labelEn: '', type: 'text' });
    setNewChoices([]);
    setNewChoiceInput('');
    setChoiceLogoFile('');
    setShowAddDialog(false);
  };

  // Edit column (update names/type)
  const handleSaveEdit = () => {
    if (!editingColumn) return;
    updateColumnConfig(editingColumn.key, {
      labelNe: editingColumn.labelNe,
      labelEn: editingColumn.labelEn,
      type: editingColumn.type,
      choices: editingColumn.choices,
      choiceLogos: editingColumn.choiceLogos,
    });
    setEditingColumn(null);
  };

  // Add choice to existing column via edit dialog
  const handleAddChoiceInEdit = () => {
    if (!editChoiceInput || !editingColumn) return;
    const updatedChoices = [...(editingColumn.choices || []), editChoiceInput];
    const updatedLogos = { ...(editingColumn.choiceLogos || {}) };
    if (editChoiceLogo && editingColumn.type === 'single-choice-logo') {
      updatedLogos[editChoiceInput] = editChoiceLogo;
    }
    setEditingColumn({ ...editingColumn, choices: updatedChoices, choiceLogos: updatedLogos });
    setEditChoiceInput('');
    setEditChoiceLogo('');
  };

  // Move choice up/down
  const handleMoveChoice = (index: number, direction: 'up' | 'down') => {
    if (!editingColumn || !editingColumn.choices) return;
    const choices = [...editingColumn.choices];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= choices.length) return;

    // Swap
    [choices[index], choices[targetIndex]] = [choices[targetIndex], choices[index]];
    setEditingColumn({ ...editingColumn, choices });
  };

  // Edit choice text inline
  const handleUpdateChoice = (oldChoice: string, newChoice: string) => {
    if (!editingColumn || !editingColumn.choices || !newChoice.trim()) return;
    if (editingColumn.choices.includes(newChoice) && newChoice !== oldChoice) {
      alert(language === 'ne' ? 'यो विकल्प पहिले नै छ' : 'Choice already exists');
      return;
    }

    const choices = editingColumn.choices.map(c => c === oldChoice ? newChoice : c);
    
    // Update logo key if exists
    let logos = editingColumn.choiceLogos;
    if (logos && logos[oldChoice]) {
      logos = { ...logos, [newChoice]: logos[oldChoice] };
      delete logos[oldChoice];
    }

    setEditingColumn({ ...editingColumn, choices, choiceLogos: logos });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'new' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      if (target === 'new') setChoiceLogoFile(data);
      else setEditChoiceLogo(data);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Logo upload for specific existing choice in edit dialog
  const handleChoiceLogoReplace = (e: React.ChangeEvent<HTMLInputElement>, choice: string) => {
    const file = e.target.files?.[0];
    if (!file || !editingColumn) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      const updatedLogos = { ...(editingColumn.choiceLogos || {}), [choice]: data };
      setEditingColumn({ ...editingColumn, choiceLogos: updatedLogos });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteColumn = (key: string) => {
    removeColumnConfig(key);
    setDeleteConfirmKey(null);
  };

  const handleDownloadTemplate = async () => {
    const headers = columnConfigs.map(c => c.labelNe);
    await writeExcelFile([headers], 'Template', 'voter_template.xlsx');
  };

  // Ethnicity operations
  const handleAddEthnicity = () => {
    if (!newEthnicity) return;
    setEthnicityMappings([...ethnicityMappings, { ethnicity: newEthnicity, castes: [] }]);
    setNewEthnicity('');
  };

  const handleDeleteEthnicity = (ethnicity: string) => {
    setEthnicityMappings(ethnicityMappings.filter(e => e.ethnicity !== ethnicity));
  };

  const handleAddCaste = (ethnicity: string) => {
    if (!newCaste) return;
    setEthnicityMappings(ethnicityMappings.map(e =>
      e.ethnicity === ethnicity ? { ...e, castes: [...e.castes, { caste: newCaste, surnames: [] }] } : e
    ));
    setNewCaste('');
  };

  const handleDeleteCaste = (ethnicity: string, caste: string) => {
    setEthnicityMappings(ethnicityMappings.map(e =>
      e.ethnicity === ethnicity ? { ...e, castes: e.castes.filter(c => c.caste !== caste) } : e
    ));
  };

  const handleAddSurname = (ethnicity: string, caste: string) => {
    if (!newSurname) return;
    setEthnicityMappings(ethnicityMappings.map(e =>
      e.ethnicity === ethnicity
        ? { ...e, castes: e.castes.map(c => c.caste === caste ? { ...c, surnames: [...c.surnames, newSurname] } : c) }
        : e
    ));
    setNewSurname('');
  };

  const handleDeleteSurname = (ethnicity: string, caste: string, surname: string) => {
    setEthnicityMappings(ethnicityMappings.map(e =>
      e.ethnicity === ethnicity
        ? { ...e, castes: e.castes.map(c => c.caste === caste ? { ...c, surnames: c.surnames.filter(s => s !== surname) } : c) }
        : e
    ));
  };

  const handleBulkAssign = (surname: string, caste: string, ethnicity: string) => {
    bulkAssignEthnicity(surname, caste, ethnicity);
  };

  const handleDownloadMapping = async () => {
    const rows: string[][] = [['जाति (Ethnicity)', 'जात (Caste)', 'थर (Surname)']];
    ethnicityMappings.forEach(e => {
      e.castes.forEach(c => { c.surnames.forEach(s => { rows.push([e.ethnicity, c.caste, s]); }); });
    });
    await writeExcelFile(rows, 'Mapping', 'ethnicity_mapping.xlsx');
  };

  const handleUploadMapping = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const jsonData = await readExcelFile(file);
      if (jsonData.length < 2) return;

      // Create a deep copy of existing mappings for merging
      const mergedMappings = JSON.parse(JSON.stringify(ethnicityMappings));

      let addedCount = 0;
      jsonData.slice(1).forEach(row => {
        const ethName = String(row[0] || '').trim();
        const casName = String(row[1] || '').trim();
        const surName = String(row[2] || '').trim();

        if (!ethName || !casName || !surName) return;

        // Find or create Ethnicity
        let ethEntry = mergedMappings.find((e: any) => e.ethnicity === ethName);
        if (!ethEntry) {
          ethEntry = { ethnicity: ethName, castes: [] };
          mergedMappings.push(ethEntry);
        }

        // Find or create Caste
        let casEntry = ethEntry.castes.find((c: any) => c.caste === casName);
        if (!casEntry) {
          casEntry = { caste: casName, surnames: [] };
          ethEntry.castes.push(casEntry);
        }

        // Add Surname if not exists
        if (!casEntry.surnames.includes(surName)) {
          casEntry.surnames.push(surName);
          addedCount++;
        }
      });

      setEthnicityMappings(mergedMappings);
      
      const msg = language === 'ne' 
        ? `${addedCount} नयाँ रेकर्डहरू सफलतापूर्वक थपियो!` 
        : `Successfully added ${addedCount} new records!`;
      setSaveMessage(msg);
      setTimeout(() => setSaveMessage(''), 3000);
      
    } catch (error) {
      console.error("Upload error:", error);
      setSaveMessage(language === 'ne' ? 'अपलोड असफल भयो' : 'Upload failed');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      e.target.value = '';
    }
  };

  const handleBulkUploadEthnicities = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const jsonData = await readExcelFile(file);
      if (jsonData.length < 1) return;

      const mergedMappings = JSON.parse(JSON.stringify(ethnicityMappings));
      let addedCount = 0;

      // Expecting single column of Ethnicities
      jsonData.forEach(row => {
        const ethName = String(row[0] || '').trim();
        if (!ethName) return;

        if (!mergedMappings.find((e: any) => e.ethnicity === ethName)) {
          mergedMappings.push({ ethnicity: ethName, castes: [] });
          addedCount++;
        }
      });

      setEthnicityMappings(mergedMappings);
      const msg = language === 'ne' 
        ? `${addedCount} नयाँ जातिहरू थपियो!` 
        : `Added ${addedCount} new ethnicities!`;
      setSaveMessage(msg);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      e.target.value = '';
    }
  };

  const handleBulkUploadCastes = async (e: React.ChangeEvent<HTMLInputElement>, targetEthnicity: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const jsonData = await readExcelFile(file);
      if (jsonData.length < 1) return;

      const mergedMappings = JSON.parse(JSON.stringify(ethnicityMappings));
      const ethEntry = mergedMappings.find((e: any) => e.ethnicity === targetEthnicity);
      
      if (!ethEntry) return;

      let addedCount = 0;
      // Expecting single column of Castes
      jsonData.forEach(row => {
        const casName = String(row[0] || '').trim();
        if (!casName) return;

        if (!ethEntry.castes.find((c: any) => c.caste === casName)) {
          ethEntry.castes.push({ caste: casName, surnames: [] });
          addedCount++;
        }
      });

      setEthnicityMappings(mergedMappings);
      const msg = language === 'ne' 
        ? `${addedCount} नयाँ जातहरू थपियो!` 
        : `Added ${addedCount} new castes!`;
      setSaveMessage(msg);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      e.target.value = '';
    }
  };

  const handleBulkUploadSurnames = async (e: React.ChangeEvent<HTMLInputElement>, targetEthnicity: string, targetCaste: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const jsonData = await readExcelFile(file);
      if (jsonData.length < 1) return;

      const mergedMappings = JSON.parse(JSON.stringify(ethnicityMappings));
      const ethEntry = mergedMappings.find((e: any) => e.ethnicity === targetEthnicity);
      if (!ethEntry) return;
      
      const casEntry = ethEntry.castes.find((c: any) => c.caste === targetCaste);
      if (!casEntry) return;

      let addedCount = 0;
      // Expecting single column of Surnames
      jsonData.forEach(row => {
        const surName = String(row[0] || '').trim();
        if (!surName) return;

        if (!casEntry.surnames.includes(surName)) {
          casEntry.surnames.push(surName);
          addedCount++;
        }
      });

      setEthnicityMappings(mergedMappings);
      const msg = language === 'ne' 
        ? `${addedCount} नयाँ थरहरू थपियो!` 
        : `Added ${addedCount} new surnames!`;
      setSaveMessage(msg);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      e.target.value = '';
    }
  };

  const openPasteDialog = (type: 'ethnicity' | 'caste' | 'surname', ethnicity = '', caste = '') => {
    setPasteType(type);
    setPasteTargetEthnicity(ethnicity);
    setPasteTargetCaste(caste);
    setPasteContent('');
    setPasteDialogOpen(true);
  };

  const handlePasteSubmit = () => {
    if (!pasteContent.trim()) return;

    const items = pasteContent.split(/[,\n]+/).map(s => s.trim()).filter(s => s);
    if (items.length === 0) return;

    const mergedMappings = JSON.parse(JSON.stringify(ethnicityMappings));
    let addedCount = 0;

    if (pasteType === 'ethnicity') {
      items.forEach(ethName => {
        if (!mergedMappings.find((e: any) => e.ethnicity === ethName)) {
          mergedMappings.push({ ethnicity: ethName, castes: [] });
          addedCount++;
        }
      });
    } else if (pasteType === 'caste') {
      const ethEntry = mergedMappings.find((e: any) => e.ethnicity === pasteTargetEthnicity);
      if (ethEntry) {
        items.forEach(casName => {
          if (!ethEntry.castes.find((c: any) => c.caste === casName)) {
            ethEntry.castes.push({ caste: casName, surnames: [] });
            addedCount++;
          }
        });
      }
    } else if (pasteType === 'surname') {
      const ethEntry = mergedMappings.find((e: any) => e.ethnicity === pasteTargetEthnicity);
      if (ethEntry) {
        const casEntry = ethEntry.castes.find((c: any) => c.caste === pasteTargetCaste);
        if (casEntry) {
          items.forEach(surName => {
            if (!casEntry.surnames.includes(surName)) {
              casEntry.surnames.push(surName);
              addedCount++;
            }
          });
        }
      }
    }

    setEthnicityMappings(mergedMappings);
    const msg = language === 'ne'
      ? `${addedCount} रेकर्डहरू थपियो!`
      : `Added ${addedCount} records!`;
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(''), 3000);
    setPasteDialogOpen(false);
  };

  const allVoters = getAllVoters();

  // Font library logic
  const saveFontLibrary = (lib: { name: string; url: string }[]) => {
    setFontLibrary(lib);
    localStorage.setItem('fontLibrary', JSON.stringify(lib));
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        setFontLibrary(prev => {
          const exists = prev.some(f => f.name === file.name);
          if (exists) return prev;
          const updated = [...prev, { name: file.name, url }];
          localStorage.setItem('fontLibrary', JSON.stringify(updated));
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeFont = (fontName: string) => {
    const updated = fontLibrary.filter(f => f.name !== fontName);
    saveFontLibrary(updated);
    if (selectedNepaliFont === fontName) { setSelectedNepaliFont(null); localStorage.removeItem('selectedNepaliFont'); }
    if (selectedEnglishFont === fontName) { setSelectedEnglishFont(null); localStorage.removeItem('selectedEnglishFont'); }
  };

  const selectFont = (fontName: string | null, type: 'nepali' | 'english') => {
    if (type === 'nepali') { setSelectedNepaliFont(fontName); if (fontName) localStorage.setItem('selectedNepaliFont', fontName); else localStorage.removeItem('selectedNepaliFont'); }
    else { setSelectedEnglishFont(fontName); if (fontName) localStorage.setItem('selectedEnglishFont', fontName); else localStorage.removeItem('selectedEnglishFont'); }
  };

  useEffect(() => {
    let styleEl = document.getElementById('custom-fonts-style') as HTMLStyleElement | null;
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'custom-fonts-style'; document.head.appendChild(styleEl); }
    let css = '';
    // Register all fonts
    fontLibrary.forEach((f, i) => {
      css += `@font-face { font-family: 'CustomFont${i}'; src: url('${f.url}'); font-display: swap; }\n`;
    });
    const nepaliFont = selectedNepaliFont ? fontLibrary.find(f => f.name === selectedNepaliFont) : null;
    const englishFont = selectedEnglishFont ? fontLibrary.find(f => f.name === selectedEnglishFont) : null;
    if (nepaliFont) {
      const idx = fontLibrary.indexOf(nepaliFont);
      css += `:root { --font-nepali: 'CustomFont${idx}', 'Kalimati', 'Noto Sans Devanagari', sans-serif; }\n`;
    }
    if (englishFont) {
      const idx = fontLibrary.indexOf(englishFont);
      css += `:root { --font-english: 'CustomFont${idx}', 'Inter', system-ui, sans-serif; }\n`;
    }
    styleEl.textContent = css;
  }, [fontLibrary, selectedNepaliFont, selectedEnglishFont]);

  const tabs = [
    { id: 'columns' as const, label: t('columnConfig'), icon: SettingsIcon },
    { id: 'ethnicity' as const, label: t('ethnicityMapping'), icon: Users },
    { id: 'locality' as const, label: language === 'ne' ? 'टोल व्यवस्थापन' : 'Locality Management', icon: MapPin },
    { id: 'fonts' as const, label: language === 'ne' ? 'फन्ट व्यवस्थापन' : 'Font Management', icon: Type },
  ];

  const handleSaveAll = () => {
    localStorage.setItem('votersetu_columnConfigs', JSON.stringify(columnConfigs));
    localStorage.setItem('votersetu_ethnicityMappings', JSON.stringify(ethnicityMappings));
    localStorage.setItem('votersetu_localityConfigs', JSON.stringify(localityConfigs));
    localStorage.setItem('votersetu_municipalities', JSON.stringify(municipalities));
    setSaveMessage(language === 'ne' ? 'सेटिङ सुरक्षित भयो!' : 'Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const sortedConfigs = [...columnConfigs].sort((a, b) => a.order - b.order);

  const getTypeLabel = (type: ColumnConfig['type']) => {
    const map: Record<string, string> = {
      text: language === 'ne' ? 'टेक्स्ट' : 'Text',
      number: language === 'ne' ? 'संख्या' : 'Number',
      'single-choice': language === 'ne' ? 'एकल छनौट' : 'Single Choice',
      'single-choice-logo': language === 'ne' ? 'छनौट + लोगो' : 'Choice + Logo',
      'multiple-choice': language === 'ne' ? 'बहु छनौट' : 'Multi Choice',
      phone: language === 'ne' ? 'फोन' : 'Phone',
      email: language === 'ne' ? 'इमेल' : 'Email',
    };
    return map[type] || type;
  };

  const hasChoices = (type: string) => ['single-choice', 'single-choice-logo', 'multiple-choice'].includes(type);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{t('settings')}</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <AnimatePresence>
            {saveMessage && (
              <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-sm text-primary font-medium">
                <Check className="w-4 h-4 inline mr-1" />{saveMessage}
              </motion.span>
            )}
          </AnimatePresence>
          <Button onClick={handleSaveAll} className="ml-auto sm:ml-0">
            <Save className="w-4 h-4" />
            {language === 'ne' ? 'सेटिङ सुरक्षित गर्नुहोस्' : 'Save Settings'}
          </Button>
        </div>
      </motion.div>

      {/* Tabs - scrollable on mobile */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-shrink-0 sm:flex-1 justify-center whitespace-nowrap ${
              activeTab === tab.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4 flex-shrink-0" />
            <span className="hidden xs:inline sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ===== Column Configuration Tab ===== */}
      {activeTab === 'columns' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">{t('columnConfig')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ne' ? `${sortedConfigs.length} स्तम्भहरू कन्फिगर गरिएको` : `${sortedConfigs.length} columns configured`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button size="sm" onClick={() => setShowAddDialog(true)} className="flex-1 sm:flex-initial">
                    <Plus className="w-4 h-4" />
                    {t('addColumn')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleDownloadTemplate} className="flex-1 sm:flex-initial">
                    <Download className="w-4 h-4" />
                    {t('downloadTemplate')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Column List - Card style on mobile, table-like on desktop */}
              <div className="space-y-1.5">
                {/* Header row - desktop only */}
                <div className="hidden md:grid md:grid-cols-[40px_1fr_120px_80px_100px] gap-3 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border">
                  <span>{language === 'ne' ? 'क्रम' : 'Order'}</span>
                  <span>{language === 'ne' ? 'स्तम्भ नाम' : 'Column Name'}</span>
                  <span>{language === 'ne' ? 'प्रकार' : 'Type'}</span>
                  <span className="text-center">{language === 'ne' ? 'दृश्यता' : 'Visible'}</span>
                  <span className="text-center">{language === 'ne' ? 'कार्य' : 'Actions'}</span>
                </div>

                {sortedConfigs.map((col, idx) => (
                  <motion.div
                    key={col.key}
                    layout
                    className="group rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all"
                  >
                    {/* Desktop row */}
                    <div className="hidden md:grid md:grid-cols-[40px_1fr_120px_80px_100px] gap-3 items-center px-3 py-2.5">
                      {/* Order arrows */}
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveColumnConfig(col.key, 'up')} disabled={idx === 0}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-20 transition-colors">
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveColumnConfig(col.key, 'down')} disabled={idx === sortedConfigs.length - 1}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-20 transition-colors">
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      {/* Name */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{language === 'ne' ? col.labelNe : col.labelEn}</p>
                        <p className="text-xs text-muted-foreground truncate">{language === 'ne' ? col.labelEn : col.labelNe}</p>
                      </div>
                      {/* Type badge */}
                      <div>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {col.type === 'single-choice-logo' && <Image className="w-3 h-3 mr-1" />}
                          {getTypeLabel(col.type)}
                        </Badge>
                      </div>
                      {/* Visibility */}
                      <div className="text-center">
                        <button onClick={() => toggleVisibility(col.key)}
                          className={`p-1.5 rounded-md transition-colors ${col.visible ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted'}`}>
                          {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditingColumn({ ...col }); setEditChoiceInput(''); setEditChoiceLogo(''); }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title={t('edit')}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {col.isCustom && (
                          <button onClick={() => setDeleteConfirmKey(col.key)}
                            className="p-1.5 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors" title={t('delete')}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="md:hidden p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground font-mono w-5">#{idx + 1}</span>
                            <p className="text-sm font-medium truncate">{language === 'ne' ? col.labelNe : col.labelEn}</p>
                          </div>
                          <p className="text-xs text-muted-foreground ml-7 truncate">{language === 'ne' ? col.labelEn : col.labelNe}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge variant="secondary" className="text-[10px] font-normal h-5">
                            {getTypeLabel(col.type)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1">
                          <button onClick={() => moveColumnConfig(col.key, 'up')} disabled={idx === 0}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-20">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => moveColumnConfig(col.key, 'down')} disabled={idx === sortedConfigs.length - 1}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-20">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleVisibility(col.key)}
                            className={`p-1.5 rounded-md transition-colors ${col.visible ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted'}`}>
                            {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button onClick={() => { setEditingColumn({ ...col }); setEditChoiceInput(''); setEditChoiceLogo(''); }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {col.isCustom && (
                            <button onClick={() => setDeleteConfirmKey(col.key)}
                              className="p-1.5 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ===== ADD COLUMN DIALOG ===== */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addColumn')}</DialogTitle>
            <DialogDescription>{language === 'ne' ? 'नयाँ स्तम्भ कन्फिगर गर्नुहोस्' : 'Configure a new column'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-xs">{t('columnName')} (नेपाली)</Label>
                <Input value={newCol.labelNe} onChange={e => setNewCol({ ...newCol, labelNe: e.target.value })} placeholder="नेपाली नाम" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">{t('columnNameEn')}</Label>
                <Input value={newCol.labelEn} onChange={e => setNewCol({ ...newCol, labelEn: e.target.value })} placeholder="English name" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">{t('columnType')}</Label>
                <Select value={newCol.type} onValueChange={v => setNewCol({ ...newCol, type: v as ColumnConfig['type'] })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Free Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="single-choice">Single Choice</SelectItem>
                    <SelectItem value="single-choice-logo">Single Choice + Logo</SelectItem>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasChoices(newCol.type) && (
              <div>
                <Label className="text-xs mb-2 block">{t('choiceOptions')}</Label>
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                  {newChoices.map((c, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {c}
                      <button onClick={() => setNewChoices(newChoices.filter((_, j) => j !== i))} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {newChoices.length === 0 && <span className="text-xs text-muted-foreground">{language === 'ne' ? 'कुनै विकल्प छैन' : 'No options yet'}</span>}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newChoiceInput}
                    onChange={e => setNewChoiceInput(e.target.value)}
                    placeholder={t('addChoice')}
                    className="text-sm"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newChoiceInput) {
                        setNewChoices([...newChoices, newChoiceInput]);
                        setNewChoiceInput('');
                      }
                    }}
                  />
                  {newCol.type === 'single-choice-logo' && (
                    <label className="flex items-center gap-1 px-3 border border-input rounded-md cursor-pointer hover:bg-muted transition-colors flex-shrink-0">
                      <Image className="w-4 h-4 text-muted-foreground" />
                      {choiceLogoFile ? <Check className="w-3 h-3 text-primary" /> : null}
                      <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'new')} className="hidden" />
                    </label>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => {
                    if (newChoiceInput) { setNewChoices([...newChoices, newChoiceInput]); setNewChoiceInput(''); }
                  }}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t('cancel')}</Button>
            <Button onClick={handleAddColumn} disabled={!newCol.labelNe || !newCol.labelEn}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT COLUMN DIALOG ===== */}
      <Dialog open={!!editingColumn} onOpenChange={(open) => { if (!open) setEditingColumn(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'ne' ? 'स्तम्भ सम्पादन' : 'Edit Column'}</DialogTitle>
            <DialogDescription>
              {editingColumn?.isCustom
                ? (language === 'ne' ? 'नाम, प्रकार, र विकल्पहरू सम्पादन गर्नुहोस्' : 'Edit name, type, and options')
                : (language === 'ne' ? 'विकल्पहरू व्यवस्थापन गर्नुहोस्' : 'Manage options and visibility')}
            </DialogDescription>
          </DialogHeader>
          {editingColumn && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">{t('columnName')}</Label>
                <Input
                  value={language === 'ne' ? editingColumn.labelNe : editingColumn.labelEn}
                  onChange={e => {
                    if (language === 'ne') {
                      setEditingColumn({ ...editingColumn, labelNe: e.target.value });
                    } else {
                      setEditingColumn({ ...editingColumn, labelEn: e.target.value });
                    }
                  }}
                  className="mt-1"
                  disabled={!editingColumn.isCustom}
                />
              </div>

              <div>
                <Label className="text-xs">{t('columnType')}</Label>
                <Select value={editingColumn.type} onValueChange={v => {
                  const newType = v as ColumnConfig['type'];
                  const needsChoices = hasChoices(newType);
                  setEditingColumn({
                    ...editingColumn,
                    type: newType,
                    choices: needsChoices ? (editingColumn.choices || []) : undefined,
                    choiceLogos: newType === 'single-choice-logo' ? (editingColumn.choiceLogos || {}) : undefined,
                  });
                }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">{language === 'ne' ? 'टेक्स्ट' : 'Free Text'}</SelectItem>
                    <SelectItem value="number">{language === 'ne' ? 'संख्या' : 'Number'}</SelectItem>
                    <SelectItem value="single-choice">{language === 'ne' ? 'एकल छनौट' : 'Single Choice'}</SelectItem>
                    <SelectItem value="single-choice-logo">{language === 'ne' ? 'छनौट + लोगो' : 'Single Choice + Logo'}</SelectItem>
                    <SelectItem value="multiple-choice">{language === 'ne' ? 'बहु छनौट' : 'Multiple Choice'}</SelectItem>
                    <SelectItem value="phone">{language === 'ne' ? 'फोन' : 'Phone'}</SelectItem>
                    <SelectItem value="email">{language === 'ne' ? 'इमेल' : 'Email'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Choices management */}
              {hasChoices(editingColumn.type) && (
                <div>
                  <Label className="text-xs mb-2 block">{t('choiceOptions')}</Label>
                  <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                    {(editingColumn.choices || []).length === 0 && (
                      <p className="text-xs text-muted-foreground py-2">{language === 'ne' ? 'कुनै विकल्प छैन' : 'No options configured'}</p>
                    )}
                    {(editingColumn.choices || []).map((choice, idx) => (
                      <div key={choice} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50 group">
                        {/* Reorder Arrows */}
                        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => handleMoveChoice(idx, 'up')} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                             <ArrowUp className="w-3 h-3" />
                           </button>
                           <button onClick={() => handleMoveChoice(idx, 'down')} disabled={idx === (editingColumn.choices?.length || 0) - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                             <ArrowDown className="w-3 h-3" />
                           </button>
                        </div>

                        {/* Logo thumbnail */}
                        {editingColumn.type === 'single-choice-logo' && (
                          <label className="flex-shrink-0 cursor-pointer" title={language === 'ne' ? 'लोगो बदल्नुहोस्' : 'Change logo'}>
                            {editingColumn.choiceLogos?.[choice] ? (
                              <img src={editingColumn.choiceLogos[choice]} alt={choice} className="w-7 h-7 rounded object-contain border border-border bg-background" />
                            ) : (
                              <div className="w-7 h-7 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors">
                                <Image className="w-3.5 h-3.5 text-muted-foreground/50" />
                              </div>
                            )}
                            <input type="file" accept="image/*" onChange={e => handleChoiceLogoReplace(e, choice)} className="hidden" />
                          </label>
                        )}
                        
                        {/* Editable Text */}
                        <input 
                          className="flex-1 text-sm bg-transparent border-none focus:ring-0 focus:outline-none hover:bg-background/50 rounded px-1"
                          value={choice}
                          onChange={(e) => handleUpdateChoice(choice, e.target.value)}
                        />

                        <button onClick={() => handleRemoveChoiceInEdit(choice)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex gap-2">
                    <Input
                      value={editChoiceInput}
                      onChange={e => setEditChoiceInput(e.target.value)}
                      placeholder={t('addChoice')}
                      className="text-sm"
                      onKeyDown={e => { if (e.key === 'Enter') handleAddChoiceInEdit(); }}
                    />
                    {editingColumn.type === 'single-choice-logo' && (
                      <label className="flex items-center gap-1 px-3 border border-input rounded-md cursor-pointer hover:bg-muted transition-colors flex-shrink-0">
                        <Image className="w-4 h-4 text-muted-foreground" />
                        {editChoiceLogo ? <Check className="w-3 h-3 text-primary" /> : null}
                        <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'edit')} className="hidden" />
                      </label>
                    )}
                    <Button size="sm" variant="secondary" onClick={handleAddChoiceInEdit} disabled={!editChoiceInput}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingColumn(null)}>{t('cancel')}</Button>
            <Button onClick={handleSaveEdit}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE CONFIRMATION DIALOG ===== */}
      <Dialog open={!!deleteConfirmKey} onOpenChange={(open) => { if (!open) setDeleteConfirmKey(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {language === 'ne' ? 'स्तम्भ मेटाउनुहोस्?' : 'Delete Column?'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ne'
                ? 'यो कार्य पूर्ववत गर्न सकिँदैन। यो स्तम्भ र यसको डाटा स्थायी रूपमा मेटिनेछ।'
                : 'This action cannot be undone. This column and its data will be permanently deleted.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmKey(null)}>{t('cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteConfirmKey && handleDeleteColumn(deleteConfirmKey)}>
              <Trash2 className="w-4 h-4" />
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Locality Tab ===== */}
      {activeTab === 'locality' && (
        <LocalityTab municipalities={municipalities} localityConfigs={localityConfigs} setLocalityConfigs={setLocalityConfigs} language={language} t={t} />
      )}

      {/* ===== Fonts Tab ===== */}
      {activeTab === 'fonts' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Font Library */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg">{language === 'ne' ? 'फन्ट लाइब्रेरी' : 'Font Library'}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{language === 'ne' ? `${fontLibrary.length} फन्ट अपलोड भएको` : `${fontLibrary.length} font(s) uploaded`}</p>
                </div>
                <label className="cursor-pointer">
                  <Button size="sm" asChild>
                    <span><Upload className="w-4 h-4" />{language === 'ne' ? 'फन्ट अपलोड' : 'Upload Fonts'}<input type="file" accept=".otf,.ttf,.woff,.woff2" multiple onChange={handleFontUpload} className="hidden" /></span>
                  </Button>
                </label>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {fontLibrary.length === 0 ? (
                <label className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{language === 'ne' ? 'फन्ट फाइलहरू छान्नुहोस् (.otf, .ttf, .woff, .woff2)' : 'Choose font files (.otf, .ttf, .woff, .woff2)'}</span>
                  <input type="file" accept=".otf,.ttf,.woff,.woff2" multiple onChange={handleFontUpload} className="hidden" />
                </label>
              ) : (
                <div className="space-y-2">
                  {fontLibrary.map((font) => (
                    <div key={font.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors group">
                      <Type className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium truncate">{font.name}</span>
                      <div className="flex items-center gap-1.5">
                        {selectedNepaliFont === font.name && <Badge variant="secondary" className="text-[10px]">{language === 'ne' ? 'नेपाली' : 'Nepali'}</Badge>}
                        {selectedEnglishFont === font.name && <Badge className="text-[10px]">{language === 'ne' ? 'अंग्रेजी' : 'English'}</Badge>}
                        <button onClick={() => removeFont(font.name)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Font Selection */}
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-5">
              <div>
                <Label className="text-sm font-semibold mb-2 block">{language === 'ne' ? 'नेपाली फन्ट छान्नुहोस्' : 'Select Nepali Font'}</Label>
                <p className="text-xs text-muted-foreground mb-2">{language === 'ne' ? 'देवनागरी लिपिका लागि' : 'For Devanagari script'}</p>
                <Select value={selectedNepaliFont || '__default__'} onValueChange={v => selectFont(v === '__default__' ? null : v, 'nepali')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">{language === 'ne' ? 'पूर्वनिर्धारित (Kalimati)' : 'Default (Kalimati)'}</SelectItem>
                    {fontLibrary.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2 font-nepali">{language === 'ne' ? 'पूर्वावलोकन: नमस्ते नेपाल' : 'Preview: नमस्ते नेपाल'}</p>
              </div>
              <Separator />
              <div>
                <Label className="text-sm font-semibold mb-2 block">{language === 'ne' ? 'अंग्रेजी फन्ट छान्नुहोस्' : 'Select English Font'}</Label>
                <p className="text-xs text-muted-foreground mb-2">{language === 'ne' ? 'ल्याटिन लिपिका लागि' : 'For Latin script'}</p>
                <Select value={selectedEnglishFont || '__default__'} onValueChange={v => selectFont(v === '__default__' ? null : v, 'english')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">{language === 'ne' ? 'पूर्वनिर्धारित (Inter)' : 'Default (Inter)'}</SelectItem>
                    {fontLibrary.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2 font-english">Preview: Hello World 123</p>
              </div>
            </CardContent>
          </Card>

          {/* Language */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-4">{t('language')}</h2>
              <div className="flex gap-3">
                <LanguageButton lang="ne" current={language} label="नेपाली" />
                <LanguageButton lang="en" current={language} label="English" />
              </div>
            </CardContent>
          </Card>

          {/* Theme */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-4">{language === 'ne' ? 'थिम' : 'Theme'}</h2>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 border border-input rounded-lg p-1">
                  {[
                    { key: 'light', label: 'Light', icon: Sun },
                    { key: 'dark', label: 'Dark', icon: Moon },
                    { key: 'aurora', label: 'Aurora', icon: Sparkles },
                  ].map((t) => (
                    <Button
                      key={t.key}
                      variant={theme === t.key ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTheme(t.key as ThemeName)}
                      className="gap-2"
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </Button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setReduceMotion(!reduceMotion)}
                    className="gap-2"
                  >
                    {reduceMotion ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {language === 'ne' ? 'मोशन कम गर्नुहोस्' : 'Reduce Motion'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ===== Ethnicity Mapping Tab ===== */}
      {activeTab === 'ethnicity' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-base sm:text-lg">{t('ethnicityMapping')}</CardTitle>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Button size="sm" variant="outline" asChild>
                      <span>
                        <Upload className="w-4 h-4" />
                        {t('bulkUpload')}
                        <input type="file" accept=".xlsx,.xls" onChange={handleUploadMapping} className="hidden" />
                      </span>
                    </Button>
                  </label>
                  <Button size="sm" variant="secondary" onClick={handleDownloadMapping}>
                    <Download className="w-4 h-4" />
                    {t('downloadMapping')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Add Ethnicity */}
              <div className="flex gap-2 mb-4">
                <Input value={newEthnicity} onChange={e => setNewEthnicity(e.target.value)} placeholder={t('addEthnicity')}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddEthnicity(); }} className="text-sm" />
                <Button size="sm" onClick={handleAddEthnicity} disabled={!newEthnicity}><Plus className="w-4 h-4" /></Button>
                <label className="cursor-pointer">
                  <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9">
                    <Upload className="w-4 h-4" />
                  </div>
                  <input type="file" accept=".xlsx,.xls" onChange={handleBulkUploadEthnicities} className="hidden" />
                </label>
                <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={() => openPasteDialog('ethnicity')} title={language === 'ne' ? 'पेस्ट गर्नुहोस्' : 'Paste'}>
                  <Clipboard className="w-4 h-4" />
                </Button>
              </div>

              {/* Ethnicity Tree */}
              <div className="space-y-2">
                {ethnicityMappings.map(eth => (
                  <div key={eth.ethnicity} className="border border-border rounded-lg overflow-hidden">
                    <button onClick={() => setExpandedEthnicity(expandedEthnicity === eth.ethnicity ? null : eth.ethnicity)}
                      className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        {expandedEthnicity === eth.ethnicity ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-semibold text-sm">{eth.ethnicity}</span>
                        <Badge variant="secondary" className="text-[10px]">{eth.castes.length} {t('caste')}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{eth.castes.reduce((s, c) => s + c.surnames.length, 0)} {t('surname')}</Badge>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteEthnicity(eth.ethnicity); }}
                        className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </button>
                    <AnimatePresence>
                      {expandedEthnicity === eth.ethnicity && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border">
                          <div className="p-3 sm:p-4 space-y-3">
                            <div className="flex gap-2">
                              <Input value={newCaste} onChange={e => setNewCaste(e.target.value)} placeholder={t('addCaste')} className="text-sm"
                                onKeyDown={e => { if (e.key === 'Enter') handleAddCaste(eth.ethnicity); }} />
                              <Button size="sm" variant="secondary" onClick={() => handleAddCaste(eth.ethnicity)} disabled={!newCaste}><Plus className="w-3 h-3" /></Button>
                              <label className="cursor-pointer">
                                <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 w-9">
                                  <Upload className="w-3 h-3" />
                                </div>
                                <input type="file" accept=".xlsx,.xls" onChange={(e) => handleBulkUploadCastes(e, eth.ethnicity)} className="hidden" />
                              </label>
                              <Button size="sm" variant="secondary" className="h-9 w-9 p-0" onClick={() => openPasteDialog('caste', eth.ethnicity)}>
                                <Clipboard className="w-3 h-3" />
                              </Button>
                            </div>
                            {eth.castes.map(cas => (
                              <div key={cas.caste} className="pl-3 sm:pl-4 border-l-2 border-secondary/30">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-secondary">{cas.caste}</span>
                                  <button onClick={() => handleDeleteCaste(eth.ethnicity, cas.caste)}
                                    className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3 h-3" /></button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {cas.surnames.map(sur => {
                                    const voterCount = allVoters.filter(v => v.surname === sur).length;
                                    return (
                                      <span key={sur} className="group flex items-center gap-1 px-2 py-1 bg-accent/15 text-foreground rounded text-xs font-medium">
                                        {sur}
                                        {voterCount > 0 && <span className="text-muted-foreground">({voterCount})</span>}
                                        <button onClick={() => handleBulkAssign(sur, cas.caste, eth.ethnicity)}
                                          className="hidden group-hover:inline-flex p-0.5 rounded hover:bg-primary/20 text-primary" title={t('bulkAssign')}>
                                          <Users className="w-3 h-3" /></button>
                                        <button onClick={() => handleDeleteSurname(eth.ethnicity, cas.caste, sur)}
                                          className="hidden group-hover:inline-flex p-0.5 rounded hover:bg-destructive/20 text-destructive">
                                          <X className="w-3 h-3" /></button>
                                      </span>
                                    );
                                  })}
                                </div>
                                <div className="flex gap-2">
                                  <Input value={newSurname} onChange={e => setNewSurname(e.target.value)} placeholder={t('addSurname')} className="text-xs h-8"
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddSurname(eth.ethnicity, cas.caste); }} />
                                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => handleAddSurname(eth.ethnicity, cas.caste)} disabled={!newSurname}>
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                  <label className="cursor-pointer">
                                    <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8">
                                      <Upload className="w-3 h-3" />
                                    </div>
                                    <input type="file" accept=".xlsx,.xls" onChange={(e) => handleBulkUploadSurnames(e, eth.ethnicity, cas.caste)} className="hidden" />
                                  </label>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openPasteDialog('surname', eth.ethnicity, cas.caste)}>
                                    <Clipboard className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      {/* ===== Bulk Paste Dialog ===== */}
      <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ne' ? 'बल्क पेस्ट' : 'Bulk Paste'}</DialogTitle>
            <DialogDescription>
              {language === 'ne'
                ? 'तल डाटा पेस्ट गर्नुहोस् (अल्पविराम वा नयाँ लाइनद्वारा छुट्याइएको)'
                : 'Paste data below (separated by comma or new line)'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={pasteContent}
            onChange={e => setPasteContent(e.target.value)}
            placeholder={language === 'ne' ? "उदाहरण 1, उदाहरण 2, उदाहरण 3..." : "Item 1, Item 2, Item 3..."}
            className="min-h-[150px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasteDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handlePasteSubmit}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const LocalityTab: React.FC<{
  municipalities: Municipality[];
  localityConfigs: LocalityConfig[];
  setLocalityConfigs: (configs: LocalityConfig[]) => void;
  language: string;
  t: (key: string) => string;
}> = ({ municipalities, localityConfigs, setLocalityConfigs, language, t }) => {
  const [selectedMunId, setSelectedMunId] = useState('');
  const [expandedWard, setExpandedWard] = useState<number | null>(null);
  const [newLocality, setNewLocality] = useState('');

  const selectedMun = municipalities.find(m => m.id === selectedMunId);

  const getOrCreateConfig = (munId: string): LocalityConfig => {
    const existing = localityConfigs.find(lc => lc.municipalityId === munId);
    if (existing) return existing;
    const mun = municipalities.find(m => m.id === munId);
    return {
      municipalityId: munId,
      municipalityName: mun ? (language === 'ne' ? mun.nameNe : mun.name) : '',
      wards: mun ? mun.wards.map(w => ({ wardNumber: w.number, localities: [] })) : [],
    };
  };

  const currentConfig = selectedMunId ? getOrCreateConfig(selectedMunId) : null;

  const updateConfig = (updated: LocalityConfig) => {
    const exists = localityConfigs.find(lc => lc.municipalityId === updated.municipalityId);
    if (exists) setLocalityConfigs(localityConfigs.map(lc => lc.municipalityId === updated.municipalityId ? updated : lc));
    else setLocalityConfigs([...localityConfigs, updated]);
  };

  const handleAddLocality = (wardNumber: number) => {
    if (!newLocality || !currentConfig) return;
    const updated = {
      ...currentConfig,
      wards: currentConfig.wards.map(w => w.wardNumber === wardNumber ? { ...w, localities: [...w.localities, newLocality] } : w),
    };
    if (!updated.wards.find(w => w.wardNumber === wardNumber)) {
      updated.wards.push({ wardNumber, localities: [newLocality] });
    }
    updateConfig(updated);
    setNewLocality('');
  };

  const handleDeleteLocality = (wardNumber: number, locality: string) => {
    if (!currentConfig) return;
    updateConfig({
      ...currentConfig,
      wards: currentConfig.wards.map(w => w.wardNumber === wardNumber ? { ...w, localities: w.localities.filter(l => l !== locality) } : w),
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">{language === 'ne' ? 'टोल व्यवस्थापन' : 'Locality Management'}</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {language === 'ne' ? 'नगरपालिका → वडा → टोल/ठाउँ थप्नुहोस्' : 'Add localities per Municipality → Ward'}
          </p>

          <div className="mb-4">
            <Label className="text-xs mb-1 block">{t('selectMunicipality')}</Label>
            <Select value={selectedMunId} onValueChange={v => { setSelectedMunId(v); setExpandedWard(null); }}>
              <SelectTrigger><SelectValue placeholder={t('selectMunicipality')} /></SelectTrigger>
              <SelectContent>
                {municipalities.map(m => (
                  <SelectItem key={m.id} value={m.id}>{language === 'ne' ? m.nameNe : m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMun && currentConfig && (
            <div className="space-y-2">
              {selectedMun.wards.map(ward => {
                const wardConfig = currentConfig.wards.find(w => w.wardNumber === ward.number);
                const localities = wardConfig?.localities || [];
                return (
                  <div key={ward.number} className="border border-border rounded-lg overflow-hidden">
                    <button onClick={() => setExpandedWard(expandedWard === ward.number ? null : ward.number)}
                      className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        {expandedWard === ward.number ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-semibold text-sm">{t('ward')} {ward.number}</span>
                        <Badge variant="secondary" className="text-[10px]">{localities.length} {language === 'ne' ? 'टोल' : 'localities'}</Badge>
                      </div>
                    </button>
                    <AnimatePresence>
                      {expandedWard === ward.number && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border">
                          <div className="p-3 sm:p-4 space-y-3">
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {localities.map(loc => (
                                <span key={loc} className="group flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent-foreground rounded text-xs">
                                  <MapPin className="w-3 h-3" />{loc}
                                  <button onClick={() => handleDeleteLocality(ward.number, loc)}
                                    className="hidden group-hover:inline-flex p-0.5 rounded hover:bg-destructive/20 text-destructive"><X className="w-3 h-3" /></button>
                                </span>
                              ))}
                              {localities.length === 0 && <span className="text-xs text-muted-foreground">{language === 'ne' ? 'कुनै टोल थपिएको छैन' : 'No localities added'}</span>}
                            </div>
                            <div className="flex gap-2">
                              <Input value={newLocality} onChange={e => setNewLocality(e.target.value)}
                                placeholder={language === 'ne' ? 'नयाँ टोल/ठाउँ' : 'New locality name'} className="text-sm"
                                onKeyDown={e => { if (e.key === 'Enter') handleAddLocality(ward.number); }} />
                              <Button size="sm" onClick={() => handleAddLocality(ward.number)} disabled={!newLocality}><Plus className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const LanguageButton: React.FC<{ lang: string; current: string; label: string }> = ({ lang, current, label }) => {
  const { setLanguage } = useLanguage();
  return (
    <Button variant={lang === current ? 'default' : 'outline'} onClick={() => setLanguage(lang as 'ne' | 'en')}>
      {label}
    </Button>
  );
};

export default SettingsPage;
