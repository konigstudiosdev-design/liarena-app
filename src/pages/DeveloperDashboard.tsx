import React, { useState, useEffect } from "react";
import {
  Building2,
  Users,
  Activity,
  ShieldCheck,
  Cpu,
  Server,
  Database,
  Zap,
  HardDrive,
  RefreshCw,
  Clock,
  ArrowRight,
  Plus,
  Loader2,
  TrendingUp,
  Inbox,
  Command,
  Monitor,
  LayoutGrid,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, Button, Badge, Avatar, toast } from "../components/ui/index";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";

export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [stats, setStats] = useState([
    { label: "Organizaciones", value: "0", icon: Building2, color: "text-primary", bg: "bg-primary/5", trend: "Nodos globales" },
    { label: "Médicos en Red", value: "0", icon: Users, color: "text-blue-500", bg: "bg-blue-500/5", trend: "Especialistas" },
    { label: "Procedimientos", value: "0", icon: Activity, color: "text-success", bg: "bg-success/5", trend: "Historial de red" },
    { label: "Identidades", value: "0", icon: ShieldCheck, color: "text-orange-500", bg: "bg-orange-500/5", trend: "Admin verified" }
  ]);
  const [loading, setLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  useEffect(() => {
    fetchData();
    fetchSystemInfo();
  }, []);

  async function fetchSystemInfo() {
    if ((window as any).ipcRenderer) {
      const info = await (window as any).ipcRenderer.invoke('get-system-info');
      setSystemInfo(info);
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        supabase.from('organizations').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'doctor').is('deleted_at', null),
        supabase.from('studies').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null)
      ]);

      const counts = results.map(res => res.status === 'fulfilled' ? (res.value as any).count || 0 : 0);

      const { data: recentOrgs } = await supabase
        .from('organizations')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      setOrganizations(recentOrgs || []);

      setStats([
        { label: "Organizaciones", value: counts[0].toString(), icon: Building2, color: "text-primary", bg: "bg-primary/5", trend: "Nodos globales" },
        { label: "Médicos en Red", value: counts[1].toString(), icon: Users, color: "text-blue-500", bg: "bg-blue-500/5", trend: "Especialistas" },
        { label: "Procedimientos", value: counts[2].toString(), icon: Activity, color: "text-success", bg: "bg-success/5", trend: "Historial de red" },
        { label: "Identidades", value: counts[3].toString(), icon: ShieldCheck, color: "text-orange-500", bg: "bg-orange-500/5", trend: "Admin verified" }
      ]);
    } catch (e) {
      console.error("Error fetching dev dashboard data:", e);
      toast.error("Error al sincronizar datos del tablero");
    } finally {
      setLoading(false);
    }
  }

  const systemStatusItems = [
    { name: "Sync Engine", status: "Optimal", icon: RefreshCw, color: "text-success" },
    { name: "Local DB", status: "Connected", icon: Database, color: "text-primary" },
    { name: "Node Telemetry", status: "Active", icon: Activity, color: "text-success" },
    { name: "Maintenance", status: "Open", icon: Zap, color: "text-warning" }
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-20 min-h-[600px]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Sincronizando Registros Root</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-14 pb-10 animate-in fade-in duration-1000">
      {/* Root Header */}
      <div className="flex items-center justify-between px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="primary" className="h-6 px-4 text-[9px] font-black tracking-widest bg-primary text-white border-none shadow-lg shadow-primary/20 italic">ROOT ACCESS</Badge>
            <div className="h-1 w-1 rounded-full bg-slate-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Core System Monitor</span>
          </div>
          <h1 className="text-6xl font-bold tracking-tight text-slate-900 italic">
            Root <span className="text-primary tracking-tighter">Overview</span>
          </h1>
        </div>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/dev/system")}
            className="rounded-2xl bg-white border-slate-100 h-16 px-10 font-black text-[12px] uppercase tracking-widest hover:bg-slate-50 gap-4 shadow-sm"
          >
            <Command className="w-5 h-5 text-slate-400" /> System Console
          </Button>
          <Button
            onClick={() => navigate("/dev/organizations/new")}
            className="rounded-[32px] shadow-2xl shadow-primary/30 h-16 px-12 font-black text-[12px] uppercase tracking-widest gap-4 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" /> Nuevo Despliegue
          </Button>
        </div>
      </div>

      {/* Root Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-premium bg-white rounded-[44px] p-10 hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon size={100} />
             </div>
             <div className="flex flex-col gap-6 relative z-10">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner", stat.bg)}>
                   <stat.icon className={cn("w-7 h-7", stat.color)} />
                </div>
                <div className="space-y-1">
                   <h3 className="text-5xl font-bold italic tracking-tighter text-slate-900 group-hover:text-primary transition-colors">{stat.value}</h3>
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest pt-2">{stat.label}</p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                   <TrendingUp className="w-3 h-3 text-success" />
                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">{stat.trend}</span>
                </div>
             </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-4">
        {/* Network Nodes */}
        <div className="lg:col-span-8 space-y-8">
           <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                 </div>
                 <h2 className="text-3xl font-bold italic tracking-tighter">Nodos de Red Recientes</h2>
              </div>
              <Button variant="ghost" onClick={() => navigate("/dev/organizations")} className="text-primary font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary/5 gap-3 h-12 px-8 rounded-2xl">
                 Gestionar Todo <ArrowRight className="w-4 h-4" />
              </Button>
           </div>

           <Card className="border-none shadow-sm bg-white rounded-[48px] overflow-hidden min-h-[400px] border border-slate-50">
              {organizations.length > 0 ? (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="border-b border-slate-50">
                             <th className="p-10 text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] pl-12">Organización</th>
                             <th className="p-10 text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Identificador</th>
                             <th className="p-10 text-right pr-12"><LayoutGrid className="w-4 h-4 text-slate-100 ml-auto" /></th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {organizations.map((org) => (
                            <tr key={org.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => navigate(`/dev/organizations`)}>
                               <td className="p-10 pl-12">
                                  <div className="flex items-center gap-6">
                                     <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-primary group-hover:text-white transition-all text-xl uppercase italic shadow-sm">
                                       {(org.nombre || "?")[0]}
                                     </div>
                                     <div className="space-y-1">
                                        <p className="font-bold text-slate-900 text-lg group-hover:text-primary transition-colors italic tracking-tight">{org.nombre || "Sin Nombre"}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{org.activo ? 'Node Active' : 'Suspended'}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="p-10">
                                  <span className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-mono font-bold text-slate-400 border border-slate-100">
                                    {org.slug || "no-id"}
                                  </span>
                               </td>
                               <td className="p-10 text-right pr-12">
                                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-300 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg shadow-primary/20 transition-all">
                                    <ChevronRight className="w-6 h-6" />
                                  </Button>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              ) : (
                 <div className="flex flex-col items-center justify-center min-h-[400px] p-20 opacity-20 italic font-bold">
                    <Inbox className="w-16 h-16 mb-8 text-slate-300" />
                    <p className="text-sm uppercase tracking-[0.3em]">Esperando despliegues...</p>
                 </div>
              )}
           </Card>
        </div>

        {/* System Status Sidebar */}
        <div className="lg:col-span-4 space-y-10">
           <div className="px-2">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-success" />
                 </div>
                 <h2 className="text-2xl font-bold italic tracking-tighter">Status Monitor</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                 {systemStatusItems.map((s, i) => (
                    <Card key={i} className="border-none shadow-sm bg-white p-6 rounded-[32px] flex items-center justify-between border border-slate-50 hover:border-primary/10 transition-all group">
                       <div className="flex items-center gap-5">
                          <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-primary/5 transition-colors">
                             <s.icon className={cn("w-6 h-6", s.color)} />
                          </div>
                          <span className="text-sm font-bold text-slate-800 italic tracking-tight uppercase group-hover:text-primary transition-colors">{s.name}</span>
                       </div>
                       <Badge variant="success" className="bg-success/5 text-success border-none text-[9px] font-black px-4 h-6 tracking-widest italic">
                          {s.status}
                       </Badge>
                    </Card>
                 ))}
              </div>
           </div>

           <Card className="border-none shadow-premium bg-slate-900 text-white rounded-[54px] overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-all duration-700 group-hover:scale-110">
                 <ShieldCheck size={200} />
              </div>
              <div className="p-12 space-y-12 relative z-10">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Infrastructure</p>
                    <h4 className="text-3xl font-bold italic tracking-tighter uppercase leading-none">Global Policy</h4>
                 </div>
                 <div className="space-y-6">
                    {[
                       { label: "Cifrado AES-256", icon: ShieldCheck },
                       { label: "Cumplimiento HIPAA", icon: RefreshCw },
                       { label: "Nodos Federados", icon: Monitor }
                    ].map((item, i) => (
                       <div key={i} className="flex items-center gap-5 p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                          <item.icon className="w-5 h-5 text-primary" />
                          <span className="text-xs font-bold text-slate-200 italic tracking-tight">{item.label}</span>
                       </div>
                    ))}
                 </div>
                 <div className="pt-10 border-t border-white/5 grid grid-cols-2 gap-8">
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Platform</p>
                       <p className="text-xl font-bold italic text-white tracking-tighter uppercase">{systemInfo?.platform || 'NODE'}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Kernel Version</p>
                       <p className="text-xl font-bold italic text-white tracking-tighter">v{systemInfo?.version || '1.0'}</p>
                    </div>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
