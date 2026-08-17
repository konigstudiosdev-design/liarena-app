import React, { useState, useEffect } from "react";
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowUpCircle,
  X,
  Loader2
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button, Card, Badge, toast } from "../ui";

export const UpdateManager: React.FC = () => {
  const [status, setStatus] = useState<string>("UP_TO_DATE");
  const [updateData, setUpdateData] = useState<any>(null);
  const [progress, setProgress] = useState<number>(0);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Only run on Desktop
    if (!(window as any).ipcRenderer) return;

    const unsubscribe = (window as any).ipcRenderer.update.onStatusChange((info: any) => {
      setStatus(info.status);

      if (info.status === "UPDATE_AVAILABLE") {
        setUpdateData(info.data);
        setShowNotification(true);
        toast.info(`Nueva versión de Liarena disponible: ${info.data.version}`);
      }

      if (info.status === "DOWNLOADING") {
        setProgress(info.data.percent);
      }

      if (info.status === "DOWNLOADED") {
        setShowNotification(true);
        toast.success("Actualización descargada y lista para instalar.");
      }

      if (info.status === "ERROR") {
        toast.error(`Error de actualización: ${info.data}`);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDownload = () => {
    if (!(window as any).ipcRenderer) return;
    (window as any).ipcRenderer.update.startDownload();
  };

  const handleInstall = () => {
    if (!(window as any).ipcRenderer) return;
    (window as any).ipcRenderer.update.quitAndInstall();
  };

  if (!showNotification || status === "UP_TO_DATE") {
    // Check if we have a mandatory update that was previously detected but not installed
    if (updateData?.isMandatory && status !== "DOWNLOADED") {
        // We still want to show the mandatory notice
    } else if (!showNotification) {
        return null;
    }
  }

  // Mandatory Update Overlay
  if (updateData?.isMandatory && status !== "DOWNLOADED" && status !== "DOWNLOADING") {
    return (
        <div className="fixed inset-0 z-[3000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6">
            <Card className="w-full max-w-md bg-white rounded-[48px] p-12 text-center space-y-8 shadow-2xl">
                <div className="w-24 h-24 bg-primary/10 rounded-[40px] flex items-center justify-center mx-auto text-primary animate-bounce">
                    <ArrowUpCircle size={48} />
                </div>
                <div className="space-y-2">
                    <Badge variant="danger" className="h-6 px-4">Actualización Obligatoria</Badge>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">Liarena v{updateData.version}</h2>
                    <p className="text-slate-500 text-sm font-medium italic">
                        Esta versión incluye parches de seguridad críticos y mejoras de estabilidad necesarias para continuar operando.
                    </p>
                </div>
                <Button onClick={handleDownload} className="w-full h-16 rounded-3xl font-black uppercase text-[12px] tracking-[0.2em] shadow-xl">
                    Descargar e Instalar Ahora
                </Button>
            </Card>
        </div>
    );
  }

  return (
    <div className="fixed bottom-10 left-10 z-[2000] animate-in slide-in-from-left-10 duration-500">
      <Card className="w-80 bg-slate-900 border-none shadow-2xl overflow-hidden rounded-[32px]">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="primary" className="bg-primary/20 text-primary border-none text-[8px]">
              {status === "DOWNLOADED" ? "Sistema Listo" : "Actualización"}
            </Badge>
            <button onClick={() => setShowNotification(false)} className="text-slate-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary shrink-0">
              {status === "DOWNLOADING" ? <Loader2 className="animate-spin" size={20} /> : <ArrowUpCircle size={20} />}
            </div>
            <div className="space-y-1">
              <h4 className="text-white font-bold text-sm tracking-tight">Liarena {updateData?.version || ""}</h4>
              <p className="text-slate-400 text-[10px] font-medium leading-relaxed italic">
                {status === "UPDATE_AVAILABLE" && "Una nueva versión está disponible para descargar."}
                {status === "DOWNLOADING" && `Descargando recursos... ${progress}%`}
                {status === "DOWNLOADED" && "La actualización se ha completado satisfactoriamente."}
              </p>
            </div>
          </div>

          {status === "DOWNLOADING" && (
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="pt-2">
            {status === "UPDATE_AVAILABLE" && (
              <Button onClick={handleDownload} className="w-full h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-2">
                <Download size={14} /> Descargar Ahora
              </Button>
            )}
            {status === "DOWNLOADED" && (
              <Button onClick={handleInstall} className="w-full h-11 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-[10px] font-black uppercase tracking-widest gap-2">
                <RefreshCw size={14} /> Reiniciar y Actualizar
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
