import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'; // v2
import { Municipality, Voter, ColumnConfig, EthnicityMapping, LocalityConfig, COLUMN_CONFIGS } from '@/types';
import { SAMPLE_VOTERS } from '@/data/sampleData';
import { DEFAULT_ETHNICITY_MAPPINGS } from '@/data/ethnicityData';

const STORAGE_KEYS = {
  municipalities: 'votersetu_municipalities',
  columnConfigs: 'votersetu_columnConfigs',
  ethnicityMappings: 'votersetu_ethnicityMappings',
  localityConfigs: 'votersetu_localityConfigs',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  return fallback;
}

interface DataContextType {
  municipalities: Municipality[];
  addMunicipality: (m: Municipality) => void;
  updateMunicipality: (id: string, m: Partial<Municipality>) => void;
  deleteMunicipality: (id: string) => void;
  addVotersToBooth: (munId: string, wardId: string, boothId: string, voters: Voter[]) => void;
  updateVoter: (munId: string, wardId: string, boothId: string, voter: Voter) => void;
  deleteVoter: (munId: string, wardId: string, boothId: string, voterId: string) => void;
  getAllVoters: () => Voter[];
  getVotersByBooth: (munId: string, wardId: string, boothId: string) => Voter[];
  columnConfigs: ColumnConfig[];
  setColumnConfigs: (configs: ColumnConfig[]) => void;
  addColumnConfig: (config: ColumnConfig) => void;
  removeColumnConfig: (key: string) => void;
  updateColumnConfig: (key: string, updates: Partial<ColumnConfig>) => void;
  moveColumnConfig: (key: string, direction: 'up' | 'down') => void;
  ethnicityMappings: EthnicityMapping[];
  setEthnicityMappings: (mappings: EthnicityMapping[]) => void;
  getSurnameMapping: (surname: string) => { caste: string; ethnicity: string } | null;
  bulkAssignEthnicity: (surname: string, caste: string, ethnicity: string) => void;
  renameSurname: (oldSurname: string, newSurname: string) => void;
  localityConfigs: LocalityConfig[];
  setLocalityConfigs: (configs: LocalityConfig[]) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialMunicipality: Municipality = {
  id: 'mun-1',
  name: 'Kirtipur Municipality',
  nameNe: 'कीर्तिपुर नगरपालिका',
  wards: [
    {
      id: 'ward-1',
      number: 1,
      booths: [
        {
          id: 'booth-1',
          name: 'Baghbhairav Temple Area',
          nameNe: 'बाघभैरव मन्दिर परिसर',
          voters: SAMPLE_VOTERS,
        },
      ],
    },
    {
      id: 'ward-2',
      number: 2,
      booths: [
        { id: 'booth-2', name: 'Booth 1', nameNe: 'बुथ १', voters: [] },
      ],
    },
    {
      id: 'ward-3',
      number: 3,
      booths: [
        { id: 'booth-3', name: 'Booth 1', nameNe: 'बुथ १', voters: [] },
      ],
    },
  ],
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [municipalities, setMunicipalities] = useState<Municipality[]>(() =>
    loadFromStorage(STORAGE_KEYS.municipalities, [initialMunicipality])
  );
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>(() =>
    loadFromStorage(STORAGE_KEYS.columnConfigs, COLUMN_CONFIGS)
  );
  const [ethnicityMappings, setEthnicityMappings] = useState<EthnicityMapping[]>(() =>
    loadFromStorage(STORAGE_KEYS.ethnicityMappings, DEFAULT_ETHNICITY_MAPPINGS)
  );
  const [localityConfigs, setLocalityConfigs] = useState<LocalityConfig[]>(() =>
    loadFromStorage(STORAGE_KEYS.localityConfigs, [])
  );
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch data from server on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Correct path to backend API assuming it's in the same domain
        const response = await fetch('/backend/get_data.php');
        if (response.ok) {
          const data = await response.json();
          // Only update state if data exists on server
          if (data.municipalities) setMunicipalities(data.municipalities);
          if (data.columnConfigs) setColumnConfigs(data.columnConfigs);
          if (data.ethnicityMappings) setEthnicityMappings(data.ethnicityMappings);
          if (data.localityConfigs) setLocalityConfigs(data.localityConfigs);
          console.log("Data loaded from server");
        } else {
            console.warn("Server API not reachable, falling back to local storage");
        }
      } catch (error) {
        console.error("Failed to fetch from server:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Persist to localStorage AND Server on change
  useEffect(() => {
    // Always save to localStorage as backup/offline cache
    localStorage.setItem(STORAGE_KEYS.municipalities, JSON.stringify(municipalities));
    localStorage.setItem(STORAGE_KEYS.columnConfigs, JSON.stringify(columnConfigs));
    localStorage.setItem(STORAGE_KEYS.ethnicityMappings, JSON.stringify(ethnicityMappings));
    localStorage.setItem(STORAGE_KEYS.localityConfigs, JSON.stringify(localityConfigs));

    // Debounce save to server
    if (isLoading) return; // Don't overwrite server data with initial local state if still loading

    const saveToServer = setTimeout(async () => {
      try {
        setIsSaving(true);
        await fetch('/backend/save_data.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            municipalities,
            columnConfigs,
            ethnicityMappings,
            localityConfigs
          })
        });
        console.log("Data saved to server");
      } catch (error) {
        console.error("Failed to save to server:", error);
      } finally {
        setIsSaving(false);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(saveToServer);
  }, [municipalities, columnConfigs, ethnicityMappings, localityConfigs, isLoading]);


  const addMunicipality = useCallback((m: Municipality) => {
    setMunicipalities(prev => [...prev, m]);
  }, []);

  const updateMunicipality = useCallback((id: string, updates: Partial<Municipality>) => {
    setMunicipalities(prev =>
      prev.map(m => m.id === id ? { ...m, ...updates } : m)
    );
  }, []);

  const deleteMunicipality = useCallback((id: string) => {
    setMunicipalities(prev => prev.filter(m => m.id !== id));
  }, []);

  const addVotersToBooth = useCallback((munId: string, wardId: string, boothId: string, voters: Voter[]) => {
    setMunicipalities(prev =>
      prev.map(m => m.id !== munId ? m : {
        ...m,
        wards: m.wards.map(w => w.id !== wardId ? w : {
          ...w,
          booths: w.booths.map(b => b.id !== boothId ? b : {
            ...b,
            voters: [...b.voters, ...voters],
          }),
        }),
      })
    );
  }, []);

  const updateVoter = useCallback((munId: string, wardId: string, boothId: string, voter: Voter) => {
    setMunicipalities(prev =>
      prev.map(m => m.id !== munId ? m : {
        ...m,
        wards: m.wards.map(w => w.id !== wardId ? w : {
          ...w,
          booths: w.booths.map(b => b.id !== boothId ? b : {
            ...b,
            voters: b.voters.map(v => v.id === voter.id ? voter : v),
          }),
        }),
      })
    );
  }, []);

  const deleteVoter = useCallback((munId: string, wardId: string, boothId: string, voterId: string) => {
    setMunicipalities(prev =>
      prev.map(m => m.id !== munId ? m : {
        ...m,
        wards: m.wards.map(w => w.id !== wardId ? w : {
          ...w,
          booths: w.booths.map(b => b.id !== boothId ? b : {
            ...b,
            voters: b.voters.filter(v => v.id !== voterId),
          }),
        }),
      })
    );
  }, []);

  const getAllVoters = useCallback(() => {
    return municipalities.flatMap(m => m.wards.flatMap(w => w.booths.flatMap(b => b.voters)));
  }, [municipalities]);

  const getVotersByBooth = useCallback((munId: string, wardId: string, boothId: string) => {
    const mun = municipalities.find(m => m.id === munId);
    if (!mun) return [];
    const ward = mun.wards.find(w => w.id === wardId);
    if (!ward) return [];
    const booth = ward.booths.find(b => b.id === boothId);
    return booth?.voters || [];
  }, [municipalities]);

  const addColumnConfig = useCallback((config: ColumnConfig) => {
    setColumnConfigs(prev => [...prev, config]);
  }, []);

  const removeColumnConfig = useCallback((key: string) => {
    setColumnConfigs(prev => prev.filter(c => c.key !== key));
  }, []);

  const updateColumnConfig = useCallback((key: string, updates: Partial<ColumnConfig>) => {
    setColumnConfigs(prev => prev.map(c => c.key === key ? { ...c, ...updates } : c));
  }, []);

  const moveColumnConfig = useCallback((key: string, direction: 'up' | 'down') => {
    setColumnConfigs(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(c => c.key === key);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      return sorted.map(c => {
        if (c.key === sorted[idx].key) return { ...c, order: sorted[swapIdx].order };
        if (c.key === sorted[swapIdx].key) return { ...c, order: sorted[idx].order };
        return c;
      });
    });
  }, []);

  const getSurnameMapping = useCallback((surname: string): { caste: string; ethnicity: string } | null => {
    for (const eth of ethnicityMappings) {
      for (const c of eth.castes) {
        if (c.surnames.includes(surname)) {
          return { caste: c.caste, ethnicity: eth.ethnicity };
        }
      }
    }
    return null;
  }, [ethnicityMappings]);

  const bulkAssignEthnicity = useCallback((surname: string, caste: string, ethnicity: string) => {
    setMunicipalities(prev =>
      prev.map(m => ({
        ...m,
        wards: m.wards.map(w => ({
          ...w,
          booths: w.booths.map(b => ({
            ...b,
            voters: b.voters.map(v =>
              v.surname === surname ? { ...v, caste, ethnicity } : v
            ),
          })),
        })),
      }))
    );
  }, []);

  const renameSurname = useCallback((oldSurname: string, newSurname: string) => {
    if (!oldSurname || !newSurname || oldSurname === newSurname) return;
    // Update all voters
    setMunicipalities(prev =>
      prev.map(m => ({
        ...m,
        wards: m.wards.map(w => ({
          ...w,
          booths: w.booths.map(b => ({
            ...b,
            voters: b.voters.map(v =>
              v.surname === oldSurname ? { ...v, surname: newSurname } : v
            ),
          })),
        })),
      }))
    );
    // Update ethnicity mappings
    setEthnicityMappings(prev =>
      prev.map(eth => ({
        ...eth,
        castes: eth.castes.map(c => ({
          ...c,
          surnames: c.surnames.map(s => s === oldSurname ? newSurname : s),
        })),
      }))
    );
  }, []);

  return (
    <DataContext.Provider value={{
      municipalities, addMunicipality, updateMunicipality, deleteMunicipality,
      addVotersToBooth, updateVoter, deleteVoter, getAllVoters, getVotersByBooth,
      columnConfigs, setColumnConfigs, addColumnConfig, removeColumnConfig, updateColumnConfig, moveColumnConfig,
      ethnicityMappings, setEthnicityMappings, getSurnameMapping, bulkAssignEthnicity,
      renameSurname, localityConfigs, setLocalityConfigs,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
