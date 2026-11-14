import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle2,
  Activity,
  Search,
  Filter,
  Eye,
  Download,
  Edit3,
  Loader2,
  Calendar,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  History,
  FileCheck,
  Inbox,
  AlertCircle,
  RefreshCw,
  X,
  User,
  Building2,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Card, Button, Badge, Avatar, Input, toast } from "../../components/ui/index";
import { supabase } from "../../lib/supabase";
import { formatDoctorName, cn } from "../../lib/utils";
import { pdfGenerator } from "../../lib/pdf-generator";
import { profileService } from "../../lib/profile-service";
import { wizardService } from "../../lib/wizard-service";

interface DocumentPortalProps {
  defaultTab?: 'dashboard' | 'all' | 'pending' | 'completed';
}

export default function DocumentPortal({ defaultTab = 'dashboard' }: DocumentPortalProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientFilter = searchParams.get("patient") || "";

  const [activeTab, setActiveTab] = useState<'dashboard' | 'all' | 'pending' | 'completed'>(defaultTab);
  const [searchQuery, setSearchQuery] = useState(patientFilter);
  const [studies, setStudies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedAuditStudy, setSelectedAuditStudy] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const orgId = localStorage.getItem('liarena_org_id');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    fetchStudies();

    // Realtime subscription for shared Desktop <-> Web sync
    if (orgId) {
      const channel = supabase
        .channel('web-document-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'studies', filter: `organization_id=eq.${orgId}` }, () => {
          fetchStudies(false);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
          fetchStudies(false);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [orgId]);

  async function fetchStudies(showLoading = true) {
    if (showLoading && studies.length === 0) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id, role, organization_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) return;

      let query = supabase
        .from('studies')
        .select(`
          *,
          patient:patient_id(*),
          doctor:doctor_id(nombre, apellidos, role, doctor_profiles(*))
        `)
        .is('deleted_at', null);

      // Multi-tenant & Role filtering
      if (userData.role === 'doctor' || userData.role === 'medic') {
        query = query.eq('doctor_id', userData.id);
      } else if (userData.role !== 'dev') {
        query = query.eq('organization_id', userData.organization_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setStudies(data || []);
    } catch (e: any) {
      console.error("DocumentPortal fetch error:", e);
      toast.error("Error al sincronizar portal documental");
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadPDF = async (study: any) => {
    setDownloadingId(study.id);
    try {
      // Register Audit Log
      await wizardService.logAudit(study.id, 'DOCUMENT_DOWNLOADED', `PDF descargado desde Portal Web`);

      const doctorProfile = await profileService.getDoctorProfile(study.doctor_id);

      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('detalles')
        .eq('study_id', study.id)
        .eq('accion', 'REPORT_SAVED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const snapshot = auditData ? JSON.parse(auditData.detalles) : { selected_media: [] };

      const obs = study.observaciones || "";
      const findings = obs.split('DIAGNÓSTICO:')[0]?.replace('HALLAZGOS:', '').trim() || "Sin observaciones registradas.";
      const diagnosis = obs.split('DIAGNÓSTICO:')[1]?.trim() || "Sin diagnóstico registrado.";

      const doc = await pdfGenerator.generateStudyReport({
        patientName: `${study.patient?.nombre || ''} ${study.patient?.apellidos || ''}`.trim() || "PACIENTE",
        age: study.patient?.fecha_nacimiento ? calculateAge(study.patient.fecha_nacimiento) : "--",
        sexo: study.patient?.sexo || "--",
        birthDate: study.patient?.fecha_nacimiento,
        expediente: study.patient?.expediente,
        procedureType: study.tipo_estudio,
        studyId: study.id,
        report: { findings, diagnosis },
        doctorName: doctorProfile ? formatDoctorName(doctorProfile) : formatDoctorName(study.doctor),
        doctor: doctorProfile || study.doctor,
        signature: doctorProfile?.firma,
        cedulaProf: doctorProfile?.cedula_profesional,
        cedulaEsp: doctorProfile?.cedula_especialidad,
        specialty: doctorProfile?.especialidad,
        orgLogo: doctorProfile?.organization?.logo
      }, snapshot.selected_media || []);

      doc.save(`Reporte_${study.patient?.nombre || 'Estudio'}_${study.patient?.apellidos || ''}.pdf`);
      toast.success("Descarga de reporte generada");
    } catch (e: any) {
      console.error(e);
      toast.error("Error al generar PDF: " + e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const openAuditHistory = async (study: any) => {
    setSelectedAuditStudy(study);
    setLoadingAudit(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, user:user_id(nombre, apellidos, role)')
        .eq('study_id', study.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (e: any) {
      console.error(e);
      toast.error("Error al cargar historial de auditoría");
    } finally {
      setLoadingAudit(false);
    }
  };

  const calculateAge = (dateString: string) => {
    if (!dateString) return "--";
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return `${age} años`;
  };

  // Filtered studies
  const pendingStudies = studies.filter(s => !s.fecha_fin);
  const completedStudies = studies.filter(s => !!s.fecha_fin);

  const filteredList = studies.filter(s => {
    const isPending = !s.fecha_fin;
    const isCompleted = !!s.fecha_fin;

    if (activeTab === 'pending' && !isPending) return false;
    if (activeTab === 'completed' && !isCompleted) return false;

    const search = searchQuery.toLowerCase();
    const patientName = `${s.patient?.nombre || ''} ${s.patient?.apellidos || ''}`.toLowerCase();
    const doctorName = formatDoctorName(s.doctor).toLowerCase();
    const type = (s.tipo_estudio || '').toLowerCase();
    const exp = (s.patient?.expediente || '').toLowerCase();

    return patientName.includes(search) || doctorName.includes(search) || type.includes(search) || exp.includes(search);
  });

  return (
    <div className="min-h-screen bg-[#FBFBFD] p-4 sm:p-6 lg:p-10 font-sans animate-in fade-in duration-700">

      {/* HEADER PRINCIPAL */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 sm:mb-12 gap-6 px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-xl">
                <FileCheck className="w-5 h-5 text-primary" />
             </div>
             <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Liarena Web Document Portal</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 italic uppercase leading-none">
            {activeTab === 'dashboard' && 'Panel Documental'}
            {activeTab === 'all' && 'Mis Documentos'}
            {activeTab === 'pending' && 'Documentos Pendientes'}
            {activeTab === 'completed' && 'Documentos Finalizados'}
          </h1>
        </div>

        {/* NAVEGACIÓN Y REFRESH */}
        <div className="flex flex-wrap items-center gap-3">
           <Button
             variant="outline"
             onClick={() => fetchStudies(true)}
             className="h-12 px-5 rounded-2xl border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest gap-2 bg-white shadow-sm hover:bg-slate-50"
           >
             <RefreshCw className="w-4 h-4 text-slate-400" /> Sincronizar
           </Button>

           {pendingStudies.length > 0 && (
             <Button
               onClick={() => navigate(`/documents/editor/${pendingStudies[0].id}`)}
               className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-amber-500/20"
             >
               <Edit3 className="w-4 h-4" /> Redactar Pendiente ({pendingStudies.length})
             </Button>
           )}
        </div>
      </header>

      {/* CARDS DE MÉTRICAS (DASHBOARD) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <Card
          onClick={() => setActiveTab('all')}
          className={cn(
            "p-6 border-none bg-white rounded-[32px] shadow-sm flex items-center gap-6 cursor-pointer hover:shadow-md transition-all group border border-transparent",
            activeTab === 'all' && "ring-2 ring-primary/20 bg-primary/[0.01]"
          )}
        >
          <div className="w-14 h-14 bg-slate-900 rounded-[22px] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Total Documentos</p>
            <h3 className="text-3xl font-black italic text-slate-900 tracking-tighter leading-none">{studies.length}</h3>
          </div>
        </Card>

        <Card
          onClick={() => setActiveTab('pending')}
          className={cn(
            "p-6 border-none bg-white rounded-[32px] shadow-sm flex items-center gap-6 cursor-pointer hover:shadow-md transition-all group border border-transparent",
            activeTab === 'pending' && "ring-2 ring-amber-500/20 bg-amber-500/[0.01]"
          )}
        >
          <div className="w-14 h-14 bg-amber-50 rounded-[22px] flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-105 transition-transform">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Pendientes Redacción</p>
            <h3 className="text-3xl font-black italic text-amber-600 tracking-tighter leading-none">{pendingStudies.length}</h3>
          </div>
        </Card>

        <Card
          onClick={() => setActiveTab('completed')}
          className={cn(
            "p-6 border-none bg-white rounded-[32px] shadow-sm flex items-center gap-6 cursor-pointer hover:shadow-md transition-all group border border-transparent",
            activeTab === 'completed' && "ring-2 ring-emerald-500/20 bg-emerald-500/[0.01]"
          )}
        >
          <div className="w-14 h-14 bg-emerald-50 rounded-[22px] flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-105 transition-transform">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Finalizados</p>
            <h3 className="text-3xl font-black italic text-emerald-600 tracking-tighter leading-none">{completedStudies.length}</h3>
          </div>
        </Card>

        <Card className="p-6 border-none bg-white rounded-[32px] shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 bg-primary/10 rounded-[22px] flex items-center justify-center text-primary shadow-sm">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Sincronización</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase text-slate-800 tracking-tight">Desktop Live</span>
            </div>
          </div>
        </Card>
      </div>

      {/* CONTROLES DE PESTAÑAS Y BÚSQUEDA */}
      <Card className="border-none shadow-sm bg-white p-4 sm:p-6 rounded-[36px] mb-8">
         <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 group w-full">
               <Search className="absolute left-5 top-4 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-all duration-300" />
               <Input
                 placeholder="Buscar por paciente, expediente, estudio o médico..."
                 className="h-14 pl-14 bg-slate-50 border-none rounded-[22px] font-bold text-base shadow-inner italic"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>

            <div className="flex bg-slate-100 p-1.5 rounded-[22px] w-full md:w-auto shrink-0 overflow-x-auto custom-scrollbar">
               {[
                 { id: 'dashboard', label: 'Dashboard' },
                 { id: 'all', label: 'Todos' },
                 { id: 'pending', label: `Pendientes (${pendingStudies.length})` },
                 { id: 'completed', label: `Completados (${completedStudies.length})` },
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={cn(
                     "px-6 h-11 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                     activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                   )}
                 >
                   {tab.label}
                 </button>
               ))}
            </div>
         </div>
      </Card>

      {/* SECCIÓN VISTA SEGÚN PESTAÑA */}
      {activeTab === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* DOCUMENTOS PENDIENTES DE REDACCIÓN */}
           <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between px-4">
                 <h3 className="text-xl font-bold italic uppercase tracking-tighter text-slate-800 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-500" /> Documentos Pendientes de Completar
                 </h3>
                 <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{pendingStudies.length} requiriendo acción</span>
              </div>

              <div className="space-y-4">
                 {loading ? (
                   <div className="py-20 text-center flex flex-col items-center justify-center opacity-30 italic font-bold">
                     <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                     <p className="text-[10px] font-black uppercase tracking-widest">Cargando expediente documental...</p>
                   </div>
                 ) : pendingStudies.length > 0 ? (
                   pendingStudies.slice(0, 5).map(study => (
                     <Card key={study.id} className="p-6 bg-white border-none rounded-[36px] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:shadow-md transition-all group border border-transparent hover:border-amber-500/20">
                       <div className="flex items-center gap-6">
                         <Avatar fallback={study.patient?.nombre?.[0] || "P"} className="h-14 w-14 text-lg bg-amber-50 ring-2 ring-amber-100" />
                         <div>
                           <div className="flex items-center gap-3 mb-1">
                             <h4 className="font-bold text-slate-900 uppercase italic tracking-tight text-lg leading-none">
                               {study.patient?.nombre} {study.patient?.apellidos}
                             </h4>
                             <Badge variant="warning" className="bg-amber-50 text-amber-600 border-none font-black text-[8px] uppercase tracking-widest px-3 h-5">BORRADOR</Badge>
                           </div>
                           <div className="flex flex-wrap items-center gap-4 text-slate-400 font-bold italic text-[11px]">
                             <Badge variant="primary" className="bg-slate-900 text-white border-none font-black text-[8px] uppercase tracking-widest px-3 h-5 rounded-md">{study.tipo_estudio}</Badge>
                             <span className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> {formatDoctorName(study.doctor)}</span>
                             <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(study.created_at).toLocaleDateString('es-MX')}</span>
                           </div>
                         </div>
                       </div>

                       <div className="flex items-center gap-3 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <Button
                            onClick={() => navigate(`/documents/editor/${study.id}`)}
                            className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-md shadow-amber-500/20 w-full sm:w-auto"
                          >
                            <Edit3 size={14} /> Redactar / Completar
                          </Button>
                       </div>
                     </Card>
                   ))
                 ) : (
                   <Card className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 space-y-4 opacity-40">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                      <h4 className="text-xl font-bold uppercase italic text-slate-800">Cero Documentos Pendientes</h4>
                      <p className="text-xs uppercase tracking-widest">Todos los informes clínicos han sido finalizados</p>
                   </Card>
                 )}
              </div>
           </div>

           {/* RESUMEN Y ACTIVIDAD RECIENTE */}
           <div className="lg:col-span-4 space-y-6">
              <div className="px-2">
                 <h3 className="text-xl font-bold italic uppercase tracking-tighter text-slate-800 flex items-center gap-3">
                    <Activity className="w-5 h-5 text-primary" /> Actividad Reciente
                 </h3>
              </div>

              <Card className="p-6 bg-white border-none rounded-[40px] shadow-sm space-y-6">
                 {completedStudies.slice(0, 5).map(study => (
                   <div key={study.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                      <div className="space-y-1 min-w-0 pr-2">
                         <p className="text-sm font-bold text-slate-900 uppercase italic truncate">{study.patient?.nombre} {study.patient?.apellidos}</p>
                         <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest italic">{study.tipo_estudio} • FINALIZADO</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadPDF(study)}
                        disabled={downloadingId === study.id}
                        className="h-10 w-10 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 shrink-0"
                      >
                         {downloadingId === study.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={18} />}
                      </Button>
                   </div>
                 ))}
                 {completedStudies.length === 0 && (
                   <div className="py-12 text-center text-slate-300 italic font-bold text-xs uppercase">Sin documentos finalizados aún</div>
                 )}
              </Card>
           </div>
        </div>
      ) : (
        /* LISTADO DE DOCUMENTOS (MIS DOCUMENTOS / PENDIENTES / COMPLETADOS) */
        <div className="space-y-4">
           {loading ? (
             <div className="py-32 text-center flex flex-col items-center justify-center opacity-30 italic font-bold">
               <Loader2 className="w-12 h-12 animate-spin text-primary mb-3" />
               <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando registros documentales...</p>
             </div>
           ) : filteredList.length > 0 ? (
             filteredList.map((study) => {
               const isFinalized = !!study.fecha_fin;
               return (
                 <Card key={study.id} className="p-6 sm:p-8 bg-white border-none rounded-[40px] shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:shadow-md transition-all group border border-transparent hover:border-primary/10">
                   <div className="flex items-center gap-6 min-w-0">
                     <Avatar fallback={study.patient?.nombre?.[0] || "P"} className="h-16 w-16 text-xl bg-slate-50 ring-2 ring-slate-100 shrink-0" />
                     <div className="min-w-0 space-y-2">
                       <div className="flex flex-wrap items-center gap-3">
                         <h4 className="font-bold text-slate-900 uppercase italic tracking-tight text-xl leading-none truncate">
                           {study.patient?.nombre} {study.patient?.apellidos}
                         </h4>
                         <Badge
                           variant={isFinalized ? "success" : "warning"}
                           className={cn(
                             "border-none font-black text-[8px] uppercase tracking-widest px-3 h-5",
                             isFinalized ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                           )}
                         >
                           {isFinalized ? "FINALIZADO" : "BORRADOR / PENDIENTE"}
                         </Badge>
                       </div>

                       <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-400 font-bold italic text-[11px]">
                         <Badge variant="primary" className="bg-slate-900 text-white border-none font-black text-[8px] uppercase tracking-widest px-3 h-5 rounded-md">{study.tipo_estudio}</Badge>
                         <span className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> {formatDoctorName(study.doctor)}</span>
                         <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(study.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                         {study.patient?.expediente && <span className="text-slate-300 font-mono">{study.patient.expediente}</span>}
                       </div>
                     </div>
                   </div>

                   {/* ACCIONES DOCUMENTALES */}
                   <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                     <Button
                       variant="ghost"
                       onClick={() => openAuditHistory(study)}
                       className="h-12 px-4 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 font-black uppercase text-[10px] tracking-widest gap-2"
                       title="Historial de Auditoría"
                     >
                       <History size={16} /> Auditoría
                     </Button>

                     {!isFinalized ? (
                       <Button
                         onClick={() => navigate(`/documents/editor/${study.id}`)}
                         className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] tracking-widest shadow-md shadow-amber-500/20 gap-2"
                       >
                         <Edit3 size={16} /> Completar Reporte
                       </Button>
                     ) : (
                       <Button
                         onClick={() => navigate(`/documents/editor/${study.id}`)}
                         variant="outline"
                         className="h-12 px-5 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest gap-2"
                       >
                         <Eye size={16} /> Ver Documento
                       </Button>
                     )}

                     <Button
                       disabled={downloadingId === study.id}
                       onClick={() => handleDownloadPDF(study)}
                       className={cn(
                         "h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-md transition-all",
                         isFinalized ? "bg-slate-900 text-white hover:bg-primary shadow-slate-900/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                       )}
                     >
                       {downloadingId === study.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={16} />}
                       <span>Descargar PDF</span>
                     </Button>
                   </div>
                 </Card>
               );
             })
           ) : (
             <Card className="py-32 bg-white rounded-[50px] border-2 border-dashed border-slate-100 text-center opacity-30 italic font-bold space-y-4">
                <Inbox className="w-16 h-16 text-slate-300 mx-auto" />
                <h3 className="text-2xl text-slate-800 uppercase tracking-tighter">Sin registros documentales</h3>
                <p className="text-xs font-bold uppercase tracking-[0.2em]">No se han localizado documentos clínicos con los filtros aplicados</p>
             </Card>
           )}
        </div>
      )}

      {/* MODAL DE HISTORIAL DE AUDITORÍA DE VERSIONES */}
      {selectedAuditStudy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setSelectedAuditStudy(null)} />
           <Card className="w-full max-w-2xl bg-white shadow-2xl relative z-10 animate-in zoom-in duration-300 rounded-[44px] overflow-hidden border-none flex flex-col max-h-[85vh]">
              <div className="p-8 bg-slate-900 text-white flex items-center justify-between shrink-0">
                 <div className="space-y-1">
                    <h3 className="text-2xl font-bold italic uppercase tracking-tighter">Historial de Auditoría & Versiones</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      {selectedAuditStudy.patient?.nombre} {selectedAuditStudy.patient?.apellidos} • {selectedAuditStudy.tipo_estudio}
                    </p>
                 </div>
                 <button onClick={() => setSelectedAuditStudy(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"><X size={20} /></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                 {loadingAudit ? (
                   <div className="py-20 text-center flex flex-col items-center justify-center opacity-30 italic font-bold">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Cargando trazabilidad documental...</p>
                   </div>
                 ) : auditLogs.length > 0 ? (
                   auditLogs.map((log) => (
                     <div key={log.id} className="p-5 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                        <div className="flex items-center justify-between">
                           <Badge variant="primary" className="bg-slate-900 text-white border-none text-[8px] font-black uppercase tracking-widest px-3 h-5">
                             {log.accion}
                           </Badge>
                           <span className="text-[10px] font-bold text-slate-400 italic">
                             {new Date(log.created_at).toLocaleString('es-MX')}
                           </span>
                        </div>
                        <p className="text-xs font-medium text-slate-700 italic">
                           Usuario: {log.user ? `${log.user.nombre || ''} ${log.user.apellidos || ''}` : 'Sistema / Auto-Sync'}
                        </p>
                     </div>
                   ))
                 ) : (
                   <p className="py-12 text-center text-slate-400 italic text-xs">Sin registros de cambios guardados para este folio.</p>
                 )}
              </div>
           </Card>
        </div>
      )}
    </div>
  );
}
