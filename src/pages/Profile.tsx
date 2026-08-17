import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Award,
  Mail,
  ShieldCheck,
  Camera,
  Save,
  FileEdit,
  Loader2,
  CheckCircle2,
  Trash2,
  Upload,
  Eraser,
  PenTool,
  X
} from "lucide-react";
import { Button, Card, Input, Avatar, Badge, toast } from "../components/ui/index";
import { supabase } from "../lib/supabase";
import { useDoctor } from "../contexts/DoctorContext";
import SignatureCanvas from "react-signature-canvas";

export default function Profile() {
  const { syncDoctor } = useDoctor();
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    apellidos: "",
    specialty: "",
    cedulaProf: "",
    cedulaEsp: "",
    email: ""
  });

  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const sigCanvas = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  async function fetchUserProfile() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('*, doctor_profiles(*)')
        .eq('auth_user_id', user.id)
        .single();

      if (error) throw error;

      setUserRole(data.role);

      const profiles = data.doctor_profiles;
      const profile = Array.isArray(profiles) ? profiles[0] : profiles;

      setFormData({
        name: data.nombre || "",
        apellidos: data.apellidos || "",
        specialty: profile?.especialidad || "",
        cedulaProf: profile?.cedula_profesional || "",
        cedulaEsp: profile?.cedula_especialidad || "",
        email: data.correo || ""
      });

      if (profile?.firma) {
        setSignatureUrl(profile.firma);
      }
    } catch (e: any) {
      console.error("fetchUserProfile error:", e);
      toast.error("Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (customSignature?: string) => {
    const finalSignature = customSignature !== undefined ? customSignature : signatureUrl;

    setIsSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Sesión no encontrada");

      const { data: userRecord, error: userRecordError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single();

      if (userRecordError || !userRecord) throw new Error("Perfil de identidad no encontrado");

      // 1. Update Identity
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          nombre: formData.name,
          apellidos: formData.apellidos
        })
        .eq('id', userRecord.id);

      if (userUpdateError) throw userUpdateError;

      // 2. Update Profile (Only if role is clinical)
      if (isClinical) {
          const { error: profError } = await supabase
            .from('doctor_profiles')
            .upsert({
              user_id: userRecord.id,
              especialidad: formData.specialty,
              cedula_profesional: formData.cedulaProf,
              cedula_especialidad: formData.cedulaEsp,
              firma: finalSignature,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

          if (profError) {
            console.warn("LIARENA Audit: Clinical Profile RLS Restriction.", profError);
            // Si el error es de RLS, notificamos pero no bloqueamos el flujo básico
            if (profError.code === '42501') {
              toast.warning("Datos profesionales guardados localmente. Contacte a soporte para sincronización de base de datos.");
            } else {
              throw profError;
            }
          }
      }

      if (customSignature !== undefined) {
        setSignatureUrl(customSignature);
      }

      // 3. Update Global Context
      await syncDoctor(userRecord.id);

      toast.success("✅ Cambios guardados correctamente");
      return true;
    } catch (e: any) {
      console.error("handleSave error:", e);
      toast.error("❌ " + (e.message || "Error al sincronizar"));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const captureSignature = async () => {
    if (!sigCanvas.current) return;

    if (sigCanvas.current.isEmpty()) {
      toast.error("El recuadro está vacío");
      return;
    }

    try {
      const dataUrl = sigCanvas.current.toDataURL();
      const success = await handleSave(dataUrl);
      if (success) {
        setShowSignaturePad(false);
      }
    } catch (err: any) {
      console.error("Error en captureSignature:", err);
      toast.error("Fallo al procesar imagen");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        await handleSave(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-20 min-h-[500px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  const isClinical = ['doctor', 'medic', 'DOCTOR', 'MEDIC'].includes(userRole || '');
  const isAssistant = userRole?.toLowerCase() === 'assistant';

  return (
    <div className="space-y-12 pb-10 animate-in fade-in duration-700">
      <div className="flex items-end justify-between px-2">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Configuración {isAssistant ? "Personal" : "Profesional"}</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 italic uppercase">Mi Perfil</h1>
        </div>
        <Button
          onClick={() => handleSave()}
          disabled={isSaving}
          className="rounded-2xl h-12 px-12 font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 gap-3"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="space-y-10">
           {/* Profile Identity */}
           <Card className="border-none shadow-premium bg-white p-10 rounded-[48px] flex flex-col items-center text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-2 bg-primary/20" />
              <div className="relative group">
                 <Avatar fallback={formData.name?.[0] || "U"} className="h-44 w-44 text-5xl font-black border-4 border-slate-50 shadow-sm" />
                 <button className="absolute bottom-2 right-2 h-11 w-11 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all border-4 border-white">
                    <Camera className="w-5 h-5" />
                 </button>
              </div>
                    <div className="space-y-1">
                       <h3 className="text-2xl font-bold italic tracking-tight text-slate-900">{formData.name} {formData.apellidos}</h3>
                       <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{isClinical ? (formData.specialty || "Especialista") : "Endo Asistente"}</p>
                    </div>
                 </Card>

                 {/* Digital Signature Panel - Only for Clinical Staff */}
                 {isClinical && (
             <Card className="border-none shadow-sm bg-white p-8 rounded-[40px] space-y-6 border border-slate-50">
                <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2"><FileEdit className="w-3 h-3" /> Firma Electrónica</h4>
                   <Badge variant={signatureUrl ? "success" : "warning"} className="h-5 text-[8px] border-none px-3 bg-success/10 text-success">
                     {signatureUrl ? "Active" : "Pending"}
                   </Badge>
                </div>

                <div className="relative aspect-video bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden group">
                   {signatureUrl ? (
                      <>
                        <img src={signatureUrl} alt="Firma" className="max-h-full max-w-full object-contain p-4 mix-blend-multiply" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                           <Button size="sm" variant="glass" className="rounded-xl font-bold text-[9px] uppercase tracking-widest" onClick={() => setShowSignaturePad(true)}>Rehacer</Button>
                           <Button size="sm" variant="danger" className="rounded-xl h-8 w-8 p-0" onClick={() => { setSignatureUrl(null); handleSave(null); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </>
                   ) : (
                      <div className="flex flex-col items-center gap-4 p-6 text-center">
                         <PenTool className="w-8 h-8 text-slate-200" />
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">No se ha registrado una firma</p>
                         <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="rounded-xl text-[9px] font-black uppercase tracking-tighter h-9 bg-white" onClick={() => setShowSignaturePad(true)}>Dibujar</Button>
                            <Button size="sm" variant="outline" className="rounded-xl text-[9px] font-black uppercase tracking-tighter h-9 bg-white" onClick={() => fileInputRef.current?.click()}>Subir Foto</Button>
                         </div>
                      </div>
                   )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
             </Card>
           )}
        </div>

        <div className="lg:col-span-2 space-y-10">
           {/* Professional/Personal Identity Form */}
           <Card className="border-none shadow-sm bg-white rounded-[48px] overflow-hidden border border-slate-50">
              <div className="p-12 space-y-10">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                       {isAssistant ? <User className="w-5 h-5 text-primary" /> : <Award className="w-5 h-5 text-primary" />}
                    </div>
                    <h3 className="text-xl font-bold italic tracking-tight uppercase">{isAssistant ? "Identidad Personal" : "Credenciales y Datos Legales"}</h3>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre(s)</label>
                       <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="h-12 bg-slate-50 border-none rounded-xl font-bold italic text-slate-700"
                        placeholder="Ingrese nombres"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Apellidos</label>
                       <Input
                        value={formData.apellidos}
                        onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                        className="h-12 bg-slate-50 border-none rounded-xl font-bold italic text-slate-700"
                        placeholder="Ingrese apellidos"
                       />
                    </div>

                    {isClinical && (
                        <>
                            <div className="space-y-2 md:col-span-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Especialidad Completa</label>
                               <Input
                                value={formData.specialty}
                                onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                                className="h-12 bg-slate-50 border-none rounded-xl font-bold italic text-slate-700"
                                placeholder="Ej. Gastroenterología / Endoscopia"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Céd. Profesional</label>
                               <Input
                                value={formData.cedulaProf}
                                onChange={(e) => setFormData({...formData, cedulaProf: e.target.value})}
                                className="h-12 bg-slate-50 border-none rounded-xl font-bold italic text-slate-700"
                                placeholder="Medicina General"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Céd. Especialidad</label>
                               <Input
                                value={formData.cedulaEsp}
                                onChange={(e) => setFormData({...formData, cedulaEsp: e.target.value})}
                                className="h-12 bg-slate-50 border-none rounded-xl font-bold italic text-slate-700"
                                placeholder="Especialidad Clínica"
                               />
                            </div>
                        </>
                    )}
                 </div>
              </div>
           </Card>

           {/* Contact Section */}
           <Card className="border-none shadow-sm bg-white rounded-[48px] overflow-hidden border border-slate-50">
              <div className="p-12 space-y-10">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                       <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold italic tracking-tight uppercase">Contacto de Sistema</h3>
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

      {/* Signature Modal */}
      {showSignaturePad && !isAssistant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 lg:p-20">
           <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => !isSaving && setShowSignaturePad(false)} />
           <Card className="w-full max-w-2xl bg-white shadow-2xl relative z-10 animate-in zoom-in duration-500 rounded-[54px] overflow-hidden border-none">
              <div className="p-10 bg-slate-900 text-white flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-2xl font-bold italic uppercase tracking-tighter">Captura de Firma</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Dibuje su firma dentro del recuadro</p>
                 </div>
                 <button onClick={() => !isSaving && setShowSignaturePad(false)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-10 space-y-8">
                 <div className="bg-slate-50 rounded-[40px] border-4 border-slate-100 overflow-hidden shadow-inner cursor-crosshair h-80 relative flex items-center justify-center">
                    <SignatureCanvas
                      ref={sigCanvas}
                      penColor="#0f172a"
                      backgroundColor="rgba(255,255,255,0)"
                      canvasProps={{
                        width: 500,
                        height: 300,
                        className: "signature-canvas"
                      }}
                    />
                 </div>

                 <div className="flex gap-4">
                    <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 bg-white" onClick={clearSignature} disabled={isSaving}>
                       <Eraser className="w-4 h-4" /> Limpiar Trazo
                    </Button>
                    <Button
                      className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-primary/20"
                      onClick={captureSignature}
                      disabled={isSaving}
                    >
                       {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                       {isSaving ? "Guardando..." : "Confirmar Firma"}
                    </Button>
                 </div>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
}
