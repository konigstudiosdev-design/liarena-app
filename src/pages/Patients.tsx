import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Filter,
  User,
  Inbox,
  Trash2,
  Edit2,
  ChevronRight,
  Loader2,
  X,
  Save,
  Calendar,
  Users,
  Database,
  ArrowRight,
  Venus,
  Mars,
  Phone,
  Mail,
  MapPin,
  HeartPulse,
  Camera,
  History,
  FileText,
  AlertCircle
} from "lucide-react";
import { Card, Button, Input, Avatar, toast, Badge } from "../components/ui/index";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

export default function Patients() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    fecha_nacimiento: "",
    sexo: "M",
    curp: "",
    telefono: "",
    correo: "",
    direccion: "",
    contacto_emergencia: "",
    foto_url: "",
    alergias: "",
    antecedentes: "",
    observaciones: ""
  });

  const orgId = localStorage.getItem('liarena_org_id');

  useEffect(() => {
    fetchPatients();
  }, [orgId]);

  async function fetchPatients() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .is('deleted_at', null)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (e: any) {
      console.error("fetchPatients error:", e);
      toast.error("Error al sincronizar expedientes");
    } finally {
      setIsLoading(false);
    }
  }

  const calculateAge = (dateString: string) => {
    if (!dateString) return "--";
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? `${age} años` : "--";
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.apellidos) return toast.error("Nombre y Apellidos son requeridos");

    setIsProcessing(true);
    try {
      // Limpieza de datos antes de enviar a Supabase
      const cleanData = {
        ...formData,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        correo: formData.correo || null,
        curp: formData.curp || null
      };

      if (editingPatient) {
        const { error } = await supabase
          .from('patients')
          .update({
            ...cleanData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPatient.id);
        if (error) throw error;
        toast.success("Expediente actualizado correctamente");
      } else {
        const generatedExpediente = `EXP-${Date.now().toString().slice(-6)}`;
        const { error } = await supabase
          .from('patients')
          .insert({
            ...cleanData,
            expediente: generatedExpediente,
            organization_id: orgId // Optional, kept for reference where it was created
          });
        if (error) throw error;
        toast.success("Paciente registrado exitosamente");
      }
      setShowForm(false);
      setEditingPatient(null);
      fetchPatients();
    } catch (e: any) {
      console.error("handleProcess error:", e);
      toast.error(e.message || "Fallo en la sincronización del expediente");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Desea archivar este expediente clínico? El registro no se eliminará físicamente.")) return;
    try {
      const { error } = await supabase.from('patients').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success("Expediente archivado");
      fetchPatients();
    } catch (e: any) {
      console.error("handleDelete error:", e);
      toast.error("Error al archivar registro");
    }
  };

  const openEdit = (p: any) => {
    setEditingPatient(p);
    setFormData({
      nombre: p.nombre || "",
      apellidos: p.apellidos || "",
      fecha_nacimiento: p.fecha_nacimiento || "",
      sexo: p.sexo?.charAt(0) || "M",
      curp: p.curp || "",
      telefono: p.telefono || "",
      correo: p.correo || "",
      direccion: p.direccion || "",
      contacto_emergencia: p.contacto_emergencia || "",
      foto_url: p.foto_url || "",
      alergias: p.alergias || "",
      antecedentes: p.antecedentes || "",
      observaciones: p.observaciones || ""
    });
    setShowForm(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, foto_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredPatients = (patients || []).filter(p => {
    const fullName = `${p?.nombre || ""} ${p?.apellidos || ""}`.toLowerCase();
    const curp = (p?.curp || "").toLowerCase();
    const expediente = (p?.expediente || "").toLowerCase();
    const search = searchQuery.toLowerCase();
    return fullName.includes(search) || curp.includes(search) || expediente.includes(search);
  });

  return (
    <div className="min-h-screen bg-[#FBFBFD] p-6 lg:p-10 font-sans animate-in fade-in duration-700">

      {/* HEADER CLINICO */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-8 px-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-primary/10 rounded-lg">
                <HeartPulse className="w-4 h-4 text-primary" />
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Archivo Clínico Central</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 italic uppercase leading-none">Pacientes</h1>
        </div>

        <div className="flex items-center gap-4">
           <Button
            onClick={() => {
              setEditingPatient(null);
              setFormData({
                nombre: "",
                apellidos: "",
                fecha_nacimiento: "",
                sexo: "M",
                curp: "",
                telefono: "",
                correo: "",
                direccion: "",
                contacto_emergencia: "",
                foto_url: "",
                alergias: "",
                antecedentes: "",
                observaciones: ""
              });
              setShowForm(true);
            }}
            className="h-16 px-12 rounded-[28px] bg-primary text-white font-black uppercase text-[12px] tracking-[0.2em] gap-4 shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
           >
             <Plus className="w-5 h-5" /> Nuevo Registro
           </Button>
        </div>
      </header>

      {/* BUSQUEDA MINIMALISTA */}
      <div className="relative group max-w-3xl mx-auto mb-16">
         <Search className="absolute left-6 top-5 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-all duration-300" />
         <Input
           placeholder="Localizar por nombre, expediente o CURP..."
           className="h-16 pl-16 bg-white border-none shadow-premium rounded-[28px] font-bold text-lg italic placeholder:text-slate-300 focus:ring-4 focus:ring-primary/5 transition-all"
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
         />
      </div>

      {/* GRID DE EXPEDIENTES */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isLoading ? (
           <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-30 italic font-bold">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Archivo Clínico...</p>
           </div>
        ) : filteredPatients.length > 0 ? (
          filteredPatients.map((p) => (
            <Card key={p.id} className="p-6 bg-white border-none rounded-[40px] shadow-sm flex items-center justify-between hover:shadow-xl transition-all duration-500 group border border-transparent hover:border-primary/10">
              <div className="flex items-center gap-8 flex-1">
                <Avatar
                  fallback={p.nombre?.[0] || "P"}
                  src={p.foto_url}
                  className="h-20 w-24 text-2xl font-black bg-slate-50 ring-offset-2 shadow-sm rounded-3xl"
                />

                <div className="flex-1 space-y-3">
                   <div className="flex items-center gap-3">
                      <h4 className="font-bold text-slate-900 uppercase italic tracking-tight text-xl leading-none">
                        {p.nombre} {p.apellidos}
                      </h4>
                      <Badge className="bg-slate-50 text-slate-400 border-none px-2.5 py-0.5 font-black text-[8px]">{p.expediente}</Badge>
                   </div>

                   <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                         <Calendar size={12} className="text-slate-300" />
                         <span className="italic">{p.fecha_nacimiento ? `${p.fecha_nacimiento} (${calculateAge(p.fecha_nacimiento)})` : "---"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         {p.sexo === 'Femenino' || p.sexo === 'F' ? <Venus size={12} className="text-danger/40" /> : <Mars size={12} className="text-primary/40" />}
                         <span>{p.sexo || "---"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                         <Database size={12} className="text-slate-300" />
                         <span>{p.curp || "S/ CURP"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                         <Phone size={12} className="text-slate-300" />
                         <span>{p.telefono || "Sin Tel"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                         <Mail size={12} className="text-slate-300" />
                         <span className="truncate max-w-[120px]">{p.correo || "Sin Correo"}</span>
                      </div>
                   </div>
                </div>
              </div>

              <div className="flex items-center gap-6 pl-8 border-l border-slate-100">
                 <div className="flex flex-col gap-2">
                    <button onClick={() => openEdit(p)} className="p-2 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all" title="Editar"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-300 hover:text-danger hover:bg-danger/5 rounded-xl transition-all" title="Archivar"><Trash2 size={16} /></button>
                 </div>
                 <Button
                   variant="ghost"
                   className="h-16 w-16 p-0 rounded-[24px] bg-slate-900 text-white hover:bg-primary transition-all shadow-xl flex flex-col items-center justify-center gap-1 group border-none"
                   onClick={() => {
                      const basePath = location.pathname.includes('/assistant') ? '/assistant/studies' : '/medic';
                      navigate(`${basePath}?patient=${p.nombre} ${p.apellidos}`);
                   }}
                 >
                    <History size={20} className="group-hover:rotate-12 transition-transform duration-500" />
                    <span className="text-[7px] font-black uppercase tracking-widest">Historial</span>
                 </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-40 bg-white rounded-[60px] border-2 border-dashed border-slate-100 text-center opacity-20 italic font-bold">
             <div className="w-32 h-32 bg-slate-50 rounded-[48px] flex items-center justify-center mx-auto mb-4">
                <Database className="w-16 h-16 text-slate-200" />
             </div>
             <div className="space-y-2">
                <h3 className="text-3xl font-bold text-slate-800 tracking-tighter uppercase italic">Archivo Vacío</h3>
                <p className="text-sm font-bold uppercase tracking-[0.2em]">No se han localizado expedientes clínicos</p>
             </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-6">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => !isProcessing && setShowForm(false)} />
           <div className="w-full max-w-[650px] h-full bg-white shadow-2xl relative z-10 animate-in slide-in-from-right-full duration-700 rounded-[54px] flex flex-col overflow-hidden border border-white/10">
              <div className="p-12 bg-slate-900 text-white flex items-center justify-between shrink-0">
                 <div className="space-y-1">
                    <h2 className="text-4xl font-bold italic tracking-tighter uppercase">{editingPatient ? 'Editar Expediente' : 'Nuevo Registro'}</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] italic">Consolidación de Identidad Clínica</p>
                 </div>
                 <button onClick={() => setShowForm(false)} className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all group">
                    <X className="w-7 h-7 group-hover:rotate-90 transition-transform duration-500" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-10 bg-slate-50/30">
                 {/* Sección: Identidad Básica */}
                 <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                       <div className="flex items-center gap-3">
                          <User size={14} className="text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identidad del Paciente</span>
                       </div>

                       {/* Foto del Paciente */}
                       <div className="relative group">
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
                          <div
                             onClick={() => fileInputRef.current?.click()}
                             className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden cursor-pointer relative group-hover:border-primary/30 transition-all flex items-center justify-center"
                          >
                             {formData.foto_url ? (
                                <img src={formData.foto_url} className="w-full h-full object-cover" />
                             ) : (
                                <Camera size={20} className="text-slate-300" />
                             )}
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Plus size={16} />
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre(s)</label>
                          <Input value={formData.nombre} onChange={(e)=>setFormData({...formData, nombre: e.target.value})} className="h-14 rounded-2xl bg-white border-none font-bold text-slate-700 shadow-sm" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellidos</label>
                          <Input value={formData.apellidos} onChange={(e)=>setFormData({...formData, apellidos: e.target.value})} className="h-14 rounded-2xl bg-white border-none font-bold text-slate-700 shadow-sm" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nacimiento</label>
                          <Input type="date" value={formData.fecha_nacimiento} onChange={(e)=>setFormData({...formData, fecha_nacimiento: e.target.value})} className="h-14 rounded-2xl bg-white border-none font-bold shadow-sm" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CURP</label>
                          <Input value={formData.curp} onChange={(e)=>setFormData({...formData, curp: e.target.value.toUpperCase()})} className="h-14 rounded-2xl bg-white border-none font-bold text-slate-700 shadow-sm" placeholder="Opcional" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sexo Biológico</label>
                       <div className="flex gap-3">
                          {[
                             { label: "Masculino", val: "M" },
                             { label: "Femenino", val: "F" }
                          ].map(s => (
                             <button
                               key={s.val}
                               type="button"
                               onClick={() => setFormData({...formData, sexo: s.val})}
                               className={cn(
                                  "flex-1 h-14 rounded-2xl border-2 font-black text-[11px] uppercase tracking-widest transition-all",
                                  formData.sexo === s.val ? "border-primary bg-primary text-white shadow-lg" : "border-white bg-white text-slate-400 hover:border-slate-200 shadow-sm"
                               )}
                             >
                                {s.label}
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>

                 {/* Sección: Contacto */}
                 <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                       <Phone size={14} className="text-primary" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contacto de Localización</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                          <Input value={formData.telefono} onChange={(e)=>setFormData({...formData, telefono: e.target.value})} className="h-14 rounded-2xl bg-white border-none font-bold text-slate-700 shadow-sm" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                          <Input type="email" value={formData.correo} onChange={(e)=>setFormData({...formData, correo: e.target.value})} className="h-14 rounded-2xl bg-white border-none font-bold text-slate-700 shadow-sm" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección Completa</label>
                       <Input value={formData.direccion} onChange={(e)=>setFormData({...formData, direccion: e.target.value})} className="h-14 rounded-2xl bg-white border-none font-bold text-slate-700 shadow-sm" />
                    </div>
                 </div>

                 {/* Sección: Emergencias */}
                 <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                       <AlertCircle size={14} className="text-danger" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emergencia (Nombre / Parentesco / Tel.)</span>
                    </div>
                    <Input value={formData.contacto_emergencia} onChange={(e)=>setFormData({...formData, contacto_emergencia: e.target.value})} className="h-14 rounded-2xl bg-white border-none font-bold text-slate-700 shadow-sm" />
                 </div>

                 {/* Sección: Información Clínica */}
                 <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                       <HeartPulse size={14} className="text-primary" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expediente Clínico</span>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Alergias</label>
                          <Input value={formData.alergias} onChange={(e)=>setFormData({...formData, alergias: e.target.value})} className="h-14 rounded-2xl bg-white border-none font-bold text-slate-700 shadow-sm" placeholder="Medicamentos, alimentos, etc." />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Antecedentes</label>
                          <Input value={formData.antecedentes} onChange={(e)=>setFormData({...formData, antecedentes: e.target.value})} className="h-14 rounded-2xl bg-white border-none font-bold text-slate-700 shadow-sm" placeholder="Cirugías, enfermedades crónicas, etc." />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Observaciones Generales</label>
                          <Input value={formData.observaciones} onChange={(e)=>setFormData({...formData, observaciones: e.target.value})} className="h-14 rounded-2xl bg-white border-none font-bold text-slate-700 shadow-sm" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-12 bg-white border-t border-slate-100">
                 <Button onClick={handleProcess} disabled={isProcessing} className="w-full h-20 rounded-[32px] font-black text-[14px] uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 group">
                    {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" /> {editingPatient ? 'Guardar Cambios' : 'Confirmar Registro'}</>}
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
