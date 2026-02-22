import React, { useState, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  Lightbulb, Target, Users, TrendingUp, AlertTriangle, CheckCircle, Megaphone,
  Building2, MapPin, Vote, Download, Filter, Settings, Calendar, Heart, UserCheck, Type, X, FileText
} from 'lucide-react';
import { Voter } from '@/types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const COLORS = [
  'hsl(215,80%,45%)', 'hsl(145,55%,42%)', 'hsl(28,85%,55%)',
  'hsl(280,60%,55%)', 'hsl(350,65%,55%)', 'hsl(190,70%,45%)',
  'hsl(50,80%,50%)', 'hsl(320,60%,50%)',
];

const DEFAULT_AGE_RANGES = [
  { label: '18-28', min: 18, max: 28 },
  { label: '29-38', min: 29, max: 38 },
  { label: '39-48', min: 39, max: 48 },
  { label: '49-58', min: 49, max: 58 },
  { label: '59-68', min: 59, max: 68 },
  { label: '69+', min: 69, max: 150 },
];

const GENERATION_RANGES = [
  { id: 'gen-z', label: 'Gen-Z (18-28)', min: 18, max: 28 },
  { id: 'millennials', label: 'Millennials (29-44)', min: 29, max: 44 },
  { id: 'gen-x', label: 'Gen-X (45-60)', min: 45, max: 60 },
  { id: 'boomers', label: 'Boomers (61-78)', min: 61, max: 78 },
  { id: 'silent', label: 'Silent (79+)', min: 79, max: 150 },
];

