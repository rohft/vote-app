import React, { useState, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Users, Vote, Plus, Trash2, Edit2, Upload, X, Image, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const Municipalities: React.FC = () => {
  const { t, language } = useLanguage();
  const { municipalities, deleteMunicipality, updateMunicipality } = useData();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameNe, setEditNameNe] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUploadId, setLogoUploadId] = useState<string | null>(null);

  // Delete confirmation with type-name
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; nameNe: string } | null>(null);
  const [deleteTypedName, setDeleteTypedName] = useState('');

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMunicipality(deleteTarget.id);
    setDeleteTarget(null);
    setDeleteTypedName('');
  };

  const isDeleteConfirmed = deleteTarget && (
    deleteTypedName === deleteTarget.name || deleteTypedName === deleteTarget.nameNe
  );

  const startEdit = (mun: typeof municipalities[0]) => {
    setEditingId(mun.id);
    setEditName(mun.name);
    setEditNameNe(mun.nameNe);
  };

  const saveEdit = () => {
    if (editingId) {
      updateMunicipality(editingId, { name: editName, nameNe: editNameNe });
      setEditingId(null);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, munId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateMunicipality(munId, { logo: ev.target?.result as string });
      setLogoUploadId(null);
    };
    reader.readAsDataURL(file);
  };

  const getGenderBreakdown = (mun: typeof municipalities[0]) => {
    let male = 0, female = 0, other = 0;
    mun.wards.forEach(w => w.booths.forEach(b => b.voters.forEach(v => {
      if (v.gender === 'पुरुष' || v.gender?.toLowerCase() === 'male') male++;
      else if (v.gender === 'महिला' || v.gender?.toLowerCase() === 'female') female++;
      else other++;
    })));
    return { male, female, other };
  };

  const getAgeGroups = (mun: typeof municipalities[0]) => {
    const groups = { '18-25': 0, '26-35': 0, '36-45': 0, '46-60': 0, '60+': 0 };
    mun.wards.forEach(w => w.booths.forEach(b => b.voters.forEach(v => {
      if (v.age >= 18 && v.age <= 25) groups['18-25']++;
      else if (v.age >= 26 && v.age <= 35) groups['26-35']++;
      else if (v.age >= 36 && v.age <= 45) groups['36-45']++;
      else if (v.age >= 46 && v.age <= 60) groups['46-60']++;
      else if (v.age > 60) groups['60+']++;
    })));
    return groups;
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('municipalities')}</h1>
        <Link
          to="/create-municipality"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {t('createMunicipality')}
        </Link>
      </motion.div>

      {/* Hidden file input for logo */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => logoUploadId && handleLogoUpload(e, logoUploadId)} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {municipalities.map((mun, idx) => {
            const totalBooths = mun.wards.reduce((a, w) => a + w.booths.length, 0);
            const totalVoters = mun.wards.reduce((a, w) => a + w.booths.reduce((b, booth) => b + booth.voters.length, 0), 0);
            const gender = getGenderBreakdown(mun);
            const ageGroups = getAgeGroups(mun);

            return (
              <motion.div
                key={mun.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.08 }}
                whileHover={{ y: -4, boxShadow: '0 12px 30px -8px hsl(215 80% 45% / 0.15)' }}
                className="bg-card rounded-xl border border-border p-5 transition-all cursor-pointer group"
                onClick={() => navigate(`/municipality/${mun.id}`)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-xl bg-municipality-light flex items-center justify-center overflow-hidden relative group/logo cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setLogoUploadId(mun.id); fileInputRef.current?.click(); }}
                    >
                      {mun.logo ? (
                        <img src={mun.logo} alt="logo" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-7 h-7 text-municipality" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div>
                      {editingId === mun.id ? (
                        <div className="space-y-1" onClick={e => e.stopPropagation()}>
                          <input value={editName} onChange={e => setEditName(e.target.value)}
                            className="border border-input rounded px-2 py-1 text-sm bg-background w-full" placeholder="Name (EN)" />
                          <input value={editNameNe} onChange={e => setEditNameNe(e.target.value)}
                            className="border border-input rounded px-2 py-1 text-sm bg-background w-full" placeholder="नाम (NE)" />
                          <div className="flex gap-1">
                            <button onClick={saveEdit} className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">{t('save')}</button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground">{t('cancel')}</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-bold text-lg">{language === 'ne' ? mun.nameNe : mun.name}</h3>
                          {mun.nameNe && mun.name && (
                            <p className="text-sm text-muted-foreground">{language === 'ne' ? mun.name : mun.nameNe}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {editingId !== mun.id && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(mun); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: mun.id, name: mun.name, nameNe: mun.nameNe }); setDeleteTypedName(''); }}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 bg-ward-light rounded-lg text-center">
                    <MapPin className="w-4 h-4 text-ward mx-auto mb-1" />
                    <p className="text-lg font-bold">{mun.wards.length}</p>
                    <p className="text-xs text-muted-foreground">{t('ward')}</p>
                  </div>
                  <div className="p-3 bg-booth-light rounded-lg text-center">
                    <Vote className="w-4 h-4 text-booth mx-auto mb-1" />
                    <p className="text-lg font-bold">{totalBooths}</p>
                    <p className="text-xs text-muted-foreground">{t('booth')}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                    <p className="text-lg font-bold">{totalVoters}</p>
                    <p className="text-xs text-muted-foreground">{t('voters')}</p>
                  </div>
                </div>

                {/* Gender breakdown */}
                {totalVoters > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('genderDistribution')}</p>
                    <div className="flex gap-1 h-2.5 rounded-full overflow-hidden bg-muted">
                      {gender.male > 0 && (
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(gender.male / totalVoters) * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className="bg-primary rounded-full" title={`${t('male')}: ${gender.male}`} />
                      )}
                      {gender.female > 0 && (
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(gender.female / totalVoters) * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          className="bg-accent rounded-full" title={`${t('female')}: ${gender.female}`} />
                      )}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" />{t('male')}: {gender.male}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent inline-block" />{t('female')}: {gender.female}</span>
                      {gender.other > 0 && <span>{language === 'ne' ? 'अन्य' : 'Other'}: {gender.other}</span>}
                    </div>
                  </div>
                )}

                {/* Age groups */}
                {totalVoters > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('ageDistribution')}</p>
                    <div className="flex gap-1">
                      {Object.entries(ageGroups).map(([label, count]) => (
                        <div key={label} className="flex-1 text-center">
                          <div className="bg-muted rounded-md relative overflow-hidden" style={{ height: 32 }}>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: totalVoters ? `${(count / totalVoters) * 100}%` : '0%' }}
                              transition={{ duration: 0.6, delay: 0.3 }}
                              className="absolute bottom-0 left-0 right-0 bg-secondary/60 rounded-md"
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                          <p className="text-xs font-semibold">{count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ward list */}
                <div className="space-y-1">
                  {mun.wards.map(w => {
                    const wVoters = w.booths.reduce((a, b) => a + b.voters.length, 0);
                    return (
                      <div key={w.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 text-sm">
                        <span>{t('ward')} {w.number}</span>
                        <span className="text-muted-foreground">
                          {w.booths.length} {t('booth')} · {wVoters} {t('voters')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteTypedName(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {language === 'ne' ? 'नगरपालिका मेटाउनुहोस्' : 'Delete Municipality'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ne'
                ? 'यो कार्य पूर्ववत गर्न सकिँदैन। पुष्टि गर्न नगरपालिकाको नाम टाइप गर्नुहोस्।'
                : 'This action cannot be undone. Type the municipality name to confirm.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm font-medium">{deleteTarget?.nameNe || deleteTarget?.name}</p>
              {deleteTarget?.name !== deleteTarget?.nameNe && (
                <p className="text-xs text-muted-foreground">{deleteTarget?.name}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                {language === 'ne'
                  ? `"${deleteTarget?.nameNe || deleteTarget?.name}" टाइप गर्नुहोस्`
                  : `Type "${deleteTarget?.name || deleteTarget?.nameNe}" to confirm`}
              </label>
              <input
                value={deleteTypedName}
                onChange={e => setDeleteTypedName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-destructive/30 focus:outline-none text-sm"
                placeholder={deleteTarget?.name || deleteTarget?.nameNe || ''}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => { setDeleteTarget(null); setDeleteTypedName(''); }}
              className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={!isDeleteConfirmed}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {t('delete')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Municipalities;
