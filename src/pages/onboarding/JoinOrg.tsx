import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardContent, Input, Badge, toast } from "../../components/ui";
import {
  ArrowLeft,
  ChevronRight,
  Globe,
  Key,
  User,
  Monitor,
  Loader2,
  AlertCircle
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function JoinOrg() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    orgCode: "",
    username: "",
    password: ""
  });

  const handleJoin = async () => {
    setIsProcessing(true);
    setError("");

    try {
      // 1. Parse code
      const code = formData.orgCode.replace('LIA-', '').toLowerCase();
      if (code.length < 8) throw new Error("Formato de código inválido.");

      // 2. Find Organization by ID prefix
      // Note: We search in 'organizations' where ID starts with the code
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id, nombre')
        .filter('id', 'ilike', `${code}%`);

      if (orgError) throw orgError;
      if (!orgs || orgs.length === 0) throw new Error("Organización no encontrada con ese código.");

      const targetOrg = orgs[0];

      // 3. Validate Credentials & Role
      // We first need the email associated with that username in that organization
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('correo, role')
        .eq('organization_id', targetOrg.id)
        .ilike('username', formData.username.trim())
        .single();

      if (userError || !userData) throw new Error("El usuario no pertenece a esta organización o no existe.");

      // 4. Authenticate
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.correo,
        password: formData.password
      });

      if (authError) throw new Error("Credenciales inválidas.");

      // 5. Success! Save and redirect
      localStorage.setItem('liarena_org_id', targetOrg.id);
      localStorage.setItem('liarena_configured', 'true');

      toast.success(`Conectado a ${targetOrg.nombre}`);
      navigate("/");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error de vinculación.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[480px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/onboarding")}
          className="text-slate-400 hover:text-slate-900 gap-2 font-bold uppercase tracking-widest text-[10px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Cancelar
        </Button>

        <Card className="border-none shadow-premium bg-white rounded-[40px] overflow-hidden">
          <div className="bg-slate-900 p-10 text-white relative">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Globe className="w-20 h-20" />
             </div>
             <Badge variant="primary" className="mb-4 bg-primary/20 text-primary border-transparent font-black tracking-widest text-[9px]">Vincular Nodo</Badge>
             <h2 className="text-3xl font-bold tracking-tight italic">Unirse a la Red</h2>
             <p className="text-slate-400 text-sm mt-1 font-medium italic">Configure el acceso a una red existente.</p>
          </div>

          <CardContent className="p-10 space-y-6">
            {error && (
              <div className="p-4 bg-danger/5 border border-danger/10 rounded-2xl flex items-center gap-3 text-danger text-[10px] font-black uppercase tracking-widest animate-in fade-in italic">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Código de Organización</label>
                <div className="relative group">
                  <Key className="absolute left-4 top-3.5 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="LIA-XXXX-XXXX"
                    className="h-12 pl-12 bg-slate-50 border-none rounded-xl font-bold text-slate-800"
                    value={formData.orgCode}
                    onChange={(e) => setFormData({...formData, orgCode: e.target.value.toUpperCase()})}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Acceso Administrador / Doctor</label>
                <div className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-300" />
                    <Input
                      placeholder="Nombre de Usuario"
                      className="h-12 pl-12 bg-slate-50 border-none rounded-xl font-bold text-slate-800"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      disabled={isProcessing}
                    />
                  </div>
                  <Input
                    type="password"
                    placeholder="Contraseña"
                    className="h-12 bg-slate-50 border-none rounded-xl font-bold text-slate-800"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>

            <Button
              className="w-full h-16 mt-6 text-[11px] font-black uppercase tracking-[0.2em] rounded-[24px] shadow-xl shadow-primary/20 group"
              onClick={handleJoin}
              disabled={!formData.orgCode || !formData.username || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Vincular Nodo
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 pt-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
               <Monitor className="w-3 h-3" /> Identificador: {navigator.platform}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
