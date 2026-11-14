import { supabase } from './supabase';

export interface DoctorProfileData {
  id: string;
  nombre: string;
  apellidos: string;
  correo: string;
  avatar_url?: string;
  role: string;
  titulo_profesional?: string;
  especialidad?: string;
  cedula_profesional?: string;
  cedula_especialidad?: string;
  firma?: string;
  organization?: {
    id: string;
    nombre: string;
    logo?: string;
  };
}

const profileCache = new Map<string, { data: DoctorProfileData; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export const profileService = {
  clearCache(doctorId?: string) {
    if (doctorId) {
      profileCache.delete(doctorId);
    } else {
      profileCache.clear();
    }
  },

  async getDoctorProfile(doctorId: string, forceRefresh = false): Promise<DoctorProfileData | null> {
    if (!doctorId) return null;

    if (!forceRefresh) {
      const cached = profileCache.get(doctorId);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
      }
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          nombre,
          apellidos,
          correo,
          avatar_url,
          role,
          organization_id,
          doctor_profiles (*),
          organizations (
            id,
            nombre,
            logo
          )
        `)
        .eq('id', doctorId)
        .maybeSingle();

      if (error) {
        console.error("Profile join query error:", error);
      }

      let userData = data;

      if (!userData) {
        const { data: authData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', doctorId)
          .maybeSingle();

        if (authData) {
          return this.getDoctorProfile(authData.id, forceRefresh);
        }
      }

      if (!userData) return null;

      let docProfile = null;
      if (userData.doctor_profiles) {
        docProfile = Array.isArray(userData.doctor_profiles) ? userData.doctor_profiles[0] : userData.doctor_profiles;
      }

      if (!docProfile || !docProfile.cedula_profesional || !docProfile.especialidad) {
        const { data: directProfile } = await supabase
          .from('doctor_profiles')
          .select('*')
          .eq('user_id', userData.id)
          .maybeSingle();

        if (directProfile) {
          docProfile = {
            ...docProfile,
            ...directProfile
          };
        }
      }

      const org = Array.isArray(userData.organizations) ? userData.organizations[0] : userData.organizations;

      const profileData: DoctorProfileData = {
        id: userData.id,
        nombre: userData.nombre || "",
        apellidos: userData.apellidos || "",
        correo: userData.correo || "",
        avatar_url: userData.avatar_url,
        role: userData.role || "",
        titulo_profesional: docProfile?.titulo_profesional || docProfile?.titulo || (userData as any).titulo_profesional || "",
        especialidad: docProfile?.especialidad || "",
        cedula_profesional: docProfile?.cedula_profesional || "",
        cedula_especialidad: docProfile?.cedula_especialidad || "",
        firma: docProfile?.firma,
        organization: org ? {
          id: org.id,
          nombre: org.nombre,
          logo: org.logo
        } : undefined
      };

      profileCache.set(doctorId, { data: profileData, timestamp: Date.now() });
      console.log("🕵️ LIARENA Profile Sync:", profileData.nombre, profileData.especialidad);
      return profileData;
    } catch (e) {
      console.error("Critical error in profileService:", e);
      return null;
    }
  },

  async getCurrentUserProfile(forceRefresh = false): Promise<DoctorProfileData | null> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single();

      if (error || !data) return null;

      return this.getDoctorProfile(data.id, forceRefresh);
    } catch (e) {
      console.error("Error fetching current user profile:", e);
      return null;
    }
  }
};
