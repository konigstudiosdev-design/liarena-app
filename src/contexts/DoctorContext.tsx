import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { profileService, DoctorProfileData } from '../lib/profile-service';

interface DoctorContextType {
  doctor: DoctorProfileData | null;
  loading: boolean;
  error: string | null;
  syncDoctor: (doctorId: string) => Promise<void>;
  clearDoctor: () => void;
}

const DoctorContext = createContext<DoctorContextType | undefined>(undefined);

export const DoctorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doctor, setDoctor] = useState<DoctorProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncDoctor = useCallback(async (doctorId: string) => {
    if (!doctorId) return;
    setLoading(true);
    setError(null);
    try {
      const profile = await profileService.getDoctorProfile(doctorId);
      if (profile) {
        setDoctor(profile);
      } else {
        setError("Doctor profile not found");
      }
    } catch (e: any) {
      setError(e.message || "Error syncing doctor profile");
      console.error("DoctorContext sync error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearDoctor = useCallback(() => {
    setDoctor(null);
    setLoading(false);
    setError(null);
  }, []);

  return (
    <DoctorContext.Provider value={{ doctor, loading, error, syncDoctor, clearDoctor }}>
      {children}
    </DoctorContext.Provider>
  );
};

export const useDoctor = () => {
  const context = useContext(DoctorContext);
  if (context === undefined) {
    throw new Error('useDoctor must be used within a DoctorProvider');
  }
  return context;
};
