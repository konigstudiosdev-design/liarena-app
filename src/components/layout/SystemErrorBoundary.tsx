import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { Button, Card } from "../ui/index";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class SystemErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("LIARENA SYSTEM ERROR:", error, errorInfo);
    this.setState({ errorInfo });

    // Aquí se podría enviar a un servicio de logging externo
    localStorage.setItem('liarena_last_error', JSON.stringify({
      message: error.message,
      stack: error.stack,
      time: new Date().toISOString(),
      url: window.location.href
    }));
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center p-6 font-sans">
          <Card className="max-w-2xl w-full border-none shadow-premium bg-white rounded-[48px] overflow-hidden animate-in zoom-in duration-500">
            <div className="bg-slate-900 p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-10">
                <ShieldAlert size={120} />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-danger/20 text-danger rounded-full text-[10px] font-black uppercase tracking-widest border border-danger/10">
                  <AlertCircle className="w-3 h-3" /> System Kernel Interrupted
                </div>
                <h1 className="text-4xl font-bold italic tracking-tighter">Excepción del Sistema</h1>
                <p className="text-slate-400 text-sm font-medium italic">
                  Se ha detectado una interrupción inesperada en el núcleo de la aplicación.
                </p>
              </div>
            </div>

            <div className="p-12 space-y-10">
              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Detalles del Error</p>
                <div className="font-mono text-[11px] text-danger bg-danger/5 p-4 rounded-xl border border-danger/10 break-words leading-relaxed">
                  {this.state.error?.message || "Error desconocido"}
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic text-center pt-2">
                  ID de sesión: {Math.random().toString(36).substring(7).toUpperCase()}
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1 h-16 rounded-[24px] font-black text-[11px] uppercase tracking-widest gap-3 shadow-xl shadow-primary/20"
                >
                  <RefreshCw className="w-4 h-4" /> Reintentar Núcleo
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1 h-16 rounded-[24px] border-slate-100 font-black text-[11px] uppercase tracking-widest gap-3 hover:bg-slate-50"
                >
                  <Home className="w-4 h-4" /> Volver al Inicio
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
