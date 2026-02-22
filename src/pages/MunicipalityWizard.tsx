import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import { Municipality, Ward, Booth } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MapPin, Vote, Check, ArrowRight, ArrowLeft, Upload, Image, Trash2, Edit, Plus } from 'lucide-react';
import { readExcelFile } from '@/lib/excel';
import { matchExcelHeaders, parseVoterRow } from '@/lib/excelHeaderMatch';
import { useNavigate } from 'react-router-dom';
import { Voter } from '@/types';

const STEPS = ['basicInfo', 'wardsSetup', 'boothsData', 'reviewConfirm'] as const;
const STEP_ICONS = [Building2, MapPin, Vote, Check];

const MunicipalityWizard: React.FC = () => {
  const { t, language } = useLanguage();
  const { addMunicipality, columnConfigs } = useData();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [munName, setMunName] = useState('');
  const [logo, setLogo] = useState<string | undefined>();
  const [wardCount, setWardCount] = useState(1);
  const [boothCounts, setBoothCounts] = useState<Record<number, number>>({});
  const [boothNames, setBoothNames] = useState<Record<string, { name: string; nameNe: string }>>({});
  const [uploadedData, setUploadedData] = useState<Record<string, Voter[]>>({});
  const [editingBooth, setEditingBooth] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getBoothKey = (wi: number, bi: number) => `${wi}-${bi}`;

  const getBoothName = (wi: number, bi: number) => {
    const key = getBoothKey(wi, bi);
    return boothNames[key] || { name: `Booth ${bi + 1}`, nameNe: `बुथ ${bi + 1}` };
  };

  const handleRenameBooth = (wi: number, bi: number, newName: string, newNameNe: string) => {
    setBoothNames(prev => ({ ...prev, [getBoothKey(wi, bi)]: { name: newName, nameNe: newNameNe } }));
    setEditingBooth(null);
  };

  const handleDeleteBooth = (wi: number, bi: number) => {
    const currentCount = boothCounts[wi] || 1;
    if (currentCount <= 1) return;
    const newUploaded = { ...uploadedData };
    const newNames = { ...boothNames };
    delete newUploaded[getBoothKey(wi, bi)];
    delete newNames[getBoothKey(wi, bi)];
    for (let j = bi + 1; j < currentCount; j++) {
      const oldKey = getBoothKey(wi, j);
      const newKey = getBoothKey(wi, j - 1);
      if (newUploaded[oldKey]) { newUploaded[newKey] = newUploaded[oldKey]; delete newUploaded[oldKey]; }
      if (newNames[oldKey]) { newNames[newKey] = newNames[oldKey]; delete newNames[oldKey]; }
    }
    setUploadedData(newUploaded);
    setBoothNames(newNames);
    setBoothCounts(prev => ({ ...prev, [wi]: currentCount - 1 }));
  };

  const handleAddBooth = (wi: number) => {
    setBoothCounts(prev => ({ ...prev, [wi]: (prev[wi] || 1) + 1 }));
  };

  const handleUploadForBooth = async (wardIdx: number, boothIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const jsonData = await readExcelFile(file);
    if (jsonData.length < 2) return;
    const headers = jsonData[0];
    const headerMapping = matchExcelHeaders(headers, columnConfigs);
    const voters: Voter[] = jsonData.slice(1).map((row, idx) => {
      return parseVoterRow(row, headerMapping, idx, wardIdx, boothIdx) as unknown as Voter;
    });
    setUploadedData(prev => ({ ...prev, [getBoothKey(wardIdx, boothIdx)]: voters }));
    e.target.value = '';
  };

  const handleCreate = () => {
    const wards: Ward[] = Array.from({ length: wardCount }, (_, wi) => {
      const bCount = boothCounts[wi] || 1;
      const booths: Booth[] = Array.from({ length: bCount }, (_, bi) => {
        const bn = getBoothName(wi, bi);
        return {
          id: `booth-new-${wi}-${bi}`,
          name: bn.name,
          nameNe: bn.nameNe,
          voters: uploadedData[getBoothKey(wi, bi)] || [],
        };
      });
      return { id: `ward-new-${wi}`, number: wi + 1, booths };
    });

    // Detect if name is Nepali (contains Devanagari) or English
    const isNepali = /[\u0900-\u097F]/.test(munName);
    const municipality: Municipality = {
      id: `mun-${Date.now()}`,
      name: isNepali ? munName : munName,
      nameNe: isNepali ? munName : munName,
      logo,
      wards,
    };

    addMunicipality(municipality);
    navigate('/');
  };

  const canNext = () => {
    if (step === 0) return munName.trim();
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-bold">{t('createMunicipality')}</h1>
      </motion.div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-3 sm:p-4">
        {STEPS.map((s, i) => {
          const Icon = STEP_ICONS[i];
          const isActive = i === step;
          const isDone = i < step;
          return (
            <React.Fragment key={s}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' :
                  isDone ? 'bg-secondary text-secondary-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-xs sm:text-sm hidden sm:block ${isActive ? 'font-semibold' : 'text-muted-foreground'}`}>
                  {t(s)}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 sm:mx-2 rounded ${isDone ? 'bg-secondary' : 'bg-border'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="bg-card rounded-xl border border-border p-4 sm:p-6"
        >
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">{t('basicInfo')}</h2>
              
              {/* Logo Upload - First */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  {t('logo')}
                </label>
                <div className="flex items-center gap-4">
                  {logo ? (
                    <div className="relative group">
                      <img src={logo} alt="Logo" className="w-24 h-24 rounded-xl object-cover border border-border shadow-sm" />
                      <button
                        onClick={() => setLogo(undefined)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                      <Image className="w-7 h-7 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">{t('upload')}</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Single Name Field */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  {language === 'ne' ? 'नगरपालिकाको नाम' : 'Municipality Name'}
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  {language === 'ne' ? 'नेपाली वा English मा लेख्नुहोस्' : 'Enter in English or नेपाली'}
                </p>
                <input
                  value={munName}
                  onChange={e => setMunName(e.target.value)}
                  placeholder={language === 'ne' ? 'उदाहरण: कीर्तिपुर नगरपालिका' : 'e.g. Kirtipur Municipality'}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none text-base"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t('wardsSetup')}</h2>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">{t('totalWardCount')}</label>
                <input type="number" min={1} max={50} value={wardCount} onChange={e => setWardCount(Math.max(1, Number(e.target.value)))}
                  className="w-32 px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {Array.from({ length: wardCount }, (_, i) => (
                  <div key={i} className="p-3 bg-ward-light rounded-lg border border-ward/20">
                    <span className="text-sm font-medium">{t('ward')} {i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t('boothsData')}</h2>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {Array.from({ length: wardCount }, (_, wi) => (
                  <div key={wi} className="p-3 sm:p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">{t('ward')} {wi + 1}</span>
                      <button
                        onClick={() => handleAddBooth(wi)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-3 h-3" />
                        {t('booth')}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {Array.from({ length: boothCounts[wi] || 1 }, (_, bi) => {
                        const uploaded = uploadedData[getBoothKey(wi, bi)];
                        const bn = getBoothName(wi, bi);
                        const isEditing = editingBooth === getBoothKey(wi, bi);
                        return (
                          <div key={bi} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 px-3 bg-card rounded-md border border-border/50">
                            {isEditing ? (
                              <div className="flex flex-wrap items-center gap-2 flex-1">
                                <input
                                  defaultValue={bn.name}
                                  placeholder={language === 'ne' ? 'बुथको नाम लेख्नुहोस्' : 'Enter booth name'}
                                  className="px-2 py-1 border border-border rounded text-xs bg-background w-40"
                                  id={`booth-name-${wi}-${bi}`}
                                />
                                <button
                                  onClick={() => {
                                    const el = document.getElementById(`booth-name-${wi}-${bi}`) as HTMLInputElement;
                                    handleRenameBooth(wi, bi, el.value, el.value);
                                  }}
                                  className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs"
                                >
                                  {t('save')}
                                </button>
                                <button onClick={() => setEditingBooth(null)} className="px-2 py-1 border border-border rounded text-xs">
                                  {t('cancel')}
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm">{language === 'ne' ? bn.nameNe : bn.name}</span>
                            )}
                            <div className="flex items-center gap-2">
                              {uploaded && (
                                <span className="text-xs text-secondary">{uploaded.length} {t('voters')}</span>
                              )}
                              {!isEditing && (
                                <>
                                  <button
                                    onClick={() => setEditingBooth(getBoothKey(wi, bi))}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                                    title={t('edit')}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  {(boothCounts[wi] || 1) > 1 && (
                                    <button
                                      onClick={() => handleDeleteBooth(wi, bi)}
                                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                                      title={t('delete')}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                  <label className="flex items-center gap-1 text-xs text-primary cursor-pointer hover:underline">
                                    <Upload className="w-3 h-3" />
                                    Excel
                                    <input type="file" accept=".xlsx,.xls" onChange={e => handleUploadForBooth(wi, bi, e)} className="hidden" />
                                  </label>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t('reviewConfirm')}</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-municipality-light rounded-lg">
                  {logo && <img src={logo} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />}
                  <Building2 className="w-5 h-5 text-municipality" />
                  <div>
                    <p className="font-semibold">{munName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-ward-light rounded-lg text-center">
                    <p className="text-2xl font-bold text-ward">{wardCount}</p>
                    <p className="text-sm text-muted-foreground">{t('totalWards')}</p>
                  </div>
                  <div className="p-3 bg-booth-light rounded-lg text-center">
                    <p className="text-2xl font-bold text-booth">
                      {Array.from({ length: wardCount }, (_, i) => boothCounts[i] || 1).reduce((a, b) => a + b, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('totalBooths')}</p>
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {t('totalVoters')}: {Object.values(uploadedData).reduce((a, v) => a + v.length, 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 border border-border rounded-lg text-sm disabled:opacity-40 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('previous')}
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext()}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {t('next')}
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            <Check className="w-4 h-4" />
            {t('confirm')}
          </button>
        )}
      </div>
    </div>
  );
};

export default MunicipalityWizard;