const Analytics: React.FC = () => {
  const { t, language } = useLanguage();
  const { municipalities } = useData();

  // Filter state
  const [selectedMunId, setSelectedMunId] = useState<string>('all');
  const [selectedWardId, setSelectedWardId] = useState<string>('all');
  const [selectedBoothId, setSelectedBoothId] = useState<string>('all');

  // Display selection state
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    gender: true,
    surname: true,
    age: true,
    generation: true,
    ethnicity: true,
    caste: true,
    tips: true,
    programs: true,
  });
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSections, setExportSections] = useState<Record<string, boolean>>(visibleSections);
  const [isExporting, setIsExporting] = useState(false);
  
  // Ref to store previous state during export
  const previousSectionsRef = useRef<Record<string, boolean>>(visibleSections);

  const selectedMun = municipalities.find(m => m.id === selectedMunId);
  const selectedWard = selectedMun?.wards.find(w => w.id === selectedWardId);

  const filteredVoters = useMemo((): Voter[] => {
    let voters: Voter[] = [];
    const muns = selectedMunId === 'all' ? municipalities : municipalities.filter(m => m.id === selectedMunId);
    for (const m of muns) {
      const wards = selectedWardId === 'all' ? m.wards : m.wards.filter(w => w.id === selectedWardId);
      for (const w of wards) {
        const booths = selectedBoothId === 'all' ? w.booths : w.booths.filter(b => b.id === selectedBoothId);
        for (const b of booths) voters = voters.concat(b.voters);
      }
    }
    return voters;
  }, [municipalities, selectedMunId, selectedWardId, selectedBoothId]);

  const ne = language === 'ne';

  // --- Data Calculations ---

  // Gender data
  const genderData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredVoters.forEach(v => { const g = v.gender || 'अज्ञात'; counts[g] = (counts[g] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredVoters]);

  // Age data
  const ageData = useMemo(() => {
    return DEFAULT_AGE_RANGES.map(r => ({
      name: r.label,
      value: filteredVoters.filter(v => v.age >= r.min && v.age <= r.max).length
    })).filter(d => d.value > 0);
  }, [filteredVoters]);

  // Generation data
  const generationData = useMemo(() => {
    return GENERATION_RANGES.map(r => ({
      name: r.label,
      value: filteredVoters.filter(v => v.age >= r.min && v.age <= r.max).length
    })).filter(d => d.value > 0);
  }, [filteredVoters]);

  // Ethnicity data
  const ethnicityData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredVoters.forEach(v => { const e = v.ethnicity || 'N/A'; counts[e] = (counts[e] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredVoters]);

  // Caste data
  const casteData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredVoters.forEach(v => { const c = v.caste || 'N/A'; counts[c] = (counts[c] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredVoters]);

  // Surname data
  const surnameData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredVoters.forEach(v => { if (v.surname) counts[v.surname] = (counts[v.surname] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredVoters]);

  // Election insights
  const insights = useMemo(() => {
    const total = filteredVoters.length;
    if (total === 0) return null;

    const maleCount = filteredVoters.filter(v => v.gender === 'पुरुष').length;
    const femaleCount = filteredVoters.filter(v => v.gender === 'महिला').length;
    const maleRatio = maleCount / total;
    const femaleRatio = femaleCount / total;
    const youth = filteredVoters.filter(v => v.age >= 18 && v.age <= 35).length;
    const middleAge = filteredVoters.filter(v => v.age >= 36 && v.age <= 55).length;
    const senior = filteredVoters.filter(v => v.age > 55).length;
    const youthPct = (youth / total * 100).toFixed(1);
    const middlePct = (middleAge / total * 100).toFixed(1);
    const seniorPct = (senior / total * 100).toFixed(1);

    const ethCounts: Record<string, number> = {};
    filteredVoters.forEach(v => { if (v.ethnicity) ethCounts[v.ethnicity] = (ethCounts[v.ethnicity] || 0) + 1; });
    const topEthnicities = Object.entries(ethCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    const surCounts: Record<string, number> = {};
    filteredVoters.forEach(v => { if (v.surname) surCounts[v.surname] = (surCounts[v.surname] || 0) + 1; });
    const topSurnames = Object.entries(surCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const tips: { icon: React.ReactNode; title: string; desc: string; type: 'info' | 'warning' | 'success' }[] = [];

    if (femaleRatio > 0.45) {
      tips.push({ icon: <Users className="w-4 h-4" />, title: ne ? 'महिला मतदाता बहुमत' : 'Strong Female Voter Base', desc: ne ? `${(femaleRatio * 100).toFixed(0)}% महिला मतदाता — महिला सशक्तिकरण, मातृ स्वास्थ्य र महिला उद्यमशीलता कार्यक्रममा ध्यान दिनुहोस्` : `${(femaleRatio * 100).toFixed(0)}% female voters — focus on women empowerment, maternal health & women entrepreneurship programs`, type: 'success' });
    }
    if (maleRatio > 0.55) {
      tips.push({ icon: <Users className="w-4 h-4" />, title: ne ? 'पुरुष प्रधान मतदाता' : 'Male-Dominant Voter Base', desc: ne ? `${(maleRatio * 100).toFixed(0)}% पुरुष मतदाता — रोजगार, पूर्वाधार र कृषि कार्यक्रम प्राथमिकता दिनुहोस्` : `${(maleRatio * 100).toFixed(0)}% male voters — prioritize employment, infrastructure & agriculture programs`, type: 'info' });
    }
    if (parseFloat(youthPct) > 35) {
      tips.push({ icon: <TrendingUp className="w-4 h-4" />, title: ne ? 'युवा मतदाता शक्ति' : 'Youth Voter Power', desc: ne ? `${youthPct}% युवा (१८-३५) — डिजिटल साक्षरता, कौशल विकास, स्टार्टअप सहयोग र सामाजिक सञ्जालमा प्रचार गर्नुहोस्` : `${youthPct}% youth (18-35) — promote digital literacy, skill development, startup support & campaign on social media`, type: 'success' });
    }
    if (parseFloat(seniorPct) > 20) {
      tips.push({ icon: <AlertTriangle className="w-4 h-4" />, title: ne ? 'ज्येष्ठ नागरिक समूह' : 'Senior Citizen Block', desc: ne ? `${seniorPct}% ज्येष्ठ (५५+) — वृद्धाश्रम, स्वास्थ्य बीमा, पेन्सन र ज्येष्ठ नागरिक भत्ता कार्यक्रममा ध्यान दिनुहोस्` : `${seniorPct}% seniors (55+) — focus on elderly care, health insurance, pension & senior citizen allowance`, type: 'warning' });
    }
    tips.push({ icon: <Target className="w-4 h-4" />, title: ne ? 'उमेर समूह रणनीति' : 'Age Group Strategy', desc: ne ? `युवा ${youthPct}% | मध्यम ${middlePct}% | ज्येष्ठ ${seniorPct}% — प्रत्येक समूहका लागि लक्षित कार्यक्रम बनाउनुहोस्` : `Youth ${youthPct}% | Middle ${middlePct}% | Senior ${seniorPct}% — create targeted programs for each group`, type: 'info' });

    if (topEthnicities.length > 0) {
      const ethList = topEthnicities.map(([e, c]) => `${e} (${c})`).join(', ');
      tips.push({ icon: <Megaphone className="w-4 h-4" />, title: ne ? 'जातीय विविधता' : 'Ethnic Diversity', desc: ne ? `प्रमुख जातिहरू: ${ethList} — सांस्कृतिक समावेशिता र जातीय सद्भाव कार्यक्रम अपनाउनुहोस्` : `Top ethnicities: ${ethList} — adopt cultural inclusivity & ethnic harmony programs`, type: 'info' });
    }

    if (topSurnames.length > 0 && topSurnames[0][1] > total * 0.15) {
      tips.push({ icon: <CheckCircle className="w-4 h-4" />, title: ne ? 'थर केन्द्रित क्षेत्र' : 'Surname Concentration', desc: ne ? `"${topSurnames[0][0]}" थर ${((topSurnames[0][1] / total) * 100).toFixed(0)}% छ — यो समुदायमा लक्षित अभियान चलाउनुहोस्` : `"${topSurnames[0][0]}" is ${((topSurnames[0][1] / total) * 100).toFixed(0)}% — run targeted outreach in this community`, type: 'success' });
    }

    const programs: { title: string; desc: string }[] = [
      { title: ne ? '🎯 घरदैलो अभियान' : '🎯 Door-to-Door Campaign', desc: ne ? `${total} मतदाताको डाटाबाट बुथ-स्तरमा लक्षित अभियान` : `Targeted booth-level campaign from ${total} voters` },
      { title: ne ? '📱 डिजिटल अभियान' : '📱 Digital Campaign', desc: ne ? `युवा मतदाता (${youthPct}%) लाई सामाजिक सञ्जालमार्फत पुग्नुहोस्` : `Reach youth voters (${youthPct}%) via social media` },
      { title: ne ? '🏥 स्वास्थ्य शिविर' : '🏥 Health Camps', desc: ne ? `ज्येष्ठ नागरिक (${seniorPct}%) र महिला (${(femaleRatio * 100).toFixed(0)}%) लक्षित निःशुल्क स्वास्थ्य शिविर` : `Free health camps targeting seniors (${seniorPct}%) and women (${(femaleRatio * 100).toFixed(0)}%)` },
      { title: ne ? '💼 रोजगार मेला' : '💼 Job Fairs', desc: ne ? `युवा बेरोजगारी समाधानका लागि कौशल विकास र रोजगार मेला आयोजना` : `Organize skill development & job fairs to address youth unemployment` },
      { title: ne ? '🎓 छात्रवृत्ति कार्यक्रम' : '🎓 Scholarship Program', desc: ne ? `आर्थिक रूपमा कमजोर परिवारका विद्यार्थीलाई शैक्षिक छात्रवृत्ति` : `Educational scholarships for students from economically disadvantaged families` },
    ];

    return { tips, programs };
  }, [filteredVoters, language, ne]);

  const tipStyles = {
    info: 'border-primary/30 bg-primary/5',
    warning: 'border-accent/30 bg-accent/5',
    success: 'border-secondary/30 bg-secondary/5',
  };
  const tipIconStyles = {
    info: 'text-primary',
    warning: 'text-accent',
    success: 'text-secondary',
  };

  const executePDFExport = async () => {
    setIsExporting(true);
    setShowExportModal(false);

    previousSectionsRef.current = { ...visibleSections };
    setVisibleSections(exportSections);
    
    await new Promise(resolve => setTimeout(resolve, 800));

    const element = document.getElementById('analytics-print-root');
    if (!element) {
      setIsExporting(false);
      return;
    }
    
    try {
      // 1. Capture Header
      const headerElement = element.querySelector('.pdf-header-info') as HTMLElement;
      let headerImgData = '';
      let headerHeightRatio = 0;
      
      if (headerElement) {
         const headerCanvas = await html2canvas(headerElement, {
            scale: 2,
            backgroundColor: '#ffffff'
         });
         headerImgData = headerCanvas.toDataURL('image/png');
         headerHeightRatio = headerCanvas.height / headerCanvas.width;
      }

      // 2. Capture all visible cards separately
      const cards = Array.from(element.querySelectorAll('.analytics-card')) as HTMLElement[];
      
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape A4
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      
      let cursorY = margin;

      // Add Header to first page
      if (headerImgData) {
        const headerHeight = contentWidth * headerHeightRatio;
        pdf.addImage(headerImgData, 'PNG', margin, cursorY, contentWidth, headerHeight);
        cursorY += headerHeight + 5;
      }

      for (const card of cards) {
        const canvas = await html2canvas(card, {
          scale: 2,
          backgroundColor: '#ffffff',
          ignoreElements: (el) => el.classList.contains('print:hidden')
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        // Check if chart fits on current page
        if (cursorY + imgHeight > pageHeight - margin) {
          pdf.addPage();
          cursorY = margin;
          // Optional: Add header again on new pages? (User didn't explicitly ask, but good practice. Skipping for now to save space)
        }

        pdf.addImage(imgData, 'PNG', margin, cursorY, contentWidth, imgHeight);
        cursorY += imgHeight + 5; // Add spacing between charts
      }

      pdf.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Export failed', error);
      alert('Failed to export PDF');
    } finally {
      setVisibleSections(previousSectionsRef.current);
      setIsExporting(false);
    }
  };

  const toggleSection = (key: string) => {
    setVisibleSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExportSection = (key: string) => {
    setExportSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sectionsList = [
    { id: 'gender', label: ne ? 'लिङ्ग वितरण' : 'Gender Distribution', icon: Users },
    { id: 'age', label: ne ? 'उमेर समूह' : 'Age Groups', icon: Calendar },
    { id: 'generation', label: ne ? 'पुस्ता वितरण' : 'Generation Distribution', icon: Users },
    { id: 'ethnicity', label: ne ? 'जाति' : 'Ethnicity', icon: Heart },
    { id: 'caste', label: ne ? 'जात' : 'Caste', icon: UserCheck },
    { id: 'surname', label: ne ? 'थर' : 'Surname', icon: Type },
    { id: 'tips', label: ne ? 'रणनीतिक सुझाव' : 'Strategy Tips', icon: Lightbulb },
    { id: 'programs', label: ne ? 'कार्यक्रमहरू' : 'Programs', icon: Target },
  ];

  return (
    <div className="space-y-6" id="analytics-print-root">
      {/* Header and Controls - Hidden in Print */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-bold">{t('analytics')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {ne ? `कुल ${filteredVoters.length} मतदाता` : `Total ${filteredVoters.length} voters`}
          </p>
        </motion.div>
        
        <div className="flex items-center gap-2">
           <div className="relative">
             <button
               onClick={() => setShowDisplaySettings(!showDisplaySettings)}
               className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm hover:bg-muted transition-colors"
             >
               <Settings className="w-4 h-4" />
               {ne ? 'डिस्प्ले सेटिङ' : 'Display'}
             </button>
             {showDisplaySettings && (
               <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-20 p-2">
                 <h4 className="text-xs font-semibold text-muted-foreground px-2 mb-2">{ne ? 'देखिने खण्डहरू' : 'Visible Sections'}</h4>
                 <div className="space-y-1">
                   {sectionsList.map(item => (
                     <button
                       key={item.id}
                       onClick={() => toggleSection(item.id)}
                       className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg transition-colors ${visibleSections[item.id] ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                     >
                       <div className={`w-4 h-4 border rounded flex items-center justify-center ${visibleSections[item.id] ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                         {visibleSections[item.id] && <CheckCircle className="w-3 h-3" />}
                       </div>
                       <item.icon className="w-3.5 h-3.5" />
                       {item.label}
                     </button>
                   ))}
                 </div>
               </div>
             )}
           </div>
           
           <button
             onClick={() => {
                setExportSections(visibleSections);
                setShowExportModal(true);
             }}
             disabled={isExporting}
             className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
           >
             <Download className="w-4 h-4" />
             {isExporting ? (ne ? 'निर्यात हुँदै...' : 'Exporting...') : (ne ? 'PDF निर्यात' : 'Export PDF')}
           </button>
        </div>
      </div>

      {/* Export Options Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-background rounded-xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">{ne ? 'PDF निर्यात विकल्पहरू' : 'PDF Export Options'}</h3>
                <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-muted rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-muted-foreground mb-4">
                  {ne ? 'कृपया रिपोर्टमा समावेश गर्न चाहने खण्डहरू चयन गर्नुहोस्:' : 'Select sections to include in the report:'}
                </p>
                <div className="space-y-2">
                  {sectionsList.map(item => (
                    <div 
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${exportSections[item.id] ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                      onClick={() => toggleExportSection(item.id)}
                    >
                      <div className={`w-5 h-5 border rounded flex items-center justify-center flex-shrink-0 ${exportSections[item.id] ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                        {exportSections[item.id] && <CheckCircle className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
                <button 
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg"
                >
                  {ne ? 'रद्ध गर्नुहोस्' : 'Cancel'}
                </button>
                <button 
                  onClick={executePDFExport}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {ne ? 'PDF सिर्जना गर्नुहोस्' : 'Generate PDF'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Export Specific Header */}
      <div className={`hidden ${isExporting ? 'block' : ''} pdf-header-info mb-6 p-4 border-b`}>
        <h1 className="text-3xl font-bold mb-2">{t('analytics')} Report</h1>
        <div className="flex gap-4 text-sm text-gray-600">
           <span>Total Voters: {filteredVoters.length}</span>
           <span>Generated: {new Date().toLocaleDateString()}</span>
        </div>
        <div className="mt-4 flex gap-8 text-sm font-medium border-t pt-4">
           <div>
             <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Municipality</span>
             <span className="text-lg">{selectedMun?.name || 'All'}</span>
           </div>
           <div>
             <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Ward</span>
             <span className="text-lg">{selectedWard?.number || 'All'}</span>
           </div>
           <div>
             <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Booth</span>
             <span className="text-lg">{selectedBoothId !== 'all' ? selectedBoothId : 'All'}</span>
           </div>
        </div>
      </div>

      {/* Filter bar - Hidden in Print/Export */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-3 items-end print:hidden">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            <Building2 className="w-3 h-3 inline mr-1" />{t('municipalities')}
          </label>
          <select value={selectedMunId} onChange={e => { setSelectedMunId(e.target.value); setSelectedWardId('all'); setSelectedBoothId('all'); }}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
            <option value="all">{t('all')}</option>
            {municipalities.map(m => <option key={m.id} value={m.id}>{ne ? m.nameNe : m.name}</option>)}
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
            {selectedWard?.booths.map(b => <option key={b.id} value={b.id}>{ne ? b.nameNe : b.name}</option>)}
          </select>
        </div>
        <div className="bg-primary/10 rounded-lg px-4 py-2 text-center">
          <p className="text-xs text-muted-foreground">{t('totalVoters')}</p>
          <p className="text-xl font-bold text-primary">{filteredVoters.length}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
        {/* Gender Pie */}
        {visibleSections.gender && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-xl p-6 border border-border print:border-gray-300 print:break-inside-avoid analytics-card">
            <h3 className="text-lg font-semibold mb-4">{t('genderDistribution')}</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Age Distribution */}
        {visibleSections.age && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card rounded-xl p-6 border border-border print:border-gray-300 print:break-inside-avoid analytics-card">
            <h3 className="text-lg font-semibold mb-4">{ne ? 'उमेर समूह' : 'Age Groups'}</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS[5]} radius={[4, 4, 0, 0]}>
                    {ageData.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Generation Distribution */}
        {visibleSections.generation && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="bg-card rounded-xl p-6 border border-border print:border-gray-300 print:break-inside-avoid analytics-card">
            <h3 className="text-lg font-semibold mb-4">{ne ? 'पुस्ता वितरण' : 'Generation Distribution'}</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={generationData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS[6]} radius={[0, 4, 4, 0]}>
                    {generationData.map((_, i) => <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Ethnicity */}
        {visibleSections.ethnicity && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card rounded-xl p-6 border border-border print:border-gray-300 print:break-inside-avoid analytics-card">
            <h3 className="text-lg font-semibold mb-4">{ne ? 'जाति वितरण' : 'Ethnicity Distribution'}</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ethnicityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value"
                     label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {ethnicityData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Caste */}
        {visibleSections.caste && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-card rounded-xl p-6 border border-border print:border-gray-300 print:break-inside-avoid analytics-card">
            <h3 className="text-lg font-semibold mb-4">{ne ? 'जात वितरण' : 'Caste Distribution'}</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={casteData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS[3]} radius={[4, 4, 0, 0]}>
                    {casteData.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Surname Frequency */}
        {visibleSections.surname && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card rounded-xl p-6 border border-border print:border-gray-300 print:break-inside-avoid lg:col-span-2 analytics-card">
            <h3 className="text-lg font-semibold mb-4">{t('surnameFrequency')}</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={surnameData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS[2]} radius={[4, 4, 0, 0]}>
                    {surnameData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      {/* Election Report */}
      {insights && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-6 print:space-y-4">
          
          {visibleSections.tips && (
            <div className="bg-card rounded-xl border border-border p-6 print:border-gray-300 print:break-inside-avoid analytics-card">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-accent" />
                {ne ? 'निर्वाचन रणनीतिक सुझाव' : 'Election Strategy Tips'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2">
                {insights.tips.map((tip, i) => (
                  <div key={i} className={`rounded-lg border p-4 ${tipStyles[tip.type]} print:border-gray-300 print:bg-gray-50`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={tipIconStyles[tip.type]}>{tip.icon}</span>
                      <h4 className="text-sm font-bold">{tip.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-800">{tip.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visibleSections.programs && (
            <div className="bg-card rounded-xl border border-border p-6 print:border-gray-300 print:break-inside-avoid analytics-card">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                {ne ? 'सुझाव गरिएका कार्यक्रमहरू' : 'Recommended Programs'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-3">
                {insights.programs.map((prog, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border hover:border-primary/30 transition-colors print:border-gray-300 print:bg-gray-50">
                    <h4 className="text-sm font-bold mb-1.5">{prog.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-800">{prog.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Global Print Styles */}
      <style>{`
        @media print {
          @page { margin: 1cm; size: landscape; }
          body { visibility: hidden; background: white; }
          #analytics-print-root, #analytics-print-root * { visibility: visible; }
          #analytics-print-root { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            margin: 0; 
            padding: 0;
            background: white;
            color: black;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Analytics;
