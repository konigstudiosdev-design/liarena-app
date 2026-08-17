import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardContent, Badge } from "../../components/ui";
import {
  Users,
  UserPlus,
  ChevronRight,
  Stethoscope,
  Sparkles
} from "lucide-react";

export default function SetupStaff() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[650px] space-y-12 text-center animate-in fade-in zoom-in duration-1000">
        {/* Celebration Header */}
        <div className="space-y-4">
           <div className="w-24 h-24 bg-success/10 rounded-[40px] flex items-center justify-center mx-auto shadow-xl shadow-success/5 animate-bounce">
              <ShieldCheck className="w-12 h-12 text-success" />
           </div>
           <div className="space-y-1">
              <Badge variant="primary" className="bg-primary/5 text-primary border-none text-[9px] font-black tracking-widest px-4">Instalación Exitosa</Badge>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 italic pt-2">Bienvenido</h1>
              <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto leading-relaxed">
                Tu organización ya está configurada. El siguiente paso es registrar a tu personal médico.
              </p>
           </div>
        </div>

        {/* Action Card */}
        <Card className="border-none shadow-premium bg-white rounded-[48px] overflow-hidden group hover:shadow-2xl transition-all duration-700">
           <CardContent className="p-12 space-y-10">
              <div className="flex flex-col items-center gap-6">
                 <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                    <Users className="w-10 h-10 text-slate-300 group-hover:text-primary transition-colors" />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-slate-900 italic tracking-tight">Personal Médico</h3>
                    <p className="text-slate-400 text-sm font-medium italic">Registre a los especialistas que realizarán procedimientos y generarán reportes.</p>
                 </div>
              </div>

              <div className="pt-6">
                 <Button
                    onClick={() => {
                      localStorage.setItem('liarena_admin_welcome', 'true');
                      navigate("/org/staff");
                    }}
                    className="w-full h-20 rounded-[32px] text-[13px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 gap-3 group relative overflow-hidden"
                 >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 flex items-center gap-3">
                      <UserPlus className="w-5 h-5" /> Crear Staff Médico
                    </span>
                    <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-2 transition-transform" />
                 </Button>
              </div>
           </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-4 text-slate-300 font-bold uppercase tracking-[0.2em] text-[10px]">
           <Sparkles className="w-4 h-4 text-warning" />
           LIARENA CLINICAL SUITE
        </div>
      </div>
    </div>
  );
}

const ShieldCheck = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
);
