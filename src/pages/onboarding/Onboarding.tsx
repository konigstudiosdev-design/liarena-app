import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardContent } from "../../components/ui";
import {
  Stethoscope,
  Building2,
  UserPlus,
  ChevronRight,
  Globe,
  Monitor
} from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[800px] z-10 space-y-12 text-center">
        {/* Brand Section */}
        <div className="flex flex-col items-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-20 h-20 bg-primary rounded-[28px] flex items-center justify-center shadow-2xl shadow-primary/20 transform transition-all hover:scale-105">
            <Stethoscope className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 italic">Bienvenido a LIARENA</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.3em]">Sistemas Médicos de Próxima Generación</p>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          {/* Create New Org */}
          <button
            onClick={() => navigate("/onboarding/create")}
            className="group relative flex flex-col items-start p-10 bg-white border border-slate-100 rounded-[40px] shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all text-left overflow-hidden active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
              <Building2 className="w-32 h-32" />
            </div>
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 italic tracking-tight">Nueva Organización</h3>
            <p className="text-slate-400 text-sm mt-3 font-medium leading-relaxed">Inicie una implementación desde cero para su clínica o centro hospitalario.</p>
            <div className="mt-8 flex items-center text-[10px] font-black uppercase tracking-widest text-primary gap-2">
              Comenzar Configuración <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Join Existing Org */}
          <button
            onClick={() => navigate("/onboarding/join")}
            className="group relative flex flex-col items-start p-10 bg-white border border-slate-100 rounded-[40px] shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all text-left overflow-hidden active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
              <Globe className="w-32 h-32" />
            </div>
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <UserPlus className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 italic tracking-tight">Unirse a una Red</h3>
            <p className="text-slate-400 text-sm mt-3 font-medium leading-relaxed">Configure esta computadora como un nodo adicional en una red ya existente.</p>
            <div className="mt-8 flex items-center text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors gap-2">
              Vincular Dispositivo <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-center gap-6 pt-6 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] animate-in fade-in duration-1000 delay-500">
          <div className="flex items-center gap-2">
            <Monitor className="w-3 h-3" /> Hardware Detectado
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-200" />
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3" /> v1.0.4 Clinical Node
          </div>
        </div>
      </div>
    </div>
  );
}
