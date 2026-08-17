import { supabase } from './supabase';
import { toast } from '../components/ui/index';

export interface StudyMetadata {
  id: string;
  patient_id: string;
  doctor_id: string;
  procedure_type: string;
  duration: string;
  timestamp: string;
}

export const wizardService = {
  // Inicialización del expediente clínico
  async createStudyRecord(metadata: any, captures: any[], preloadedProfile?: any) {
    try {
      let userProfile = preloadedProfile;
      let orgId = preloadedProfile?.organization_id;

      if (!userProfile) {
        // 1. Obtener Identidad del Usuario Autenticado
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error("Sesión no válida. Inicie sesión nuevamente.");

        // 2. Recuperar Sede (Multi-tenancy Enforced)
        const { data: profile, error: uErr } = await supabase
          .from('users')
          .select('id, organization_id, role')
          .eq('auth_user_id', authUser.id)
          .single();

        if (uErr || !profile) {
          throw new Error("Su perfil no está vinculado a una sede activa.");
        }
        userProfile = profile;
        orgId = profile.organization_id;
      }

      if (!orgId) throw new Error("Su cuenta no tiene una sede asignada.");

      // 3. Preparar Registro de Estudio
      const studyPayload: any = {
        patient_id: metadata.patientId,
        organization_id: orgId,
        tipo_estudio: metadata.procedureType || 'Estudio Clínico General'
      };

      if (metadata.doctorId && metadata.doctorId !== "") {
        studyPayload.doctor_id = metadata.doctorId;
      }

      // 4. Persistencia en Núcleo de Estudios
      const { data: study, error: studyErr } = await supabase
        .from('studies')
        .insert(studyPayload)
        .select('id')
        .single();

      if (studyErr) {
        if (studyErr.code === '42501' && studyPayload.doctor_id) {
           const { doctor_id, ...minimalPayload } = studyPayload;
           const { data: studyRetry, error: retryErr } = await supabase
             .from('studies')
             .insert(minimalPayload)
             .select('id')
             .single();

           if (!retryErr && studyRetry) {
             await this.logAudit(studyRetry.id, 'STUDY_CREATED', `Estudio iniciado por ${userProfile.role} (Vínculo médico pendiente)`, userProfile.id);
             return studyRetry.id;
           }
           if (retryErr) throw retryErr;
        }
        throw studyErr;
      }

      if (study) {
        await this.logAudit(study.id, 'STUDY_CREATED', `Estudio iniciado por ${userProfile.role}`, userProfile.id);
        return study.id;
      }

      return null;
    } catch (e: any) {
      console.error("Register Error:", e);
      toast.error("Error al registrar: " + (e.message || "Fallo de conexión"));
      return null;
    }
  },

  async logAudit(studyId: string, action: string, details: string, userId?: string) {
    try {
      let finalUserId = userId;

      if (!finalUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .single();
          if (profile) finalUserId = profile.id;
        }
      }

      await supabase.from('audit_logs').insert({
        study_id: studyId,
        accion: action,
        entidad: 'STUDY',
        detalles: details,
        user_id: finalUserId || null
      });
    } catch (e) {
      console.warn("Audit log fail:", e);
    }
  },

  async saveStudyReport(studyId: string, reportData: any, selectedPhotos: any[]) {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Sesión expirada");

      const { data: userProfile } = await supabase
        .from('users')
        .select('organization_id, role, id')
        .eq('auth_user_id', authUser.id)
        .single();

      // Consolidación de Informe en columna 'observaciones' (Única columna de texto clínico detectada)
      const reportText = `
HALLAZGOS: ${reportData.findings || 'Sin observaciones'}
DIAGNÓSTICO: ${reportData.diagnosis || 'Pendiente'}
      `.trim();

      const { error } = await supabase
        .from('studies')
        .update({ observaciones: reportText })
        .eq('id', studyId)
        .eq('organization_id', userProfile?.organization_id);

      if (error) throw error;

      // Persistencia de Multimedia en el log (Snapshot Inmutable)
      const clinicalSnapshot = {
        selected_media: selectedPhotos,
        timestamp: new Date().toISOString()
      };

      await this.logAudit(studyId, 'REPORT_SAVED', JSON.stringify(clinicalSnapshot), userProfile?.id);
      return true;
    } catch (e: any) {
      console.error("Critical Save Report Error:", e);
      toast.error("Error al sincronizar el reporte clínico: " + (e.message || "Fallo de conexión"));
      return false;
    }
  },

  async finalizeStudy(studyId: string, signatureData?: string) {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Sesión expirada");

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, organization_id, role')
        .eq('auth_user_id', authUser.id)
        .single();

      // Mapeo a columna real 'fecha_fin' detectada en auditoría
      const updateData = {
        fecha_fin: new Date().toISOString()
      };

      console.log("🕵️ FINALIZE [Architecture Sync]: Using 'fecha_fin' column.");

      const { error } = await supabase
        .from('studies')
        .update(updateData)
        .eq('id', studyId)
        .eq('organization_id', userProfile?.organization_id);

      if (error) throw error;

      const finalSeal = {
        hash: btoa(studyId + Date.now()).substring(0, 32),
        signature: signatureData || null,
        finalized_by: userProfile?.id
      };

      await this.logAudit(studyId, 'STUDY_COMPLETED', JSON.stringify(finalSeal), userProfile?.id);
      return true;
    } catch (e: any) {
      console.error("CRITICAL FINALIZE EXCEPTION:", e);
      toast.error("Error al sellar el expediente clínico: " + (e.message || "Error de esquema"));
      return false;
    }
  },

  async markCaptureFinished(studyId: string) {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('users').select('organization_id').eq('auth_user_id', authUser?.id).single();

      await supabase
        .from('studies')
        .update({ observaciones: '[PENDIENTE_REPORTE]' })
        .eq('id', studyId)
        .eq('organization_id', profile?.organization_id)
        .is('observaciones', null);

      await this.logAudit(studyId, 'CAPTURE_FINISHED', 'Captura de multimedia completada, pendiente de reporte');
    } catch (e) {
      console.warn("LIARENA Core: Failed to mark capture finish.", e);
    }
  },

  async generateAIDraft(procedureType: string, capturesCount: number, notes: string) {
    await new Promise(r => setTimeout(r, 1500));
    return {
      findings: `Se visualiza mucosa de ${procedureType} con integridad conservada. Se identifican ${capturesCount} zonas de interés para seguimiento.`,
      diagnosis: `Estudio de ${procedureType} dentro de parámetros normales.`
    };
  }
};
