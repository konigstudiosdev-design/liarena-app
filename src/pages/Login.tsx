import { cn } from "../lib/utils";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  Input,
  Badge,
  toast
} from "../components/ui/index";
import {
  Stethoscope,
  Lock,
  ChevronRight,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Play,
  ArrowRight,
  ShieldCheck,
  Zap,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const logo = "/logo.png";
  const [identifier, setIdentifier] = useState(() => {
    return localStorage.getItem('liarena_remembered_user') || "";
  });
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    return !!localStorage.getItem('liarena_remembered_user');
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    toast.info("Validando acceso seguro...");

    try {
      let email = identifier.trim();
      const loginPassword = password.trim();

      if (!email.includes('@')) {
        console.log("🔍 LIARENA: Buscando usuario por username:", email);
        const { data: userRecord, error: searchError } = await supabase
          .from('users')
          .select('correo')
          .ilike('username', email)
          .maybeSingle();

        if (searchError) {
          console.error("❌ LIARENA: Error de búsqueda en DB:", searchError);
          throw new Error(`Error de conexión con el servidor: ${searchError.message}`);
        }

        if (!userRecord) {
          console.warn("⚠️ LIARENA: Usuario no encontrado en la tabla 'users'.");
          throw new Error(`El usuario "@${email}" no existe. Si realizaste un reset, crea la organización y el usuario de nuevo.`);
        }
        email = userRecord.correo.trim();
      }

      console.log("🔐 LIARENA: Intentando autenticación para:", email);
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: loginPassword,
      });

      if (authError) {
        console.error("❌ LIARENA: Auth Error:", authError.message);
        if (authError.message === "Invalid login credentials") {
          throw new Error("La contraseña ingresada es incorrecta.");
        }
        throw authError;
      }

      console.log("✅ LIARENA: Auth exitosa. Sincronizando perfil...");

      // Update last login (Non-blocking)
      supabase
        .from('users')
        .update({ ultimo_inicio_sesion: new Date().toISOString() })
        .eq('auth_user_id', data.user.id)
        .then(({error}) => {
          if (error) console.warn("LIARENA: No se pudo actualizar último inicio:", error.message);
        });

      const { data: userData, error: profileError } = await supabase
        .from('users')
        .select('role, organization_id, nombre, apellidos')
        .eq('auth_user_id', data.user.id)
        .single();

      if (profileError) {
        console.error("❌ LIARENA: Error al obtener perfil post-login:", profileError);
        throw new Error("Autenticado, pero no se encontró tu perfil clínico.");
      }

      if (userData?.organization_id) {
        localStorage.setItem('liarena_org_id', userData.organization_id);
      }

      if (userData?.nombre) {
        localStorage.setItem('liarena_user_name', `${userData.nombre} ${userData.apellidos || ''}`);
      }

      toast.success(`Bienvenido, ${userData.nombre}`);

      if (email === 'konigstudios.dev@gmail.com' || userData?.role === 'developer') {
        navigate("/dev");
        return;
      }

      switch (userData.role) {
        case 'organization_admin': navigate("/org"); break;
        case 'doctor': navigate("/medic"); break;
        case 'assistant': navigate("/assistant"); break;
        default: navigate("/medic");
      }

    } catch (err: any) {
      console.error("❌ LIARENA Login Exception:", err);
      setError(err.message || "Error de autenticación crítico.");
      toast.error(err.message || "Error al iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col items-center justify-center p-8 font-sans relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[460px] z-10 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative group">
             <div className="absolute inset-0 bg-primary blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
             <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center relative shadow-xl transform transition-transform duration-700 group-hover:scale-105 p-4 border border-slate-50">
                <img src={logo} alt="Liarena Logo" className="w-full h-full object-contain" />
             </div>
          </div>
          <div className="text-center space-y-1">
             <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Liarena<span className="text-primary">.</span></h1>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">PORTAL ESPECIALISTAS WEB</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="relative flex items-center py-2 hidden">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-6 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Portal de Gestión</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <Card className="border-none shadow-premium bg-white rounded-[44px] overflow-hidden border border-slate-50/50">
            <CardContent className="p-10">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">USUARIO O CORREO</label>
                  <div className="relative">
                     <User className="absolute left-4 top-4 w-4.5 h-4.5 text-slate-300 hidden" />
                     <Input
                        placeholder="ej: dr_perez o dr@correo.com"
                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-primary/10"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                     />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">CONTRASEÑA</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 w-4.5 h-4.5 text-slate-300 hidden" />
                    <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-primary/10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4.5 text-slate-300 hover:text-slate-500 transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2 hidden">
                   <button
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className="flex items-center gap-2 group cursor-pointer"
                   >
                      <div className={cn(
                        "w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center",
                        rememberMe ? "bg-primary border-primary shadow-lg shadow-primary/20" : "border-slate-200 bg-slate-50"
                      )}>
                         {rememberMe && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest transition-colors",
                        rememberMe ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                      )}>Recordar Usuario</span>
                   </button>
                </div>

                {error && (
                   <div className="bg-danger/5 text-danger p-5 rounded-3xl text-[10px] font-black uppercase tracking-widest border border-danger/10 italic flex items-center gap-4 animate-in shake duration-500">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>{error}</span>
                   </div>
                )}

                <Button
                   type="submit"
                   variant="primary"
                   className="w-full h-16 rounded-[24px] text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 gap-3 group overflow-hidden relative"
                   disabled={isLoading}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative z-10 flex items-center gap-3">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ACCEDER AL PORTAL"}
                  </span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col items-center gap-4 pt-4 animate-in fade-in duration-1000 delay-500">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aislamiento HIPAA</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-200" />
              <div className="flex items-center gap-2">
                 <Zap className="w-3.5 h-3.5 text-slate-300" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">v1.0.4 Clinical Build</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
