import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  ArrowRight,
  Award,
  Lock,
  User as UserIcon,
  Camera,
  X,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  CheckCircle2,
  Activity,
  FileText,
  Edit,
  Save,
  ShieldCheck
} from "lucide-react";
import { Card, Button, Badge, Input, Avatar, toast } from "../../components/ui/index";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

export default function StaffManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newRole, setNewRole] = useState<"doctor" | "assistant">("doctor");

  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    especialidad: "",
    cedula_profesional: "",
    cedula_especialidad: "",
    correo: "",
    username: "",
    password: "",
  });

  const orgId = localStorage.getItem('liarena_org_id');

  useEffect(() => {
    fetchStaff();

    // LIARENA REALTIME ENGINE: Escuchar cambios en staff y perfiles
    const channel = supabase
      .channel('staff-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `organization_id=eq.${orgId}` }, () => fetchStaff())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_profiles' }, () => fetchStaff())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  async function fetchStaff() {
    console.group("--- STAFF AUDIT: fetchStaff ---");

    if (!orgId) {
      setFetchError("Error de Identidad: No se encontró el ID de su organización. Re-inicie sesión.");
      setLoading(false);
      console.groupEnd();
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, doctor_profiles(*)')
        .eq('organization_id', orgId)
        .in('role', ['doctor', 'assistant'])
        .is('deleted_at', null)
        .order('nombre', { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map(u => {
        const profs = u.doctor_profiles;
        const prof = Array.isArray(profs) ? profs[0] : profs;

        return {
            ...u,
            especialidad: prof?.especialidad || (u.role === 'assistant' ? 'Endo Asistente' : 'Médico General'),
            cedula_profesional: prof?.cedula_profesional || 'N/A',
            cedula_especialidad: prof?.cedula_especialidad || 'N/A'
        };
      });

      setStaff(mapped);
    } catch (e: any) {
      console.error("AUDIT FATAL:", e);
      setFetchError(e.message || "Error inesperado de base de datos");
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  }

  const openEdit = (user: any) => {
    setEditingId(user.id);
    setNewRole(user.role);
    setFormData({
      nombre: user.nombre || "",
      apellidos: user.apellidos || "",
      especialidad: user.especialidad !== 'Endo Asistente' && user.especialidad !== 'Médico General' && !user.especialidad.includes('No Cargado') ? user.especialidad : "",
      cedula_profesional: user.cedula_profesional !== 'N/A' ? user.cedula_profesional : "",
      cedula_especialidad: user.cedula_especialidad !== 'N/A' ? user.cedula_especialidad : "",
      correo: user.correo || "",
      username: user.username || "",
      password: "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setNewRole("doctor");
    setFormError("");
    setFormData({
      nombre: "", apellidos: "", especialidad: "",
      cedula_profesional: "", cedula_especialidad: "", correo: "",
      username: "", password: ""
    });
  };

  const handleProcess = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setFormError("");

    try {
      if (editingId) {
        const { error: uErr } = await supabase
            .from('users')
            .update({
                nombre: formData.nombre,
                apellidos: formData.apellidos,
                username: formData.username
            })
            .eq('id', editingId);

        if (uErr) throw uErr;

        if (newRole === 'doctor') {
            const { error: dpErr } = await supabase.from('doctor_profiles').upsert({
                user_id: editingId,
                especialidad: formData.especialidad,
                cedula_profesional: formData.cedula_profesional,
                cedula_especialidad: formData.cedula_especialidad
            }, { onConflict: 'user_id' });

            if (dpErr) throw dpErr;
        }
        toast.success("Perfil actualizado");
      } else {
        if (!formData.correo || !formData.password || formData.password.length < 6) {
           throw new Error("Se requiere correo y contraseña (mínimo 6 caracteres).");
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.correo,
          password: formData.password,
        });

        if (authError) throw authError;

        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authData.user?.id,
            organization_id: orgId,
            role: newRole,
            username: formData.username,
            nombre: formData.nombre,
            apellidos: formData.apellidos,
            correo: formData.correo,
            activo: true
          })
          .select().single();

        if (userError) throw userError;

        if (newRole === 'doctor' && newUser) {
          await supabase.from('doctor_profiles').insert({
            user_id: newUser.id,
            especialidad: formData.especialidad,
            cedula_profesional: formData.cedula_profesional,
            cedula_especialidad: formData.cedula_especialidad
          });
        }
        toast.success("Staff registrado correctamente");
      }

      closeForm();
      fetchStaff();
    } catch (err: any) {
      setFormError(err.message || "Error al procesar la solicitud");
      toast.error("Fallo en la operación");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("¿Está seguro de desactivar este acceso?")) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ activo: false, deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success("Acceso revocado");
      fetchStaff();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  };

  const filteredStaff = (staff || []).filter(u =>
    `${u?.nombre || ""} ${u?.apellidos || ""} ${u?.username || ""} ${u?.especialidad || ""}`.toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  return (
    <div className="space-y-12 pb-10 animate-in fade-in duration-700">
      <div className="flex items-end justify-between px-2">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 italic uppercase">Gestión de Staff</h1>
          <Badge variant="primary" className="bg-primary/5 text-primary border-none text-[9px] font-black tracking-widest px-4">Administración de Sede</Badge>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-[28px] h-16 px-12 font-black text-[12px] uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 transition-all">
          <UserPlus className="w-5 h-5 mr-2" /> Nuevo Registro
        </Button>
      </div>

      <div className="space-y-8">
        <Card className="border-none shadow-premium bg-white p-6 rounded-[40px] border border-slate-50">
           <div className="relative">
              <Search className="absolute left-6 top-5 w-5 h-5 text-slate-300" />
              <Input
                placeholder="Localizar por nombre, cargo o usuario..."
                className="h-16 pl-16 bg-slate-50 border-none rounded-[28px] font-bold text-lg italic shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
        </Card>

        {loading ? (
           <div className="py-32 text-center flex flex-col items-center gap-6">
              <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Sincronizando con el servidor clínico...</p>
           </div>
        ) : fetchError && staff.length === 0 ? (
          <Card className="p-20 bg-white rounded-[54px] border-2 border-dashed border-danger/20 flex flex-col items-center justify-center text-center space-y-8">
             <div className="w-24 h-24 bg-danger/10 rounded-[40px] flex items-center justify-center text-danger">
                <AlertCircle size={48} />
             </div>
             <div className="space-y-3">
                <h3 className="text-2xl font-bold text-slate-900 uppercase italic">Interrupción de Datos</h3>
                <p className="text-slate-500 max-w-lg mx-auto italic font-medium leading-relaxed">
                   Se ha detectado un error real en la base de datos: <br/>
                   <span className="text-danger font-black not-italic mt-2 block">{fetchError}</span>
                </p>
             </div>
             <Button onClick={() => fetchStaff()} variant="primary" className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-[11px]">Reintentar Auditoría</Button>
          </Card>
        ) : filteredStaff.length > 0 ? (
          <div className="flex flex-col gap-4">
            {filteredStaff.map((member) => (
               <Card key={member.id} className="border-none shadow-premium bg-white p-6 rounded-[32px] hover:shadow-xl transition-all duration-500 relative overflow-hidden group border border-transparent hover:border-primary/10">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none"><Activity size={80} /></div>

                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    {/* Identidad */}
                    <div className="flex items-center gap-6 min-w-[300px]">
                       <Avatar fallback={(member.nombre?.[0] || "U")} className="h-16 w-16 text-xl font-black bg-slate-50 ring-4 ring-slate-50 uppercase italic shrink-0" />
                       <div className="min-w-0">
                          <div className="flex items-center gap-2">
                             <h3 className="font-bold text-slate-900 text-lg truncate italic uppercase tracking-tighter">{member.nombre} {member.apellidos}</h3>
                             {member.role === 'assistant' && <ShieldCheck className="w-4 h-4 text-primary shrink-0" />}
                          </div>
                          <Badge variant={member.role === 'assistant' ? "neutral" : "primary"} className={`text-[8px] px-3 h-5 mt-1 border-none font-black uppercase tracking-widest ${member.role === 'assistant' ? "bg-slate-100 text-slate-500" : "bg-primary/5 text-primary"}`}>
                             {member.role === 'assistant' ? "Endo Asistente" : member.especialidad}
                          </Badge>
                       </div>
                    </div>

                    {/* Información Técnica */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 px-8 border-x border-slate-50">
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                             {member.role === 'assistant' ? "Identificador" : "Credenciales Legales"}
                          </p>
                          <p className="text-sm font-bold text-slate-700 italic truncate">
                             {member.role === 'assistant'
                               ? `@${member.username}`
                               : `CP: ${member.cedula_profesional} / CE: ${member.cedula_especialidad}`}
                          </p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Estatus de Acceso</p>
                          <div className="flex items-center gap-2">
                             <div className={cn("w-2 h-2 rounded-full", member.activo ? "bg-success" : "bg-danger")} />
                             <p className={`text-[11px] font-black uppercase ${member.activo ? "text-success" : "text-danger"}`}>
                                {member.activo ? "Conexión Activa" : "Acceso Revocado"}
                             </p>
                          </div>
                       </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-3 pl-4">
                       <Button variant="ghost" onClick={() => openEdit(member)} size="icon" className="h-12 w-12 rounded-2xl text-slate-300 hover:text-primary hover:bg-primary/5 transition-all shadow-sm border border-slate-50 flex items-center justify-center shrink-0">
                          <Edit className="w-5 h-5" />
                       </Button>
                       <Button variant="ghost" onClick={() => handleDeactivate(member.id)} size="icon" className="h-12 w-12 rounded-2xl text-slate-300 hover:text-danger hover:bg-danger/5 transition-all shadow-sm border border-slate-50 flex items-center justify-center shrink-0">
                          <Trash2 className="w-5 h-5" />
                       </Button>
                    </div>
                  </div>
               </Card>
            ))}
          </div>
        ) : (
          <div className="py-40 bg-white rounded-[54px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-6 italic shadow-sm">
             <Users className="w-16 h-16 text-slate-100" />
             <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-widest text-slate-300">No hay personal registrado</p>
                <p className="text-[10px] font-bold text-slate-200">Utilice el botón superior para agregar personal médico o asistentes.</p>
             </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-6">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in" onClick={() => !isProcessing && closeForm()} />
           <div className="w-full max-w-[600px] h-full bg-white shadow-2xl relative z-10 animate-in slide-in-from-right-full duration-700 rounded-[54px] flex flex-col overflow-hidden">
              <div className="p-12 bg-slate-900 text-white flex items-center justify-between relative shrink-0">
                 <div className="relative z-10 space-y-2">
                    <h2 className="text-4xl font-bold italic tracking-tighter uppercase">{editingId ? "Editar Staff" : "Nuevo Registro"}</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] italic">Configuración de Acceso y Perfil Clínico</p>
                 </div>
                 <button onClick={() => !isProcessing && closeForm()} className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-12">
                 {formError && <div className="p-6 bg-danger/5 border border-danger/10 rounded-[32px] flex items-center gap-4 text-danger text-[10px] font-black uppercase tracking-widest italic animate-in shake"><AlertCircle size={48} /><span>{formError}</span></div>}

                 <div className="space-y-10">
                    {/* Role Selector */}
                    {!editingId && (
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Tipo de Usuario</label>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setNewRole("doctor")}
                                    className={`flex-1 p-5 rounded-3xl border-2 transition-all text-left ${newRole === 'doctor' ? "border-primary bg-primary/5 shadow-inner" : "border-slate-100 text-slate-400"}`}
                                >
                                    <h4 className="font-bold text-sm italic tracking-tight">Médico Especialista</h4>
                                    <p className="text-[9px] font-black uppercase mt-1">Realiza y firma reportes</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewRole("assistant")}
                                    className={`flex-1 p-5 rounded-3xl border-2 transition-all text-left ${newRole === 'assistant' ? "border-primary bg-primary/5 shadow-inner" : "border-slate-100 text-slate-400"}`}
                                >
                                    <h4 className="font-bold text-sm italic tracking-tight">Endo Asistente</h4>
                                    <p className="text-[9px] font-black uppercase mt-1">Gestión de captura y salas</p>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Identidad Personal</label>
                       <div className="grid grid-cols-2 gap-6">
                          <Input placeholder="Nombre(s)" value={formData.nombre} onChange={(e)=>setFormData({...formData, nombre: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold italic" />
                          <Input placeholder="Apellidos" value={formData.apellidos} onChange={(e)=>setFormData({...formData, apellidos: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold italic" />
                       </div>

                       {newRole === 'doctor' && (
                           <div className="space-y-6 animate-in fade-in">
                              <Input placeholder="Especialidad (Ej: Gastroenterología / Endoscopia)" value={formData.especialidad} onChange={(e)=>setFormData({...formData, especialidad: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold italic w-full" />
                              <div className="grid grid-cols-2 gap-6">
                                 <Input placeholder="Cédula Profesional" value={formData.cedula_profesional} onChange={(e)=>setFormData({...formData, cedula_profesional: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold italic" />
                                 <Input placeholder="Cédula Especialidad" value={formData.cedula_especialidad} onChange={(e)=>setFormData({...formData, cedula_especialidad: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold italic" />
                              </div>
                           </div>
                       )}
                    </div>

                    <div className="space-y-6">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Credenciales de Acceso</label>
                       {!editingId && <Input placeholder="Correo Electrónico de Sistema" value={formData.correo} onChange={(e)=>setFormData({...formData, correo: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold italic mb-4" />}
                       <div className="grid grid-cols-2 gap-6">
                          <Input placeholder="Nombre de Usuario" value={formData.username} onChange={(e)=>setFormData({...formData, username: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold italic" />
                          {!editingId && <Input type="password" placeholder="Contraseña Temporal" value={formData.password} onChange={(e)=>setFormData({...formData, password: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold italic" />}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-12 bg-white border-t border-slate-50 shrink-0">
                 <Button onClick={handleProcess} disabled={isProcessing} className="w-full h-20 rounded-[32px] font-black text-[13px] uppercase tracking-widest shadow-2xl shadow-primary/30 flex items-center justify-center gap-5 transition-all">
                    {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <>{editingId ? "Actualizar Staff" : "Desplegar Usuario"} <Save className="w-6 h-6" /></>}
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
