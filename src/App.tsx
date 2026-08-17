import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { SystemErrorBoundary } from "./components/layout/SystemErrorBoundary";
import { SecurityGuard } from "./components/auth/SecurityGuard";
import { DoctorProvider } from "./contexts/DoctorContext";
import { supabase } from "./lib/supabase";

// Pages
import Login from "./pages/Login";
import ProcedureSetup from "./pages/ProcedureSetup";
import OrgDashboard from "./pages/OrgDashboard";
import MedicDashboard from "./pages/MedicDashboard";
import AssistantDashboard from "./pages/AssistantDashboard";
import Patients from "./pages/Patients";
import ProcedureScreen from "./pages/ProcedureScreen";
import PostProcedureWizard from "./pages/PostProcedureWizard";
import ImportReportWizard from "./pages/ImportReportWizard";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Onboarding from "./pages/onboarding/Onboarding";
import CreateOrg from "./pages/onboarding/CreateOrg";
import JoinOrg from "./pages/onboarding/JoinOrg";
import StaffManagement from "./pages/admin/StaffManagement";

import { Toaster } from "./components/ui/index";

function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function initializeSystem() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase.from('users').select('organization_id').eq('auth_user_id', session.user.id).maybeSingle();
          if (profile?.organization_id) {
            localStorage.setItem('liarena_org_id', profile.organization_id);
            localStorage.setItem('liarena_configured', 'true');
          }
        }
      } catch (error) {
        console.error("Init Error:", error);
      } finally {
        setIsInitializing(false);
      }
    }
    initializeSystem();
  }, []);

  if (isInitializing) return null;

  return (
    <SystemErrorBoundary>
      <Toaster />
      <DoctorProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/onboarding/create" element={<CreateOrg />} />
            <Route path="/onboarding/join" element={<JoinOrg />} />

            {/* Endo Assistant Workspace */}
            <Route element={<SecurityGuard allowedRoles={['assistant']}><DashboardLayout role="assistant" /></SecurityGuard>}>
              <Route path="/assistant" element={<AssistantDashboard />} />
              <Route path="/assistant/procedure" element={<ProcedureSetup />} />
              <Route path="/assistant/studies" element={<MedicDashboard />} />
              <Route path="/assistant/patients" element={<Patients />} />
              <Route path="/assistant/profile" element={<Profile />} />
            </Route>

            {/* Medic Workspace */}
            <Route element={<SecurityGuard allowedRoles={['doctor', 'medic']}><DashboardLayout role="medic" /></SecurityGuard>}>
              <Route path="/medic" element={<MedicDashboard />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/reports" element={<MedicDashboard />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Capture Flow */}
            <Route path="/procedure/setup" element={<SecurityGuard><ProcedureSetup /></SecurityGuard>} />
            <Route path="/procedure/active" element={<SecurityGuard><ProcedureScreen /></SecurityGuard>} />
            <Route path="/procedure/finish" element={<SecurityGuard><PostProcedureWizard /></SecurityGuard>} />
            <Route path="/import-report" element={<SecurityGuard><ImportReportWizard /></SecurityGuard>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </DoctorProvider>
    </SystemErrorBoundary>
  );
}

export default App;
