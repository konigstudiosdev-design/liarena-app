import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  ArrowRight,
  Mail,
  Lock,
  Trash2,
  Edit3,
  Building2,
  X,
  Key,
  Activity,
  Shield,
  Loader2,
  Inbox,
  ChevronRight,
  Command,
  Save
} from "lucide-react";
import { Card, CardContent, Button, Badge, Input, Avatar, toast } from "../../components/ui/index";
import { supabase } from "../../lib/supabase";

export default function AdminManagement() {
  const [showForm, setShowForm] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    correo: "",
    password: "",
    organization_id: "",
    activo: true
  });

  useEffect(() => {
    fetchAdmins();
    fetchOrgs();
  }, []);

  async function fetchOrgs() {
    const { data } = await supabase.from('organizations').select('id, nombre').is('deleted_at', null);
    setOrganizations(data || []);
  }

  async function fetchAdmins() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, organization:organization_id(nombre)')
        .eq('role', 'organization_admin')
        .is('deleted_at', null)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setAdmins(data || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error al cargar administradores");
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este administrador?")) return;
    try {
      const { error } = await supabase.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success("Administrador eliminado");
      fetchAdmins();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('users').update({
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          organization_id: formData.organization_id,
          activo: formData.activo
        }).eq('id', editingId);
        if (error) throw error;
        toast.success("Perfil actualizado");
      } else {
        // Create Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.correo,
          password: formData.password
        });
        if (authError) throw authError;

        // Create Public User
        const { error: userError } = await supabase.from('users').insert({
          auth_user_id: authData.user?.id,
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          correo: formData.correo,
          role: 'organization_admin',
          organization_id: formData.organization_id,
          activo: true
        });
        if (userError) throw userError;
        toast.success("Administrador registrado");
      }
      setShowForm(false);
      setEditingId(null);
      fetchAdmins();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const openEdit = (admin: any) => {
    setEditingId(admin.id);
    setFormData({
      nombre: admin.nombre || "",
      apellidos: admin.apellidos || "",
      correo: admin.correo || "",
      password: "",
      organization_id: admin.organization_id || "",
      activo: admin.activo
    });
    setShowForm(true);
  };

  const filteredAdmins = (admins || []).filter(admin =>
    (admin?.nombre || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
    (admin?.apellidos || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
    (admin?.correo || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
    (admin?.organization?.nombre || "").toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  return (
    <div className="space-y-12 pb-10 animate-in fade-in duration-1000">
      <div className="flex items-end justify-between px-2">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-slate-900 rounded-lg">
               <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Global Identity Protocol</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 italic">
            Maestros de <span className="text-primary tracking-tighter">Organización</span>
          </h1>
        </div>
        <Button
          onClick={() => { setEditingId(null); setFormData({nombre:"", apellidos:"", correo:"", password:"", organization_id:"", activo:true}); setShowForm(true); }}
          className="rounded-[28px] shadow-2xl shadow-primary/30 h-16 px-12 font-black text-[12px] uppercase tracking-widest gap-4 hover:scale-105 active:scale-95 transition-all"
        >
          <UserPlus className="w-5 h-5" /> Registrar Maestro
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8">
            <Card className="border-none shadow-premium bg-white p-6 rounded-[40px] border border-slate-50">
               <div className="relative group">
                  <Search className="absolute left-6 top-5 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-all duration-300" />
                  <Input
                    placeholder="Filtrar identidades..."
                    className="h-16 pl-16 bg-slate-50 border-none rounded-[28px] font-bold text-lg shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
            </Card>
         </div>
         <div className="lg:col-span-4 grid grid-cols-1 gap-4">
            <Card className="border-none shadow-sm bg-white p-6 rounded-[32px] flex items-center justify-between px-10">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Maestros</p>
               <h4 className="text-3xl font-black italic text-primary">{admins.length}</h4>
            </Card>
         </div>
      </div>

      <div className="space-y-6">
         {loading ? (
            <div className="py-32 text-center flex flex-col items-center gap-6">
               <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
               <p className="text-[10px] font-black uppercase text-slate-400 italic">Sincronizando identidades...</p>
            </div>
         ) : filteredAdmins.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
               {filteredAdmins.map((admin) => (
                  <Card key={admin.id} className="border-none shadow-sm bg-white p-8 rounded-[44px] group hover:shadow-xl transition-all duration-500 border border-transparent hover:border-primary/10">
                     <div className="flex items-center gap-10">
                        <Avatar fallback={(admin.nombre?.[0] || "") + (admin.apellidos?.[0] || "")} className="h-20 w-20 text-2xl font-black bg-slate-50 ring-4 ring-slate-50" />

                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-4">
                              <h3 className="text-2xl font-bold text-slate-900 italic tracking-tight group-hover:text-primary transition-colors uppercase">
                                {admin.nombre} {admin.apellidos}
                              </h3>
                              <Badge variant={admin.activo ? "success" : "neutral"} className="h-6 px-4 uppercase text-[9px] font-black tracking-widest italic border-none shadow-sm">
                                {admin.activo ? "Master Verified" : "Locked"}
                              </Badge>
                           </div>
                           <div className="flex items-center gap-10 mt-4">
                              <div className="flex items-center gap-2 text-slate-400">
                                 <Building2 className="w-4 h-4 text-primary" />
                                 <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">{admin.organization?.nombre || "Sin Nodo"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-400">
                                 <Mail className="w-4 h-4" />
                                 <span className="text-[11px] font-bold italic text-slate-500">{admin.correo}</span>
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-4 pr-4">
                           <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl text-slate-200 hover:text-primary transition-all" onClick={() => openEdit(admin)}><Edit3 className="w-5 h-5" /></Button>
                              <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl text-slate-200 hover:text-danger transition-all" onClick={() => handleDelete(admin.id)}><Trash2 className="w-5 h-5" /></Button>
                           </div>
                        </div>
                     </div>
                  </Card>
               ))}
            </div>
         ) : (
            <div className="py-40 text-center opacity-20 italic font-bold">
               <Inbox className="w-16 h-16 mx-auto mb-10 text-slate-300" />
               <p className="text-3xl text-slate-800 tracking-tighter">Sin registros detectados</p>
            </div>
         )}
      </div>

      {showForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-end p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setShowForm(false)} />
            <div className="w-full max-w-[600px] h-full bg-white shadow-2xl relative z-10 animate-in slide-in-from-right-full duration-700 rounded-[54px] flex flex-col overflow-hidden border border-slate-50/10">
               <div className="p-12 bg-slate-900 text-white flex items-center justify-between relative shrink-0">
                  <h2 className="text-4xl font-bold italic tracking-tighter">{editingId ? 'Editar Maestro' : 'Nueva Identidad'}</h2>
                  <button onClick={() => setShowForm(false)} className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"><X className="w-6 h-6" /></button>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre(s)</label>
                    <Input value={formData.nombre} onChange={(e)=>setFormData({...formData, nombre: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Apellidos</label>
                    <Input value={formData.apellidos} onChange={(e)=>setFormData({...formData, apellidos: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold" />
                  </div>
                  {!editingId && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Correo Electrónico</label>
                        <Input value={formData.correo} onChange={(e)=>setFormData({...formData, correo: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Contraseña</label>
                        <Input type="password" value={formData.password} onChange={(e)=>setFormData({...formData, password: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold" />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Organización Nodo</label>
                    <select
                      value={formData.organization_id}
                      onChange={(e)=>setFormData({...formData, organization_id: e.target.value})}
                      className="w-full h-14 bg-slate-50 border-none rounded-2xl px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Seleccionar Nodo...</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.nombre}</option>
                      ))}
                    </select>
                  </div>
               </div>

               <div className="p-12 border-t border-slate-50 shrink-0">
                  <Button onClick={handleProcess} disabled={isProcessing} className="w-full h-20 rounded-[32px] font-black text-[13px] uppercase tracking-widest shadow-2xl shadow-primary/20">
                    {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> {editingId ? 'Guardar Cambios' : 'Desplegar Maestro'}</>}
                  </Button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
