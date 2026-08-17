import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { SystemErrorBoundary } from "./components/layout/SystemErrorBoundary";
import { SecurityGuard } from "./components/auth/SecurityGuard";
import { DoctorProvider } from "./contexts/DoctorContext";
import { SplashScreen } from "./components/layout/SplashScreen";
import { UpdateManager } from "./components/layout/UpdateManager";
import { supabase } from "./lib/supabase";

// Pages
import Login from "./pages/Login";
import ProcedureSetup from "./pages/ProcedureSetup";
import ProcedureScreen from "./pages/ProcedureScreen";
import PostProcedureWizard from "./pages/PostProcedureWizard";
import ImportReportWizard from "./pages/ImportReportWizard";
import OrgDashboard from "./pages/OrgDashboard";
import MedicDashboard from "./pages/MedicDashboard";
import AssistantDashboard from "./pages/AssistantDashboard";
import Patients from "./pages/Patients";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import StaffManagement from "./pages/admin/StaffManagement";
import Onboarding from "./pages/onboarding/Onboarding";
import CreateOrg from "./pages/onboarding/CreateOrg";
import JoinOrg from "./pages/onboarding/JoinOrg";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import OrganizationList from "./pages/dev/OrganizationList";
import AdminManagement from "./pages/dev/AdminManagement";
import UserList from "./pages/dev/UserList";
import DevInfrastructure from "./pages/dev/DevInfrastructure";
import SystemControl from "./pages/dev/SystemControl";
import DevSettings from "./pages/dev/DevSettings";
import DevProfile from "./pages/dev/DevProfile";

import { Toaster, Card, Button } from "./components/ui";
import { Clock, ArrowRight } from "lucide-react";
import { dbMigrationService } from "./lib/db-migration-service";

function AppWorkstation() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Iniciando Estación...");
  const [pendingStudy, setPendingStudy] = useState<any>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const isConfigured = localStorage.getItem('liarena_configured') === 'true';

  useEffect(() => {
    async function initializeSystem() {
      try {
        setProgress(10);
        setStatusMessage("Verificando integridad...");
        await dbMigrationService.runMigrations().catch(() => null);

        setProgress(30);
        setStatusMessage("Validando Liarena Cloud...");

        const { data: { session } } = await supabase.auth.getSession();
        setHasSession(!!session);

        if (session) {
          // Attempt to load profile without blocking entire app if it fails
          try {
            const { data: profile } = await supabase.from('users').select('id, organization_id').eq('auth_user_id', session.user.id).maybeSingle();
            if (profile) {
              if (!localStorage.getItem('liarena_org_id') && profile.organization_id) {
                localStorage.setItem('liarena_org_id', profile.organization_id);
                localStorage.setItem('liarena_configured', 'true');
              }

              const { data } = await supabase.from('studies').select('*, patient:patient_id(*)').eq('doctor_id', profile.id).is('fecha_fin', null).is('deleted_at', null).limit(1).maybeSingle();
              if (data) {
                setPendingStudy(data);
                setShowRecoveryModal(true);
              }
            }
          } catch (e) {
            console.warn("Profile fetch error during init:", e);
          }
        }

        setProgress(100);
        setStatusMessage("Sistema listo.");
        setTimeout(() => setIsInitializing(false), 500);
      } catch (error) {
        console.error("Initialization error:", error);
        setIsInitializing(false);
      }
    }
    initializeSystem();
  }, []);

  if (isInitializing) {
    return <SplashScreen message={statusMessage} progress={progress} isExiting={false} />;
  }

  return (
    <SystemErrorBoundary>
      <Toaster />
      <UpdateManager />

      {showRecoveryModal && pendingStudy && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-2xl">
           <Card className="w-full max-w-lg bg-white rounded-[48px] p-10 space-y-8 shadow-2xl">
              <div className="text-center space-y-4">
                 <div className="w-20 h-20 bg-amber-50 rounded-[32px] flex items-center justify-center text-amber-500 mx-auto">
                    <Clock size={40} className="animate-pulse" />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 uppercase italic">Procedimiento pendiente</h3>
                 <p className="text-sm text-slate-500 italic">Se ha detectado un estudio que no ha sido finalizado.</p>
              </div>
              <div className="flex gap-4 pt-2">
                 <Button variant="ghost" onClick={() => setShowRecoveryModal(false)} className="flex-1 h-16 rounded-3xl">Descartar</Button>
                 <Button onClick={() => { setShowRecoveryModal(false); window.location.hash = "#/procedure/finish"; }} className="flex-[2] h-16 rounded-3xl bg-slate-900 text-white font-black uppercase text-[11px] gap-3">Continuar <ArrowRight size={18} /></Button>
              </div>
           </Card>
        </div>
      )}

      <DoctorProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Login />} />

            {(!isConfigured && !hasSession) ? (
              <>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/onboarding/create" element={<CreateOrg />} />
                <Route path="/onboarding/join" element={<JoinOrg />} />
                <Route path="*" element={<Navigate to="/onboarding" replace />} />
              </>
            ) : (
              <>
                <Route path="/procedure/setup" element={<SecurityGuard allowedRoles={['assistant', 'medic', 'doctor']}><ProcedureSetup /></SecurityGuard>} />
                <Route path="/procedure/active" element={<SecurityGuard allowedRoles={['assistant', 'medic', 'doctor']}><ProcedureScreen /></SecurityGuard>} />
                <Route path="/procedure/finish" element={<SecurityGuard allowedRoles={['assistant', 'medic', 'doctor']}><PostProcedureWizard /></SecurityGuard>} />
                <Route path="/import-report" element={<SecurityGuard allowedRoles={['assistant', 'medic', 'doctor']}><ImportReportWizard /></SecurityGuard>} />

                <Route element={<SecurityGuard allowedRoles={['dev', 'developer']}><DashboardLayout role="dev" /></SecurityGuard>}>
                  <Route path="/dev" element={<DeveloperDashboard />} />
                  <Route path="/dev/organizations" element={<OrganizationList />} />
                  <Route path="/dev/admins" element={<AdminManagement />} />
                  <Route path="/dev/infrastructure" element={<DevInfrastructure />} />
                  <Route path="/dev/system" element={<SystemControl />} />
                  <Route path="/dev/settings" element={<DevSettings />} />
                  <Route path="/dev/doctors" element={<UserList />} />
                  <Route path="/dev/profile" element={<DevProfile />} />
                </Route>

                <Route element={<SecurityGuard allowedRoles={['organization_admin', 'admin']}><DashboardLayout role="admin" /></SecurityGuard>}>
                  <Route path="/org" element={<OrgDashboard />} />
                  <Route path="/org/staff" element={<StaffManagement />} />
                  <Route path="/org/settings" element={<Admin />} />
                </Route>

                <Route element={<SecurityGuard allowedRoles={['doctor', 'medic']}><DashboardLayout role="medic" /></SecurityGuard>}>
                  <Route path="/medic" element={<MedicDashboard />} />
                  <Route path="/patients" element={<Patients />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>

                <Route element={<SecurityGuard allowedRoles={['assistant']}><DashboardLayout role="assistant" /></SecurityGuard>}>
                  <Route path="/assistant" element={<AssistantDashboard />} />
                  <Route path="/assistant/procedure" element={<ProcedureSetup />} />
                  <Route path="/assistant/studies" element={<MedicDashboard />} />
                  <Route path="/assistant/patients" element={<Patients />} />
                  <Route path="/assistant/profile" element={<Profile />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </HashRouter>
      </DoctorProvider>
    </SystemErrorBoundary>
  );
}

export default AppWorkstation;
