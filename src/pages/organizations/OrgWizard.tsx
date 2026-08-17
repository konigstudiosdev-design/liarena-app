import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardContent, Input, Badge, toast, Avatar } from "../../components/ui/index";
import {
  Building2,
  UserPlus,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Camera,
  X
} from "lucide-react";
import { cn } from "../../lib/utils";
import { supabase } from "../../lib/supabase";

const steps = [
  { id: 1, title: "Organización", icon: Building2 },
  { id: 2, title: "Administrador", icon: UserPlus },
  { id: 3, title: "Confirmación", icon: CheckCircle2 },
];

export default function OrgWizard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    logo: null as string | null,
    admin_nombre_completo: "",
    admin_email: "",
    admin_usuario: "",
    admin_password: ""
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("El logo no debe exceder los 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, logo: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({ ...formData, logo: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleFinalize = async () => {
    setIsProcessing(true);
    try {
      // 1. Crear Organización
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([
          {
            nombre: formData.nombre,
            logo: formData.logo,
            slug: formData.nombre.toLowerCase().replace(/\s+/g, '-'),
            activo: true
          }
        ])
        .select()
        .single();

      if (orgError) {
        console.error("SUPABASE ORG ERROR:", orgError);
        throw new Error(`Error de Base de Datos: ${orgError.message}`);
      }

      // 2. Crear Admin Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.admin_email,
        password: formData.admin_password
      });

      if (authError) {
        console.error("SUPABASE AUTH ERROR:", authError);
        throw new Error(`Error de Autenticación: ${authError.message}`);
      }

      if (!authData.user) throw new Error("No se pudo crear el usuario");

      // 3. Crear Perfil Usuario
      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          organization_id: org.id,
          role: 'organization_admin',
          username: formData.admin_usuario,
          nombre: formData.admin_nombre_completo.split(' ')[0] || 'Admin',
          apellidos: formData.admin_nombre_completo.split(' ').slice(1).join(' ') || 'Master',
          correo: formData.admin_email,
          activo: true
        });

      if (userError) {
        console.error("SUPABASE USER PROFILE ERROR:", userError);
      }

      toast.success("Organización desplegada correctamente");

      // Devolvemos al desarrollador a su dashboard de organizaciones
      navigate("/dev/organizations");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error al procesar el registro");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

        <div className="flex items-center justify-between px-2">
          <Button
            variant="ghost"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate("/dev/organizations")}
            className="text-slate-400 font-bold uppercase tracking-widest text-[9px] gap-2 hover:bg-transparent"
          >
            <ArrowLeft className="w-3 h-3" /> {currentStep === 1 ? "Cancelar" : "Volver"}
          </Button>
          <div className="flex gap-1.5">
            {steps.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "h-1 w-8 rounded-full transition-all duration-500",
                  currentStep >= s.id ? "bg-primary shadow-[0_0_8px_rgba(0,122,255,0.3)]" : "bg-slate-200"
                )}
              />
            ))}
          </div>
        </div>

        <Card className="border-none shadow-premium bg-white rounded-[40px] overflow-hidden">
          <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
             <div className="relative z-10">
                <Badge variant="primary" className="mb-4 bg-primary/20 text-primary border-none font-black tracking-widest text-[8px]">PROCESO SIMPLIFICADO</Badge>
                <h2 className="text-3xl font-bold italic tracking-tight">{steps[currentStep-1].title}</h2>
             </div>
             <div className="absolute top-0 right-0 p-8 opacity-5 scale-125">
                {React.createElement(steps[currentStep-1].icon, { size: 100 })}
             </div>
          </div>

          <CardContent className="p-10">
            <div className="min-h-[280px]">
              {currentStep === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex flex-col items-center space-y-6">
                    <div className="relative group">
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "w-32 h-32 rounded-[40px] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center group-hover:border-primary/30 transition-all overflow-hidden cursor-pointer relative",
                          formData.logo && "border-solid border-primary/20 bg-white"
                        )}
                      >
                        {formData.logo ? (
                          <>
                            <img src={formData.logo} alt="Logo preview" className="w-full h-full object-contain p-4" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="w-6 h-6 text-white" /></div>
                            <button onClick={removeLogo} className="absolute top-1 right-1 w-6 h-6 bg-white shadow-md rounded-full flex items-center justify-center text-slate-400 hover:text-danger z-10"><X className="w-3 h-3" /></button>
                          </>
                        ) : (
                          <Camera className="w-8 h-8 text-slate-300 group-hover:text-primary transition-colors" />
                        )}
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-3 text-center italic">{formData.logo ? "Click para cambiar" : "Logo de Organización"}</p>
                    </div>
                    <div className="w-full space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre de la Organización</label>
                      <Input value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} placeholder="Ej. Clínica Gastroenterológica" className="h-14 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-lg" />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre Completo</label>
                      <Input value={formData.admin_nombre_completo} onChange={(e) => setFormData({...formData, admin_nombre_completo: e.target.value})} placeholder="Nombre del Administrador" className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Correo Electrónico</label>
                      <Input type="email" value={formData.admin_email} onChange={(e) => setFormData({...formData, admin_email: e.target.value})} placeholder="admin@clinica.com" className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Usuario</label>
                        <Input value={formData.admin_usuario} onChange={(e) => setFormData({...formData, admin_usuario: e.target.value})} placeholder="admin_user" className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Contraseña</label>
                        <Input type="password" value={formData.admin_password} onChange={(e) => setFormData({...formData, admin_password: e.target.value})} placeholder="••••••••" className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-8 animate-in zoom-in duration-500">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4">
                      <div className="flex items-center gap-3 text-primary"><Building2 className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Organización</span></div>
                      <div className="flex items-center gap-4">
                        {formData.logo && <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0"><img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-1" /></div>}
                        <div><p className="text-xl font-bold italic text-slate-900">{formData.nombre}</p><p className="text-[9px] font-bold text-slate-400 uppercase mt-1 italic tracking-widest">ID Global Generado</p></div>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4">
                      <div className="flex items-center gap-3 text-primary"><UserPlus className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Administrador</span></div>
                      <div className="space-y-1"><p className="font-bold text-slate-900 text-sm">{formData.admin_nombre_completo}</p><p className="text-[10px] font-medium text-slate-500 italic">{formData.admin_email}</p></div>
                    </div>
                  </div>
                  <div className="p-6 bg-success/5 rounded-[24px] border border-success/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5 text-success" /></div>
                    <p className="text-[11px] font-medium text-slate-600 italic leading-relaxed">Al confirmar, se creará el entorno para la organización y se cerrará su sesión para permitir el primer acceso del nuevo administrador.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10">
              <Button
                onClick={currentStep === 3 ? handleFinalize : handleNext}
                disabled={isProcessing || (currentStep === 1 && !formData.nombre)}
                className="w-full h-16 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 group flex items-center justify-center gap-3"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{currentStep === 3 ? "Confirmar y Desplegar" : "Siguiente Paso"}<ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
