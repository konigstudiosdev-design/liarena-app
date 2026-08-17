import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Terminal,
  Database,
  Globe,
  Key,
  Cpu,
  Activity,
  Save,
  Loader2
} from "lucide-react";
import { Button, Card, Input, Avatar, Badge, toast } from "../../components/ui/index";
import { supabase } from "../../lib/supabase";

export default function DevProfile() {
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    email: ""
  });

  useEffect(() => {
    fetchDevProfile();
  }, []);

  async function fetchDevProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (error) throw error;
      setFormData({
        nombre: data.nombre || "",
        apellidos: data.apellidos || "",
        email: data.correo || ""
      });
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      const { error } = await supabase
        .from('users')
        .update({
          nombre: formData.nombre,
          apellidos: formData.apellidos
        })
        .eq('auth_user_id', user.id);

      if (error) throw error;
      toast.success("Perfil de desarrollador sincronizado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-20 min-h-[500px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-10 animate-in fade-in duration-700">
      <div className="flex items-end justify-between px-2">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic">Root Authentication</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 italic uppercase">System Developer</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-2xl h-12 px-10 font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 gap-3"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Guardando..." : "Guardar Perfil"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="space-y-10">
           {/* Dev Identity */}
           <Card className="border-none shadow-premium bg-slate-900 text-white p-10 rounded-[48px] flex flex-col items-center text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
              <div className="relative group">
                 <Avatar fallback="DEV" className="h-44 w-44 text-5xl font-black border-4 border-white/5 shadow-2xl bg-black" />
                 <div className="absolute -bottom-2 bg-primary px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-lg">
                    Superuser
                 </div>
              </div>
              <div className="space-y-1">
                 <h3 className="text-2xl font-bold italic tracking-tight uppercase tracking-tighter">{formData.nombre} {formData.apellidos}</h3>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Platform Architect</p>
              </div>
           </Card>

           <Card className="border-none shadow-sm bg-white p-8 rounded-[40px] space-y-6 border border-slate-50">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">Security Node</h4>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                 <span className="text-[10px] font-mono font-bold text-slate-400 truncate mr-4">ROOT_ACCESS_GRANTED</span>
                 <ShieldCheck className="w-4 h-4 text-success" />
              </div>
           </Card>
        </div>

        <div className="lg:col-span-2 space-y-10">
           <Card className="border-none shadow-sm bg-white rounded-[48px] overflow-hidden border border-slate-50">
              <div className="p-12 space-y-10">
                 <h3 className="text-xl font-bold italic tracking-tight uppercase">Configuración de Identidad</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre(s)</label>
                       <Input
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
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
                    <div className="space-y-2 col-span-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Correo Maestro</label>
                       <Input
                        value={formData.email}
                        readOnly
                        className="h-12 bg-slate-50 border-none rounded-xl font-bold italic text-slate-400 cursor-not-allowed"
                       />
                    </div>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
