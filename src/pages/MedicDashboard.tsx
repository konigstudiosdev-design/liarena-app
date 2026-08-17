import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Activity,
  Search,
  FileText,
  Filter,
  ArrowRight,
  ClipboardList,
  Clock,
  HardDrive,
  Cloud,
  Loader2,
  ChevronRight,
  Eye,
  Trash2,
  Inbox,
  Stethoscope,
  LayoutDashboard,
  Calendar,
  Pencil
} from "lucide-react";
import { Card, Button, Badge, Avatar, Input, toast } from "../components/ui/index";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { pdfGenerator } from "../lib/pdf-generator";
import { profileService } from "../lib/profile-service";
import { useDoctor } from "../contexts/DoctorContext";

export default function MedicDashboard() {
  const navigate = useNavigate();
  const { doctor, syncDoctor } = useDoctor();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("patient") || "";
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [studies, setStudies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');

  useEffect(() => {
    fetchMyStudies();
  }, [activeTab]);

  async function fetchMyStudies() {
    setLoading(true);
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
          doctor:doctor_id(nombre, apellidos, role)
        `);

      if (activeTab === 'pending') {
        query = query.is('fecha_fin', null);
      }

      if (userData.role === 'doctor' || userData.role === 'medic') {
        query = query.eq('doctor_id', userData.id);
        syncDoctor(userData.id);
      } else if (userData.role === 'assistant') {
        query = query.eq('organization_id', userData.organization_id);
      } else if (userData.role !== 'dev') {
        query = query.eq('organization_id', userData.organization_id);
      }

      const { data, error } = await query
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudies(data || []);
    } catch (e: any) {
      console.error(e);
      toast.error("Error al cargar estudios");
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadReport = async (study: any) => {
    if (!study.fecha_fin) {
      toast.info("El reporte aún no ha sido finalizado.");
      return;
    }

    setDownloadingId(study.id);
    try {
      // 1. Obtener perfil completo del médico
      const doctorProfile = await profileService.getDoctorProfile(study.doctor_id);

      // 2. Recuperar hallazgos y fotos desde la auditoría (Snapshot inmutable)
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('detalles')
        .eq('study_id', study.id)
        .eq('accion', 'REPORT_SAVED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fallback: Si no hay auditData (estudios antiguos), inicializar snapshot vacío
      const snapshot = auditData ? JSON.parse(auditData.detalles) : { selected_media: [] };

      // 3. Parsear observaciones
      const obs = study.observaciones || "";
      const findings = obs.split('DIAGNÓSTICO:')[0]?.replace('HALLAZGOS:', '').trim() || "Sin observaciones registradas.";
      const diagnosis = obs.split('DIAGNÓSTICO:')[1]?.trim() || "Sin diagnóstico registrado.";

      // 4. Regenerar PDF con datos reales
      const doc = await pdfGenerator.generateStudyReport({
        patientName: `${study.patient?.nombre} ${study.patient?.apellidos}`,
        age: study.patient?.fecha_nacimiento ? calculateAge(study.patient.fecha_nacimiento) : "--",
        sexo: study.patient?.sexo || "--",
        birthDate: study.patient?.fecha_nacimiento,
        expediente: study.patient?.expediente,
        procedureType: study.tipo_estudio,
        studyId: study.id,
        report: { findings, diagnosis },
        doctorName: doctorProfile ? `${doctorProfile.nombre} ${doctorProfile.apellidos}` : `${study.doctor?.nombre} ${study.doctor?.apellidos}`,
        signature: doctorProfile?.firma,
        cedulaProf: doctorProfile?.cedula_profesional,
        cedulaEsp: doctorProfile?.cedula_especialidad,
        specialty: doctorProfile?.especialidad,
        orgLogo: doctorProfile?.organization?.logo
      }, snapshot.selected_media || []);

      doc.save(`Reporte_${study.patient?.nombre}_${study.patient?.apellidos}.pdf`);
      toast.success("Reporte generado correctamente");
    } catch (e: any) {
      console.error(e);
      toast.error("Error al recuperar el reporte: " + e.message);
    } finally {
      setDownloadingId(null);
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

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este registro de estudio?")) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('users').select('organization_id').eq('auth_user_id', user?.id).single();

      const { error } = await supabase
        .from('studies')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', profile?.organization_id);

      if (error) throw error;
      toast.success("Estudio removido");
      fetchMyStudies();
    } catch (e: any) {
      toast.error("Error: No tiene permisos para eliminar este registro.");
    }
  };

  const filteredStudies = (studies || []).filter(s => {
    const patientName = `${s?.patient?.nombre || ""} ${s?.patient?.apellidos || ""}`.toLowerCase();
    const type = (s?.tipo_estudio || "").toLowerCase();
    const exp = (s?.patient?.expediente || "").toLowerCase();
    const search = (searchQuery || "").toLowerCase();
    return patientName.includes(search) || type.includes(search) || exp.includes(search);
  });

  return (
    <div className="min-h-screen bg-[#FBFBFD] p-6 lg:p-10 font-sans animate-in fade-in duration-700">

      {/* HEADER */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-8 px-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-success/10 rounded-lg">
                <Stethoscope className="w-4 h-4 text-success" />
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Workstation Control</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 italic uppercase leading-none">Mis Estudios</h1>
        </div>

        <div className="flex items-center gap-4">
           <Button
            onClick={() => navigate("/procedure/setup")}
            className="h-16 px-12 rounded-[28px] bg-primary text-white font-black uppercase text-[12px] tracking-[0.2em] gap-4 shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
           >
             <Activity className="w-5 h-5" /> Nueva Captura
           </Button>
        </div>
      </header>

      {/* SEARCH CARD */}
      <Card className="border-none shadow-premium bg-white p-6 rounded-[40px] mb-8 border border-slate-50">
         <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="relative flex-1 group w-full">
               <Search className="absolute left-6 top-5 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-all duration-300" />
               <Input
                 placeholder="Localizar estudio por paciente o tipo de procedimiento..."
                 className="h-16 pl-16 bg-slate-50 border-none rounded-[28px] font-bold text-lg shadow-inner italic"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-[24px] shrink-0 shadow-inner">
               <button
                  onClick={() => setActiveTab('all')}
                  className={cn("px-8 h-12 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
               >
                  Todos
               </button>
               <button
                  onClick={() => setActiveTab('pending')}
                  className={cn("px-8 h-12 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'pending' ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600")}
               >
                  Pendientes {studies.filter(s => !s.fecha_fin).length > 0 && <span className="ml-2 w-2 h-2 bg-primary rounded-full animate-pulse inline-block" />}
               </button>
            </div>
         </div>
      </Card>

      {/* LIST SECTION */}
      <div className="space-y-4">
         {loading ? (
            <div className="py-32 text-center flex flex-col items-center gap-6 opacity-30 italic font-bold">
               <Loader2 className="w-12 h-12 animate-spin text-primary mb-2" />
               <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando registros clínicos...</p>
            </div>
         ) : filteredStudies.length > 0 ? (
            filteredStudies.map((study) => (
              <Card key={study.id} className="p-8 bg-white border-none rounded-[44px] shadow-sm flex items-center justify-between hover:translate-x-2 hover:shadow-xl transition-all duration-500 group border border-transparent hover:border-primary/10">
                <div className="flex items-center gap-10">
                  <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-slate-200 group-hover:bg-primary/5 group-hover:text-primary transition-all duration-500">
                    <FileText size={32} />
                  </div>

                  <div className="flex items-center gap-6">
                    <Avatar fallback={study.patient?.nombre?.[0] || "P"} className="h-14 w-14 text-lg bg-slate-50" />
                    <div>
                      <h4 className="font-bold text-slate-900 uppercase italic tracking-tight text-xl leading-none mb-3">
                        {study.patient?.nombre} {study.patient?.apellidos}
                      </h4>
                      <div className="flex items-center gap-4">
                         <Badge variant="primary" className="bg-slate-900 text-white border-none font-black text-[8px] uppercase tracking-widest h-6 px-4 rounded-lg">{study.tipo_estudio}</Badge>
                         <div className="flex items-center gap-2 text-slate-400 font-bold italic text-[11px]">
                           <Stethoscope className="w-3.5 h-3.5" />
                           <span>DR. {study.doctor ? `${study.doctor.nombre} ${study.doctor.apellidos}` : 'N/A'}</span>
                         </div>
                         <div className="flex items-center gap-2 text-slate-400 font-bold italic text-[11px]">
                           <Calendar className="w-3.5 h-3.5" />
                           <span>{new Date(study.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-10">
                  <div className="hidden md:flex flex-col items-end">
                     <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Estado de Reporte</span>
                     <Badge
                        variant={study.fecha_fin ? "success" : (study.observaciones ? "warning" : "primary")}
                        className="h-7 px-5 uppercase text-[8px] font-black border-none tracking-widest rounded-xl"
                     >
                       {study.fecha_fin ? "Completado" : (study.observaciones ? "Redacción" : "En Captura")}
                     </Badge>
                  </div>

                  <div className="flex gap-2">
                     {!study.fecha_fin ? (
                        <Button
                          onClick={() => {
                            localStorage.setItem('liarena_active_procedure', JSON.stringify({
                              studyId: study.id,
                              patientId: study.patient_id,
                              nombre: study.patient?.nombre,
                              apellidos: study.patient?.apellidos,
                              patientName: `${study.patient?.nombre} ${study.patient?.apellidos}`,
                              birthDate: study.patient?.fecha_nacimiento,
                              sexo: study.patient?.sexo,
                              procedureType: study.tipo_estudio,
                              doctorId: study.doctor_id,
                              timestamp: study.created_at
                            }));
                            navigate("/procedure/finish");
                          }}
                          className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-500/20 gap-2 animate-pulse"
                        >
                          <Pencil size={14} /> Continuar Reporte
                        </Button>
                     ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={downloadingId === study.id}
                          className="h-12 w-12 rounded-2xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
                          onClick={() => handleDownloadReport(study)}
                        >
                           {downloadingId === study.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-6 h-6" />}
                        </Button>
                     )}

                     <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl text-slate-200 hover:text-danger hover:bg-danger/5 transition-all" onClick={() => handleDelete(study.id)}><Trash2 className="w-5 h-5" /></Button>
                     <div className="w-[1px] h-8 bg-slate-50 mx-2" />
                     <Button
                       variant="ghost"
                       size="icon"
                       disabled={!study.fecha_fin || downloadingId === study.id}
                       className={cn(
                          "h-12 w-12 rounded-2xl transition-all shadow-sm",
                          study.fecha_fin ? "bg-slate-50 text-slate-900 group-hover:bg-primary group-hover:text-white" : "bg-slate-50/50 text-slate-200"
                       )}
                       onClick={() => handleDownloadReport(study)}
                     >
                        <ChevronRight className="w-6 h-6" />
                     </Button>
                  </div>
                </div>
              </Card>
            ))
         ) : (
            <div className="py-40 bg-white rounded-[60px] border-2 border-dashed border-slate-50 flex flex-col items-center justify-center text-center space-y-8 shadow-sm opacity-30 italic">
               <div className="w-32 h-32 bg-slate-50 rounded-[48px] flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-16 h-16 text-slate-200" />
               </div>
               <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-slate-800 tracking-tighter uppercase italic">Sin estudios previos</h3>
                  <p className="text-sm font-bold uppercase tracking-[0.2em]">Capture su primer procedimiento para comenzar</p>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
