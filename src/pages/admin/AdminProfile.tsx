import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  ShieldCheck,
  Camera,
  Save,
  Key,
  Lock,
  Loader2
} from "lucide-react";
import { Button, Card, Input, Avatar, Badge, toast } from "../../components/ui/index";
import { supabase } from "../../lib/supabase";

export default function AdminProfile() {
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    apellidos: "",
    email: "",
    username: ""
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          name: data.nombre || "",
          apellidos: data.apellidos || "",
          email: data.correo || "",
          username: data.username || ""
        });
      }
    } catch (e) {
      console.error("Error fetching profile:", e);
      toast.error("No se pudo cargar el perfil");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      const updateData: any = {
        nombre: formData.name,
        apellidos: formData.apellidos,
        username: formData.username
      };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('auth_user_id', user.id);

      if (error) {
        if (error.code === '23505') throw new Error("El nombre de usuario ya está en uso");
        if (error.code === '42501') throw new Error("Permisos insuficientes en la base de datos (RLS)");
        throw error;
      }

      toast.success("Perfil actualizado correctamente");
    } catch (e: any) {
      console.error("Error updating profile:", e);
      toast.error(e.message || "Error al actualizar perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const newPassword = prompt("Ingrese su nueva contraseña (mínimo 6 caracteres):");
    if (!newPassword) return;
    if (newPassword.length < 6) return toast.error("La contraseña es muy corta");

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Contraseña actualizada exitosamente");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[400px]">
      <div className="space-y-12 pb-10 animate-in fade-in duration-700">
        <div className="flex items-end justify-between px-2">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Gestión de Cuenta</p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 italic">Mi Perfil</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-2xl h-12 px-12 font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 gap-3"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="space-y-10">
             <Card className="border-none shadow-premium bg-white p-10 rounded-[48px] flex flex-col items-center text-center space-y-6 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-2 bg-primary/20" />
                <div className="relative group">
                   <Avatar fallback={formData.name?.[0] || "AD"} className="h-44 w-44 text-5xl font-black border-4 border-slate-50 shadow-sm" />
                   <button className="absolute bottom-2 right-2 h-11 w-11 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all border-4 border-white">
                      <Camera className="w-5 h-5" />
                   </button>
                </div>
                <div className="space-y-1">
                   <h3 className="text-2xl font-bold italic tracking-tight text-slate-900 uppercase">{formData.name} {formData.apellidos}</h3>
                   <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Administrador Principal</p>
                </div>
             </Card>

             <Card className="border-none shadow-sm bg-white p-8 rounded-[40px] space-y-6 border border-slate-50">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2"><Lock className="w-3 h-3" /> Seguridad</h4>
                <Button onClick={handleChangePassword} variant="outline" className="w-full rounded-xl h-11 font-bold text-[10px] uppercase tracking-widest bg-white border-slate-200">
                  Cambiar Contraseña
                </Button>
             </Card>
          </div>

          <div className="lg:col-span-2 space-y-10">
             <Card className="border-none shadow-sm bg-white rounded-[48px] overflow-hidden border border-slate-50">
                <div className="p-12 space-y-10">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                         <User className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold italic tracking-tight uppercase">Datos Personales</h3>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre(s)</label>
                         <Input
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="h-12 bg-slate-50 border-none rounded-xl font-bold italic text-slate-700"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Apellidos</label>
                         <Input
                          value={formData.apellidos}
                          onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                          className="h-12 bg-slate-50 border-none rounded-xl font-bold italic text-slate-700"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre de Usuario</label>
                         <Input
                          value={formData.username}
                          onChange={(e) => setFormData({...formData, username: e.target.value})}
                          className="h-12 bg-slate-50 border-none rounded-xl font-bold italic text-slate-700"
                         />
                      </div>
                   </div>
                </div>
             </Card>

             <Card className="border-none shadow-sm bg-white rounded-[48px] overflow-hidden border border-slate-50">
                <div className="p-12 space-y-10">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                         <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold italic tracking-tight uppercase">Contacto</h3>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Correo Electrónico</label>
                      <Input
                      value={formData.email}
                      readOnly
                      className="h-12 bg-slate-50 border-none rounded-xl font-bold italic text-slate-400 cursor-not-allowed"
                      />
                   </div>
                </div>
             </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
