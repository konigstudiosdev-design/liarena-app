import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Loader2, ShieldAlert, Lock } from "lucide-react";
import { Card, Button } from "../ui/index";

interface SecurityGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const SecurityGuard = ({ children, allowedRoles }: SecurityGuardProps) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    validateSession();
  }, [location.pathname]);

  async function validateSession() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      // Validar rol real desde la base de datos
      console.log("🛡️ LIARENA: Validando rol para usuario:", session.user.id);
      const { data: userData, error } = await supabase
        .from('users')
        .select('role, organization_id')
        .eq('auth_user_id', session.user.id)
        .maybeSingle(); // Usar maybeSingle para evitar error de 0 filas

      if (error) {
        console.error("❌ LIARENA: Error al validar sesión en DB:", error.message);
      }

      if (!userData) {
        console.warn("⚠️ LIARENA: Perfil no encontrado en tabla 'users'.");
        // Manejo especial para Developer Root si no está en la tabla users
        if (session.user.email === 'konigstudios.dev@gmail.com') {
           setUserRole('dev');
           setAuthenticated(true);
        } else {
           // Si no es dev y no hay perfil, forzar re-login
           setAuthenticated(false);
        }
      } else {
        setUserRole(userData.role);
        setAuthenticated(true);
        // Asegurar que el orgId esté en sync
        if (userData.organization_id) {
          localStorage.setItem('liarena_org_id', userData.organization_id);
        }
      }
    } catch (e) {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFD]">
        <div className="text-center space-y-4">
           <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto opacity-20" />
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Verificando Credenciales</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Si hay roles permitidos y el usuario no tiene el rol, mostrar error elegante
  if (allowedRoles && userRole && !allowedRoles.includes(userRole) && userRole !== 'dev') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full p-12 text-center space-y-8 rounded-[48px] border-none shadow-2xl bg-white animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-danger/10 rounded-[40px] flex items-center justify-center mx-auto text-danger">
              <Lock size={48} />
           </div>
           <div className="space-y-2">
              <h2 className="text-3xl font-bold italic tracking-tighter uppercase text-slate-900">Acceso Restringido</h2>
              <p className="text-slate-400 text-sm font-medium italic">
                Su perfil de <span className="text-primary font-black not-italic uppercase">{userRole}</span> no tiene privilegios para acceder a este nodo del sistema.
              </p>
           </div>
           <Button onClick={() => window.history.back()} className="w-full h-16 rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20">
              Regresar al Panel Seguro
           </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
