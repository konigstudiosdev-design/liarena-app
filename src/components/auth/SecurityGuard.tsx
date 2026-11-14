import React, { useState, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Loader2, Lock } from "lucide-react";
import { Card, Button } from "../ui/index";

interface SecurityGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

interface CachedSession {
  authUserId: string;
  role: string;
  organizationId: string | null;
  timestamp: number;
}

let cachedSession: CachedSession | null = null;

export function clearSecurityGuardCache() {
  cachedSession = null;
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    cachedSession = null;
  }
});

function withTimeout<T>(promise: PromiseLike<T>, ms = 8000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout session check"));
    }, ms);

    Promise.resolve(promise).then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

export const SecurityGuard = ({ children, allowedRoles }: SecurityGuardProps) => {
  const [loading, setLoading] = useState(() => !cachedSession);
  const [authenticated, setAuthenticated] = useState(() => !!cachedSession);
  const [userRole, setUserRole] = useState<string | null>(() => cachedSession?.role || null);
  const location = useLocation();
  const isValidatingRef = useRef(false);

  useEffect(() => {
    validateSession();
  }, [location.pathname]);

  async function validateSession() {
    const now = Date.now();
    const isCacheValid = cachedSession && (now - cachedSession.timestamp < 15 * 60 * 1000);

    if (isCacheValid) {
      setUserRole(cachedSession!.role);
      setAuthenticated(true);
      if (loading) setLoading(false);
      return;
    }

    if (isValidatingRef.current) return;
    isValidatingRef.current = true;

    if (!cachedSession) {
      setLoading(true);
    }

    try {
      const sessionRes = await withTimeout(supabase.auth.getSession(), 6000);
      const session = sessionRes.data?.session;

      if (!session) {
        cachedSession = null;
        setAuthenticated(false);
        setUserRole(null);
        setLoading(false);
        return;
      }

      console.log("🛡️ LIARENA: Validando rol para usuario:", session.user.id);
      const { data: userData, error } = await withTimeout(
        supabase
          .from('users')
          .select('role, organization_id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle(),
        6000
      );

      if (error) {
        console.error("❌ LIARENA: Error al validar sesión en DB:", error.message);
        // Si hay error de red/DB pero tenemos sesión de Auth, permitimos continuar
        // para evitar "sacar" al usuario por fallos temporales de conexión.
        if (session) {
           setAuthenticated(true);
           setLoading(false);
           return;
        }
      }

      let roleToSet: string | null = null;
      if (!userData) {
        console.warn("⚠️ LIARENA: Perfil no encontrado en tabla 'users'.");
        if (session.user.email === 'konigstudios.dev@gmail.com') {
           roleToSet = 'dev';
        }
      } else {
        roleToSet = userData.role;
        if (userData.organization_id) {
          localStorage.setItem('liarena_org_id', userData.organization_id);
        }
      }

      if (roleToSet) {
        cachedSession = {
          authUserId: session.user.id,
          role: roleToSet,
          organizationId: userData?.organization_id || null,
          timestamp: Date.now()
        };
        setUserRole(roleToSet);
        setAuthenticated(true);
      } else {
        cachedSession = null;
        setAuthenticated(false);
      }
    } catch (e) {
      console.warn("SecurityGuard Session Check Timeout/Fail:", e);
      if (!cachedSession) {
        setAuthenticated(false);
      }
    } finally {
      isValidatingRef.current = false;
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

  const normalizedAllowed = allowedRoles ? allowedRoles.map(r => r.toLowerCase().trim()) : null;
  const normalizedUserRole = (userRole || "").toLowerCase().trim();

  const isRoleAllowed = !normalizedAllowed ||
    normalizedAllowed.includes(normalizedUserRole) ||
    normalizedUserRole === 'dev' ||
    normalizedUserRole === 'developer';

  if (!isRoleAllowed) {
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
