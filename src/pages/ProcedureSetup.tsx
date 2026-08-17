import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Button,
  Card,
  Input,
  Badge,
  Avatar,
  toast
} from "../components/ui/index";
import {
  ArrowLeft,
  User,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  Search,
  Activity,
  CheckCircle2,
  Clock,
  Layout,
  Stethoscope,
  Loader2
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { localRecordService } from "../lib/local-record-service";
import { profileService, DoctorProfileData } from "../lib/profile-service";
import { wizardService } from "../lib/wizard-service";

export default function ProcedureSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [warmingUp, setWarmingUp] = useState(false);
  const [orgData, setOrgData] = useState<any>(null);
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState<DoctorProfileData | null>(null);

  const [formData, setFormData] = useState({
    patientId: "",
    nombre: "",
    apellidos: "",
    birthDate: "",
    sexo: "M",
    age: "",
    doctorId: "",
    roomId: "",
    procedureType: "",
    customProcedureType: ""
  });

  const calculateAge = (dateString: string) => {
    if (!dateString) return "";
    const today = new Date();
    // Parseo manual para evitar desfases de zona horaria (YYYY-MM-DD)
    const parts = dateString.split('-');
    if (parts.length < 3) return "";

    const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? `${age} años` : "";
  };

  const orgId = localStorage.getItem('liarena_org_id');

  useEffect(() => {
    async function loadResources() {
      if (!orgId) return;

      try {
        console.log("LIARENA Core: Sincronizando recursos médicos...");

        // CARGA EN PARALELO: Salas y Médicos
        const [roomsRes, usersRes] = await Promise.all([
          supabase.from('rooms')
            .select('id, nombre')
            .eq('organization_id', orgId)
            .eq('activa', true)
            .is('deleted_at', null),
          supabase.from('users')
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
            .is('deleted_at', null)
        ]);

        if (roomsRes.data) setRooms(roomsRes.data);

        if (usersRes.data) {
          // Filtramos solo por rol clínico
          const clinicalStaff = usersRes.data.filter(u =>
            ['doctor', 'medic', 'DOCTOR', 'MEDIC'].includes(u.role)
          );

          // Procesamos especialidad desde la unión
          const processed = clinicalStaff.map(u => {
            const profiles = u.doctor_profiles;
            const profile = Array.isArray(profiles) ? profiles[0] : profiles;
            return {
              ...u,
              especialidad: profile?.especialidad || "",
              doctorProfile: profile
            };
          });

          // Ordenamos: Médicos de esta sede aparecen primero
          const sorted = [...processed].sort((a, b) => {
            if (a.organization_id === orgId) return -1;
            if (b.organization_id === orgId) return 1;
            return 0;
          });

          setDoctors(sorted);
          console.log(`LIARENA Core: ${sorted.length} especialistas sincronizados con perfiles.`);
        }

      } catch (error) {
        console.error("LIARENA Core Error:", error);
      }
    }
    loadResources();
  }, [orgId]);

  // --- NÚCLEO DE PRE-CARGA (WARM-UP) ---
  useEffect(() => {
    if (step === 3 && !warmingUp) {
      const preloadHardware = async () => {
        setWarmingUp(true);
        console.log("🚀 LIARENA Warm-up: Pre-cargando motor de video...");
        try {
          const savedConfig = localStorage.getItem('liarena_pro_capture_config');
          if (savedConfig) {
            const config = JSON.parse(savedConfig);
            const deviceId = config.videoDevice?.deviceId;
            if (deviceId) {
              const constraints = {
                video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } }
              };
              // Iniciamos el stream silenciosamente en el background global
              const stream = await navigator.mediaDevices.getUserMedia(constraints);
              (window as any).stream = stream;
              console.log("✅ LIARENA Warm-up: Señal de video lista.");
            }
          }
        } catch (e) {
          console.warn("Warm-up failed (expected if device in use or not configured):", e);
        }
      };
      preloadHardware();
    }
  }, [step, warmingUp]);

  useEffect(() => {
    if (location.state?.prefillPatient) {
      const p = location.state.prefillPatient;
      setFormData(prev => ({
        ...prev,
        patientId: p.patientId || p.id,
        nombre: p.nombre || p.patientName?.split(' ')[0] || "",
        apellidos: p.apellidos || p.patientName?.split(' ').slice(1).join(' ') || "",
        birthDate: p.birthDate || p.fecha_nacimiento || "",
        sexo: p.sexo?.charAt(0) || "M",
        age: p.age || calculateAge(p.birthDate || p.fecha_nacimiento),
        doctorId: p.doctorId || prev.doctorId,
        roomId: p.roomId || prev.roomId,
        procedureType: p.procedureType || "",
        customProcedureType: p.customProcedureType || ""
      }));
      setStep(3);
    }
  }, [location.state]);

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

  const handleDoctorSelect = async (docId: string) => {
    setFormData(prev => ({ ...prev, doctorId: docId }));
    const profile = await profileService.getDoctorProfile(docId);
    setSelectedDoctorProfile(profile);
  };

  const procedures = ["Endoscopia", "Colonoscopia", "CPRE", "USE"];

  const handleNext = async () => {
    if (step < 3) setStep(step + 1);
    else {
      setLoading(true);
      try {
        // 1. CARGA ACELERADA EN PARALELO
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error("Sesión no válida.");

        const [profileRes, orgRes] = await Promise.all([
          supabase.from('users')
            .select('organization_id, id, nombre, apellidos, role')
            .eq('auth_user_id', authUser.id)
            .single(),
          supabase.from('organizations')
            .select('logo, nombre')
            .eq('id', orgId)
            .maybeSingle()
        ]);

        const userProfile = profileRes.data;
        const orgInfo = orgRes.data;

        if (!userProfile) throw new Error("No se pudo recuperar el perfil del usuario.");

        let currentPatientId = formData.patientId;

        // 2. RECUPERACIÓN PROFESIONAL Y PERSISTENCIA (Paralelo Nivel 2)
        const doctorInfo = doctors.find(d => d.id === formData.doctorId);
        let finalDoctorProfile = selectedDoctorProfile;

        if (!finalDoctorProfile?.especialidad && doctorInfo?.doctorProfile) {
          finalDoctorProfile = { ...doctorInfo.doctorProfile, id: doctorInfo.id, nombre: doctorInfo.nombre, apellidos: doctorInfo.apellidos } as any;
        }

        const docProfilePromise = (formData.doctorId && (!finalDoctorProfile || !finalDoctorProfile.especialidad))
          ? profileService.getDoctorProfile(formData.doctorId)
          : Promise.resolve(finalDoctorProfile);

        const patientPromise = !currentPatientId
          ? supabase.from('patients').insert({
              nombre: formData.nombre.trim(),
              apellidos: formData.apellidos.trim(),
              fecha_nacimiento: formData.birthDate || null,
              sexo: formData.sexo,
              expediente: `EXP-${Date.now().toString().slice(-6)}`,
              organization_id: userProfile.organization_id
            }).select().single()
          : Promise.resolve({ data: { id: currentPatientId }, error: null });

        const [pRes, dRes] = await Promise.all([patientPromise, docProfilePromise]);

        if (pRes.error) throw pRes.error;
        currentPatientId = pRes.data.id;
        finalDoctorProfile = dRes;

        // 3. DATOS FINALES
        const selectedRoom = rooms.find(r => r.id === formData.roomId);
        const finalDoctorName = finalDoctorProfile
          ? `Dr ${finalDoctorProfile.nombre} ${finalDoctorProfile.apellidos}`
          : (doctorInfo ? `Dr ${doctorInfo.nombre} ${doctorInfo.apellidos}` : "MÉDICO");

        const finalProcedureType = formData.customProcedureType || formData.procedureType || "Endoscopia";
        const finalAge = calculateAge(formData.birthDate);

        // 4. CREACIÓN DEL ESTUDIO (Pasamos el perfil pre-cargado para evitar queries extras)
        console.log("LIARENA Core: Registrando estudio...");
        const studyId = await wizardService.createStudyRecord({
          patientId: currentPatientId,
          procedureType: finalProcedureType,
          doctorId: formData.doctorId,
          roomId: formData.roomId
        }, [], userProfile);

        if (!studyId) throw new Error("No se pudo reservar el folio del estudio.");

        // 5. CONSOLIDACIÓN DE EXPEDIENTE CLÍNICO
        const reportContext: any = {
          doctor: {
            id: formData.doctorId,
            nombreFull: finalDoctorName,
            especialidad: finalDoctorProfile?.especialidad || doctorInfo?.especialidad || "",
            cedulaProf: finalDoctorProfile?.cedula_profesional || doctorInfo?.doctorProfile?.cedula_profesional || "---",
            cedulaEsp: finalDoctorProfile?.cedula_especialidad || doctorInfo?.doctorProfile?.cedula_especialidad || "---",
            signature: finalDoctorProfile?.firma || doctorInfo?.doctorProfile?.firma
          },
          patient: {
            id: currentPatientId,
            nombreFull: `${formData.nombre} ${formData.apellidos}`,
            expediente: `EXP-${currentPatientId.slice(-6).toUpperCase()}`,
            edad: finalAge,
            fn: formData.birthDate,
            sexo: formData.sexo
          },
          assistant: {
            id: userProfile.id,
            nombreFull: `${userProfile.nombre} ${userProfile.apellidos}`
          },
          location: {
            organization: orgInfo?.nombre || "LIARENA NODE",
            room: selectedRoom?.nombre || "SALA DE ENDOSCOPIA",
            logo: orgInfo?.logo || finalDoctorProfile?.organization?.logo || doctorInfo?.doctorProfile?.organization?.logo
          },
          study: {
            id: studyId,
            type: finalProcedureType,
            timestamp: new Date().toISOString()
          }
        };

        localStorage.setItem('liarena_report_context', JSON.stringify(reportContext));
        localStorage.setItem('liarena_active_procedure', JSON.stringify({
           ...formData,
           studyId,
           procedureType: finalProcedureType,
           doctorName: finalDoctorName,
           doctorProfile: finalDoctorProfile,
           roomName: selectedRoom?.nombre || "SALA DE ENDOSCOPIA"
        }));

        // Notify Updater to block updates
        if ((window as any).ipcRenderer) {
          (window as any).ipcRenderer.update.setProcedureActive(true);
        }

        toast.success("Expediente sincronizado.");
        navigate("/procedure/active");
      } catch (e: any) {
        console.error("Critical Setup Error:", e);
        toast.error("Fallo al iniciar procedimiento: " + (e.message || "Error de red"));
      } finally {
        setLoading(false);
      }
    }
  };

  const workflowSteps = [
    { id: 1, label: "Paciente", status: step > 1 ? "done" : "active" },
    { id: 2, label: "Médico & Sala", status: step > 2 ? "done" : step === 2 ? "active" : "pending" },
    { id: 3, label: "Estudio", status: step === 3 ? "active" : "pending" },
    { id: 4, label: "Captura", status: "pending" },
    { id: 5, label: "Reporte", status: "pending" },
  ];

  return (
    <div className="h-full min-h-[calc(100vh-12rem)] bg-[#F4F4F7] rounded-[48px] flex overflow-hidden font-sans border border-slate-100 shadow-inner">

      {/* LEFT: CLINICAL INFO */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col p-8 shrink-0 hidden lg:flex">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2 bg-slate-900 rounded-xl"><Activity size={18} className="text-white" /></div>
          <span className="font-black italic uppercase tracking-widest text-[10px] text-slate-900">Console v1.0</span>
        </div>

        <div className="space-y-10">
          <section className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Paciente</h3>
             <div className="space-y-1">
                <p className="font-bold text-slate-900 uppercase truncate">{formData.nombre || "Seleccione Paciente"} {formData.apellidos}</p>
                <div className="flex flex-col gap-0.5">
                   <p className="text-[10px] text-slate-400 italic">FN: {formData.birthDate || "---"}</p>
                   <p className="text-[10px] text-slate-400 italic">Edad: {calculateAge(formData.birthDate) || "---"}</p>
                   <p className="text-[10px] text-slate-400 italic">Sexo: {formData.sexo}</p>
                </div>
             </div>
          </section>

          <section className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contexto</h3>
             <div className="space-y-3">
                <div className="flex items-center gap-3">
                   <Avatar
                    fallback={(doctors.find(d => d.id === formData.doctorId)?.nombre || selectedDoctorProfile?.nombre)?.[0] || "D"}
                    src={selectedDoctorProfile?.avatar_url}
                    className="h-8 w-8 text-[10px]"
                   />
                   <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-slate-700 truncate">
                        {formData.doctorId
                          ? (() => {
                              const localDoc = doctors.find(d => d.id === formData.doctorId);
                              if (localDoc) return `${localDoc.nombre} ${localDoc.apellidos}`;
                              if (selectedDoctorProfile) return `${selectedDoctorProfile.nombre} ${selectedDoctorProfile.apellidos}`;
                              return "Cargando...";
                            })()
                          : "Sin Asignar"}
                      </span>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-8 flex justify-center"><DoorOpen size={14} className="text-slate-400" /></div>
                   <span className="text-[11px] font-bold text-slate-700">{rooms.find(r=>r.id===formData.roomId)?.nombre || "Sala Pendiente"}</span>
                </div>
             </div>
          </section>

          <section className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estado</h3>
             <Badge className="bg-amber-50 text-amber-600 border-none px-3 font-black text-[9px] uppercase tracking-widest italic">Configuración</Badge>
          </section>
        </div>
      </aside>

      {/* CENTER: WORK AREA */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 overflow-y-auto bg-white/30 backdrop-blur-sm">
        <div className="w-full max-w-xl min-w-[320px] animate-in fade-in slide-in-from-bottom-4 duration-500">

           {step === 1 && (
             <div className="space-y-8">
                <div className="space-y-2 text-center">
                   <h2 className="text-4xl font-bold text-slate-900 italic tracking-tighter uppercase">Identidad</h2>
                   <p className="text-slate-400 text-sm font-medium italic">Registre al paciente para el estudio.</p>
                </div>

                <div className="space-y-4">
                   <div className="relative group">
                      <Search className="absolute left-5 top-5 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder="Buscar por nombre..."
                        className="h-16 pl-14 bg-white border-none rounded-[24px] shadow-sm text-lg font-bold italic"
                        value={searchQuery}
                        onChange={(e)=>setSearchQuery(e.target.value)}
                      />
                   </div>

                   {patients.length > 0 && (
                     <div className="bg-white rounded-[28px] overflow-hidden shadow-sm divide-y divide-slate-50 border border-slate-100 mb-4">
                        {patients.map(p => (
                          <button key={p.id} onClick={()=>{ setFormData({...formData, patientId:p.id, nombre:p.nombre, apellidos:p.apellidos, birthDate:p.fecha_nacimiento, sexo: p.sexo?.charAt(0) || "M"}); setStep(2); }} className="w-full p-5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group">
                             <div className="flex items-center gap-4">
                                <Avatar fallback={p.nombre[0]} className="h-10 w-10 font-black italic" />
                                <div>
                                   <p className="font-bold text-slate-900 uppercase italic group-hover:text-primary transition-colors">{p.nombre} {p.apellidos}</p>
                                   <p className="text-[10px] text-slate-400 font-bold uppercase">{p.fecha_nacimiento}</p>
                                </div>
                             </div>
                             <ChevronRight size={18} className="text-slate-200 group-hover:text-primary transition-all" />
                          </button>
                        ))}
                     </div>
                   )}

                   <div className="grid grid-cols-2 gap-4">
                      <Input placeholder="Nombre" className="h-14 rounded-2xl bg-white border-none shadow-sm font-bold" value={formData.nombre} onChange={(e)=>setFormData({...formData, nombre:e.target.value})} />
                      <Input placeholder="Apellidos" className="h-14 rounded-2xl bg-white border-none shadow-sm font-bold" value={formData.apellidos} onChange={(e)=>setFormData({...formData, apellidos:e.target.value})} />
                      <Input type="date" className="h-14 rounded-2xl bg-white border-none shadow-sm font-bold" value={formData.birthDate} onChange={(e)=>setFormData({...formData, birthDate:e.target.value})} />
                      <select
                        value={formData.sexo}
                        onChange={(e)=>setFormData({...formData, sexo: e.target.value})}
                        className="h-14 px-4 rounded-2xl bg-white border-none shadow-sm font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                      >
                         <option value="M">Masculino</option>
                         <option value="F">Femenino</option>
                      </select>
                   </div>
                </div>
             </div>
           )}

           {step === 2 && (
             <div className="space-y-8">
                <div className="space-y-2 text-center">
                   <h2 className="text-4xl font-bold text-slate-900 italic tracking-tighter uppercase">Médico & Sala</h2>
                   <p className="text-slate-400 text-sm font-medium italic">Seleccione el equipo responsable.</p>
                </div>

                <div className="space-y-6">
                   <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                      {doctors.map(d => (
                        <button key={d.id} onClick={()=>handleDoctorSelect(d.id)} className={cn("p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left", formData.doctorId === d.id ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-white shadow-sm")}>
                           <Avatar fallback={d.nombre[0]} className="h-10 w-10 font-bold" />
                           <div>
                              <p className="font-bold uppercase italic text-sm">{d.nombre} {d.apellidos}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Especialista</p>
                                {d.organization_id === orgId && <Badge variant="primary" className="h-4 text-[7px] px-2 border-none">Sede Actual</Badge>}
                              </div>
                           </div>
                        </button>
                      ))}
                      {doctors.length === 0 && <div className="p-8 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100 text-slate-400 text-xs italic">No hay especialistas disponibles.</div>}
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      {rooms.map(r => (
                        <button key={r.id} onClick={()=>setFormData({...formData, roomId:r.id})} className={cn("p-4 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all", formData.roomId === r.id ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-white shadow-sm")}>{r.nombre}</button>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {step === 3 && (
             <div className="space-y-8 text-center">
                <div className="space-y-2">
                   <h2 className="text-4xl font-bold text-slate-900 italic tracking-tighter uppercase">Estudio</h2>
                   <p className="text-slate-400 text-sm font-medium italic">Defina el tipo de procedimiento.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   {procedures.map(p => (
                     <button key={p} onClick={()=>setFormData({...formData, procedureType:p, customProcedureType: ""})} className={cn("h-24 rounded-[28px] border-2 flex flex-col items-center justify-center gap-2 transition-all", (formData.procedureType === p && !formData.customProcedureType) ? "border-primary bg-primary shadow-2xl shadow-primary/40 text-white" : "border-transparent bg-white shadow-sm text-slate-500 hover:bg-slate-50")}>
                        <span className="font-black uppercase italic text-[11px] tracking-widest">{p}</span>
                     </button>
                   ))}
                </div>

                <div className="pt-6 space-y-3">
                    <Input
                      placeholder="Otro estudio..."
                      className="h-14 bg-white border-none rounded-2xl shadow-sm font-bold italic"
                      value={formData.customProcedureType}
                      onChange={(e) => setFormData({...formData, customProcedureType: e.target.value})}
                    />
                </div>
             </div>
           )}

           <div className="mt-12 flex items-center justify-between">
              <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-transparent">
                 <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
              </Button>
              <Button onClick={handleNext} disabled={loading || (step === 1 && !formData.nombre)} className="h-16 px-12 rounded-[24px] bg-primary text-white font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl shadow-primary/30 gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all">
                 {loading ? <Loader2 className="animate-spin" /> : step === 3 ? (
                   <div className="flex items-center gap-3">
                     <span>Iniciar Procedimiento</span>
                     {warmingUp && <div className="w-2 h-2 bg-white rounded-full animate-pulse" title="Motor de video listo" />}
                   </div>
                 ) : "Continuar"}
              </Button>
           </div>
        </div>
      </main>

      {/* RIGHT: WORKFLOW */}
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col p-8 shrink-0 hidden xl:flex">
         <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-10">Workflow</h3>
         <div className="space-y-8">
            {workflowSteps.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-5 relative group">
                 {idx < workflowSteps.length - 1 && <div className={cn("absolute left-3.5 top-8 w-0.5 h-6 transition-colors", s.status === 'done' ? "bg-primary" : "bg-slate-100")} />}
                 <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all", s.status === 'active' ? "bg-primary text-white shadow-lg ring-4 ring-primary/20" : s.status === 'done' ? "bg-primary text-white" : "bg-slate-50 text-slate-300")}>
                    {s.status === 'done' ? <CheckCircle2 size={16} /> : <span className="text-[10px] font-black">{s.id}</span>}
                 </div>
                 <span className={cn("text-[10px] font-bold uppercase tracking-widest italic transition-colors", s.status === 'active' ? "text-slate-900" : "text-slate-300")}>{s.label}</span>
              </div>
            ))}
         </div>
      </aside>
    </div>
  );
}
