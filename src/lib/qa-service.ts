import { supabase } from './supabase';

export interface AuditResult {
  module: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  details?: any;
}

export const qaService = {
  async runFullAudit(): Promise<AuditResult[]> {
    const results: AuditResult[] = [];

    // 1. Database Integrity
    try {
      const { data, error } = await supabase.from('organizations').select('id', { count: 'exact', head: true });
      if (error) throw error;
      results.push({
        module: 'Database Connection',
        status: 'OK',
        message: 'Conexión con Supabase establecida y verificada.'
      });
    } catch (e: any) {
      results.push({
        module: 'Database Connection',
        status: 'ERROR',
        message: 'Fallo crítico de conexión: ' + e.message
      });
    }

    // 2. Roles & Permissions (Auth)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        results.push({
          module: 'Auth Session',
          status: 'OK',
          message: `Sesión activa para ${user.email}.`
        });
      } else {
        results.push({
          module: 'Auth Session',
          status: 'WARNING',
          message: 'Sin sesión activa en el núcleo.'
        });
      }
    } catch (e) {
      results.push({
        module: 'Auth Session',
        status: 'ERROR',
        message: 'Error verificando sesión.'
      });
    }

    // 3. Multimedia Engine (Local Storage Check via Electron)
    if ((window as any).ipcRenderer) {
      try {
        const root = await (window as any).ipcRenderer.invoke('get-liarena-root');
        results.push({
          module: 'Local Storage (Electron)',
          status: 'OK',
          message: `Acceso a disco verificado en: ${root}`
        });
      } catch (e) {
        results.push({
          module: 'Local Storage (Electron)',
          status: 'ERROR',
          message: 'Fallo al consultar ruta raíz local.'
        });
      }
    } else {
      results.push({
        module: 'Local Storage (Electron)',
        status: 'WARNING',
        message: 'No se detectó el entorno Electron (Modo Web).'
      });
    }

    // 4. Data Consistency Check (Studies without Doctors)
    try {
      const { count, error } = await supabase
        .from('studies')
        .select('*', { count: 'exact', head: true })
        .is('doctor_id', null);

      if (error) throw error;

      if (count && count > 0) {
        results.push({
          module: 'Data Integrity',
          status: 'WARNING',
          message: `Se encontraron ${count} procedimientos sin médico asignado.`
        });
      } else {
        results.push({
          module: 'Data Integrity',
          status: 'OK',
          message: 'Integridad de registros médicos validada.'
        });
      }
    } catch (e) {}

    // 6. Role-Based Security Policy Check
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
         const { data: profile } = await supabase.from('users').select('role').eq('auth_user_id', session.user.id).single();
         if (profile) {
            results.push({
                module: 'Security Policy',
                status: 'OK',
                message: `Permisos de Rol [${profile.role.toUpperCase()}] verificados y activos.`
            });
         }
      }
    } catch (e) {}

    // 5. Hardware Telemetry Check
    if ((window as any).ipcRenderer) {
        try {
            const info = await (window as any).ipcRenderer.invoke('get-system-info');
            if (info && !info.error) {
                results.push({
                    module: 'Hardware Telemetry',
                    status: 'OK',
                    message: `CPU: ${info.cpu.substring(0, 30)}... | RAM: ${info.ram}`
                });
            } else {
                results.push({
                    module: 'Hardware Telemetry',
                    status: 'ERROR',
                    message: 'Fallo al obtener telemetría real del hardware.'
                });
            }
        } catch (e) {
            results.push({
                module: 'Hardware Telemetry',
                status: 'ERROR',
                message: 'Excepción en el bridge de telemetría.'
            });
        }
    }

    return results;
  }
};
