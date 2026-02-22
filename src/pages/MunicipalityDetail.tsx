import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MapPin, Vote, Users, Upload, ArrowLeft, Plus, Trash2, Edit2, ChevronRight, ChevronDown, Check, X } from 'lucide-react';
import { readExcelFile } from '@/lib/excel';
import { matchExcelHeaders, parseVoterRow } from '@/lib/excelHeaderMatch';
import { Voter, Ward, Booth } from '@/types';
import { toast } from 'sonner';

const MunicipalityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { municipalities, updateMunicipality, addVotersToBooth, columnConfigs } = useData();

  const mun = municipalities.find(m => m.id === id);

  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [addingBooth, setAddingBooth] = useState<string | null>(null);
  const [newBoothName, setNewBoothName] = useState('');
  const [editingWard, setEditingWard] = useState<string | null>(null);
  const [editWardNumber, setEditWardNumber] = useState<number>(0);
  const [editingBooth, setEditingBooth] = useState<string | null>(null);
  const [editBoothName, setEditBoothName] = useState('');
  const [editBoothNameNe, setEditBoothNameNe] = useState('');

  if (!mun) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Building2 className="w-12 h-12 mb-4" />
        <p>{t('noData')}</p>
        <Link to="/municipalities" className="mt-4 text-primary hover:underline">{t('municipalities')}</Link>
      </div>
    );
  }

  const activeWard = mun.wards.find(w => w.id === selectedWard);

  const handleUploadForBooth = async (wardId: string, boothId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const jsonData = await readExcelFile(file);
    if (jsonData.length < 2) return;
    const headers = jsonData[0];
    const headerMapping = matchExcelHeaders(headers, columnConfigs);
    const voters: Voter[] = jsonData.slice(1).map((row, idx) => {
      return parseVoterRow(row, headerMapping, idx, 0, 0) as unknown as Voter;
    }).map((v, i) => ({ ...v, id: `v-${Date.now()}-${i}` } as unknown as Voter));
    addVotersToBooth(mun.id, wardId, boothId, voters);
    toast.success(`${voters.length} ${t('voters')} uploaded`);
    e.target.value = '';
  };

  const handleAddWard = () => {
    const nextNum = Math.max(0, ...mun.wards.map(w => w.number)) + 1;
    const newWard: Ward = {
      id: `ward-${Date.now()}`,
      number: nextNum,
      booths: [{ id: `booth-${Date.now()}`, name: 'Booth 1', nameNe: 'बुथ १', voters: [] }],
    };
    updateMunicipality(mun.id, { wards: [...mun.wards, newWard] });
  };

  const handleDeleteWard = (wardId: string) => {
    updateMunicipality(mun.id, { wards: mun.wards.filter(w => w.id !== wardId) });
    if (selectedWard === wardId) setSelectedWard(null);
  };

  const handleEditWard = (ward: Ward) => {
    setEditingWard(ward.id);
    setEditWardNumber(ward.number);
  };

  const handleSaveWard = (wardId: string) => {
    updateMunicipality(mun.id, {
      wards: mun.wards.map(w => w.id === wardId ? { ...w, number: editWardNumber } : w),
    });
    setEditingWard(null);
  };

  const handleAddBooth = (wardId: string) => {
    if (!newBoothName.trim()) return;
    const isNepali = /[\u0900-\u097F]/.test(newBoothName);
    const newBooth: Booth = {
      id: `booth-${Date.now()}`,
      name: newBoothName,
      nameNe: isNepali ? newBoothName : newBoothName,
      voters: [],
    };
    updateMunicipality(mun.id, {
      wards: mun.wards.map(w => w.id === wardId ? { ...w, booths: [...w.booths, newBooth] } : w),
    });
    setAddingBooth(null);
    setNewBoothName('');
  };

  const handleDeleteBooth = (wardId: string, boothId: string) => {
    updateMunicipality(mun.id, {
      wards: mun.wards.map(w => w.id === wardId
        ? { ...w, booths: w.booths.filter(b => b.id !== boothId) }
        : w
      ),
    });
  };

  const handleEditBooth = (booth: Booth) => {
    setEditingBooth(booth.id);
    setEditBoothName(booth.name);
    setEditBoothNameNe(booth.nameNe);
  };

  const handleSaveBooth = (wardId: string, boothId: string) => {
    updateMunicipality(mun.id, {
      wards: mun.wards.map(w => w.id === wardId
        ? { ...w, booths: w.booths.map(b => b.id === boothId ? { ...b, name: editBoothName, nameNe: editBoothNameNe } : b) }
        : w
      ),
    });
    setEditingBooth(null);
  };

  const totalBooths = mun.wards.reduce((a, w) => a + w.booths.length, 0);
  const totalVoters = mun.wards.reduce((a, w) => a + w.booths.reduce((b, booth) => b + booth.voters.length, 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
        <button onClick={() => navigate('/municipalities')} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          {mun.logo ? (
            <img src={mun.logo} alt="logo" className="w-12 h-12 rounded-xl object-cover border border-border" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-municipality-light flex items-center justify-center">
              <Building2 className="w-6 h-6 text-municipality" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{language === 'ne' ? mun.nameNe : mun.name}</h1>
            <p className="text-sm text-muted-foreground">{language === 'ne' ? mun.name : mun.nameNe}</p>
          </div>
        </div>
      </motion.div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 bg-ward-light rounded-xl text-center border border-ward/20">
          <MapPin className="w-5 h-5 text-ward mx-auto mb-1" />
          <p className="text-2xl font-bold">{mun.wards.length}</p>
          <p className="text-xs text-muted-foreground">{t('totalWards')}</p>
        </div>
        <div className="p-3 sm:p-4 bg-booth-light rounded-xl text-center border border-booth/20">
          <Vote className="w-5 h-5 text-booth mx-auto mb-1" />
          <p className="text-2xl font-bold">{totalBooths}</p>
          <p className="text-xs text-muted-foreground">{t('totalBooths')}</p>
        </div>
        <div className="p-3 sm:p-4 bg-muted rounded-xl text-center">
          <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-2xl font-bold">{totalVoters}</p>
          <p className="text-xs text-muted-foreground">{t('totalVoters')}</p>
        </div>
      </div>

      {/* Wards section */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('ward')}</h2>
        <button onClick={handleAddWard} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          {t('ward')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <AnimatePresence>
          {mun.wards.map((ward, idx) => {
            const wardVoters = ward.booths.reduce((a, b) => a + b.voters.length, 0);
            const isSelected = selectedWard === ward.id;
            const isEditingThis = editingWard === ward.id;

            return (
              <motion.div
                key={ward.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-card rounded-xl border p-4 cursor-pointer transition-all ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'}`}
                onClick={() => setSelectedWard(isSelected ? null : ward.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-ward-light flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-ward" />
                    </div>
                    {isEditingThis ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="number"
                          value={editWardNumber}
                          onChange={e => setEditWardNumber(Number(e.target.value))}
                          className="w-16 px-2 py-1 border border-border rounded text-sm bg-background"
                          min={1}
                        />
                        <button onClick={() => handleSaveWard(ward.id)} className="p-1 text-primary"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingWard(null)} className="p-1 text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <span className="font-semibold">{t('ward')} {ward.number}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!isEditingThis && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditWard(ward); }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteWard(ward.id); }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isSelected ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                <div className="flex gap-3 text-sm text-muted-foreground">
                  <span>{ward.booths.length} {t('booth')}</span>
                  <span>·</span>
                  <span>{wardVoters} {t('voters')}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Booth detail for selected ward */}
      <AnimatePresence>
        {activeWard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl border border-border p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{t('ward')} {activeWard.number} — {t('booth')}</h3>
                <button
                  onClick={() => { setAddingBooth(activeWard.id); setNewBoothName(''); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  {t('booth')}
                </button>
              </div>

              {/* Add booth form */}
              {addingBooth === activeWard.id && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {language === 'ne' ? 'बुथको नाम' : 'Booth Name'}
                    </label>
                    <input value={newBoothName} onChange={e => setNewBoothName(e.target.value)}
                      placeholder={language === 'ne' ? 'नेपाली वा English मा' : 'English or नेपाली'}
                      className="w-full px-3 py-1.5 border border-border rounded-md bg-background text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAddBooth(activeWard.id)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm">{t('save')}</button>
                    <button onClick={() => setAddingBooth(null)} className="px-3 py-1.5 border border-border rounded-md text-sm">{t('cancel')}</button>
                  </div>
                </motion.div>
              )}

              {/* Booth list */}
              <div className="space-y-2">
                {activeWard.booths.map((booth, bi) => {
                  const isEditingThis = editingBooth === booth.id;
                  return (
                    <motion.div
                      key={booth.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: bi * 0.05 }}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-booth-light flex items-center justify-center flex-shrink-0">
                          <Vote className="w-4 h-4 text-booth" />
                        </div>
                        {isEditingThis ? (
                          <div className="flex flex-wrap items-center gap-2 flex-1">
                            <input
                              value={editBoothName}
                              onChange={e => { setEditBoothName(e.target.value); setEditBoothNameNe(e.target.value); }}
                              className="px-2 py-1 border border-border rounded text-sm bg-background w-48"
                              placeholder={language === 'ne' ? 'बुथको नाम लेख्नुहोस्' : 'Enter booth name'}
                            />
                            <button onClick={() => handleSaveBooth(activeWard.id, booth.id)} className="p-1 text-primary"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingBooth(null)} className="p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium">{language === 'ne' ? booth.nameNe : booth.name}</p>
                            <p className="text-xs text-muted-foreground">{booth.voters.length} {t('voters')}</p>
                          </div>
                        )}
                      </div>
                      {!isEditingThis && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-xs cursor-pointer hover:bg-primary/20 transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            {t('uploadExcel')}
                            <input
                              type="file"
                              accept=".xlsx,.xls"
                              onChange={e => handleUploadForBooth(activeWard.id, booth.id, e)}
                              className="hidden"
                            />
                          </label>
                          <button
                            onClick={() => handleEditBooth(booth)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {activeWard.booths.length > 1 && (
                            <button
                              onClick={() => handleDeleteBooth(activeWard.id, booth.id)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MunicipalityDetail;
