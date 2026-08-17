import { supabase } from './supabase';

export interface DoctorProfileData {
  id: string;
  nombre: string;
  apellidos: string;
  correo: string;
  avatar_url?: string;
  role: string;
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

export const profileService = {
  async getDoctorProfile(doctorId: string): Promise<DoctorProfileData | null> {
    if (!doctorId) return null;

    try {
      // 1. Fetch user data with joins
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
          doctor_profiles (
            especialidad,
            cedula_profesional,
            cedula_especialidad,
            firma
          ),
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

      // 2. Fallback: If not found by public.users.id, try by auth_user_id (sometimes IDs get swapped in logic)
      if (!userData) {
        const { data: authData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', doctorId)
          .maybeSingle();

        if (authData) {
          return this.getDoctorProfile(authData.id);
        }
      }

      if (!userData) return null;

      // 3. Extract doctor profile
      let docProfile = null;
      if (userData.doctor_profiles) {
        docProfile = Array.isArray(userData.doctor_profiles) ? userData.doctor_profiles[0] : userData.doctor_profiles;
      }

      // 4. Force direct fetch if profile fields are missing (Deep sync)
      if (!docProfile || !docProfile.cedula_profesional || !docProfile.especialidad) {
        const { data: directProfile } = await supabase
          .from('doctor_profiles')
          .select('especialidad, cedula_profesional, cedula_especialidad, firma')
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

      const profileData = {
        id: userData.id,
        nombre: userData.nombre || "",
        apellidos: userData.apellidos || "",
        correo: userData.correo || "",
        avatar_url: userData.avatar_url,
        role: userData.role || "",
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

      console.log("🕵️ LIARENA Profile Sync:", profileData.nombre, profileData.especialidad);
      return profileData;
    } catch (e) {
      console.error("Critical error in profileService:", e);
      return null;
    }
  },

  async getCurrentUserProfile(): Promise<DoctorProfileData | null> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single();

      if (error || !data) return null;

      return this.getDoctorProfile(data.id);
    } catch (e) {
      console.error("Error fetching current user profile:", e);
      return null;
    }
  }
};
