import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardContent, Input, Badge } from "../../components/ui";
import {
  Building2,
  UserPlus,
  ArrowLeft,
  ChevronRight,
  DoorOpen,
  Monitor,
  ShieldCheck,
  Loader2,
  AlertCircle
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function CreateOrg() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    orgName: "",
    orgRfc: "",
    orgAddress: "",
    orgPhone: "",
    orgEmail: "",
    adminName: "",
    adminUser: "",
    adminEmail: "",
    adminPassword: "",
    roomName: "Sala 01",
    roomType: "Endoscopía",
    equipment: "Capturadora USB"
  });

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (step === 3) {
      setIsProcessing(true);
      setError("");
      try {
        // 1. Create Organization
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({
            nombre: formData.orgName,
            slug: formData.orgName.toLowerCase().replace(/\s+/g, '-'),
            correo: formData.orgEmail,
            telefono: formData.orgPhone,
            direccion: formData.orgAddress,
            activo: true
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // 2. Sign up Admin in Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.adminEmail,
          password: formData.adminPassword,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No se pudo crear el usuario");

        // 3. Create Admin Profile in public.users
        const { error: userError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authData.user.id,
            organization_id: org.id,
            role: 'organization_admin',
            nombre: formData.adminName.split(' ')[0],
            apellidos: formData.adminName.split(' ').slice(1).join(' ') || 'Admin',
            correo: formData.adminEmail,
            activo: true
          });

        if (userError) throw userError;

        // 4. Create Initial Room
        const { error: roomError } = await supabase
          .from('rooms')
          .insert({
            organization_id: org.id,
            nombre: formData.roomName,
            activa: true
          });

        if (roomError) throw roomError;

        // 5. Finalize local config
        localStorage.setItem('liarena_configured', 'true');
        localStorage.setItem('liarena_org_id', org.id);

        setStep(4);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error durante la configuración");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (step === 4) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[600px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between px-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step > 1 && !isProcessing ? setStep(step - 1) : navigate("/onboarding")}
            className="text-slate-400 hover:text-slate-900 gap-2 font-bold uppercase tracking-widest text-[10px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </Button>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1 w-10 rounded-full transition-all duration-500 ${step >= i ? "bg-primary shadow-[0_0_8px_rgba(0,122,255,0.3)]" : "bg-slate-200"}`} />
            ))}
          </div>
        </div>

        <Card className="border-none shadow-premium bg-white rounded-[40px] overflow-hidden">
          <div className="bg-slate-900 p-10 text-white relative">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                {step === 1 ? <Building2 className="w-20 h-20" /> : step === 2 ? <UserPlus className="w-20 h-20" /> : <DoorOpen className="w-20 h-20" />}
             </div>
             <Badge variant="primary" className="mb-4 bg-primary/20 text-primary border-transparent font-black tracking-widest text-[9px]">Instalación Inicial</Badge>
             <h2 className="text-3xl font-bold tracking-tight italic">
               {step === 1 ? "Organización" : step === 2 ? "Administrador" : step === 3 ? "Configuración de Sala" : "Confirmación"}
             </h2>
             <p className="text-slate-400 text-sm mt-1 font-medium italic">Paso {step} de 4.</p>
          </div>

          <CardContent className="p-10">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-in fade-in">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                    <Input placeholder="Ej. Clínica Gastroenterológica" className="h-12 bg-slate-50 border-none rounded-xl font-bold" value={formData.orgName} onChange={(e) => setFormData({...formData, orgName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RFC (Opcional)</label>
                    <Input placeholder="Identificador Fiscal" className="h-12 bg-slate-50 border-none rounded-xl font-bold" value={formData.orgRfc} onChange={(e) => setFormData({...formData, orgRfc: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                    <Input placeholder="+52" className="h-12 bg-slate-50 border-none rounded-xl font-bold" value={formData.orgPhone} onChange={(e) => setFormData({...formData, orgPhone: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Administrador</label>
                    <Input placeholder="Nombre Completo" className="h-12 bg-slate-50 border-none rounded-xl font-bold" value={formData.adminName} onChange={(e) => setFormData({...formData, adminName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario</label>
                      <Input placeholder="admin_user" className="h-12 bg-slate-50 border-none rounded-xl font-bold" value={formData.adminUser} onChange={(e) => setFormData({...formData, adminUser: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo</label>
                      <Input type="email" placeholder="admin@clinica.com" className="h-12 bg-slate-50 border-none rounded-xl font-bold" value={formData.adminEmail} onChange={(e) => setFormData({...formData, adminEmail: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                    <Input type="password" placeholder="••••••••" className="h-12 bg-slate-50 border-none rounded-xl font-bold" value={formData.adminPassword} onChange={(e) => setFormData({...formData, adminPassword: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la Sala Inicial</label>
                    <Input placeholder="Ej. Sala 01" className="h-12 bg-slate-50 border-none rounded-xl font-bold" value={formData.roomName} onChange={(e) => setFormData({...formData, roomName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Equipo Médico Asignado</label>
                    <select className="w-full h-12 px-4 bg-slate-50 border-none rounded-xl font-bold text-sm" value={formData.equipment} onChange={(e) => setFormData({...formData, equipment: e.target.value})}>
                      <option>Capturadora USB</option>
                      <option>Olympus</option>
                      <option>Pentax</option>
                      <option>Fujifilm</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-6 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-success/10 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                   <ShieldCheck className="w-10 h-10 text-success" />
                </div>
                <h3 className="text-2xl font-bold italic">Configuración Lista</h3>
                <p className="text-sm text-slate-400 mt-2 font-medium max-w-xs mx-auto leading-relaxed">
                  La organización y la sala inicial han sido creadas. Redirigiendo al portal de acceso...
                </p>
              </div>
            )}

            <Button
              className="w-full h-16 mt-8 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 group disabled:opacity-50"
              onClick={handleNext}
              disabled={isProcessing || (step === 1 && !formData.orgName)}
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {step === 4 ? "Finalizar y Salir" : step === 3 ? "Crear Organización" : "Siguiente Paso"}
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
