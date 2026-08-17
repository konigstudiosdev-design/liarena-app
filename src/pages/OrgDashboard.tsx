import React, { useState, useEffect } from "react";
import {
  Building2,
  Users,
  Activity,
  Plus,
  RefreshCw,
  Inbox,
  ChevronRight,
  Monitor,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  HardDrive,
  Cloud,
  Trash2,
  AlertTriangle,
  X
} from "lucide-react";
import { Card, Button, Badge, Avatar, toast, Input } from "../components/ui/index";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { googleDriveService } from "../lib/google-drive-service";

export default function OrgDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState<any>(null);
  const [recentStudies, setRecentStudies] = useState<any[]>([]);
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [stats, setStats] = useState({
    staffCount: 0,
    studiesCount: 0,
    activeRooms: 0
  });

  const orgId = localStorage.getItem('liarena_org_id');

  useEffect(() => {
    if (orgId) {
      fetchDashboardData();
      checkDriveStatus();

      // LIARENA REALTIME DASHBOARD: Sincronización automática de métricas
      const channel = supabase
        .channel('dashboard-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `organization_id=eq.${orgId}` }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'studies', filter: `organization_id=eq.${orgId}` }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `organization_id=eq.${orgId}` }, () => fetchDashboardData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setLoading(false);
    }
  }, [orgId]);

  async function checkDriveStatus() {
    try {
      const status = await googleDriveService.validateConnection();
      if (status.connected && status.folderId !== "None") {
        setDriveFolderId(status.folderId);
      }
    } catch (e) {}
  }

  async function openLocalStorage() {
    if ((window as any).ipcRenderer) {
      await (window as any).ipcRenderer.invoke('open-local-folder');
    } else {
      toast.error("Acceso local solo disponible en la App de Escritorio");
    }
  }

  async function openCloudStorage() {
    if (driveFolderId) {
      window.open(`https://drive.google.com/drive/folders/${driveFolderId}`, '_blank');
    } else {
      toast.error("Google Drive no vinculado o carpeta no localizada.");
    }
  }

  async function handleDeleteAllStudies() {
    const entered = deleteConfirmationText.trim().toLowerCase();
    const actual = orgData?.nombre?.trim().toLowerCase();

    if (entered !== actual) {
      toast.error("El nombre de la organización no coincide.");
      return;
    }

    setLoading(true);
    try {
      // 1. Log de auditoría antes de borrar (Seguridad)
      console.log(`🗑️ LIARENA: Iniciando eliminación masiva para ${actual}`);

      const { error } = await supabase
        .from('studies')
        .delete()
        .eq('organization_id', orgId);

      if (error) throw error;

      toast.success("Historial de procedimientos eliminado.");
      setShowDeleteModal(false);
      setDeleteConfirmationText("");
      fetchDashboardData();
    } catch (e: any) {
      console.error("Delete all error:", e);
      toast.error("Fallo al eliminar: " + (e.message || "Error RLS"));
    } finally {
      setLoading(false);
    }
  }

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const orgRes = await supabase.from('organizations').select('id, nombre, logo').eq('id', orgId).maybeSingle();

      const [staffRes, studiesRes, roomsRes, recentRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('role', 'doctor'),
        supabase.from('studies').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('activa', true),
        supabase.from('studies').select(`
          *,
          patient:patient_id(nombre, apellidos),
          doctor:doctor_id(nombre, apellidos)
        `).eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5)
      ]);

      setOrgData(orgRes.data);
      setRecentStudies(recentRes.data || []);
      setStats({
        staffCount: staffRes.count || 0,
        studiesCount: studiesRes.count || 0,
        activeRooms: roomsRes.count || 0
      });

      // Trigger subtle real-time update animation
      if (!loading) {
        setIsUpdating(true);
        setTimeout(() => setIsUpdating(false), 2000);
      }
    } catch (e) {
      console.error("Dashboard error:", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-20 min-h-[500px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-700">
      {/* Dynamic Header */}
      <div className="flex items-end justify-between px-2">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             {orgData?.logo && (
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 p-2 shadow-sm flex items-center justify-center overflow-hidden">
                   <img src={orgData.logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
             )}
             <Badge variant="primary" className="bg-slate-900 text-white border-none px-4 h-6 tracking-[0.2em] font-black italic uppercase">
                {orgData?.nombre || "Nodo Principal"}
             </Badge>
          </div>
          <h1 className="text-6xl font-bold tracking-tighter text-slate-900 italic uppercase">Dashboard</h1>
        </div>
        <div className="flex gap-4">
           <Button
            variant="outline"
            onClick={openLocalStorage}
            className="rounded-2xl bg-white border-slate-100 h-16 px-8 font-black text-[10px] uppercase tracking-widest gap-3 shadow-sm hover:bg-slate-50 transition-all"
           >
             <HardDrive className="w-5 h-5 text-slate-400" /> Almacenamiento Local
           </Button>

           <Button
            variant="outline"
            onClick={openCloudStorage}
            className="rounded-2xl bg-white border-slate-100 h-16 px-8 font-black text-[10px] uppercase tracking-widest gap-3 shadow-sm hover:bg-slate-50 transition-all"
           >
             <Cloud className="w-5 h-5 text-blue-500" /> Google Drive
           </Button>

           <Button
            variant="ghost"
            onClick={() => setShowDeleteModal(true)}
            className="rounded-2xl h-16 px-6 font-black text-[10px] uppercase tracking-widest gap-3 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
            title="Eliminar todo el historial"
           >
             <Trash2 className="w-5 h-5" />
           </Button>

           <Button onClick={() => navigate("/org/staff")} className="rounded-[28px] shadow-2xl shadow-primary/20 h-16 px-10 font-black text-[11px] uppercase tracking-widest gap-4 group">
             <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Registrar Staff
           </Button>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <Card className="w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden border-none p-10 space-y-8 animate-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center space-y-4">
                 <div className="w-20 h-20 bg-red-50 rounded-[32px] flex items-center justify-center text-red-600 shadow-inner">
                    <AlertTriangle size={40} />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Eliminación Masiva</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                       Esta acción borrará permanentemente **TODOS** los procedimientos de su organización. No hay marcha atrás.
                    </p>
                 </div>
              </div>

              <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Para confirmar escriba el nombre de la sede:</p>
                 <p className="text-xs font-bold text-slate-900 text-center uppercase tracking-tight italic">{orgData?.nombre}</p>
                 <Input
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="Escriba el nombre aquí..."
                    className="h-14 bg-white border-slate-200 rounded-2xl text-center font-bold uppercase italic"
                 />
              </div>

              <div className="flex gap-4">
                 <Button
                    variant="ghost"
                    onClick={() => { setShowDeleteModal(false); setDeleteConfirmationText(""); }}
                    className="flex-1 h-16 rounded-[24px] text-slate-400 font-black uppercase text-[11px] tracking-widest"
                 >
                    Cancelar
                 </Button>
                 <Button
                    onClick={handleDeleteAllStudies}
                    disabled={(deleteConfirmationText.trim().toLowerCase() !== orgData?.nombre?.trim().toLowerCase()) || loading}
                    className="flex-[1.5] h-16 rounded-[24px] bg-red-600 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-red-200 disabled:opacity-30 disabled:grayscale transition-all"
                 >
                    {loading ? <RefreshCw className="animate-spin" /> : "Confirmar Borrado"}
                 </Button>
              </div>
           </Card>
        </div>
      )}

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: "Staff Médico", value: stats.staffCount, icon: Users, bg: "bg-blue-500" },
          { label: "Procedimientos", value: stats.studiesCount, icon: Activity, bg: "bg-emerald-500" },
          { label: "Salas Activas", value: stats.activeRooms, icon: Monitor, bg: "bg-slate-900" },
        ].map((stat, i) => (
          <Card key={i} className={cn(
             "border-none shadow-premium bg-white rounded-[48px] p-12 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500",
             isUpdating && "ring-2 ring-primary/20 bg-primary/[0.01]"
          )}>
             <div className="relative z-10 flex flex-col gap-8">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", stat.bg)}>
                   <stat.icon className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-6xl font-black italic tracking-tighter text-slate-900">{stat.value}</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">{stat.label}</p>
                </div>
             </div>
             <ArrowUpRight className="absolute top-10 right-10 w-6 h-6 text-slate-100 group-hover:text-primary transition-colors" />
          </Card>
        ))}
      </div>

      {/* Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-6">
           <div className="flex items-center justify-between px-6">
              <h3 className="text-xl font-bold italic uppercase tracking-widest text-slate-800 flex items-center gap-3">
                 <Clock className="w-5 h-5 text-primary" /> Actividad Reciente
              </h3>
           </div>

           <Card className="border-none shadow-sm bg-white rounded-[54px] overflow-hidden border border-slate-50 min-h-[440px]">
              {recentStudies.length > 0 ? (
                 <div className="divide-y divide-slate-50">
                    {recentStudies.map((study) => (
                       <div key={study.id} className="p-8 flex items-center justify-between transition-all">
                          <div className="flex items-center gap-8 flex-1">
                             <div className="w-14 h-14 rounded-[22px] bg-slate-50 flex items-center justify-center text-slate-300 shadow-inner shrink-0">
                                <Activity className="w-6 h-6" />
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-4 gap-8 flex-1 items-center">
                                {/* Paciente */}
                                <div className="space-y-1">
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Paciente</p>
                                   <h4 className="text-base font-bold text-slate-900 uppercase italic tracking-tight truncate">
                                      {study.patient?.nombre} {study.patient?.apellidos}
                                   </h4>
                                </div>

                                {/* Procedimiento */}
                                <div className="space-y-1">
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Estudio</p>
                                   <Badge variant="neutral" className="bg-slate-100 text-slate-600 border-none font-black text-[9px] tracking-widest uppercase truncate">
                                      {study.tipo_estudio}
                                   </Badge>
                                </div>

                                {/* Doctor */}
                                <div className="space-y-1">
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Especialista</p>
                                   <p className="text-sm font-bold text-slate-700 uppercase italic truncate">
                                      {study.doctor?.nombre
                                        ? `DR. ${study.doctor.nombre} ${study.doctor.apellidos || ''}`
                                        : 'SIN ASIGNAR'}
                                   </p>
                                </div>

                                {/* Fecha */}
                                <div className="space-y-1 text-right md:text-left">
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Fecha de Realización</p>
                                   <p className="text-sm font-bold text-primary italic">
                                      {new Date(study.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                                   </p>
                                </div>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              ) : (
                 <div className="flex flex-col items-center justify-center p-32 opacity-20 italic font-black text-center space-y-6">
                    <Inbox className="w-16 h-16 text-slate-300" />
                    <p className="text-sm uppercase tracking-[0.3em]">Nodo sin registros activos</p>
                 </div>
              )}
           </Card>
        </div>

        {/* Global Security Node */}
        <div className="lg:col-span-4 space-y-10">
           <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[54px] p-12 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-all duration-700">
                 <ShieldCheck size={240} />
              </div>
              <div className="space-y-12 relative z-10">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Infrastructure</p>
                    <h4 className="text-3xl font-bold italic tracking-tighter uppercase leading-none">Security Node</h4>
                 </div>
                 <div className="space-y-6">
                    {[
                       { label: "Encriptación SSL/TLS", icon: ShieldCheck },
                       { label: "Cumplimiento HIPAA", icon: RefreshCw },
                       { label: "Backups Redundantes", icon: Monitor }
                    ].map((item, i) => (
                       <div key={i} className="flex items-center gap-5 p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                          <item.icon className="w-5 h-5 text-primary" />
                          <span className="text-xs font-bold text-slate-200 italic tracking-tight">{item.label}</span>
                       </div>
                    ))}
                 </div>
                 <div className="pt-4">
                    <Button variant="outline" onClick={() => navigate("/org/settings")} className="w-full h-14 rounded-2xl border-white/10 text-white hover:bg-white/5 font-black text-[10px] uppercase tracking-widest">
                       Ver Configuración de Seguridad
                    </Button>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
