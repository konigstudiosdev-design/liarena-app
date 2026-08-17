import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Users,
  Settings,
  LogOut,
  Bell,
  Search,
  Stethoscope,
  Building2,
  User,
  Command,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Activity,
  ShieldCheck,
  Cloud,
  CloudOff,
  Loader2,
  WifiOff
} from "lucide-react";
import { Avatar, Button } from "../../components/ui/index";
import { supabase } from "../../lib/supabase";
import { cloudSyncService, SyncStatus } from "../../lib/cloud-sync-service";
import { cn } from "../../lib/utils";

const logo = "/logo.png";

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  to: string;
}

export const DashboardLayout = ({ role }: { role: "dev" | "admin" | "medic" | "assistant" }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('liarena_sidebar_collapsed') === 'true';
  });
  const [userName, setUserName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [syncState, setSyncState] = useState({ count: 0, status: 'idle' as SyncStatus });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    return cloudSyncService.subscribe(setSyncState);
  }, []);

  useEffect(() => {
    fetchUserData();
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('liarena_sidebar_collapsed', String(newState));
  };

  async function fetchUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('nombre, apellidos, correo, organizations(nombre)')
          .eq('auth_user_id', user.id)
          .single();

        if (data) {
          const fullName = `${data.nombre || ""} ${data.apellidos || ""}`.trim();
          setUserName(fullName || data.correo || "Usuario");

          const org = Array.isArray(data.organizations) ? data.organizations[0] : data.organizations;
          if (org?.nombre) {
            setOrgName(org.nombre);
          }
        } else if (user.email === 'konigstudios.dev@gmail.com') {
          setUserName("konigstudios.dev");
          setOrgName("Liarena Global");
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  const navItems: Record<string, SidebarItem[]> = {
    dev: [
      { icon: LayoutGrid, label: "Overview", to: "/dev" },
      { icon: Building2, label: "Organizaciones", to: "/dev/organizations" },
      { icon: ShieldCheck, label: "Administradores", to: "/dev/admins" },
      { icon: Users, label: "Usuarios Red", to: "/dev/doctors" },
      { icon: Settings, label: "Configuración", to: "/dev/settings" },
      { icon: User, label: "Mi Perfil", to: "/dev/profile" },
    ],
    admin: [
      { icon: LayoutGrid, label: "Panel Principal", to: "/org" },
      { icon: Users, label: "Equipo Médico", to: "/org/staff" },
      { icon: Settings, label: "Configuración Org", to: "/org/settings" },
      { icon: User, label: "Mi Perfil", to: "/org/profile" },
    ],
    medic: [
      { icon: LayoutGrid, label: "Mi Panel", to: "/medic" },
      { icon: Users, label: "Pacientes", to: "/patients" },
      { icon: Activity, label: "Actividad", to: "/reports" },
      { icon: Settings, label: "Configuración", to: "/profile" },
    ],
    assistant: [
      { icon: LayoutGrid, label: "Dashboard", to: "/assistant" },
      { icon: PlusCircle, label: "Nuevo Procedimiento", to: "/assistant/procedure" },
      { icon: Activity, label: "Procedimientos", to: "/assistant/studies" },
      { icon: Users, label: "Pacientes", to: "/assistant/patients" },
      { icon: User, label: "Mi Perfil", to: "/assistant/profile" },
    ]
  };

  const items = navItems[role] || [];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('liarena_org_id');
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-[#FBFBFD] overflow-hidden font-sans selection:bg-primary/10">
      <aside
        className={cn(
          "h-full border-r border-slate-100 bg-white flex flex-col transition-all duration-500 ease-in-out z-30 relative",
          isSidebarCollapsed ? "w-[80px]" : "w-[280px]"
        )}
      >
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-10 w-6 h-6 bg-white border border-slate-100 rounded-full shadow-sm flex items-center justify-center text-slate-400 hover:text-primary transition-all z-50 hover:scale-110"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        <div className="h-24 flex items-center justify-center px-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shrink-0 transform transition-transform hover:scale-105 p-2 border border-slate-50">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            {!isSidebarCollapsed && (
              <div className="space-y-0.5 animate-in fade-in slide-in-from-left-2 duration-500">
                <span className="font-black text-xl tracking-tighter text-slate-900 italic">LIARENA</span>
                <p className="text-[8px] font-black text-primary uppercase tracking-[0.3em] leading-none">Clinical OS</p>
              </div>
            )}
          </div>
        </div>

        <div className={cn("flex-1 overflow-y-auto py-6 space-y-1.5 custom-scrollbar transition-all duration-500", isSidebarCollapsed ? "px-2" : "px-4")}>
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to.split('/').length <= 2}
                className={({ isActive }) => cn(
                  "flex items-center rounded-2xl transition-all duration-300 group relative overflow-hidden",
                  isSidebarCollapsed ? "justify-center h-14 w-14 mx-auto" : "gap-3 px-4 py-3",
                  isActive
                    ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-[20px] h-[20px] shrink-0 transition-all", isSidebarCollapsed ? "" : "group-hover:scale-110")} />
                {!isSidebarCollapsed && <span className="text-[13px] font-bold tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
                {isSidebarCollapsed && (
                   <div className="absolute left-full ml-4 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-2xl border border-white/10 translate-x-[-10px] group-hover:translate-x-0">
                      {item.label}
                   </div>
                )}
              </NavLink>
            ))}
        </div>

        <div className="p-4 bg-slate-50/30 border-t border-slate-100">
           <div className={cn(
             "flex flex-col gap-4 p-2 rounded-[28px] transition-all duration-500",
             isSidebarCollapsed ? "bg-transparent items-center" : "bg-white shadow-sm border border-slate-100 p-4"
           )}>
              <div className="flex items-center gap-3 w-full justify-center">
                 <Avatar
                   fallback={userName && userName.length > 0 ? userName.charAt(0).toUpperCase() : 'U'}
                   className={cn("ring-2 ring-slate-50 transition-all", isSidebarCollapsed ? "h-9 w-9" : "h-10 w-10")}
                 />
                 {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0 animate-in fade-in duration-500">
                       <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">
                         {userName || "Identificando..."}
                       </p>
                       <p className="text-[9px] font-bold text-primary truncate uppercase tracking-widest mt-0.5">
                         {orgName || `${role} mode`}
                       </p>
                    </div>
                 )}
              </div>

              <button
                onClick={handleLogout}
                className={cn(
                  "flex items-center gap-2 text-slate-400 hover:text-danger transition-all duration-300 group",
                  isSidebarCollapsed ? "justify-center w-10 h-10 rounded-xl hover:bg-danger/5" : "px-1 w-full"
                )}
                title={isSidebarCollapsed ? "Cerrar Sesión" : ""}
              >
                <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                {!isSidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Cerrar Sesión</span>}
              </button>
           </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="h-20 flex items-center px-10 justify-between shrink-0 bg-white/40 backdrop-blur-xl border-b border-slate-100 z-20">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                <Command className="w-4 h-4 text-slate-300" />
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                   {items.find(w => location.pathname === w.to)?.label || "Overview"}
                </h2>
             </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               {syncState.status === 'error' && (
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-full border border-red-500/20 animate-in fade-in zoom-in duration-300 mr-2 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    <WifiOff size={12} className="text-red-500" />
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Error Sync</span>
                 </div>
               )}
               {syncState.count > 0 && syncState.status !== 'error' && (
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10 animate-in fade-in zoom-in duration-300 mr-2">
                    <Loader2 size={12} className="animate-spin text-primary" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">{syncState.count} pendientes</span>
                 </div>
               )}
               <button className="relative p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all hover:scale-105 active:scale-95">
                 <Bell className="w-4.5 h-4.5" />
                 <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-white animate-pulse" />
               </button>
               <div className="h-8 w-[1px] bg-slate-100 mx-2" />
               <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                  <LayoutGrid className="w-4.5 h-4.5" />
               </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto custom-scrollbar bg-[#FBFBFD]">
          <div className="max-w-[1600px] mx-auto p-4 lg:p-8 xl:p-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
