import React, { useEffect, useState } from "react";
import {
  Monitor,
  Apple,
  ChevronRight,
  ShieldCheck,
  Zap,
  Download,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button, Card, Badge } from "../components/ui";

export default function DownloadPage() {
  const [os, setOs] = useState<'mac' | 'windows' | 'unknown'>('windows');

  useEffect(() => {
    const platform = window.navigator.platform.toLowerCase();
    if (platform.includes('mac')) setOs('mac');
    else if (platform.includes('win')) setOs('windows');
  }, []);

  const GITHUB_BASE = "https://github.com/konigstudiosdev-design/Liarena/releases/latest/download";

  // Estos nombres deben coincidir con lo que genera electron-builder en package.json
  const links = {
    mac: `${GITHUB_BASE}/Liarena-1.0.1-mac.dmg`,
    win: `${GITHUB_BASE}/Liarena-1.0.1-win.exe`
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col font-sans selection:bg-primary/10">
      {/* Header Fino */}
      <nav className="h-20 flex items-center justify-between px-10 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center p-2 shadow-lg">
             <img src="/logo.png" alt="Liarena" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase italic">Liarena<span className="text-primary">.</span></span>
        </div>
        <div className="flex items-center gap-6">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:inline">Centro de Distribución Oficial</span>
           <Badge variant="success" className="h-6">v1.0.1 Stable</Badge>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

        {/* Lado Izquierdo: Pitch */}
        <div className="space-y-10 animate-in fade-in slide-in-from-left-6 duration-1000">
           <div className="space-y-4">
              <h1 className="text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[0.9] italic uppercase">
                Potencia tu <br />
                <span className="text-primary">Consulta</span> Clínica.
              </h1>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-lg italic">
                Descarga la suite de captura y gestión endoscópica más avanzada. Diseñada por especialistas para especialistas.
              </p>
           </div>

           <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => window.location.href = links.mac}
                  className={cn(
                    "h-16 px-8 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all gap-3 text-xs font-black uppercase tracking-widest group flex-1",
                    os === 'mac' ? "bg-primary text-white" : "bg-slate-900 text-white"
                  )}
                >
                   <Apple size={20} className="group-hover:rotate-12 transition-transform" />
                   Descargar para Mac
                </Button>

                <Button
                  onClick={() => window.location.href = links.win}
                  className={cn(
                    "h-16 px-8 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all gap-3 text-xs font-black uppercase tracking-widest group flex-1",
                    os === 'windows' ? "bg-primary text-white" : "bg-slate-900 text-white"
                  )}
                >
                   <Monitor size={20} className="group-hover:rotate-12 transition-transform" />
                   Descargar para Windows
                </Button>
              </div>
           </div>

           <div className="grid grid-cols-3 gap-8 pt-10 border-t border-slate-100">
              <div className="space-y-2">
                 <ShieldCheck className="text-primary w-6 h-6" />
                 <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Seguro</p>
                 <p className="text-[10px] text-slate-400 font-medium italic">Encriptación AES-256</p>
              </div>
              <div className="space-y-2">
                 <Zap className="text-amber-500 w-6 h-6" />
                 <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Rápido</p>
                 <p className="text-[10px] text-slate-400 font-medium italic">Build Optimizado</p>
              </div>
              <div className="space-y-2">
                 <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                 <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Sincronizado</p>
                 <p className="text-[10px] text-slate-400 font-medium italic">Cloud Backup Activo</p>
              </div>
           </div>
        </div>

        {/* Lado Derecho: Preview/Instrucciones */}
        <div className="relative animate-in fade-in zoom-in duration-1000 delay-300">
           <Card className="border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] bg-white rounded-[54px] p-12 relative z-10 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
              <h3 className="text-2xl font-bold italic tracking-tighter uppercase mb-8">Guía de Instalación</h3>

              <div className="space-y-8">
                 {[
                    { step: 1, title: "Descarga", text: "Obtén el instalador oficial desde los botones superiores." },
                    { step: 2, title: "Ejecuta", text: "Abre el archivo descargado y arrastra Liarena a Aplicaciones." },
                    { step: 3, title: "Vincula", text: "Usa tu Código de Organización para activar el nodo clínico." }
                 ].map((item) => (
                   <div key={item.step} className="flex gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 font-black italic text-lg shrink-0 shadow-inner">
                        {item.step}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 uppercase italic tracking-tight">{item.title}</h4>
                        <p className="text-sm text-slate-400 font-medium italic">{item.text}</p>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="mt-12 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-start gap-4">
                 <AlertCircle className="text-primary shrink-0" size={20} />
                 <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">
                   Nota para Mac: Si aparece el mensaje de "Desarrollador no identificado", ve a Ajustes de Sistema {'>'} Privacidad y Seguridad {'>'} Abrir de todos modos.
                 </p>
              </div>
           </Card>

           {/* Decoración Background */}
           <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-slate-100 rounded-full -z-20 opacity-50" />
        </div>

      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 bg-white text-center space-y-4">
         <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Liarena SaaS • Healthcare Infrastructure</p>
         <div className="flex justify-center gap-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-primary transition-colors">Soporte</a>
            <span className="text-slate-200">•</span>
            <a href="#" className="hover:text-primary transition-colors">Privacidad</a>
            <span className="text-slate-200">•</span>
            <a href="#" className="hover:text-primary transition-colors">Términos</a>
         </div>
      </footer>
    </div>
  );
}
