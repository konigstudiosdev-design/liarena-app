import React, { useState, useEffect } from "react";
import {
  Activity,
  Plus,
  Clock,
  Loader2,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  Calendar,
  Search,
  LayoutDashboard,
  Users,
  Files,
  Inbox,
  ArrowRight,
  Stethoscope,
  FileDown
} from "lucide-react";
import { Card, Button, Badge, Avatar, Input, toast } from "../components/ui/index";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { pdfGenerator } from "../lib/pdf-generator";
import { profileService } from "../lib/profile-service";
import { cn } from "../lib/utils";

export default function AssistantDashboard() {
  const navigate = useNavigate();
  const [studies, setStudies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const orgId = localStorage.getItem('liarena_org_id');

  useEffect(() => {
    if (orgId) {
        fetchDashboardData();
        fetchOrgInfo();
    }
  }, [orgId]);

  async function fetchOrgInfo() {
    const { data } = await supabase.from('organizations').select('nombre, logo').eq('id', orgId).single();
    if (data) setOrgData(data);
  }

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Sesión no válida");

      const { data: userProfile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', authUser.id)
        .single();

      const { data, error } = await supabase
        .from('studies')
        .select(`
          *,
          patient:patient_id(*),
          doctor:doctor_id(nombre, apellidos, role)
        `)
        .eq('organization_id', userProfile?.organization_id)
        .is('deleted_at', null)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudies(data || []);
    } catch (e: any) {
      console.error(e);
      toast.error("Error al sincronizar actividad");
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
      const findings = obs.split('DIAGNÓSTICO:')[0]?.replace('HALLAZGOS:', '').trim() || "Sin observaciones.";
      const diagnosis = obs.split('DIAGNÓSTICO:')[1]?.trim() || "Sin diagnóstico.";

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
      toast.success("Descarga iniciada");
    } catch (e: any) {
      console.error(e);
      toast.error("Error al recuperar el reporte");
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

  const completedToday = studies.filter(s => s.fecha_fin).length;
  const pending = studies.filter(s => !s.fecha_fin).length;

  const filteredStudies = studies.filter(s =>
    `${s.patient?.nombre} ${s.patient?.apellidos}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tipo_estudio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FBFBFD] p-6 lg:p-10 font-sans animate-in fade-in duration-700">

      {/* HEADER CLINICAL CONTROL */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-8 px-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-primary/10 rounded-lg">
                <LayoutDashboard className="w-4 h-4 text-primary" />
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Clinical Console v1.5</span>
          </div>
          <div className="flex items-center gap-6">
            {orgData?.logo ? (
              <img src={orgData.logo} alt="Logo" className="h-16 w-auto object-contain drop-shadow-sm" />
            ) : (
              <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white font-black italic text-2xl shadow-xl shadow-slate-200">L</div>
            )}
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 italic uppercase leading-none mb-2">Panel de Control</h1>
              <p className="text-slate-400 font-bold text-xs tracking-[0.1em] uppercase flex items-center gap-2">
                <Stethoscope className="w-3 h-3" /> {orgData?.nombre || "Sede Liarena"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <Button
            onClick={() => navigate("/import-report")}
            variant="outline"
            className="h-16 px-10 rounded-[28px] border-2 border-slate-100 text-slate-500 font-black uppercase text-[12px] tracking-[0.2em] gap-4 hover:bg-slate-50 transition-all"
           >
             <Files className="w-5 h-5" /> Importar Reporte
           </Button>

           <Button
            onClick={() => navigate("/procedure/setup")}
            className="h-16 px-10 rounded-[28px] bg-primary text-white font-black uppercase text-[12px] tracking-[0.2em] gap-4 shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
           >
             <Activity className="w-5 h-5" /> Iniciar Procedimiento
           </Button>
        </div>
      </header>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="p-8 border-none bg-white rounded-[40px] shadow-premium flex items-center gap-8 group hover:shadow-xl transition-all duration-500">
          <div className="w-16 h-16 bg-amber-50 rounded-[24px] flex items-center justify-center text-amber-600 transition-all group-hover:scale-110 duration-500">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Procedimientos Pendientes</p>
            <h3 className="text-5xl font-black italic text-slate-900 tracking-tighter leading-none">{pending}</h3>
          </div>
        </Card>

        <Card className="p-8 border-none bg-white rounded-[40px] shadow-premium flex items-center gap-8 group hover:shadow-xl transition-all duration-500">
          <div className="w-16 h-16 bg-emerald-50 rounded-[24px] flex items-center justify-center text-emerald-600 transition-all group-hover:scale-110 duration-500">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Altas de Hoy</p>
            <h3 className="text-5xl font-black italic text-slate-900 tracking-tighter leading-none">{completedToday}</h3>
          </div>
        </Card>

        <Card className="p-8 border-none bg-white rounded-[40px] shadow-premium flex items-center gap-8 group hover:shadow-xl transition-all duration-500">
          <div className="w-16 h-16 bg-primary/5 rounded-[24px] flex items-center justify-center text-primary transition-all group-hover:scale-110 duration-500">
            <ClipboardList size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Total del Turno</p>
            <h3 className="text-5xl font-black italic text-slate-900 tracking-tighter leading-none">{studies.length}</h3>
          </div>
        </Card>
      </div>

      {/* SEARCH AND LIST SECTION */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
           <div className="space-y-1">
              <h2 className="text-2xl font-bold italic uppercase tracking-tighter text-slate-800">Actividad del Día</h2>
              <p className="text-slate-400 text-xs font-medium italic">{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
           </div>

           <div className="relative w-full md:w-96 group">
              <Search className="absolute left-5 top-4 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Filtrar por paciente o estudio..."
                className="h-14 w-full bg-white border border-slate-100 shadow-sm rounded-2xl pl-14 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all italic"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="p-32 flex flex-col items-center justify-center opacity-30 italic font-bold">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
              <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando registros clínicos...</p>
            </div>
          ) : filteredStudies.length > 0 ? (
            filteredStudies.map((study, idx) => (
              <Card key={study.id} className="p-8 bg-white border-none rounded-[44px] shadow-sm flex items-center justify-between hover:translate-x-2 hover:shadow-xl transition-all duration-500 group border border-transparent hover:border-primary/10">
                <div className="flex items-center gap-10">
                  <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-[9px] font-black text-slate-300 uppercase leading-none mb-2 tracking-widest"># Orden</span>
                    <span className="text-2xl font-black italic text-slate-900 group-hover:text-primary transition-colors duration-500">{(studies.length - idx).toString().padStart(2, '0')}</span>
                  </div>

                  <div className="w-[1px] h-12 bg-slate-50" />

                  <div className="flex items-center gap-6">
                    <Avatar fallback={study.patient?.nombre?.[0] || "P"} className="h-16 w-16 text-xl bg-slate-50 ring-offset-4" />
                    <div>
                      <h4 className="font-bold text-slate-900 uppercase italic tracking-tight text-xl leading-none mb-3 group-hover:translate-x-1 transition-transform">
                        {study.patient?.nombre} {study.patient?.apellidos}
                      </h4>
                      <div className="flex items-center gap-4">
                         <Badge variant="primary" className="bg-slate-900 text-white border-none font-black text-[8px] uppercase tracking-widest h-6 px-4 rounded-lg">{study.tipo_estudio}</Badge>
                         <div className="flex items-center gap-2 text-slate-400 font-bold italic text-[11px]">
                           <Stethoscope className="w-3.5 h-3.5" />
                           <span>DR. {study.doctor ? `${study.doctor.nombre} ${study.doctor.apellidos}` : 'POR ASIGNAR'}</span>
                         </div>
                         <div className="flex items-center gap-2 text-slate-400 font-bold italic text-[11px]">
                           <Clock className="w-3.5 h-3.5" />
                           <span>{new Date(study.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-10">
                  <div className="hidden md:flex flex-col items-end">
                     <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Status Interno</span>
                     <Badge
                        variant={study.fecha_fin ? "success" : (study.observaciones ? "warning" : "primary")}
                        className="h-7 px-5 uppercase text-[8px] font-black border-none tracking-widest rounded-xl shadow-sm"
                     >
                       {study.fecha_fin ? "Completado" : (study.observaciones ? "Redacción" : "En Captura")}
                     </Badge>
                  </div>

                  {study.fecha_fin ? (
                     <button
                        onClick={() => handleDownloadReport(study)}
                        disabled={downloadingId === study.id}
                        className="p-5 rounded-[28px] bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all duration-500 shadow-sm disabled:opacity-50"
                     >
                        {downloadingId === study.id ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileDown size={24} />}
                     </button>
                  ) : (
                     <button
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
                          navigate(`/procedure/active`);
                        }}
                        className="p-5 rounded-[28px] bg-primary/5 text-primary hover:bg-primary hover:text-white hover:shadow-xl hover:shadow-primary/20 transition-all duration-500 shadow-sm"
                     >
                        <ArrowRight size={24} />
                     </button>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div className="p-32 bg-white rounded-[60px] border-2 border-dashed border-slate-100 text-center opacity-20 italic font-bold">
               <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-transform">
                  <Inbox className="w-10 h-10 text-slate-300" />
               </div>
               <h3 className="text-2xl text-slate-800 uppercase tracking-tighter mb-2">Bandeja Vacía</h3>
               <p className="text-sm font-bold uppercase tracking-[0.2em]">Cero procedimientos registrados en este turno</p>
            </div>
          )}
        </div>
      </section>

      <footer className="mt-20 pt-8 border-t border-slate-100 flex items-center justify-between px-6 opacity-30 italic font-bold">
         <div className="flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-widest">Liarena OS Core v2.0.4</span>
            <div className="w-1 h-1 rounded-full bg-slate-400" />
            <span className="text-[10px] uppercase tracking-widest">Secure HIPAA Environment</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-emerald-600">Sincronizado</span>
         </div>
      </footer>
    </div>
  );
}
