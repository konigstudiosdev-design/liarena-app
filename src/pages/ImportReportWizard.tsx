import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  User,
  Stethoscope,
  Layout,
  PenTool,
  CheckCircle2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Search,
  Building2,
  DoorOpen,
  Plus,
  ArrowRight,
  Printer,
  Eye,
  Loader2,
  Camera,
  ArrowUp,
  ArrowDown,
  X
} from "lucide-react";
import { Card, Button, Badge, Avatar, Input, toast } from "../components/ui/index";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { pdfGenerator } from "../lib/pdf-generator";
import { profileService, DoctorProfileData } from "../lib/profile-service";
import { localRecordService } from "../lib/local-record-service";
import { wizardService } from "../lib/wizard-service";

export default function ImportReportWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [orgData, setOrgData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- WIZARD STATE ---
  const [photos, setPhotos] = useState<any[]>([]);
  const [selectionOrder, setSelectionOrder] = useState<number[]>([]);
  const [format, setFormat] = useState<8 | 12>(8);
  const [patientData, setPatientData] = useState({
    id: "",
    nombre: "",
    apellidos: "",
    birthDate: "",
    sexo: "M",
    expediente: "",
    curp: "",
    telefono: "",
    correo: "",
    observaciones: ""
  });
  const [doctorInputMode, setDoctorInputMode] = useState<'selection' | 'manual'>('selection');
  const [doctorData, setDoctorData] = useState<any>(null);
  const [manualDoctor, setManualDoctor] = useState({
    nombre: "",
    apellidos: "",
    especialidad: "",
    cedulaProf: "",
    cedulaEsp: ""
  });
  const [studyData, setStudyData] = useState({
    type: "Endoscopia",
    procedimiento: "",
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    roomId: ""
  });
  const [reportData, setReportData] = useState({
    findings: "",
    diagnosis: ""
  });

  const [activeStep, setActiveStep] = useState(1); // Use activeStep as a local state for simpler control if needed, but 'step' is already used.
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [previewOpened, setPreviewOpened] = useState(false);

  const orgId = localStorage.getItem('liarena_org_id');

  useEffect(() => {
    const draft = localStorage.getItem('liarena_import_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setPhotos(parsed.photos || []);
        setSelectionOrder(parsed.selectionOrder || []);
        setFormat(parsed.format || 8);
        setPatientData(parsed.patientData || patientData);
        setDoctorInputMode(parsed.doctorInputMode || 'selection');
        setDoctorData(parsed.doctorData || null);
        setManualDoctor(parsed.manualDoctor || manualDoctor);
        setStudyData(parsed.studyData || studyData);
        setReportData(parsed.reportData || reportData);
        setStep(parsed.step || 1);
        toast.info("Borrador recuperado automáticamete.");
      } catch (e) { console.error("Draft recovery failed", e); }
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [orgId]);

  useEffect(() => {
    setPreviewOpened(false);
  }, [reportData, photos, selectionOrder, patientData, doctorData, manualDoctor, studyData]);

  const saveDraft = () => {
    const draft = {
      photos,
      selectionOrder,
      format,
      patientData,
      doctorInputMode,
      doctorData,
      manualDoctor,
      studyData,
      reportData,
      step
    };
    localStorage.setItem('liarena_import_draft', JSON.stringify(draft));
    toast.success("Borrador guardado.");
  };

  async function fetchOrgInfo(id: string) {
    const { data } = await supabase.from('organizations').select('nombre, logo').eq('id', id).maybeSingle();
    if (data) setOrgData(data);
  }

  async function loadResources() {
    try {
      console.log("LIARENA Import: Sincronizando recursos médicos...");

      // 1. Obtener la organización del usuario actual directamente de la DB para máxima precisión
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: userProfile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', authUser.id)
        .single();

      const currentOrgId = userProfile?.organization_id || localStorage.getItem('liarena_org_id');

      if (currentOrgId) fetchOrgInfo(currentOrgId);

      // 2. Carga de Médicos (Visibilidad global con ordenamiento prioritario)
      const { data: usersRes, error: uErr } = await supabase.from('users')
        .select(`
          id,
          nombre,
          apellidos,
          role,
          organization_id,
          doctor_profiles (
            especialidad,
            cedula_profesional,
            cedula_especialidad,
            firma
          )
        `)
        .is('deleted_at', null);

      if (uErr) throw uErr;

      if (usersRes) {
        // Filtramos solo por roles clínicos permitidos
        const clinicalStaff = usersRes.filter(u =>
          ['doctor', 'medic', 'DOCTOR', 'MEDIC'].includes(u.role)
        );

        // Procesamos perfiles de doctor
        const processed = clinicalStaff.map(u => {
          const profiles = u.doctor_profiles;
          const profile = Array.isArray(profiles) ? profiles[0] : profiles;
          return {
            ...u,
            especialidad: profile?.especialidad || "Especialista",
            doctorProfile: profile
          };
        });

        // Aplicamos el algoritmo de priorización por sede
        const sorted = [...processed].sort((a, b) => {
          if (a.organization_id === currentOrgId) return -1;
          if (b.organization_id === currentOrgId) return 1;
          return 0;
        });

        // Mostramos todos los clínicos, pero los de la sede aparecen al principio
        setDoctors(sorted);
        console.log(`LIARENA Import: ${sorted.length} médicos sincronizados.`);
      }

      // 3. Carga de Salas (Filtro por organización del asistente)
      if (currentOrgId) {
        const { data: roomsRes } = await supabase.from('rooms')
          .select('id, nombre')
          .eq('organization_id', currentOrgId)
          .eq('activa', true)
          .is('deleted_at', null);
        if (roomsRes) setRooms(roomsRes);
      }

    } catch (e) {
      console.error("Import Resources Error:", e);
      toast.error("Error al sincronizar personal de la sede.");
    }
  }

  // --- IMAGE IMPORT LOGIC ---
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileList = Array.from(files);

    fileList.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        setPhotos(prev => [...prev, {
          id: Date.now() + Math.random(),
          image: base64,
          comment: "",
          file: file
        }]);
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = "";
  };

  const handleTogglePhoto = (id: number) => {
    setSelectionOrder(prev => {
      if (prev.includes(id)) return prev.filter(item => item !== id);
      if (prev.length >= format) {
        toast.warning(`Límite alcanzado: El formato seleccionado es de ${format} fotos.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const removePhoto = (id: number) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    setSelectionOrder(prev => prev.filter(item => item !== id));
  };

  const movePhoto = (index: number, direction: 'up' | 'down') => {
    const newPhotos = [...photos];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;
    [newPhotos[index], newPhotos[targetIndex]] = [newPhotos[targetIndex], newPhotos[index]];
    setPhotos(newPhotos);
  };

  // --- PATIENT SEARCH ---
  useEffect(() => {
    if (searchQuery.length > 2) searchPatients();
    else setPatients([]);
  }, [searchQuery]);

  async function searchPatients() {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .is('deleted_at', null)
      .or(`nombre.ilike.%${searchQuery}%,apellidos.ilike.%${searchQuery}%`)
      .limit(5);
    setPatients(data || []);
  }

  const selectPatient = (p: any) => {
    setPatientData({
      id: p.id,
      nombre: p.nombre,
      apellidos: p.apellidos,
      birthDate: p.fecha_nacimiento || "",
      sexo: p.sexo || "M",
      expediente: p.expediente || "",
      curp: p.curp || "",
      telefono: p.telefono || "",
      correo: p.correo || "",
      observaciones: p.observaciones || ""
    });
    setPatients([]);
    setSearchQuery("");
  };

  const calculateAge = (dateString: string) => {
    if (!dateString) return "--";
    const parts = dateString.split('-');
    if (parts.length < 3) return "--";
    const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return `${age} años`;
  };

  // --- REGLA DINÁMICA DE FUENTE (CLINICAL ENGINE) ---
  const calculateClinicalFontSize = (findings: string, diagnosis: string) => {
    if (format === 12) return '12px'; // Regla fija para Layout 12 (Doble Página)

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

  // --- FINALIZATION ---
  const validateData = () => {
    if (!patientData.nombre || !patientData.birthDate) {
      toast.error("Datos del paciente incompletos.");
      setStep(2);
      return false;
    }

    if (doctorInputMode === 'selection' && !doctorData) {
      toast.error("Seleccione un médico responsable.");
      setStep(3);
      return false;
    }

    if (doctorInputMode === 'manual' && (!manualDoctor.nombre || !manualDoctor.especialidad || !manualDoctor.cedulaProf)) {
      toast.error("Complete la información del médico manual.");
      setStep(3);
      return false;
    }

    if (selectionOrder.length !== format) {
      toast.error(`Debe seleccionar exactamente ${format} fotografías para el reporte.`);
      setStep(1);
      return false;
    }
    return true;
  };

  const getPdfData = () => {
    const selectedRoom = rooms.find(r => r.id === studyData.roomId);

    let docName = "";
    let specialty = "";
    let cp = "";
    let ce = "";
    let signature = null;

    if (doctorInputMode === 'selection') {
      docName = `${doctorData.nombre} ${doctorData.apellidos}`;
      specialty = doctorData.doctorProfile?.especialidad || "";
      cp = doctorData.doctorProfile?.cedula_profesional || "---";
      ce = doctorData.doctorProfile?.cedula_especialidad || "---";
      signature = doctorData.doctorProfile?.firma;
    } else {
      docName = `${manualDoctor.nombre} ${manualDoctor.apellidos}`;
      specialty = manualDoctor.especialidad;
      cp = manualDoctor.cedulaProf;
      ce = manualDoctor.cedulaEsp || "---";
    }

    return {
      patientName: `${patientData.nombre} ${patientData.apellidos}`,
      age: calculateAge(patientData.birthDate),
      sexo: patientData.sexo,
      birthDate: patientData.birthDate,
      expediente: patientData.expediente,
      procedureType: studyData.type,
      report: { findings: reportData.findings, diagnosis: reportData.diagnosis },
      doctorName: docName,
      doctor: {
        nombreFull: docName,
        especialidad: specialty,
        cedulaProf: cp,
        cedulaEsp: ce,
        signature: signature
      },
      orgLogo: orgData?.logo,
      location: {
         room: rooms.find(r => r.id === studyData.roomId)?.nombre || "SALA EXTERNA",
         organization: orgData?.nombre,
         logo: orgData?.logo
      }
    };
  };

  const handleGeneratePDF = async () => {
    if (!validateData()) return;
    setLoading(true);
    try {
      const pdfFinalData = getPdfData();
      const orderedSelection = selectionOrder.map(id => photos.find(p => p.id === id)).filter(Boolean);
      const doc = await pdfGenerator.generateStudyReport(pdfFinalData, orderedSelection);

      // Save local folder structure
      const patientFolderName = `${patientData.nombre} ${patientData.apellidos}`;
      const localPatientPath = await localRecordService.ensurePatientFolder(patientFolderName, patientData.birthDate);
      const localStudyPath = await localRecordService.ensureStudyFolder(localPatientPath!, studyData.type);

      if (localStudyPath) {
        // Save images
        for (let i = 0; i < orderedSelection.length; i++) {
          await localRecordService.saveCapture(localStudyPath, i + 1, orderedSelection[i].image);
        }
        // Save metadata
        await localRecordService.saveMetadata(localStudyPath, {
          ...pdfFinalData,
          imported: true,
          importDate: new Date().toISOString()
        });
        // Save PDF
        const pdfBlob = doc.output('blob');
        await localRecordService.saveReportPDF(localStudyPath, pdfBlob);
      }

      doc.save(`Reporte_Importado_${patientData.nombre}.pdf`);
      localStorage.removeItem('liarena_import_draft');
      toast.success("Reporte generado y guardado localmente.");
      navigate("/assistant");
    } catch (e) {
      console.error(e);
      toast.error("Error al generar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (!validateData()) return;
    setLoading(true);
    const id = toast.loading("Generando previsualización de alta fidelidad...");
    try {
      const pdfFinalData = getPdfData();
      const orderedSelection = selectionOrder.map(id => photos.find(p => p.id === id)).filter(Boolean);
      const doc = await pdfGenerator.generateStudyReport(pdfFinalData, orderedSelection);
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfPreviewUrl(url);
      setShowPreviewModal(true);
      setPreviewOpened(true);
      toast.dismiss(id);
    } catch (e) {
      console.error("PDF Preview Error:", e);
      toast.error("Error al generar vista previa.");
      toast.dismiss(id);
    } finally {
      setLoading(false);
    }
  };

  const workflowSteps = [
    { id: 1, label: "Fotos", status: step > 1 ? "done" : "active" },
    { id: 2, label: "Paciente", status: step > 2 ? "done" : step === 2 ? "active" : "pending" },
    { id: 3, label: "Contexto", status: step > 3 ? "done" : step === 3 ? "active" : "pending" },
    { id: 4, label: "Redacción", status: step > 4 ? "done" : step === 4 ? "active" : "pending" },
    { id: 5, label: "Finalizar", status: step === 5 ? "active" : "pending" },
  ];

  return (
    <div className="h-screen bg-[#FBFBFD] flex overflow-hidden font-sans">

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col p-8 shrink-0">
        <div className="flex items-center gap-3 mb-12">
          <div className="p-2 bg-slate-900 rounded-xl"><Upload size={18} className="text-white" /></div>
          <span className="font-black italic uppercase tracking-widest text-[10px] text-slate-900">Import Wizard v1.0</span>
        </div>

        <div className="space-y-8 flex-1">
          {workflowSteps.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-5 relative group">
               {idx < workflowSteps.length - 1 && <div className={cn("absolute left-4 top-8 w-0.5 h-8 transition-colors", s.status === 'done' ? "bg-primary" : "bg-slate-100")} />}
               <div className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-all", s.status === 'active' ? "bg-primary text-white shadow-lg ring-4 ring-primary/20" : s.status === 'done' ? "bg-primary text-white" : "bg-slate-50 text-slate-300")}>
                  {s.status === 'done' ? <CheckCircle2 size={18} /> : <span className="text-[11px] font-black">{s.id}</span>}
               </div>
               <span className={cn("text-[11px] font-bold uppercase tracking-widest italic transition-colors", s.status === 'active' ? "text-slate-900" : "text-slate-300")}>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4 mt-auto">
          <Button onClick={saveDraft} variant="outline" className="w-full h-12 rounded-2xl border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50">
             Guardar Borrador
          </Button>
          <Button variant="ghost" onClick={() => { localStorage.removeItem('liarena_import_draft'); navigate(-1); }} className="w-full h-12 rounded-2xl text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50">
             <ArrowLeft className="w-4 h-4 mr-2" /> Cancelar Importación
          </Button>
        </div>
      </aside>

      {/* MAIN WORK AREA */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/30">

        {/* HEADER */}
        <header className="h-24 border-b border-slate-100 bg-white/80 backdrop-blur-md px-12 flex items-center justify-between shrink-0 z-10">
           <div className="space-y-1">
              <h2 className="text-2xl font-bold italic text-slate-900 uppercase tracking-tighter">Importar Reporte</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Construya un reporte a partir de evidencia existente</p>
           </div>
           <Badge className="bg-slate-900 text-white font-black italic h-8 px-4 rounded-xl">FORMATO {format} FOTOS</Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex flex-col items-center">
           <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* STEP 1: PHOTOS */}
              {step === 1 && (
                <div className="space-y-10">
                   <div className="grid grid-cols-2 gap-6">
                      <button onClick={() => setFormat(8)} className={cn("p-10 rounded-[40px] border-2 transition-all text-left group", format === 8 ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10" : "border-slate-100 bg-white")}>
                         <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", format === 8 ? "bg-primary text-white" : "bg-slate-50 text-slate-400")}>
                            <Layout size={24} />
                         </div>
                         <h3 className={cn("text-xl font-bold uppercase italic tracking-tighter mb-2", format === 8 ? "text-primary" : "text-slate-900")}>Layout 8 Fotos</h3>
                         <p className="text-sm text-slate-400 font-medium italic">Un solo anexo de 4x2 fotografías grandes.</p>
                      </button>
                      <button onClick={() => setFormat(12)} className={cn("p-10 rounded-[40px] border-2 transition-all text-left group", format === 12 ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10" : "border-slate-100 bg-white")}>
                         <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", format === 12 ? "bg-primary text-white" : "bg-slate-50 text-slate-400")}>
                            <Camera size={24} />
                         </div>
                         <h3 className={cn("text-xl font-bold uppercase italic tracking-tighter mb-2", format === 12 ? "text-primary" : "text-slate-900")}>Layout 12 Fotos</h3>
                         <p className="text-sm text-slate-400 font-medium italic">Dos páginas: Clínica + Anexo 3x4 de alta densidad.</p>
                      </button>
                   </div>

                   <Card className="p-12 border-2 border-dashed border-slate-200 bg-white/50 rounded-[48px] flex flex-col items-center text-center space-y-6 group hover:border-primary/30 transition-all">
                      <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-300 group-hover:scale-110 group-hover:text-primary transition-all duration-500">
                         <Upload size={40} />
                      </div>
                      <div className="space-y-2">
                         <h4 className="text-2xl font-bold text-slate-900 uppercase italic tracking-tighter">Cargar Fotografías</h4>
                         <p className="text-sm text-slate-400 font-medium italic max-w-xs">Seleccione archivos desde su USB o almacenamiento local. Formatos: JPG, PNG, WEBP.</p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileImport}
                        className="hidden"
                        ref={fileInputRef}
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black uppercase text-[11px] tracking-widest gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all"
                      >
                         Seleccionar Imágenes
                      </Button>
                   </Card>

                   {photos.length > 0 && (
                     <div className="grid grid-cols-4 gap-6 animate-in fade-in duration-500">
                        {photos.map((p, idx) => {
                          const isSelected = selectionOrder.includes(p.id);
                          const selectIdx = selectionOrder.indexOf(p.id) + 1;

                          return (
                            <Card
                               key={p.id}
                               onClick={() => handleTogglePhoto(p.id)}
                               className={cn(
                                 "relative aspect-square rounded-[32px] overflow-hidden cursor-pointer transition-all duration-300 border-none",
                                 isSelected ? "ring-4 ring-primary ring-offset-4 scale-[0.98]" : "opacity-60 grayscale hover:opacity-100 hover:grayscale-0 shadow-sm hover:shadow-xl"
                               )}
                            >
                               <img src={p.image} className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                                  <button
                                     onClick={(e) => { e.stopPropagation(); removePhoto(p.id); }}
                                     className="p-3 bg-danger text-white rounded-xl hover:scale-110 active:scale-95 transition-all"
                                  >
                                     <Trash2 size={20} />
                                  </button>
                               </div>
                               <div className={cn(
                                  "absolute top-4 left-4 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-lg",
                                  isSelected ? "bg-primary text-white" : "bg-white/90 text-slate-300"
                               )}>
                                  {isSelected ? selectIdx : <Plus size={20} />}
                               </div>
                            </Card>
                          );
                        })}
                     </div>
                   )}
                </div>
              )}

              {/* STEP 2: PATIENT DATA */}
              {step === 2 && (
                <div className="space-y-10">
                   <div className="space-y-4">
                      <div className="relative group">
                         <Search className="absolute left-5 top-5 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                         <Input
                           placeholder="Buscar paciente existente..."
                           className="h-16 pl-14 bg-white border-none rounded-[24px] shadow-sm text-lg font-bold italic"
                           value={searchQuery}
                           onChange={(e)=>setSearchQuery(e.target.value)}
                         />
                      </div>
                      {patients.length > 0 && (
                        <div className="bg-white rounded-[28px] overflow-hidden shadow-sm divide-y divide-slate-50 border border-slate-100 mb-4">
                           {patients.map(p => (
                             <button key={p.id} onClick={()=>selectPatient(p)} className="w-full p-5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                   <Avatar fallback={p.nombre[0]} className="h-10 w-10 font-black italic" />
                                   <div>
                                      <p className="font-bold text-slate-900 uppercase italic group-hover:text-primary transition-colors">{p.nombre} {p.apellidos}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">FN: {p.fecha_nacimiento}</p>
                                   </div>
                                </div>
                                <Plus size={18} className="text-slate-200 group-hover:text-primary transition-all" />
                             </button>
                           ))}
                        </div>
                      )}
                   </div>

                   <div className="grid grid-cols-2 gap-6 bg-white p-10 rounded-[48px] shadow-sm">
                      <div className="space-y-4">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Información Primaria</label>
                         <Input placeholder="Nombre" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={patientData.nombre} onChange={(e)=>setPatientData({...patientData, nombre: e.target.value})} />
                         <Input placeholder="Apellidos" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={patientData.apellidos} onChange={(e)=>setPatientData({...patientData, apellidos: e.target.value})} />
                         <div className="grid grid-cols-2 gap-4">
                            <Input type="date" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={patientData.birthDate} onChange={(e)=>setPatientData({...patientData, birthDate: e.target.value})} />
                            <select value={patientData.sexo} onChange={(e)=>setPatientData({...patientData, sexo: e.target.value})} className="h-14 px-4 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none">
                               <option value="M">Masculino</option>
                               <option value="F">Femenino</option>
                            </select>
                         </div>
                         <div className="bg-primary/5 p-4 rounded-2xl flex items-center justify-between">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Edad Calculada</span>
                            <span className="text-sm font-bold text-primary italic">{calculateAge(patientData.birthDate)}</span>
                         </div>
                      </div>
                      <div className="space-y-4">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contacto & Registro</label>
                         <Input placeholder="Expediente (Folio)" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={patientData.expediente} onChange={(e)=>setPatientData({...patientData, expediente: e.target.value})} />
                         <Input placeholder="CURP" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={patientData.curp} onChange={(e)=>setPatientData({...patientData, curp: e.target.value})} />
                         <Input placeholder="Teléfono" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={patientData.telefono} onChange={(e)=>setPatientData({...patientData, telefono: e.target.value})} />
                         <Input placeholder="Correo Electrónico" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={patientData.correo} onChange={(e)=>setPatientData({...patientData, correo: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                         <Input placeholder="Observaciones generales del paciente..." className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={patientData.observaciones} onChange={(e)=>setPatientData({...patientData, observaciones: e.target.value})} />
                      </div>
                   </div>
                </div>
              )}

              {/* STEP 3: CONTEXT & DOCTOR */}
              {step === 3 && (
                <div className="space-y-10">
                   <section className="space-y-6">
                      <div className="flex justify-between items-end">
                         <h3 className="text-xl font-bold text-slate-900 uppercase italic tracking-tighter">Médico Responsable</h3>
                         <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                               onClick={() => setDoctorInputMode('selection')}
                               className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", doctorInputMode === 'selection' ? "bg-white text-primary shadow-sm" : "text-slate-400")}
                            >
                               Seleccionar
                            </button>
                            <button
                               onClick={() => setDoctorInputMode('manual')}
                               className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", doctorInputMode === 'manual' ? "bg-white text-primary shadow-sm" : "text-slate-400")}
                            >
                               Manual
                            </button>
                         </div>
                      </div>

                      {doctorInputMode === 'selection' ? (
                        <div className="grid grid-cols-2 gap-4">
                           {doctors.map(d => (
                             <button key={d.id} onClick={()=>setDoctorData(d)} className={cn("p-6 rounded-3xl border-2 transition-all flex items-center gap-4 text-left", doctorData?.id === d.id ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5" : "border-slate-100 bg-white")}>
                                <Avatar fallback={d.nombre[0]} className="h-12 w-12 font-bold" />
                                <div className="min-w-0">
                                   <p className="font-bold uppercase italic text-sm truncate">{d.nombre} {d.apellidos}</p>
                                   <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest truncate">{d.especialidad}</p>
                                </div>
                             </button>
                           ))}
                           {doctors.length === 0 && <div className="col-span-2 p-8 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 text-slate-400 text-xs italic">No se encontraron especialistas registrados. Pruebe el ingreso manual.</div>}
                        </div>
                      ) : (
                        <Card className="p-10 rounded-[48px] bg-white border-none shadow-sm space-y-6">
                           <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre(s)</label>
                                 <Input placeholder="Ej: Daniel Martin" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={manualDoctor.nombre} onChange={(e)=>setManualDoctor({...manualDoctor, nombre: e.target.value})} />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellidos</label>
                                 <Input placeholder="Ej: Escobedo Paredes" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={manualDoctor.apellidos} onChange={(e)=>setManualDoctor({...manualDoctor, apellidos: e.target.value})} />
                              </div>
                              <div className="col-span-2 space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Especialidad</label>
                                 <Input placeholder="Ej: GASTROENTEROLOGÍA / ENDOSCOPIA" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={manualDoctor.especialidad} onChange={(e)=>setManualDoctor({...manualDoctor, especialidad: e.target.value})} />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cédula Profesional</label>
                                 <Input placeholder="0000000" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={manualDoctor.cedulaProf} onChange={(e)=>setManualDoctor({...manualDoctor, cedulaProf: e.target.value})} />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cédula Especialidad</label>
                                 <Input placeholder="0000000" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={manualDoctor.cedulaEsp} onChange={(e)=>setManualDoctor({...manualDoctor, cedulaEsp: e.target.value})} />
                              </div>
                           </div>
                        </Card>
                      )}
                   </section>

                   <section className="space-y-6">
                      <h3 className="text-xl font-bold text-slate-900 uppercase italic tracking-tighter">Información del Estudio</h3>
                      <div className="bg-white p-10 rounded-[48px] shadow-sm grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Estudio</label>
                            <select value={studyData.type} onChange={(e)=>setStudyData({...studyData, type: e.target.value})} className="h-14 w-full px-4 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none">
                               <option value="Endoscopia">Endoscopia</option>
                               <option value="Colonoscopia">Colonoscopia</option>
                               <option value="CPRE">CPRE</option>
                               <option value="USE">USE</option>
                               <option value="Broncoscopia">Broncoscopia</option>
                            </select>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Procedimiento</label>
                            <Input placeholder="Ej: Diagnóstica, Terapéutica..." className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={studyData.procedimiento} onChange={(e)=>setStudyData({...studyData, procedimiento: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                            <Input type="date" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={studyData.fecha} onChange={(e)=>setStudyData({...studyData, fecha: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora</label>
                            <Input type="time" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={studyData.hora} onChange={(e)=>setStudyData({...studyData, hora: e.target.value})} />
                         </div>
                         <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sala de Procedimiento</label>
                            <div className="grid grid-cols-2 gap-3">
                               {rooms.map(r => (
                                 <button key={r.id} onClick={()=>setStudyData({...studyData, roomId: r.id})} className={cn("p-4 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest transition-all", studyData.roomId === r.id ? "border-primary bg-primary/5 text-primary" : "border-slate-100 bg-slate-50 text-slate-400")}>{r.nombre}</button>
                               ))}
                            </div>
                         </div>
                      </div>
                   </section>
                </div>
              )}

              {/* STEP 4: REDACTION */}
              {step === 4 && (
                <div className="space-y-10">
                   <div className="bg-white p-12 rounded-[48px] shadow-sm space-y-8">
                      <div className="space-y-4">
                         <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-3">
                            <div className="p-2 bg-primary/5 rounded-lg"><PenTool size={14} className="text-primary" /></div>
                            Hallazgos Clínicos
                         </label>
                         <textarea
                           value={reportData.findings}
                           onChange={(e) => setReportData({...reportData, findings: e.target.value})}
                           style={{ fontSize: clinicalFontSize }}
                           className="w-full h-80 bg-slate-50 border border-slate-100 rounded-[32px] p-8 font-bold text-slate-700 outline-none focus:ring-8 focus:ring-primary/5 focus:bg-white transition-all resize-none shadow-inner"
                           placeholder="Describa los hallazgos observados en el estudio..."
                         />
                      </div>
                      <div className="space-y-4">
                         <div className="flex justify-between items-end italic ml-1">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                               <div className="p-2 bg-primary/5 rounded-lg"><CheckCircle2 size={14} className="text-primary" /></div>
                               Diagnóstico Final
                            </label>
                            <span className={cn(
                               "text-[10px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-400 transition-all",
                               clinicalFontSize === '8px' && "bg-amber-100 text-amber-700 animate-pulse"
                            )}>
                               Tamaño Fuente: {clinicalFontSize}
                            </span>
                         </div>
                         <textarea
                           value={reportData.diagnosis}
                           onChange={(e) => setReportData({...reportData, diagnosis: e.target.value})}
                           style={{ fontSize: clinicalFontSize }}
                           className="w-full h-40 bg-slate-50 border border-slate-100 rounded-[32px] p-8 font-bold text-slate-900 uppercase outline-none focus:ring-8 focus:ring-primary/5 focus:bg-white transition-all resize-none shadow-inner"
                           placeholder="Diagnóstico concluyente..."
                         />
                      </div>
                   </div>
                </div>
              )}

              {/* STEP 5: FINALIZATION */}
              {step === 5 && (
                <div className="flex flex-col items-center justify-center space-y-10 py-12">
                   <div className="w-24 h-24 bg-emerald-50 rounded-[36px] flex items-center justify-center text-emerald-500 shadow-inner">
                      <CheckCircle2 size={48} className="animate-in zoom-in duration-500" />
                   </div>
                   <div className="text-center space-y-3">
                      <h3 className="text-4xl font-bold text-slate-900 uppercase italic tracking-tighter">Validación Final</h3>
                      <p className="text-slate-400 text-sm font-medium italic">Confirme que todos los datos y fotografías son correctos.</p>
                   </div>

                   <Card className="w-full bg-white rounded-[60px] p-12 shadow-2xl space-y-10 border-none">
                      <div className="grid grid-cols-2 gap-8">
                         <div className="p-8 bg-slate-50 rounded-[40px] space-y-4">
                            <div className="flex items-center gap-3 opacity-30">
                               <User size={14} className="text-slate-900" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Paciente</span>
                            </div>
                            <div>
                               <p className="text-xl font-bold text-slate-900 uppercase tracking-tight">{patientData.nombre} {patientData.apellidos}</p>
                               <p className="text-xs text-slate-500 font-bold italic">{patientData.expediente || "SIN EXPEDIENTE"}</p>
                            </div>
                         </div>
                         <div className="p-8 bg-slate-50 rounded-[40px] space-y-4">
                            <div className="flex items-center gap-3 opacity-30">
                               <Camera size={14} className="text-slate-900" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Evidencia</span>
                            </div>
                            <div>
                               <p className="text-xl font-bold text-slate-900 uppercase tracking-tight">{selectionOrder.length} Seleccionadas</p>
                               <Badge className="bg-slate-900 text-white border-none text-[9px] px-3 mt-1 tracking-widest uppercase">Layout {format} Fotos</Badge>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                        <Button
                          onClick={handlePreviewPDF}
                          variant="outline"
                          className="w-full h-16 rounded-[28px] border-2 border-slate-100 text-slate-500 font-black uppercase text-[12px] tracking-[0.2em] hover:bg-slate-50 transition-all gap-3"
                        >
                           <Eye size={20} /> Ver Vista Previa Real
                        </Button>

                        <Button
                           onClick={handleGeneratePDF}
                           disabled={loading || !previewOpened}
                           className={cn(
                             "w-full h-20 rounded-[32px] font-black uppercase text-[14px] tracking-[0.2em] shadow-2xl transition-all gap-4",
                             !previewOpened ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-primary text-white shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
                           )}
                        >
                           {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Printer size={24} /> Autorizar y Generar PDF</>}
                        </Button>
                        {!previewOpened && <p className="text-[10px] text-amber-500 font-bold italic animate-pulse">Debe abrir la vista previa real para poder autorizar el reporte.</p>}
                      </div>
                   </Card>
                </div>
              )}

           </div>
        </div>

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
                       handleGeneratePDF();
                     }}
                     className="h-16 px-16 rounded-3xl bg-primary text-white font-black uppercase text-[12px] tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all gap-4"
                   >
                      <Printer size={20} /> Autorizar y Guardar PDF
                   </Button>
                </div>
             </Card>
          </div>
        )}

        {/* FOOTER NAVIGATION */}
        <footer className="h-24 bg-white border-t border-slate-100 px-12 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-4">
              {step > 1 && (
                <Button variant="ghost" onClick={() => setStep(step - 1)} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-transparent flex items-center gap-2">
                   <ChevronLeft size={16} /> Regresar
                </Button>
              )}
           </div>

           <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                 <span className="text-[9px] font-black text-slate-300 uppercase italic">Fase {step} de 5</span>
                 <span className="text-[11px] font-bold text-slate-900 uppercase">{workflowSteps[step-1].label}</span>
              </div>
              {step < 5 && (
                 <Button
                    onClick={() => {
                        if (step === 1 && photos.length === 0) { toast.error("Debe importar al menos una fotografía."); return; }
                        setStep(step + 1);
                    }}
                    className="h-14 px-12 rounded-2xl bg-slate-900 text-white font-black uppercase text-[11px] tracking-widest gap-4 group"
                 >
                    Siguiente <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                 </Button>
              )}
           </div>
        </footer>

      </main>
    </div>
  );
}
