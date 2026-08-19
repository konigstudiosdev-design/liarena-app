import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { SystemErrorBoundary } from "./components/layout/SystemErrorBoundary";
import { SecurityGuard } from "./components/auth/SecurityGuard";
import { DoctorProvider } from "./contexts/DoctorContext";
import { SplashScreen } from "./components/layout/SplashScreen";
import { supabase } from "./lib/supabase";

// Pages
import Login from "./pages/Login";
import OrgDashboard from "./pages/OrgDashboard";
import MedicDashboard from "./pages/MedicDashboard";
import AssistantDashboard from "./pages/AssistantDashboard";
import Patients from "./pages/Patients";
import Profile from "./pages/Profile";
import DownloadPage from "./pages/DownloadPage";
import AdminManagement from "./pages/dev/AdminManagement";
import OrganizationList from "./pages/dev/OrganizationList";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import UserList from "./pages/dev/UserList";
import DevInfrastructure from "./pages/dev/DevInfrastructure";
import SystemControl from "./pages/dev/SystemControl";
import DevSettings from "./pages/dev/DevSettings";
import DevProfile from "./pages/dev/DevProfile";
import Admin from "./pages/Admin";
import SetupStaff from "./pages/admin/SetupStaff";
import StaffManagement from "./pages/admin/StaffManagement";
import AdminProfile from "./pages/admin/AdminProfile";

import { Toaster } from "./components/ui";

function AppWeb() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Iniciando Portal Web...");

  useEffect(() => {
    async function initializeSystem() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase.from('users').select('organization_id').eq('auth_user_id', session.user.id).maybeSingle();
          if (profile?.organization_id) {
            localStorage.setItem('liarena_org_id', profile.organization_id);
          }
        }
        setTimeout(() => setIsInitializing(false), 500);
      } catch (error) {
        console.error("Web Init Error:", error);
        setIsInitializing(false);
      }
    }
    initializeSystem();
  }, []);

  if (isInitializing) {
    return <SplashScreen message={statusMessage} progress={100} isExiting={false} />;
  }

  return (
    <SystemErrorBoundary>
      <Toaster />
      <DoctorProvider>
        <BrowserRouter>
          <Routes>
            {/* Acceso Directo */}
            <Route path="/" element={<Login />} />
            <Route path="/download" element={<DownloadPage />} />

            {/* Developer Workspace */}
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

            {/* Admin Workspace */}
            <Route element={<SecurityGuard allowedRoles={['organization_admin', 'admin']}><DashboardLayout role="admin" /></SecurityGuard>}>
              <Route path="/org" element={<OrgDashboard />} />
              <Route path="/org/setup-staff" element={<SetupStaff />} />
              <Route path="/org/staff" element={<StaffManagement />} />
              <Route path="/org/settings" element={<Admin />} />
              <Route path="/org/profile" element={<AdminProfile />} />
            </Route>

            {/* Doctor Workspace */}
            <Route element={<SecurityGuard allowedRoles={['doctor', 'medic']}><DashboardLayout role="medic" /></SecurityGuard>}>
              <Route path="/medic" element={<MedicDashboard />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/reports" element={<MedicDashboard />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DoctorProvider>
    </SystemErrorBoundary>
  );
}

export default AppWeb;
