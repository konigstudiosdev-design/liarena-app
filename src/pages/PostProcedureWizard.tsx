import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Camera,
  Loader2,
  FileText,
  X,
  MessageSquare,
  ClipboardCheck,
  Building2,
  Printer,
  Clock,
  Activity,
  Stethoscope,
  DoorOpen,
  Layout,
  Layers,
  Plus,
  Zap,
  PenTool,
  Eye,
  ArrowRight,
  LogOut,
  Type,
  User,
  Calendar,
  Phone,
  Mail,
  Award
} from "lucide-react";
import { cn } from "../lib/utils";
import { Button, Badge, Card, Avatar, toast, Input } from "../components/ui/index";
import { wizardService } from "../lib/wizard-service";
import { localRecordService } from "../lib/local-record-service";
import { pdfGenerator, ReportLayout } from "../lib/pdf-generator";
import { supabase } from "../lib/supabase";
import { cloudSyncService } from "../lib/cloud-sync-service";
import { profileService, DoctorProfileData } from "../lib/profile-service";
import { useDoctor } from "../contexts/DoctorContext";

export default function PostProcedureWizard() {
  const navigate = useNavigate();
  const { doctor, syncDoctor } = useDoctor();
  const [loading, setLoading] = useState(false);
  const [reportCtx, setReportCtx] = useState<any>(null);
  const [procedureData, setProcedureData] = useState<any>(null);
  const [studyId, setStudyId] = useState<string | null>(null);
  const [sessionStudies, setSessionStudies] = useState<any[]>([]);
  const [showHub, setShowHub] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const creationRef = useRef(false);

  // Data States
  const [photos, setPhotos] = useState<any[]>([]);
  const [selectionOrder, setSelectionOrder] = useState<number[]>([]);
  const [reportData, setReportData] = useState({
    findings: "",
    diagnosis: ""
  });

  const [activeStep, setActiveStep] = useState(1);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showNewProcedureModal, setShowNewProcedureModal] = useState(false);
  const [newProcedureType, setNewProcedureType] = useState("");
  const [customProcedureName, setCustomProcedureName] = useState("");

  const selectedPhotos = selectionOrder.map(id => photos.find(p => p.id === id)).filter(Boolean);

  const calculateAge = (dateString: string) => {
    if (!dateString) return "-- años";
    const today = new Date();
    // Parseo manual para evitar desfases de zona horaria (YYYY-MM-DD)
    const parts = dateString.split('-');
    if (parts.length < 3) return "-- años";

    const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? `${age} años` : "-- años";
  };

  const PROCEDURE_OPTIONS = [
    "Endoscopia",
    "Colonoscopia",
    "Sigmoidoscopia",
    "Rectosigmoidoscopia",
    "Enteroscopia",
    "Cápsula endoscópica",
    "Ecoendoscopia",
    "CPRE",
    "Broncoscopia",
    "Otro..."
  ];

  useEffect(() => {
    const ctx = localStorage.getItem('liarena_report_context');
    if (ctx) {
      setReportCtx(JSON.parse(ctx));
    }
    fetchSessionAndData();
  }, []);

  async function fetchSessionAndData() {
    const data = localStorage.getItem('liarena_active_procedure');
    const captures = localStorage.getItem('liarena_active_captures');
    const ctx = localStorage.getItem('liarena_report_context');
    const sessionListStr = localStorage.getItem('liarena_session_studies');

    // Recuperar rol para navegación inteligente
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: profile } = await supabase.from('users').select('role').eq('auth_user_id', authUser.id).single();
      if (profile) setUserRole(profile.role);
    }

    if (sessionListStr) {
      const list = JSON.parse(sessionListStr);
      setSessionStudies(list);
      // Si hay más de un estudio en la sesión, mostramos el Hub
      if (list.length > 1) setShowHub(true);
    }

    if (data) {
      const parsed = JSON.parse(data);
      setProcedureData(parsed);
      if (parsed.studyId) setStudyId(parsed.studyId);

      // Si no hay contexto de reporte, intentamos reconstruirlo para compatibilidad
      if (!ctx) {
        const reconstructedCtx = {
          doctor: {
            nombreFull: parsed.doctorName || "DR. ASIGNADO",
            especialidad: parsed.doctorProfile?.especialidad || "Gastroenterología / Hepatología",
            cedulaProf: parsed.doctorProfile?.cedula_profesional || "---",
            cedulaEsp: parsed.doctorProfile?.cedula_especialidad || "---",
            signature: parsed.doctorProfile?.firma
          },
          patient: {
            nombreFull: parsed.patientName || "PACIENTE",
            expediente: parsed.expediente || "---",
            edad: parsed.age || calculateAge(parsed.birthDate),
            fn: parsed.birthDate,
            sexo: parsed.sexo
          },
          location: {
            room: parsed.roomName || "SALA DE ENDOSCOPIA",
            logo: parsed.doctorProfile?.organization?.logo
          },
          study: {
            type: parsed.procedureType,
            id: parsed.studyId
          }
        };
        setReportCtx(reconstructedCtx);
      }

      const photoList = captures ? JSON.parse(captures) : [];
      setPhotos(photoList.map((p: any) => ({ ...p, comment: p.comment || "" })));
    }
  }

  async function initStudy(metadata: any, photoList: any[]) {
    if (creationRef.current) return;
    creationRef.current = true;
    setLoading(true);
    try {
      const id = await wizardService.createStudyRecord(metadata, photoList);
      if (id) {
        setStudyId(id);
        localStorage.setItem('liarena_active_procedure', JSON.stringify({ ...metadata, studyId: id }));
      }
    } catch (e) {
      creationRef.current = false;
    } finally {
      setLoading(false);
    }
  }

  const handleTogglePhoto = (id: number) => {
    setSelectionOrder(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleCommentChange = (id: number, comment: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, comment } : p));
  };

  const handlePreviewPDF = async () => {
    setLoading(true);
    try {
      const orderedSelection = selectionOrder.map(id => photos.find(p => p.id === id)).filter(Boolean);

      const pdfFinalData = {
        ...reportCtx,
        report: reportData,
        doctor: {
          ...reportCtx?.doctor,
          nombreFull: reportCtx?.doctor?.nombreFull || procedureData?.doctorName,
          especialidad: reportCtx?.doctor?.especialidad || procedureData?.doctorProfile?.especialidad,
          cedulaProf: reportCtx?.doctor?.cedulaProf || procedureData?.doctorProfile?.cedula_profesional,
          cedulaEsp: reportCtx?.doctor?.cedulaEsp || procedureData?.doctorProfile?.cedula_especialidad,
          signature: reportCtx?.doctor?.signature || procedureData?.doctorProfile?.firma
        },
        patientName: reportCtx?.patient?.nombreFull || procedureData?.patientName || "PACIENTE",
        age: reportCtx?.patient?.edad || calculateAge(procedureData?.birthDate),
        sexo: reportCtx?.patient?.sexo || procedureData?.sexo,
        birthDate: reportCtx?.patient?.fn || procedureData?.birthDate,
        expediente: reportCtx?.patient?.expediente || procedureData?.expediente,
        procedureType: reportCtx?.study?.type || procedureData?.procedureType
      };

      const doc = await pdfGenerator.generateStudyReport(pdfFinalData, orderedSelection);
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfPreviewUrl(url);
      setShowPreviewModal(true);
    } catch (e) {
      console.error("PDF Preview Error:", e);
      toast.error("Error al generar vista previa.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeAndGeneratePDF = async () => {
    if (!studyId) return;

    if (!reportData.findings || !reportData.diagnosis) {
      toast.error("Hallazgos y Diagnóstico son campos requeridos.");
      setActiveStep(2);
      return;
    }

    setLoading(true);
    try {
      const orderedSelection = selectionOrder.map(id => photos.find(p => p.id === id)).filter(Boolean);
      await wizardService.saveStudyReport(studyId, reportData, orderedSelection);

      // Consolidación final utilizando la Única Fuente de Verdad (ClinicalReportContext)
      // Agregamos fallbacks defensivos para evitar "DR. ASIGNADO"
      const pdfFinalData = {
        ...reportCtx,
        report: reportData,
        doctor: {
          ...reportCtx?.doctor,
          nombreFull: reportCtx?.doctor?.nombreFull || procedureData?.doctorName,
          especialidad: reportCtx?.doctor?.especialidad || procedureData?.doctorProfile?.especialidad,
          cedulaProf: reportCtx?.doctor?.cedulaProf || procedureData?.doctorProfile?.cedula_profesional,
          cedulaEsp: reportCtx?.doctor?.cedulaEsp || procedureData?.doctorProfile?.cedula_especialidad,
          signature: reportCtx?.doctor?.signature || procedureData?.doctorProfile?.firma
        },
        patientName: reportCtx?.patient?.nombreFull || procedureData?.patientName || "PACIENTE",
        age: reportCtx?.patient?.edad || calculateAge(procedureData?.birthDate),
        sexo: reportCtx?.patient?.sexo || procedureData?.sexo,
        birthDate: reportCtx?.patient?.fn || procedureData?.birthDate,
        expediente: reportCtx?.patient?.expediente || procedureData?.expediente,
        procedureType: reportCtx?.study?.type || procedureData?.procedureType
      };

      const doc = await pdfGenerator.generateStudyReport(pdfFinalData, orderedSelection);

      const success = await wizardService.finalizeStudy(studyId);

      if (success) {
        // Guardado local definitivo
        const pdfBlob = doc.output('blob');
        const activeProc = JSON.parse(localStorage.getItem('liarena_active_procedure') || '{}');

        // Cloud Sync del Reporte (Background)
        cloudSyncService.enqueue(studyId, pdfBlob, 'Reporte.pdf', 'report');

        if (activeProc.localStudyPath) {
          await localRecordService.saveReportPDF(activeProc.localStudyPath, pdfBlob);
        }

        // DESPACHO AUTOMÁTICO AL MÉDICO
        toast.info("Enviando expediente al médico asignado...");
        await wizardService.logAudit(studyId, 'REPORT_DISPATCHED', JSON.stringify({
          doctor_id: reportCtx?.doctor?.id,
          doctor_name: reportCtx?.doctor?.nombreFull,
          dispatch_time: new Date().toISOString()
        }));

        doc.save(`Reporte_${reportCtx?.patient?.nombreFull}.pdf`);
        toast.success("Expediente finalizado, guardado y enviado.");

        // Actualizar lista de sesión (Quitar el que acabamos de terminar)
        const remaining = sessionStudies.filter(s => s.id !== studyId);
        setSessionStudies(remaining);
        localStorage.setItem('liarena_session_studies', JSON.stringify(remaining));

        setIsAuthorized(true);
      }
    } catch (e) {
      console.error("Critical PDF Generation Error:", e);
      toast.error("Fallo al generar el reporte definitivo.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewProcedure = () => {
    const finalType = newProcedureType === "Otro..." ? customProcedureName : newProcedureType;
    if (!finalType) {
      toast.error("Seleccione un tipo de procedimiento.");
      return;
    }

    if (!procedureData) {
      toast.error("Error de sesión: Datos del paciente no encontrados.");
      return;
    }

    // 1. Clonamos la configuración actual pero reseteamos el estudio
    const nextProcedure = {
      ...procedureData,
      procedureType: finalType,
      studyId: null, // Forzamos creación de nuevo registro en DB
      localStudyPath: null, // Se generará nueva ruta de archivos
    };

    // 2. Limpieza de buffers de sesión anterior
    localStorage.removeItem('liarena_active_captures');
    localStorage.removeItem('liarena_report_context');

    // 3. Persistimos la nueva intención de estudio
    localStorage.setItem('liarena_active_procedure', JSON.stringify(nextProcedure));

    // 4. Reset de UI y Navegación
    setShowNewProcedureModal(false);
    toast.success(`Iniciando nuevo estudio: ${finalType}`);

    // Navegamos directamente a la pantalla de captura
    navigate("/procedure/active");
  };

  const selectStudyFromHub = async (selected: any) => {
    setLoading(true);
    try {
      // 1. Cargar metadatos del estudio seleccionado desde el servidor/local
      const { data: study } = await supabase.from('studies').select('*').eq('id', selected.id).single();
      const { data: patient } = await supabase.from('patients').select('*').eq('id', study.patient_id).single();

      // 2. Reconstruir procedureData para este estudio
      const newProcData = {
        studyId: study.id,
        patientId: study.patient_id,
        nombre: patient.nombre,
        apellidos: patient.apellidos,
        patientName: `${patient.nombre} ${patient.apellidos}`,
        birthDate: patient.fecha_nacimiento,
        sexo: patient.sexo,
        procedureType: study.tipo_estudio,
        doctorId: study.doctor_id,
        timestamp: study.created_at,
        localStudyPath: selected.localPath
      };

      setProcedureData(newProcData);
      setStudyId(study.id);

      // 3. Recuperar capturas guardadas en la auditoría (si existen)
      const { data: audit } = await supabase.from('audit_logs')
        .select('detalles')
        .eq('study_id', study.id)
        .eq('accion', 'REPORT_SAVED')
        .maybeSingle();

      const photoList = audit ? JSON.parse(audit.detalles).selected_media : [];
      setPhotos(photoList.map((p: any) => ({ ...p, comment: p.comment || "" })));

      setShowHub(false);
      setActiveStep(1);
    } catch (e) {
      toast.error("Error al cargar el estudio seleccionado.");
    } finally {
      setLoading(false);
    }
  };

  const goBackToDashboard = () => {
    if (userRole === 'doctor' || userRole === 'medic') {
      navigate("/medic");
    } else {
      navigate("/assistant");
    }
  };

  const handleSendToDoctor = async () => {
    if (!confirm("¿Desea cerrar este estudio? El reporte quedará pendiente para el Doctor.")) return;

    // Limpiar rastro de sesión actual
    localStorage.removeItem('liarena_active_procedure');
    localStorage.removeItem('liarena_active_captures');
    localStorage.removeItem('liarena_session_studies');
    localStorage.removeItem('liarena_report_context');

    goBackToDashboard();
  };

  const calculateClinicalFontSize = (findings: string, diagnosis: string) => {
    const isExtended = selectedPhotos.length > 8;
    if (isExtended) return '12px'; // REGLA FIJA

    const totalChars = (findings?.length || 0) + (diagnosis?.length || 0);
    if (totalChars > 2300) return '8px';
    if (totalChars > 1900) return '8.5px';
    if (totalChars > 1500) return '9px';
    if (totalChars > 1100) return '9.5px';
    if (totalChars > 750) return '10px';
    if (totalChars > 450) return '11px';
    if (totalChars > 250) return '11.5px';
    return '12px';
  };

  const clinicalFontSize = calculateClinicalFontSize(reportData.findings, reportData.diagnosis);

  const workflowSteps = [
    { id: 1, label: "Paciente", status: "done" },
    { id: 2, label: "Médico & Sala", status: "done" },
    { id: 3, label: "Estudio", status: "done" },
    { id: 4, label: "Captura", status: "done" },
    { id: 5, label: "Reporte", status: "active" },
  ];

  return (
    <div className="fixed inset-0 bg-[#F4F4F7] flex overflow-hidden font-sans select-none animate-in fade-in duration-500">

      {/* HUB DE SELECCIÓN DE REPORTE (MULTIPLE STUDIES) */}
      {showHub && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-500">
           <Card className="w-full max-w-4xl bg-white rounded-[60px] shadow-2xl overflow-hidden border-none p-12 space-y-12">
              <div className="flex flex-col items-center text-center space-y-6">
                 <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary shadow-inner">
                    <ClipboardCheck size={48} className="animate-pulse" />
                 </div>
                 <div className="space-y-2">
                    <h2 className="text-4xl font-bold text-slate-900 uppercase italic tracking-tighter">Centro de Reportes</h2>
                    <p className="text-slate-400 text-lg font-medium italic">Se han completado {sessionStudies.length} estudios para este paciente. ¿Cuál desea redactar primero?</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {sessionStudies.map((s, idx) => (
                   <button
                    key={s.id}
                    onClick={() => selectStudyFromHub(s)}
                    className="group p-8 rounded-[40px] bg-slate-50 border-2 border-transparent hover:border-primary hover:bg-white hover:shadow-2xl transition-all duration-500 text-left relative flex flex-col justify-between h-52"
                   >
                      <div className="flex justify-between items-start">
                        <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                           <FileText size={24} />
                        </div>
                        <Badge className="bg-slate-900 text-white border-none font-black text-[9px] uppercase tracking-widest px-3 h-6">FOLIO {s.id.slice(-6).toUpperCase()}</Badge>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Estudio {idx + 1}</p>
                        <h4 className="text-2xl font-bold text-slate-900 uppercase italic leading-none">{s.type}</h4>
                      </div>
                      <div className="absolute bottom-8 right-8 w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                        <ChevronRight size={24} />
                      </div>
                   </button>
                 ))}
              </div>

              <div className="pt-6 border-t border-slate-50 flex flex-col items-center gap-4">
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Otras opciones de flujo</p>
                 <div className="flex gap-4 w-full">
                    <Button
                      variant="ghost"
                      onClick={handleSendToDoctor}
                      className="flex-1 h-18 rounded-3xl text-slate-400 font-bold uppercase text-[11px] tracking-widest hover:bg-slate-50 gap-3"
                    >
                      <User size={18} /> Dejar Reportes al Doctor
                    </Button>
                 </div>
              </div>
           </Card>
        </div>
      )}

      {/* LEFT: CLINICAL INFO (COMPLETE) */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
        <div className="p-8 border-b border-slate-50 flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-xl"><Activity size={18} className="text-white" /></div>
          <span className="font-black italic uppercase tracking-widest text-[10px] text-slate-900">Wizard Core v1.0</span>
        </div>

        <div className="p-8 space-y-12">
          {/* Patient Section */}
          <section className="space-y-6">
             <div className="flex items-center gap-2 opacity-40">
                <User size={12} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Paciente</span>
             </div>
             <div className="space-y-4 px-1">
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Nombre Completo</p>
                   <p className="text-sm font-bold text-slate-900 uppercase truncate">{reportCtx?.patient?.nombreFull || procedureData?.patientName || "---"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Edad</p>
                      <p className="text-xs font-bold text-slate-700 italic">{reportCtx?.patient?.edad || calculateAge(procedureData?.birthDate)}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Sexo</p>
                      <p className="text-xs font-bold text-slate-700 uppercase">{reportCtx?.patient?.sexo || procedureData?.sexo || "--"}</p>
                   </div>
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Fecha de Nacimiento</p>
                   <p className="text-xs font-bold text-slate-700">{reportCtx?.patient?.fn || procedureData?.birthDate || "--/--/----"}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Expediente</p>
                   <p className="text-xs font-mono font-bold text-primary tracking-widest">{reportCtx?.patient?.expediente || procedureData?.patientId?.slice(-8).toUpperCase() || "---"}</p>
                </div>
             </div>
          </section>
        </div>
      </aside>

      {/* CENTER: WIZARD WORK AREA */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
         {/* SUB-HEADER PROGRESS */}
         <div className="h-16 bg-white border-b border-slate-100 flex items-center justify-center gap-12 shrink-0">
            {[
              { id: 1, label: "Imágenes", icon: Camera },
              { id: 2, label: "Redacción", icon: PenTool },
              { id: 3, label: "Validación", icon: Eye },
            ].map(s => (
               <div key={s.id} onClick={() => setActiveStep(s.id)} className={cn("flex items-center gap-3 cursor-pointer transition-all border-b-2 h-full px-4", activeStep === s.id ? "border-primary text-primary" : "border-transparent text-slate-300 hover:text-slate-500")}>
                  <s.icon size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{s.label}</span>
               </div>
            ))}
         </div>

         <div className="flex-1 overflow-y-auto p-6 lg:p-10 flex flex-col items-center">
            <div className="w-full max-w-[1400px] animate-in fade-in slide-in-from-bottom-2 duration-300">

               {activeStep === 1 && (
                 <div className="space-y-10">
                    <div className="flex justify-between items-end bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                       <div className="space-y-1">
                          <h2 className="text-3xl font-bold italic tracking-tighter text-slate-900 uppercase">Imágenes</h2>
                          <p className="text-slate-400 text-sm font-medium italic">Seleccione y etiquete las capturas relevantes para el reporte oficial.</p>
                       </div>
                       <Badge className="bg-slate-900 text-white font-black italic h-10 px-6 rounded-2xl">{selectionOrder.length} Seleccionadas</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                       {photos.map(p => {
                          const isSelected = selectionOrder.includes(p.id);
                          const idx = selectionOrder.indexOf(p.id) + 1;
                          return (
                            <div key={p.id} className="space-y-3 group">
                               <Card onClick={() => handleTogglePhoto(p.id)} className={cn("relative rounded-[36px] overflow-hidden cursor-pointer transition-all duration-300 border-none", isSelected ? "ring-4 ring-primary ring-offset-4 scale-[0.98]" : "opacity-60 grayscale hover:opacity-100 hover:grayscale-0 shadow-sm hover:shadow-xl")}>
                                  <img src={p.image} className="w-full h-auto block" style={{ objectFit: 'contain' }} />
                                  <div className={cn("absolute top-4 right-4 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-lg", isSelected ? "bg-primary text-white" : "bg-white/90 text-slate-300")}>
                                     {isSelected ? idx : <Plus size={20} />}
                                  </div>
                               </Card>
                               {isSelected && (
                                  <div className="px-3 animate-in fade-in slide-in-from-top-2">
                                     <div className="relative group/input">
                                        <Type size={12} className="absolute left-3 top-3.5 text-slate-300 group-focus-within/input:text-primary transition-colors" />
                                        <Input
                                          placeholder="Añadir nota..."
                                          value={p.comment}
                                          onChange={(e) => handleCommentChange(p.id, e.target.value)}
                                          className="h-10 pl-9 rounded-xl bg-white border-slate-100 text-[11px] font-bold italic shadow-sm"
                                        />
                                     </div>
                                  </div>
                               )}
                            </div>
                          )
                       })}
                    </div>
                 </div>
               )}

               {activeStep === 2 && (
                 <div className="w-full max-w-4xl mx-auto space-y-8">
                    <div className="bg-white p-10 rounded-[48px] shadow-sm border border-slate-100 space-y-8">
                       <div className="flex justify-between items-center border-b border-slate-50 pb-8 gap-8">
                         <div className="space-y-2 flex-1">
                           <h2 className="text-4xl font-bold italic tracking-tighter text-slate-900 uppercase">Redacción</h2>
                           <p className="text-slate-400 text-sm font-bold italic uppercase tracking-widest leading-relaxed">
                              Ingrese los hallazgos y el diagnóstico clínico para el reporte final.
                           </p>
                         </div>
                         <div className="flex flex-col items-end gap-2 shrink-0 min-w-[180px]">
                            <Badge className={cn("px-4 py-2 font-black italic rounded-xl border-none transition-all whitespace-nowrap",
                              clinicalFontSize === '8px' ? "bg-amber-500 text-white animate-pulse shadow-lg shadow-amber-500/20" : "bg-slate-100 text-slate-400"
                            )}>
                              {clinicalFontSize === '8px' ? "⚠️ COMPRESIÓN MÁXIMA (8px)" : `Fuente: ${clinicalFontSize}`}
                            </Badge>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic tabular-nums">
                               {reportData.findings.length + reportData.diagnosis.length} / 2300 caracteres
                            </span>
                         </div>
                       </div>

                       <div className="space-y-10">
                          <div className="space-y-4">
                             <div className="flex justify-between items-end italic ml-1">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                   <div className="p-2 bg-primary/5 rounded-lg"><FileText size={14} className="text-primary" /></div>
                                   Hallazgos
                                </label>
                                <span className={cn(
                                   "text-[10px] font-bold px-3 py-1 rounded-full transition-all",
                                   (reportData.findings?.length || 0) > 2000 ? "bg-amber-100 text-amber-700 animate-pulse" : "bg-slate-100 text-slate-400"
                                )}>
                                   {reportData.findings?.length || 0} / 2200 caracteres {(reportData.findings?.length || 0) > 2000 && "• Posible 2da Página"}
                                </span>
                             </div>
                             <textarea
                               value={reportData.findings}
                               onChange={(e) => setReportData({...reportData, findings: e.target.value})}
                               style={{ fontSize: clinicalFontSize }}
                               className="w-full h-[450px] bg-slate-50 border border-slate-100 rounded-[32px] p-8 font-bold text-slate-700 outline-none focus:ring-8 focus:ring-primary/5 focus:bg-white transition-all resize-none shadow-inner custom-scrollbar"
                               placeholder="Mucosa conservada, sin lesiones aparentes..."
                             />
                          </div>

                          <div className="space-y-4">
                             <div className="flex justify-between items-end italic ml-1">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                   <div className="p-2 bg-primary/5 rounded-lg"><CheckCircle2 size={14} className="text-primary" /></div>
                                   Diagnóstico
                                </label>
                                <span className={cn(
                                   "text-[10px] font-bold px-3 py-1 rounded-full transition-all",
                                   (reportData.diagnosis?.length || 0) > 800 ? "bg-amber-100 text-amber-700 animate-pulse" : "bg-slate-100 text-slate-400"
                                )}>
                                   {reportData.diagnosis?.length || 0} / 1000 caracteres
                                </span>
                             </div>
                             <textarea
                               value={reportData.diagnosis}
                               onChange={(e) => setReportData({...reportData, diagnosis: e.target.value})}
                               style={{ fontSize: clinicalFontSize }}
                               className="w-full h-40 bg-slate-50 border border-slate-100 rounded-[32px] p-8 font-bold text-slate-700 outline-none focus:ring-8 focus:ring-primary/5 focus:bg-white transition-all resize-none shadow-inner custom-scrollbar"
                               placeholder="Endoscopia dentro de parámetros normales..."
                             />
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {activeStep === 3 && !isAuthorized && (
                 <div className="flex flex-col items-center justify-center w-full py-10">
                    {/* RIGHT: AUTHORIZATION CARD */}
                    <div className="max-w-2xl w-full space-y-10 flex flex-col items-center text-center">
                       <div className="space-y-2">
                          <h2 className="text-4xl font-bold italic tracking-tighter text-slate-900 uppercase">Sello Final</h2>
                          <p className="text-slate-400 text-sm font-medium italic">Confirme la integridad de los datos.</p>
                       </div>

                       <Card className="w-full bg-white rounded-[60px] p-12 shadow-2xl space-y-10 border-none">
                          <div className="flex items-center gap-6 justify-center">
                             <div className="w-20 h-20 bg-emerald-50 rounded-[28px] flex items-center justify-center text-emerald-500 shadow-inner">
                                <CheckCircle2 size={40} className="animate-in zoom-in duration-500" />
                             </div>
                             <div className="text-left">
                                <h4 className="text-2xl font-bold text-slate-900 uppercase italic">Reporte Validado</h4>
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Próximo paso: Generación de PDF</p>
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6 py-8 border-y border-slate-50">
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest">Fotografías</p>
                                <p className="text-xl font-bold text-slate-700 italic">{selectionOrder.length} Capturas</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest">Escalado de Fuente</p>
                                <p className={cn("text-xl font-bold uppercase italic",
                                  clinicalFontSize === '8px' ? "text-amber-500 animate-pulse" : "text-slate-700"
                                )}>
                                  {clinicalFontSize === '8px' ? "Máxima (8px)" : clinicalFontSize}
                                </p>
                             </div>
                          </div>

                          <div className="space-y-4">
                            <Button onClick={handlePreviewPDF} disabled={loading} variant="outline" className="w-full h-16 rounded-[28px] border-2 border-slate-100 text-slate-500 font-black uppercase text-[12px] tracking-[0.15em] hover:bg-slate-50 transition-all gap-3">
                               <Eye size={20} /> Ver Vista Previa Real
                            </Button>

                            <Button onClick={handleAuthorizeAndGeneratePDF} disabled={loading} className="w-full h-20 rounded-[32px] bg-primary text-white font-black uppercase text-[14px] tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all gap-4">
                               {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Printer size={24} /> Autorizar y Firmar</>}
                            </Button>
                          </div>
                       </Card>
                    </div>
                 </div>
               )}

               {isAuthorized && (
                 <div className="space-y-10 flex flex-col items-center text-center py-20">
                    <div className="w-32 h-32 bg-emerald-500 rounded-[40px] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/20 mb-8">
                       <CheckCircle2 size={64} className="animate-in zoom-in duration-700" />
                    </div>
                    <div className="space-y-4">
                       <h2 className="text-6xl font-bold italic tracking-tighter text-slate-900 uppercase">¡Estudio Finalizado!</h2>
                       <p className="text-slate-400 text-xl font-medium italic">El reporte ha sido generado y los archivos están resguardados localmente.</p>
                    </div>

                    <div className="flex gap-6 mt-12">
                       {sessionStudies.length > 0 ? (
                         <Button
                          onClick={() => { setIsAuthorized(false); setShowHub(true); }}
                          className="h-20 px-12 rounded-[32px] bg-primary text-white font-black uppercase text-[14px] tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.05] active:scale-[0.95] transition-all gap-4"
                         >
                            <FileText size={24} /> Redactar Siguiente Estudio ({sessionStudies.length})
                         </Button>
                       ) : (
                         <Button
                          onClick={() => setShowNewProcedureModal(true)}
                          className="h-20 px-12 rounded-[32px] bg-primary text-white font-black uppercase text-[14px] tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.05] active:scale-[0.95] transition-all gap-4"
                         >
                            <Plus size={24} /> Nuevo Procedimiento
                         </Button>
                       )}
                       <Button
                        onClick={() => {
                          localStorage.removeItem('liarena_session_studies');
                          goBackToDashboard();
                        }}
                        variant="outline"
                        className="h-20 px-12 rounded-[32px] border-2 border-slate-200 text-slate-500 font-black uppercase text-[14px] tracking-[0.2em] hover:bg-slate-50 transition-all gap-4"
                       >
                          Finalizar Atención <ArrowRight size={24} />
                       </Button>
                    </div>
                 </div>
               )}

            </div>
         </div>

         {/* FOOTER ACTIONS */}
         {!isAuthorized && (
           <div className="h-24 bg-white border-t border-slate-100 px-12 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => activeStep > 1 && setActiveStep(activeStep - 1)} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-transparent flex items-center gap-2">
                   <ChevronLeft size={16} /> Regresar
                </Button>
                <div className="w-[1px] h-8 bg-slate-100 mx-2" />
                <Button variant="ghost" onClick={goBackToDashboard} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 flex items-center gap-2 rounded-xl px-4">
                   <Building2 size={14} /> Inicio
                </Button>
                <div className="w-[1px] h-8 bg-slate-100 mx-2" />
                <Button variant="ghost" onClick={handleSendToDoctor} className="text-danger/60 font-bold uppercase text-[10px] tracking-widest hover:bg-danger/5 flex items-center gap-2 rounded-xl px-4">
                   <LogOut size={14} /> Enviar al Doctor
                </Button>
              </div>
              <div className="flex items-center gap-8">
                 <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-300 uppercase italic">Progreso de Documentación</span>
                    <span className="text-[11px] font-bold text-slate-900 uppercase">Fase {activeStep} de 3</span>
                 </div>
                 {activeStep < 3 && (
                    <Button onClick={() => setActiveStep(activeStep + 1)} className="h-14 px-12 rounded-2xl bg-slate-900 text-white font-black uppercase text-[11px] tracking-widest gap-4 group">
                       Siguiente <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Button>
                 )}
              </div>
           </div>
         )}
      </main>

      {/* RIGHT: PROGRESS PANEL (MINIMIZED) */}
      <aside className="w-16 bg-white border-l border-slate-100 flex flex-col items-center py-10 shrink-0">
         <div className="flex flex-col gap-12">
            {workflowSteps.map((s, idx) => (
              <div key={s.id} className="relative flex flex-col items-center group">
                 {idx < workflowSteps.length - 1 && <div className={cn("absolute top-8 w-[2px] h-10 transition-colors", s.status === 'done' ? "bg-primary" : "bg-slate-100")} />}
                 <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all relative z-10", s.status === 'active' ? "bg-primary text-white shadow-lg ring-4 ring-primary/10" : s.status === 'done' ? "bg-primary text-white" : "bg-slate-50 text-slate-300")}>
                    {s.status === 'done' ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-black">{s.id}</span>}
                 </div>

                 {/* Tooltip style label */}
                 <div className="absolute right-full mr-4 px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                    {s.label}
                 </div>
              </div>
            ))}
         </div>

         <div className="mt-auto flex flex-col items-center gap-4 opacity-20">
            <Clock size={16} className="text-slate-400" />
            <div className="h-10 w-[1px] bg-slate-200" />
         </div>
      </aside>

      {/* NEW PROCEDURE MODAL */}
      {showNewProcedureModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <Card className="w-full max-w-2xl bg-white rounded-[48px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 border-none">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-2xl"><Zap size={24} /></div>
                    <div>
                       <h2 className="text-2xl font-bold text-slate-900 uppercase italic tracking-tighter">Nuevo Procedimiento</h2>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Paciente: {procedureData?.patientName || `${procedureData?.nombre} ${procedureData?.apellidos}`}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowNewProcedureModal(false)} className="p-3 text-slate-300 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>

              <div className="p-10 space-y-8">
                 <p className="text-sm font-medium text-slate-500 italic">¿Qué procedimiento desea iniciar para este paciente?</p>

                 <div className="grid grid-cols-2 gap-3">
                    {PROCEDURE_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setNewProcedureType(opt)}
                        className={cn(
                          "h-14 px-6 rounded-2xl border-2 font-bold text-[11px] uppercase tracking-widest transition-all text-left flex items-center justify-between",
                          newProcedureType === opt ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-400 hover:bg-slate-50"
                        )}
                      >
                         {opt}
                         {newProcedureType === opt && <CheckCircle2 size={16} />}
                      </button>
                    ))}
                 </div>

                 {newProcedureType === "Otro..." && (
                   <div className="animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Especifique el estudio</label>
                      <Input
                        placeholder="Ej: Colonoscopia, CPRE..."
                        value={customProcedureName}
                        onChange={(e) => setCustomProcedureName(e.target.value)}
                        className="h-14 rounded-2xl bg-slate-50 border-none font-bold italic"
                        autoFocus
                      />
                   </div>
                 )}

                 <div className="pt-4 flex gap-4">
                    <Button
                      variant="ghost"
                      onClick={() => setShowNewProcedureModal(false)}
                      className="flex-1 h-16 rounded-2xl text-slate-400 font-bold uppercase text-[11px] tracking-widest"
                    >
                       Cancelar
                    </Button>
                    <Button
                      onClick={handleStartNewProcedure}
                      disabled={!newProcedureType || (newProcedureType === "Otro..." && !customProcedureName)}
                      className="flex-[2] h-16 rounded-2xl bg-slate-900 text-white font-black uppercase text-[11px] tracking-widest shadow-xl gap-3"
                    >
                       Iniciar Nuevo Estudio <ArrowRight size={18} />
                    </Button>
                 </div>
              </div>
           </Card>
        </div>
      )}

      {/* PDF PREVIEW MODAL */}
      {showPreviewModal && pdfPreviewUrl && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-10 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
           <Card className="w-full max-w-6xl h-full bg-white rounded-[40px] shadow-2xl overflow-hidden border-none flex flex-col">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between shrink-0 bg-white z-10">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-2xl"><Eye size={24} /></div>
                    <div>
                       <h2 className="text-xl font-bold text-slate-900 uppercase italic tracking-tighter">Vista Previa del Documento</h2>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documento Electrónico de Grado Médico</p>
                    </div>
                 </div>
                 <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
                    setPdfPreviewUrl(null);
                  }}
                  className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                 >
                   <X size={24} />
                 </button>
              </div>

              <div className="flex-1 bg-slate-100 p-4 md:p-8 overflow-hidden relative">
                 <iframe
                   src={`${pdfPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                   className="w-full h-full rounded-2xl shadow-inner bg-white"
                   title="PDF Preview"
                 />
              </div>

              <div className="p-8 border-t border-slate-50 flex justify-center bg-white shrink-0">
                 <Button
                   onClick={() => {
                     setShowPreviewModal(false);
                     handleAuthorizeAndGeneratePDF();
                   }}
                   className="h-16 px-16 rounded-3xl bg-primary text-white font-black uppercase text-[12px] tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all gap-4"
                 >
                    <Printer size={20} /> Autorizar y Guardar PDF
                 </Button>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
}
