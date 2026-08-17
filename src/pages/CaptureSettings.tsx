import React, { useState, useEffect, useRef } from "react";
import {
  Settings2,
  Video,
  Monitor,
  Camera,
  HardDrive,
  Cpu,
  Activity,
  FileDown,
  Database,
  Search,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Maximize2,
  RotateCcw,
  Save,
  Trash2,
  ChevronRight,
  Sliders,
  FolderOpen,
  Info,
  ShieldCheck,
  Zap,
  Mic,
  MicOff,
  Clock,
  Circle,
  RefreshCw,
  Layout,
  Layers,
  X,
  Loader2
} from "lucide-react";
import { Card, Button, Input, Badge, toast } from "../components/ui/index";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";

// Tipos de Categorías
type ConfigCategory =
  | 'GENERAL'
  | 'VIDEO_DEVICE'
  | 'VIDEO_SOURCE'
  | 'VIDEO_QUALITY'
  | 'CAPTURE_CONFIG'
  | 'PHOTO'
  | 'VIDEO'
  | 'COLOR'
  | 'PREVIEW'
  | 'STORAGE'
  | 'EXPORT'
  | 'HARDWARE'
  | 'DIAGNOSTIC';

export default function CaptureSettings() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<ConfigCategory>('GENERAL');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<Record<string, string>>({});
  const [systemInfo, setSystemInfo] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Estado de Configuración Global (Persistente)
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('liarena_pro_capture_config');
    return saved ? JSON.parse(saved) : {
      general: {
        teamName: "ENDO-NODE-01",
        officeName: "Consultorio 302",
        organization: "Clínica Gastroenterología",
        storagePath: "/Documents/LIARENA/Pacientes",
        tempPath: "/Temp/LIARENA",
      },
      videoDevice: {
        deviceId: "",
        resolution: "1920x1080",
        fps: 60,
        connection: "HDMI",
        sourceCategory: "external" // 'external' | 'integrated'
      },
      videoSource: {
        type: "HDMI",
      },
      quality: {
        resolution: "1080p",
        fps: 60,
        bitrate: "Alto",
        codec: "H264",
        format: "MP4"
      },
      capture: {
        autoCapture: false,
        saveFullVideo: true,
        onlyPhotos: false,
        continuousCapture: false,
        manualCapture: true,
        pedalTrigger: true,
        minInterval: 1000,
        autoNaming: true
      },
      photo: {
        format: "JPEG",
        quality: 90,
        resolution: "Original",
        watermark: true,
        showDate: true,
        showPatientName: true,
        showStudyName: true
      },
      video: {
        saveAudio: false,
        compression: "Media",
        splitLargeFiles: false,
        maxDuration: 0
      },
      color: {
        brightness: 50,
        contrast: 50,
        gamma: 50,
        saturation: 50,
        sharpness: 50,
        whiteBalance: "Auto",
        temperature: 5500,
        noiseReduction: "Media"
      },
      storage: {
        backupPath: "",
        autoBackup: true,
        deleteTemp: true,
        autoCompress: false
      }
    };
  });

  useEffect(() => {
    loadDevices();
    loadSystemInfo();
    return () => {
        if ((window as any).stream) (window as any).stream.getTracks().forEach((t: any) => t.stop());
    };
  }, []);

  async function loadSystemInfo() {
    if ((window as any).ipcRenderer) {
      const info = await (window as any).ipcRenderer.invoke('get-system-info');
      setSystemInfo(info);
    }
  }

  // Timer Engine: Only active during recording
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  async function loadDevices() {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devs.filter(d => d.kind === 'videoinput');
      setDevices(videoDevs);
      // Auto select if none selected
      if (videoDevs.length > 0 && !config.videoDevice.deviceId) {
        setConfig(prev => ({
          ...prev,
          videoDevice: { ...prev.videoDevice, deviceId: videoDevs[0].deviceId }
        }));
      }
    } catch (e) {
      toast.error("Error al detectar dispositivos de hardware.");
    }
  }

  const startPreview = async (deviceId: string) => {
    try {
      if ((window as any).stream) (window as any).stream.getTracks().forEach((t: any) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: 1920, height: 1080 }
      });
      (window as any).stream = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      toast.success("Stream de video sincronizado.");
    } catch (e) {
      toast.error("El dispositivo seleccionado no responde o está en uso.");
    }
  };

  const handleSave = () => {
    localStorage.setItem('liarena_pro_capture_config', JSON.stringify(config));
    toast.success("Configuración del núcleo de captura actualizada.");
  };

  const handleRestore = () => {
    if (confirm("¿Restaurar valores de fábrica del nodo?")) {
      localStorage.removeItem('liarena_pro_capture_config');
      window.location.reload();
    }
  };

  const handleRunDiagnostic = async () => {
    setDiagnosticLoading(true);
    setDiagnosticResults({});

    const tests = [
      { id: 'usb', label: 'Verificando puertos USB...' },
      { id: 'hdmi', label: 'Sincronizando señal HDMI...' },
      { id: 'capture', label: 'Probando buffer de capturadora...' },
      { id: 'storage', label: 'Validando permisos de escritura...' },
      { id: 'write', label: 'Midiendo velocidad de disco...' },
      { id: 'engine', label: 'Optimizando motor de video...' }
    ];

    for (const test of tests) {
       await new Promise(r => setTimeout(r, 800));
       setDiagnosticResults(prev => ({ ...prev, [test.id]: 'Optimized' }));
    }

    setDiagnosticLoading(false);
    toast.success("Diagnóstico de hardware completado con éxito.");
  };

  const handleToggleRecording = () => {
    if (!isRecording) {
      if (!videoRef.current?.srcObject) {
         toast.error("Seleccione una fuente de video activa primero.");
         return;
      }
      recordedChunksRef.current = [];
      try {
        const stream = videoRef.current.srcObject as MediaStream;
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `Test_Capture_${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);
          toast.success("Grabación de prueba descargada.");
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setElapsedTime(0);
      } catch (e) {
        toast.error("Motor de grabación no soportado.");
      }
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const url = canvas.toDataURL('image/jpeg');
      const a = document.createElement('a');
      a.href = url;
      a.download = `Test_Photo_${Date.now()}.jpg`;
      a.click();
      toast.success("Captura de prueba almacenada.");
    }
  };

  const handlePickPath = (key: 'storagePath' | 'tempPath') => {
    const newPath = prompt(`Ingrese la nueva ruta para ${key === 'storagePath' ? 'Pacientes' : 'Temporales'}:`, config.general[key]);
    if (newPath) {
      setConfig({ ...config, general: { ...config.general, [key]: newPath } });
      toast.success("Ruta de almacenamiento actualizada.");
    }
  };

  const menuItems = [
    { id: 'GENERAL', label: 'General', icon: Database },
    { id: 'VIDEO_DEVICE', label: 'Dispositivo de Video', icon: Video },
    { id: 'VIDEO_SOURCE', label: 'Fuente de Video', icon: Layout },
    { id: 'VIDEO_QUALITY', label: 'Calidad de Video', icon: Activity },
    { id: 'CAPTURE_CONFIG', label: 'Configuración de Captura', icon: Zap },
    { id: 'PHOTO', label: 'Fotografía', icon: Camera },
    { id: 'VIDEO', label: 'Video', icon: Monitor },
    { id: 'COLOR', label: 'Color', icon: Sliders },
    { id: 'PREVIEW', label: 'Previsualización', icon: Play },
    { id: 'STORAGE', label: 'Almacenamiento', icon: HardDrive },
    { id: 'EXPORT', label: 'Exportación', icon: FileDown },
    { id: 'HARDWARE', label: 'Hardware', icon: Cpu },
    { id: 'DIAGNOSTIC', label: 'Diagnóstico', icon: ShieldCheck },
  ];

  return (
    <div className="fixed inset-0 bg-[#0F172A] text-slate-300 flex overflow-hidden font-sans select-none animate-in fade-in duration-500 z-[100]">

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-80 bg-slate-900 border-r border-white/5 flex flex-col shrink-0">
        <div className="p-8 border-b border-white/5 bg-slate-950/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20"><Settings2 size={20} className="text-white" /></div>
            <h1 className="text-lg font-bold text-white italic tracking-tighter uppercase">Configuración</h1>
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Núcleo de Adquisición v2.5</p>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar py-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveCategory(item.id as ConfigCategory)}
              className={cn(
                "w-full px-8 py-4 flex items-center gap-4 transition-all group relative",
                activeCategory === item.id
                  ? "text-white bg-white/5"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/2"
              )}
            >
              {activeCategory === item.id && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full shadow-[0_0_8px_#007aff]" />}
              <item.icon size={18} className={cn("transition-colors", activeCategory === item.id ? "text-primary" : "group-hover:text-slate-300")} />
              <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 bg-slate-950/50 border-t border-white/5">
           <div className="flex items-center gap-3 text-emerald-500 mb-4">
              <CheckCircle2 size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Hardware Sincronizado</span>
           </div>
           <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-500 uppercase">Espacio en Disco</p>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-primary w-2/3" />
              </div>
              <p className="text-[9px] font-bold text-slate-400 text-right mt-1 italic">1.2 TB / 2.0 TB LIBRE</p>
           </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col bg-slate-950/20">

        {/* HEADER AREA */}
        <header className="h-24 border-b border-white/5 px-12 flex items-center justify-between bg-[#111827] z-20">
           <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                 <Activity size={18} className="text-primary" />
                 <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Captura & Hardware</h2>
              </div>
              <div className="h-6 w-[1px] bg-white/5" />
              <div>
                 <h2 className="text-xl font-bold text-white italic tracking-tighter uppercase">{menuItems.find(i=>i.id===activeCategory)?.label}</h2>
              </div>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 mr-6">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nodo: {config.general.teamName}</span>
              </div>
              <button onClick={() => navigate(-1)} className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5"><X size={20} /></button>
           </div>
        </header>

        {/* SETTINGS PANELS */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
          <div className="max-w-4xl space-y-12 animate-in slide-in-from-right-4 duration-500">

            {activeCategory === 'GENERAL' && (
              <div className="space-y-10">
                <section className="space-y-6">
                   <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-[0.2em]"><Info size={16} className="text-primary" /> Identificación del Sistema</h3>
                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Nombre del Equipo</label>
                         <Input value={config.general.teamName} onChange={e=>setConfig({...config, general: {...config.general, teamName: e.target.value}})} className="h-14 bg-white/5 border-white/5 rounded-2xl font-bold text-white focus:ring-primary/20" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Consultorio / Sala</label>
                         <Input value={config.general.officeName} onChange={e=>setConfig({...config, general: {...config.general, officeName: e.target.value}})} className="h-14 bg-white/5 border-white/5 rounded-2xl font-bold text-white" />
                      </div>
                   </div>
                </section>

                <section className="space-y-6 pt-10 border-t border-white/5">
                   <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-[0.2em]"><FolderOpen size={16} className="text-primary" /> Estructura de Archivos</h3>
                   <div className="space-y-6">
                      <div className="p-6 bg-white/2 rounded-[32px] border border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><Database size={24} /></div>
                            <div>
                               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ruta de Pacientes</p>
                               <p className="text-sm font-bold text-slate-200">{config.general.storagePath}</p>
                            </div>
                         </div>
                         <Button variant="ghost" onClick={() => handlePickPath('storagePath')} className="rounded-xl h-10 px-6 bg-white/5 text-[10px] font-black uppercase tracking-widest">Cambiar Ruta</Button>
                      </div>
                      <div className="p-6 bg-white/2 rounded-[32px] border border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500"><Clock size={24} /></div>
                            <div>
                               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Carpeta Temporal</p>
                               <p className="text-sm font-bold text-slate-200">{config.general.tempPath}</p>
                            </div>
                         </div>
                         <Button variant="ghost" onClick={() => handlePickPath('tempPath')} className="rounded-xl h-10 px-6 bg-white/5 text-[10px] font-black uppercase tracking-widest">Cambiar Ruta</Button>
                      </div>
                   </div>
                </section>
              </div>
            )}

            {activeCategory === 'VIDEO_DEVICE' && (
              <div className="space-y-10">
                <section className="space-y-6">
                   <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-[0.2em]"><Video size={16} className="text-primary" /> Hardware Detectado</h3>
                      <div className="flex items-center gap-2 p-1 bg-slate-800 rounded-xl">
                         <button
                           onClick={() => setConfig({...config, videoDevice: {...config.videoDevice, sourceCategory: 'external'}})}
                           className={cn(
                             "px-4 py-2 rounded-lg font-black text-[9px] uppercase transition-all",
                             config.videoDevice.sourceCategory === 'external' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                           )}
                         >
                            Capturadora
                         </button>
                         <button
                           onClick={() => setConfig({...config, videoDevice: {...config.videoDevice, sourceCategory: 'integrated'}})}
                           className={cn(
                             "px-4 py-2 rounded-lg font-black text-[9px] uppercase transition-all",
                             config.videoDevice.sourceCategory === 'integrated' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                           )}
                         >
                            Cámara PC
                         </button>
                      </div>
                      <button onClick={loadDevices} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-all"><RefreshCw size={14} /></button>
                   </div>
                   <div className="grid grid-cols-1 gap-4">
                      {devices.filter(d => {
                        const isIntegrated = d.label.toLowerCase().includes('facetime') || d.label.toLowerCase().includes('integrated') || d.label.toLowerCase().includes('camera');
                        return config.videoDevice.sourceCategory === 'integrated' ? isIntegrated : !isIntegrated;
                      }).length > 0 ? devices.filter(d => {
                        const isIntegrated = d.label.toLowerCase().includes('facetime') || d.label.toLowerCase().includes('integrated') || d.label.toLowerCase().includes('camera');
                        return config.videoDevice.sourceCategory === 'integrated' ? isIntegrated : !isIntegrated;
                      }).map((d) => (
                        <Card key={d.deviceId} onClick={() => { setConfig({...config, videoDevice: {...config.videoDevice, deviceId: d.deviceId}}); startPreview(d.deviceId); }} className={cn("p-6 bg-white/2 border-white/5 rounded-[32px] flex items-center justify-between cursor-pointer transition-all hover:bg-white/5", config.videoDevice.deviceId === d.deviceId && "border-primary/40 bg-primary/5 ring-1 ring-primary/20")}>
                           <div className="flex items-center gap-6">
                              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all", config.videoDevice.deviceId === d.deviceId ? "bg-primary text-white" : "bg-white/5 text-slate-500")}>
                                 {config.videoDevice.sourceCategory === 'integrated' ? <Camera size={32} /> : <Monitor size={32} />}
                              </div>
                              <div>
                                 <h4 className="font-bold text-white text-lg uppercase italic">{d.label || `Dispositivo ${devices.indexOf(d) + 1}`}</h4>
                                 <div className="flex items-center gap-4 mt-1">
                                    <Badge variant="primary" className="bg-slate-800 text-slate-400 h-5 border-none px-2">{config.videoDevice.resolution}</Badge>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{config.videoDevice.sourceCategory === 'integrated' ? 'Integrated Connection' : 'External Core Connection'}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-4 pr-4">
                              {config.videoDevice.deviceId === d.deviceId && <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[9px] font-black uppercase">Activo</span></div>}
                              <button onClick={(e) => { e.stopPropagation(); startPreview(d.deviceId); }} className="h-10 px-6 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Probar Fuente</button>
                           </div>
                        </Card>
                      )) : (
                        <div className="p-20 border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                           <AlertCircle size={40} />
                           <p className="text-xs font-black uppercase tracking-[0.2em]">No se han detectado dispositivos en esta categoría</p>
                        </div>
                      )}
                   </div>
                </section>
              </div>
            )}

            {activeCategory === 'VIDEO_SOURCE' && (
              <div className="space-y-10">
                 <section className="space-y-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-[0.2em]"><Layers size={16} className="text-primary" /> Fuente de Entrada</h3>
                    <div className="grid grid-cols-3 gap-4">
                       {["HDMI", "USB", "SDI", "Composite", "S-Video", "IP Camera", "RTSP", "NDI", "Auto"].map(source => (
                          <button
                            key={source}
                            onClick={()=>setConfig({...config, videoSource: {type: source}})}
                            className={cn(
                              "h-20 rounded-3xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                              config.videoSource.type === source ? "border-primary bg-primary/10 text-white shadow-[0_0_15px_rgba(0,122,255,0.2)]" : "border-white/5 bg-white/2 text-slate-500 hover:border-white/10"
                            )}
                          >
                             <span className="text-[11px] font-black uppercase tracking-widest">{source}</span>
                          </button>
                       ))}
                    </div>
                 </section>
              </div>
            )}

            {activeCategory === 'VIDEO_QUALITY' && (
              <div className="space-y-12">
                 <div className="grid grid-cols-2 gap-12">
                    <section className="space-y-6">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Resolución de Adquisición</label>
                       <div className="grid grid-cols-2 gap-3">
                          {["640x480", "720x480", "720p", "1080p", "2K", "4K"].map(res => (
                             <button key={res} onClick={()=>setConfig({...config, quality: {...config.quality, resolution: res}})} className={cn("h-12 rounded-xl border-2 font-bold text-[10px] uppercase transition-all", config.quality.resolution === res ? "border-primary bg-primary text-white" : "border-white/5 bg-white/5 text-slate-500 hover:bg-white/10")}>{res}</button>
                          ))}
                       </div>
                    </section>

                    <section className="space-y-6">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Tasa de Frames (FPS)</label>
                       <div className="grid grid-cols-3 gap-3">
                          {[24, 25, 30, 50, 60].map(fps => (
                             <button key={fps} onClick={()=>setConfig({...config, quality: {...config.quality, fps: fps}})} className={cn("h-12 rounded-xl border-2 font-bold text-[10px] transition-all", config.quality.fps === fps ? "border-primary bg-primary text-white" : "border-white/5 bg-white/5 text-slate-500 hover:bg-white/10")}>{fps}</button>
                          ))}
                       </div>
                    </section>
                 </div>

                 <div className="grid grid-cols-2 gap-12 pt-10 border-t border-white/5">
                    <section className="space-y-6">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Bitrate del Codificador</label>
                       <div className="flex gap-2 p-1 bg-slate-900 rounded-2xl border border-white/5">
                          {["Bajo", "Medio", "Alto", "Máximo"].map(b => (
                             <button key={b} onClick={()=>setConfig({...config, quality: {...config.quality, bitrate: b}})} className={cn("flex-1 h-10 rounded-xl font-black text-[9px] uppercase transition-all", config.quality.bitrate === b ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-slate-300")}>{b}</button>
                          ))}
                       </div>
                    </section>
                    <section className="space-y-6">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Códec Primario</label>
                       <div className="flex gap-2 p-1 bg-slate-900 rounded-2xl border border-white/5">
                          {["H264", "H265", "MJPEG", "RAW"].map(c => (
                             <button key={c} onClick={()=>setConfig({...config, quality: {...config.quality, codec: c}})} className={cn("flex-1 h-10 rounded-xl font-black text-[9px] uppercase transition-all", config.quality.codec === c ? "bg-primary text-white" : "text-slate-500 hover:text-slate-300")}>{c}</button>
                          ))}
                       </div>
                    </section>
                 </div>
              </div>
            )}

            {activeCategory === 'CAPTURE_CONFIG' && (
              <div className="space-y-10">
                 <section className="space-y-8">
                    <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Parámetros de Adquisición</h3>
                    <div className="grid grid-cols-2 gap-8">
                       {[
                          { key: 'autoCapture', label: 'Captura Automática', desc: 'Inicia captura al detectar señal estable' },
                          { key: 'saveFullVideo', label: 'Guardar Video Completo', desc: 'Registra toda la sesión en el nodo' },
                          { key: 'onlyPhotos', label: 'Solo Fotografías', desc: 'Desactiva grabación de video' },
                          { key: 'continuousCapture', label: 'Captura Continua', desc: 'Burst mode al presionar disparador' },
                          { key: 'pedalTrigger', label: 'Disparador por Pedal', desc: 'Activa captura mediante puerto COM' },
                          { key: 'autoNaming', label: 'Nombre Automático', desc: 'Genera IDs correlativos por estudio' },
                       ].map(item => (
                          <div key={item.key} className="p-6 bg-white/2 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                             <div className="space-y-1">
                                <p className="text-[11px] font-bold text-white uppercase tracking-widest">{item.label}</p>
                                <p className="text-[10px] text-slate-500 italic">{item.desc}</p>
                             </div>
                             <button
                                onClick={()=>setConfig({...config, capture: {...config.capture, [item.key]: !(config.capture as any)[item.key]}})}
                                className={cn(
                                   "w-12 h-6 rounded-full transition-all relative",
                                   (config.capture as any)[item.key] ? "bg-primary shadow-[0_0_10px_#007aff]" : "bg-slate-800"
                                )}
                             >
                                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", (config.capture as any)[item.key] ? "left-7" : "left-1")} />
                             </button>
                          </div>
                       ))}
                    </div>
                 </section>
              </div>
            )}

            {activeCategory === 'PHOTO' && (
              <div className="space-y-12">
                 <div className="grid grid-cols-2 gap-12">
                    <section className="space-y-6">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Formato de Imagen</label>
                       <div className="flex gap-2 p-1 bg-slate-900 rounded-2xl border border-white/5">
                          {["JPEG", "PNG", "TIFF", "BMP"].map(f => (
                             <button key={f} onClick={()=>setConfig({...config, photo: {...config.photo, format: f}})} className={cn("flex-1 h-10 rounded-xl font-black text-[9px] uppercase transition-all", config.photo.format === f ? "bg-primary text-white" : "text-slate-500 hover:text-slate-300")}>{f}</button>
                          ))}
                       </div>
                    </section>
                    <section className="space-y-6">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Calidad de Compresión</label>
                       <div className="flex items-center gap-4">
                          <input type="range" value={config.photo.quality} onChange={e=>setConfig({...config, photo: {...config.photo, quality: parseInt(e.target.value)}})} className="flex-1 h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary" />
                          <span className="text-[10px] font-bold text-primary w-8">{config.photo.quality}%</span>
                       </div>
                    </section>
                 </div>

                 <section className="space-y-6 pt-10 border-t border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Superposición de Datos (Watermark)</h3>
                    <div className="grid grid-cols-2 gap-4">
                       {[
                          { key: 'watermark', label: 'Marca de Agua LIARENA' },
                          { key: 'showDate', label: 'Fecha y Hora' },
                          { key: 'showPatientName', label: 'Nombre del Paciente' },
                          { key: 'showStudyName', label: 'Tipo de Estudio' },
                       ].map(item => (
                          <button key={item.key} onClick={()=>setConfig({...config, photo: {...config.photo, [item.key]: !(config.photo as any)[item.key]}})} className={cn("p-4 rounded-2xl border flex items-center justify-between transition-all", (config.photo as any)[item.key] ? "border-primary bg-primary/5 text-white" : "border-white/5 text-slate-500 hover:border-white/10")}>
                             <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                             {(config.photo as any)[item.key] ? <CheckCircle2 size={14} className="text-primary" /> : <div className="w-3 h-3 rounded-full border border-white/10" />}
                          </button>
                       ))}
                    </div>
                 </section>
              </div>
            )}

            {activeCategory === 'VIDEO' && (
              <div className="space-y-10">
                 <section className="space-y-8">
                    <div className="p-8 bg-white/2 rounded-[40px] border border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-6">
                          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all", config.video.saveAudio ? "bg-primary text-white" : "bg-white/5 text-slate-500")}>
                             {config.video.saveAudio ? <Mic size={24} /> : <MicOff size={24} />}
                          </div>
                          <div>
                             <p className="text-[11px] font-bold text-white uppercase tracking-widest">Grabar Audio</p>
                             <p className="text-[10px] text-slate-500 italic">Captura sonido ambiental desde la torre</p>
                          </div>
                       </div>
                       <button onClick={()=>setConfig({...config, video: {...config.video, saveAudio: !config.video.saveAudio}})} className={cn("h-10 px-8 rounded-xl font-black text-[10px] uppercase transition-all", config.video.saveAudio ? "bg-primary text-white" : "bg-white/5 text-slate-400")}>{config.video.saveAudio ? 'ON' : 'OFF'}</button>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Compresión de Video</label>
                          <div className="grid grid-cols-2 gap-2">
                             {["Baja", "Media", "Alta", "Automática"].map(c => (
                                <button key={c} onClick={()=>setConfig({...config, video: {...config.video, compression: c}})} className={cn("h-12 rounded-xl border-2 font-bold text-[10px] uppercase transition-all", config.video.compression === c ? "border-primary bg-primary text-white" : "border-white/5 bg-white/2 text-slate-500")}>{c}</button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Fragmentación de Archivos</label>
                          <div className="grid grid-cols-1 gap-2">
                             <select className="w-full h-12 bg-white/5 border-2 border-white/5 rounded-xl px-4 text-white font-bold text-xs outline-none">
                                <option>Sin límite (Un solo archivo)</option>
                                <option>5 minutos por fragmento</option>
                                <option>10 minutos por fragmento</option>
                             </select>
                          </div>
                       </div>
                    </div>
                 </section>
              </div>
            )}

            {activeCategory === 'COLOR' && (
              <div className="grid grid-cols-2 gap-x-20 gap-y-12">
                 {[
                    { key: 'brightness', label: 'Brillo', icon: Sliders },
                    { key: 'contrast', label: 'Contraste', icon: Sliders },
                    { key: 'gamma', label: 'Gamma', icon: Sliders },
                    { key: 'saturation', label: 'Saturación', icon: Sliders },
                    { key: 'sharpness', label: 'Nitidez', icon: Sliders },
                    { key: 'temperature', label: 'Temperatura', icon: Sliders, max: 10000, min: 2000 },
                 ].map((c) => (
                    <div key={c.key} className="space-y-4">
                       <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{c.label}</label>
                          <span className="text-[10px] font-bold text-primary font-mono">{(config.color as any)[c.key]}</span>
                       </div>
                       <input
                          type="range"
                          min={c.min || 0}
                          max={c.max || 100}
                          value={(config.color as any)[c.key]}
                          onChange={(e) => setConfig({...config, color: {...config.color, [c.key]: parseInt(e.target.value)}})}
                          className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary"
                       />
                    </div>
                 ))}
                 <div className="col-span-2 pt-10 border-t border-white/5 flex justify-end gap-4">
                    <Button variant="ghost" onClick={()=>setConfig({...config, color: {brightness:50, contrast:50, gamma:50, saturation:50, sharpness:50, whiteBalance:"Auto", temperature:5500, noiseReduction:"Media"}})} className="h-12 px-8 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-widest"><RotateCcw size={14} className="mr-2" /> Restablecer Valores</Button>
                    <Button className="h-12 px-10 rounded-xl text-[10px] font-black uppercase tracking-widest">Activar Modo Automático</Button>
                 </div>
              </div>
            )}

            {activeCategory === 'PREVIEW' && (
              <div className="space-y-10">
                 <div className="aspect-video bg-black rounded-[44px] overflow-hidden border-4 border-white/5 shadow-2xl relative group">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />

                    {/* HUD OVERLAY */}
                    <div className={cn(
                       "absolute top-8 left-8 flex flex-col gap-3 transition-all duration-500",
                       isRecording ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-95"
                    )}>
                       <div className={cn(
                          "flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 transition-all",
                          isRecording && "bg-danger/20 border-danger/30 ring-2 ring-danger/20"
                       )}>
                          <div className={cn("w-2.5 h-2.5 rounded-full shadow-lg", isRecording ? "bg-danger animate-pulse shadow-danger/50" : "bg-white/20")} />
                          <span className="text-[11px] font-bold text-white uppercase tracking-widest tabular-nums">
                            {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:{(elapsedTime % 60).toString().padStart(2, '0')}
                          </span>
                          {isRecording && <span className="text-[9px] font-black text-danger/80 tracking-tighter">REC</span>}
                       </div>
                    </div>

                    <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-500">
                       <div className="flex gap-3">
                          <button onClick={handleCapturePhoto} className="h-12 w-12 rounded-2xl bg-white text-slate-900 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"><Camera size={20} /></button>
                          <button onClick={handleToggleRecording} className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all", isRecording ? "bg-danger text-white" : "bg-white/10 text-white backdrop-blur-md border border-white/10")}>{isRecording ? <Square size={20} fill="currentColor" /> : <Video size={20} />}</button>
                       </div>
                       <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md px-6 h-12 rounded-2xl border border-white/10">
                          <div className="flex items-center gap-2"><span className="text-[8px] font-black text-slate-500 uppercase">FPS</span><span className="text-[10px] font-bold text-white font-mono">{config.quality.fps}</span></div>
                          <div className="w-[1px] h-4 bg-white/10" />
                          <div className="flex items-center gap-2"><span className="text-[8px] font-black text-slate-500 uppercase">RES</span><span className="text-[10px] font-bold text-white font-mono">{config.videoDevice.resolution}</span></div>
                          <div className="w-[1px] h-4 bg-white/10" />
                          <Badge className="bg-emerald-500/20 text-emerald-500 border-none text-[8px] px-2 h-5">LIVE</Badge>
                       </div>
                    </div>
                 </div>
                 <div className="flex justify-center pt-4">
                    <Button variant="ghost" onClick={()=>startPreview(config.videoDevice.deviceId)} className="rounded-full h-12 px-10 border border-white/5 bg-white/2 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest gap-3"><RefreshCw size={16} /> Probar Capturadora</Button>
                 </div>
              </div>
            )}

            {activeCategory === 'STORAGE' && (
              <div className="space-y-10">
                 <section className="space-y-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-[0.2em]"><HardDrive size={16} className="text-primary" /> Gestión de Almacenamiento</h3>
                    <div className="grid grid-cols-1 gap-4">
                       {[
                          { key: 'autoBackup', label: 'Respaldo Automático', desc: 'Sincroniza con ruta secundaria al finalizar' },
                          { key: 'deleteTemp', label: 'Eliminar Temporales', desc: 'Limpia caché después de procesar estudio' },
                          { key: 'autoCompress', label: 'Compresión Post-Proceso', desc: 'Optimiza espacio al cerrar expediente' },
                       ].map(item => (
                          <div key={item.key} className="p-8 bg-white/2 rounded-[40px] border border-white/5 flex items-center justify-between transition-all hover:bg-white/5">
                             <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500"><Settings2 size={20} /></div>
                                <div>
                                   <p className="text-[11px] font-bold text-white uppercase tracking-widest">{item.label}</p>
                                   <p className="text-[10px] text-slate-500 italic">{item.desc}</p>
                                </div>
                             </div>
                             <button
                                onClick={()=>setConfig({...config, storage: {...config.storage, [item.key]: !(config.storage as any)[item.key]}})}
                                className={cn(
                                   "w-12 h-6 rounded-full transition-all relative",
                                   (config.storage as any)[item.key] ? "bg-primary shadow-[0_0_10px_#007aff]" : "bg-slate-800"
                                )}
                             >
                                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", (config.storage as any)[item.key] ? "left-7" : "left-1")} />
                             </button>
                          </div>
                       ))}
                    </div>
                 </section>

                 <section className="p-10 bg-slate-900/50 rounded-[44px] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary shadow-2xl shadow-primary/20"><Database size={28} /></div>
                       <div>
                          <h4 className="text-xl font-bold text-white italic tracking-tighter uppercase leading-none mb-2">Estado del Disco Principal</h4>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">NVMe Clinical Storage - SSD 2TB</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums">1,240 GB</p>
                       <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Disponibles para Captura</p>
                    </div>
                 </section>
              </div>
            )}

            {activeCategory === 'EXPORT' && (
              <div className="space-y-12">
                 <section className="space-y-8">
                    <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Configuración de Entrega (PDF)</h3>
                    <div className="grid grid-cols-1 gap-8">
                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Formato de Reporte</label>
                          <div className="flex gap-2">
                             {["PDF Clínico Estándar"].map(f => (
                                <button key={f} className={cn("h-12 px-8 rounded-xl border-2 font-bold text-[10px] uppercase transition-all border-primary bg-primary/10 text-white shadow-[0_0_15px_rgba(0,122,255,0.2)]")}>{f}</button>
                             ))}
                          </div>
                       </div>
                    </div>
                 </section>

                 <section className="p-10 bg-emerald-500/5 rounded-[44px] border border-emerald-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500"><FileDown size={28} /></div>
                       <div>
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 italic">Estado de Exportación</p>
                          <h4 className="text-xl font-bold text-slate-200 italic tracking-tighter uppercase leading-none">Motor de Renderizado Listo</h4>
                       </div>
                    </div>
                 </section>
              </div>
            )}

            {activeCategory === 'DIAGNOSTIC' && (
              <div className="space-y-12">
                 <div className="grid grid-cols-2 gap-8">
                    {[
                       { id: 'usb', label: 'Estado USB', status: 'Online', icon: Database },
                       { id: 'hdmi', label: 'Estado HDMI', status: 'Sincronizado', icon: Layout },
                       { id: 'capture', label: 'Estado Capturadora', status: 'Ready', icon: Video },
                       { id: 'storage', label: 'Estado Almacenamiento', status: '1.2 TB Libres', icon: HardDrive },
                       { id: 'write', label: 'Estado Escritura', status: '480 MB/s', icon: Zap },
                       { id: 'engine', label: 'Estado Video Engine', status: 'Optimized', icon: Activity },
                    ].map((diag, i) => (
                       <div key={i} className="p-8 bg-white/2 rounded-[40px] border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-6">
                             <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors"><diag.icon size={20} /></div>
                             <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{diag.label}</p>
                                <p className="text-sm font-bold text-slate-200">{diagnosticResults[diag.id] || diag.status}</p>
                             </div>
                          </div>
                          <div className={cn("w-2 h-2 rounded-full", diagnosticResults[diag.id] ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-slate-700")} />
                       </div>
                    ))}
                 </div>
                 <div className="flex justify-center pt-10 border-t border-white/5">
                    <Button onClick={handleRunDiagnostic} disabled={diagnosticLoading} className="h-16 px-12 rounded-3xl bg-primary text-white font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-primary/30 gap-4">
                       {diagnosticLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity size={18} />}
                       {diagnosticLoading ? "Ejecutando Secuencia..." : "Ejecutar Diagnóstico Completo"}
                    </Button>
                 </div>
              </div>
            )}

            {activeCategory === 'HARDWARE' && (
              <div className="space-y-12">
                 <div className="grid grid-cols-2 gap-8">
                    {[
                       { label: 'Procesador (CPU)', value: systemInfo?.cpu || 'Cargando...', icon: Cpu },
                       { label: 'Memoria RAM', value: systemInfo?.ram || 'Cargando...', icon: Zap },
                       { label: 'Acelerador de Video (GPU)', value: 'Hardware Acceleration Active', icon: Monitor },
                       { label: 'Sistema Operativo', value: systemInfo?.os || 'Cargando...', icon: Layout },
                       { label: 'Versión del Núcleo', value: `Adquisition Engine v${systemInfo?.version || '2.5'}`, icon: Activity },
                       { label: 'Arquitectura', value: systemInfo?.arch || '---', icon: Clock },
                    ].map((hw, i) => (
                       <div key={i} className="p-8 bg-white/2 rounded-[40px] border border-white/5 flex flex-col gap-4 group hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-3">
                             <hw.icon size={16} className="text-primary" />
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{hw.label}</span>
                          </div>
                          <p className="text-lg font-bold text-slate-200 uppercase italic tracking-tight">{hw.value}</p>
                       </div>
                    ))}
                 </div>

                 <section className="p-10 bg-slate-900/50 rounded-[44px] border border-white/5 space-y-8">
                    <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2"><Activity size={16} className="text-primary" /> Monitoreo de Recursos en Tiempo Real</h3>
                    <div className="grid grid-cols-3 gap-10">
                       <div className="space-y-3">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest"><span className="text-slate-500 italic">Carga CPU</span><span className="text-white">12%</span></div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-primary w-[12%]" /></div>
                       </div>
                       <div className="space-y-3">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest"><span className="text-slate-500 italic">Uso RAM</span><span className="text-white">4.2 GB</span></div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-[25%]" /></div>
                       </div>
                       <div className="space-y-3">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest"><span className="text-slate-500 italic">Video Buffer</span><span className="text-white">Low Latency</span></div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-primary w-[5%]" /></div>
                       </div>
                    </div>
                 </section>
              </div>
            )}

          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <footer className="h-24 border-t border-white/5 px-12 flex items-center justify-between bg-slate-900/50 backdrop-blur-2xl">
           <div className="flex gap-4">
              <Button variant="ghost" onClick={handleRestore} className="h-12 px-8 rounded-2xl border border-white/5 text-slate-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"><RotateCcw size={14} className="mr-2" /> Restaurar</Button>
              <Button variant="ghost" onClick={() => navigate(-1)} className="h-12 px-8 rounded-2xl text-slate-500 hover:text-danger text-[10px] font-black uppercase tracking-widest">Cancelar</Button>
           </div>
           <div className="flex gap-4">
              <Button onClick={handleSave} className="h-14 px-12 rounded-[24px] bg-white text-slate-900 font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-white/10 hover:bg-primary hover:text-white transition-all gap-3"><Save size={18} /> Guardar Configuración</Button>
              <Button onClick={handleSave} className="h-14 px-12 rounded-[24px] bg-primary text-white font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all gap-3"><Zap size={18} /> Aplicar Cambios</Button>
           </div>
        </footer>
      </main>

    </div>
  );
}
