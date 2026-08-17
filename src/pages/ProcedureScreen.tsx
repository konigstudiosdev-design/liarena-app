import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  Video,
  X,
  Activity,
  CheckCircle2,
  Clock,
  Layers,
  Square,
  Pause,
  Play,
  Settings2,
  Scaling,
  Stethoscope,
  DoorOpen,
  Layout,
  Trash2,
  Plus,
  Circle,
  Monitor,
  VideoOff,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  AlertCircle,
  Save,
  Loader2,
  Mic,
  MicOff,
  History,
  User,
  Calendar,
  Database,
  Info,
  FolderOpen,
  Zap,
  Sliders,
  ShieldCheck,
  RefreshCw,
  RotateCcw,
  Cpu,
  Move,
  Maximize2,
  Terminal,
  ActivitySquare,
  BarChart3,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Bookmark,
  Pencil,
  Home,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { Button, Badge, Card, toast, Input, Skeleton } from "../components/ui/index";
import { localRecordService } from "../lib/local-record-service";
import { profileService, DoctorProfileData } from "../lib/profile-service";
import { wizardService } from "../lib/wizard-service";
import { useDoctor } from "../contexts/DoctorContext";
import { supabase } from "../lib/supabase";
import { hardwareService, ProDevice } from "../lib/hardware-service";
import { systemMonitorService, SystemStats } from "../lib/system-monitor-service";
import { cloudSyncService, SyncStatus } from "../lib/cloud-sync-service";

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

interface CaptureProfile {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ProcedureScreen() {
  const navigate = useNavigate();
  const { doctor, loading: doctorLoading, syncDoctor } = useDoctor();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [procedureData, setProcedureData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [captures, setCaptures] = useState<any[]>([]);
  const vaultRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showHardwareModal, setShowHardwareModal] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showAbTest, setShowAbTest] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);
  const [isStoppingPulse, setIsStoppingPulse] = useState(false);

  // New States for Additional Procedure
  const [showConfirmAdd, setShowConfirmAdd] = useState(false);
  const [showStudySelect, setShowStudySelect] = useState(false);
  const [newStudyType, setNewStudyType] = useState("");
  const [customStudyName, setCustomStudyName] = useState("");

  const [signalStatus, setSignalStatus] = useState<'active' | 'waiting' | 'none'>('waiting');
  const [syncState, setSyncState] = useState({ count: 0, status: 'idle' as SyncStatus });
  const [activeProDevice, setActiveProDevice] = useState<ProDevice | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [trackStats, setTrackStats] = useState<any>(null);
  const [validationStatus, setValidationStatus] = useState<Record<string, boolean>>({});

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('liarena_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('liarena_sidebar_collapsed', String(newState));
  };

  const [isCropBoxVisible, setIsCropBoxVisible] = useState(true);
  const [captureProfiles, setCaptureProfiles] = useState<CaptureProfile[]>(() => {
    const saved = localStorage.getItem('liarena_capture_profiles');
    const defaultProfiles = [
      { id: 'endos', name: 'ENDOSCOPIA', x: 10, y: 10, width: 80, height: 80 },
      { id: 'use', name: 'USE', x: 20, y: 20, width: 60, height: 60 },
      { id: '16-9', name: '16:9 Full', x: 0, y: 0, width: 100, height: 100 },
      { id: 'custom', name: 'Personalizado', x: 15, y: 15, width: 70, height: 70 },
    ];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Garantizar que 'endos' esté siempre presente
        if (!parsed.find((p: any) => p.id === 'endos')) return [defaultProfiles[0], ...parsed];
        return parsed;
      } catch (e) { return defaultProfiles; }
    }
    return defaultProfiles;
  });
  const [activeProfileId, setActiveProfileId] = useState('endos');
  const [isRenamingProfile, setIsRenamingProfile] = useState<string | null>(null);

  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const cropBoxStateRef = useRef(cropBox);
  const isDraggingRef = useRef(false);
  const resizingHandleRef = useRef<ResizeHandle | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const profile = captureProfiles.find(p => p.id === activeProfileId);
    if (profile) {
      const newBox = { x: profile.x, y: profile.y, width: profile.width, height: profile.height };
      setCropBox(newBox);
      cropBoxStateRef.current = newBox;
    }
  }, [activeProfileId]);

  useEffect(() => {
    cropBoxStateRef.current = cropBox;
  }, [cropBox]);

  const updateProfileData = useCallback((box: {x:number, y:number, width:number, height:number}) => {
    setCaptureProfiles(prev => {
      const updated = prev.map(p => p.id === activeProfileId ? { ...p, ...box } : p);
      localStorage.setItem('liarena_capture_profiles', JSON.stringify(updated));
      return updated;
    });
  }, [activeProfileId]);

  const handleRenameProfile = (id: string, newName: string) => {
    setCaptureProfiles(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, name: newName } : p);
      localStorage.setItem('liarena_capture_profiles', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddProfile = () => {
    const newId = `profile-${Date.now()}`;
    const newProfile = {
      id: newId,
      name: `Nuevo Perfil`,
      ...cropBox
    };
    setCaptureProfiles(prev => {
      const updated = [...prev, newProfile];
      localStorage.setItem('liarena_capture_profiles', JSON.stringify(updated));
      return updated;
    });
    setActiveProfileId(newId);
    setIsRenamingProfile(newId);
    toast.success("Perfil creado");
  };

  const handleDeleteProfile = (id: string) => {
    if (captureProfiles.length <= 1) { toast.error("Debe existir al menos un perfil de captura."); return; }
    if (!confirm("¿Desea eliminar este perfil de captura?")) return;
    setCaptureProfiles(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem('liarena_capture_profiles', JSON.stringify(updated));
      if (activeProfileId === id) setActiveProfileId(updated[0].id);
      return updated;
    });
    toast.success("Perfil eliminado");
  };

  const [proDevices, setProDevices] = useState<ProDevice[]>([]);
  const [config, setConfig] = useState<any>(() => {
    const saved = localStorage.getItem('liarena_pro_capture_config');
    try { if (saved) { const parsed = JSON.parse(saved); if (parsed.videoDevice) return parsed; } } catch (e) {}
    return {
      general: { teamName: "ENDO-NODE-01", officeName: "Consultorio 302", storagePath: "/Documents/LIARENA/Pacientes", tempPath: "/Temp/LIARENA" },
      videoDevice: { deviceId: "", resolution: "1920x1080", fps: 60, sourceCategory: "external" },
      videoSource: { type: "HDMI" },
      quality: { resolution: "1080p", fps: 60, bitrate: "Alto", codec: "H264" },
      capture: { pedalTrigger: true, autoNaming: true },
      photo: { format: "JPEG", quality: 90, watermark: true },
      video: { saveAudio: false, compression: "Media" },
      color: { brightness: 100, contrast: 100, saturation: 100, sharpness: 100, mirrorMode: true },
      storage: { autoBackup: true, deleteTemp: true }
    };
  });

  const [activeConfigTab, setActiveConfigTab] = useState('HARDWARE');

  useEffect(() => {
    return cloudSyncService.subscribe(setSyncState);
  }, []);

  useEffect(() => {
    const data = localStorage.getItem('liarena_active_procedure');

    // Recuperar identidad para navegación
    const syncUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('users').select('role').eq('auth_user_id', user.id).single();
        if (profile) setUserRole(profile.role);
      }
    };
    syncUser();

    if (data) {
      const parsed = JSON.parse(data);
      setProcedureData(parsed);
      if (parsed.doctorId) syncDoctor(parsed.doctorId);

      // Si el estudio es nuevo (sin localStudyPath), limpiamos la lista de sesión previa
      if (!parsed.localStudyPath) {
        localStorage.setItem('liarena_session_studies', JSON.stringify([]));
      }
    }

    // ASIGNAR PERFIL ENDOSCOPIA COMO PRIORIDAD AL INICIAR
    const targetId = 'endos';
    setActiveProfileId(targetId);
    const endosProfile = captureProfiles.find(p => p.id === targetId);
    if (endosProfile) {
      const initialBox = { x: endosProfile.x, y: endosProfile.y, width: endosProfile.width, height: endosProfile.height };
      setCropBox(initialBox);
      cropBoxStateRef.current = initialBox;
    }

    loadDevices();
    const statsInterval = setInterval(async () => {
      const stats = await systemMonitorService.getStats();
      setSystemStats(stats);
    }, 2000);
    return () => clearInterval(statsInterval);
  }, []);

  async function loadDevices() {
    try {
      const proDevs = await hardwareService.getProfessionalDevices();
      setProDevices(proDevs);
      if (proDevs.length > 0) {
        const savedId = config.videoDevice.deviceId;
        const currentDevice = proDevs.find(d => d.id === savedId) || proDevs[0];
        if (!savedId) setConfig((prev: any) => ({ ...prev, videoDevice: { ...prev.videoDevice, deviceId: currentDevice.id } }));
        setActiveProDevice(currentDevice);
      }
    } catch (e) {}
  }

  async function startStream(deviceId: string) {
    if (!deviceId) return;

    // VERIFICACIÓN DE PRE-CARGA (WARM-UP)
    const existingStream = (window as any).stream;
    const isPreloaded = existingStream &&
                        existingStream.active &&
                        existingStream.getVideoTracks()[0].getSettings().deviceId === deviceId;

    if (isPreloaded) {
      console.log("⚡ LIARENA Core: Utilizando señal pre-cargada (Instant Load).");
      if (videoRef.current) {
        videoRef.current.srcObject = existingStream;
        const track = existingStream.getVideoTracks()[0];
        setTrackStats(track.getSettings());
        setSignalStatus('active');
        setValidationStatus(v => ({ ...v, hardwareFound: true, streamStarted: true, signalDetected: true, videoRendering: true }));
      }
      return;
    }

    // Si no hay pre-carga, procedemos con el inicio normal
    if (existingStream) {
      existingStream.getTracks().forEach((t: any) => t.stop());
      (window as any).stream = null;
    }

    if (videoRef.current) videoRef.current.srcObject = null;
    setSignalStatus('waiting'); setValidationStatus({});
    try {
      const constraints: MediaStreamConstraints = {
        video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 },
          // @ts-ignore
          resizeMode: "none"
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      (window as any).stream = stream;
      setTrackStats(settings);
      setValidationStatus(v => ({ ...v, hardwareFound: true, streamStarted: true }));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current!.videoWidth > 0) {
            setSignalStatus('active');
            setValidationStatus(v => ({ ...v, signalDetected: true, videoRendering: true }));
          } else setSignalStatus('none');
        };
        videoRef.current.onerror = () => { setSignalStatus('none'); setValidationStatus(v => ({ ...v, videoRendering: false })); };
      }
      const proDevs = await hardwareService.getProfessionalDevices();
      const current = proDevs.find(d => d.id === deviceId);
      if (current) setActiveProDevice(current);
    } catch (e) {
      setSignalStatus('none'); setValidationStatus(v => ({ ...v, hardwareFound: false }));
      toast.error("Fallo de hardware o dispositivo en uso.");
    }
  }

  useEffect(() => {
    localStorage.setItem('liarena_pro_capture_config', JSON.stringify(config));
    if (config.videoDevice.deviceId) startStream(config.videoDevice.deviceId);
  }, [config.videoDevice.deviceId]);

  useEffect(() => {
    let interval: any;
    if (isRecording && !isPaused) interval = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (context && video.videoWidth > 0 && video.videoHeight > 0) {
      const { x, y, width, height } = cropBoxStateRef.current;
      const vW = video.videoWidth; const vH = video.videoHeight;

      // MAPEO DE PRECISIÓN: De Porcentaje de Contenedor a Píxeles Reales (Letterbox/Pillarbox Aware)
      const container = video.parentElement;
      if (!container) return;
      const cW = container.clientWidth;
      const cH = container.clientHeight;
      const vRatio = vW / vH;
      const cRatio = cW / cH;

      let renderW, renderH, xOff, yOff;
      if (vRatio > cRatio) {
        // Letterbox (franjas arriba/abajo)
        renderW = cW; renderH = cW / vRatio;
        xOff = 0; yOff = (cH - renderH) / 2;
      } else {
        // Pillarbox (franjas laterales)
        renderH = cH; renderW = cH * vRatio;
        yOff = 0; xOff = (cW - renderW) / 2;
      }

      // Convertimos porcentajes de UI a píxeles absolutos del contenedor
      const boxX = (x / 100) * cW;
      const boxY = (y / 100) * cH;
      const boxW = (width / 100) * cW;
      const boxH = (height / 100) * cH;

      // Traducimos a coordenadas relativas al video (ajustando offsets)
      let relX = boxX - xOff;
      let relY = boxY - yOff;

      // Escalamos a píxeles reales del stream de video
      const scale = vW / renderW;
      let captureX = relX * scale;
      let captureY = relY * scale;
      let captureW = boxW * scale;
      let captureH = boxH * scale;

      // CALIBRACIÓN CRÍTICA: Invertimos la coordenada X solo si el Modo Espejo está activo
      if (config.color.mirrorMode) {
        captureX = vW - captureX - captureW;
      }

      // Clamping final de seguridad para evitar áreas fuera del stream
      const finalX = Math.max(0, Math.min(vW, captureX));
      const finalY = Math.max(0, Math.min(vH, captureY));
      const finalW = Math.max(1, Math.min(vW - finalX, captureW));
      const finalH = Math.max(1, Math.min(vH - finalY, captureH));

      canvas.width = finalW;
      canvas.height = finalH;

      context.filter = "none";
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      // Dibujamos el área exacta compensada utilizando las coordenadas finales calculadas
      context.drawImage(video, finalX, finalY, finalW, finalH, 0, 0, finalW, finalH);

      // Aplicamos el flip horizontal final a la imagen capturada solo si el Modo Espejo está activo
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = finalW;
      finalCanvas.height = finalH;
      const finalCtx = finalCanvas.getContext('2d');
      if (finalCtx) {
        if (config.color.mirrorMode) {
          finalCtx.translate(finalW, 0);
          finalCtx.scale(-1, 1);
        }
        finalCtx.drawImage(canvas, 0, 0);

        try {
          const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
          if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) throw new Error("Invalid capture data generated");
          const newCapture = {
            id: Date.now(), type: 'photo', time: formatTime(recordingSeconds), videoSecond: recordingSeconds, image: dataUrl,
            label: `Foto ${(captures.filter(c => c.type === 'photo').length + 1).toString().padStart(2, '0')}`,
            capturedAt: new Date().toISOString(), patientId: procedureData?.patientId, doctorId: procedureData?.doctorId, procedureType: procedureData?.procedureType
          };
          setCaptures(prev => {
            const updated = [newCapture, ...prev];

            if (procedureData?.studyId) {
              const fileName = `IMG_${updated.length.toString().padStart(3, '0')}.jpg`;
              canvas.toBlob((blob) => {
                if (blob) cloudSyncService.enqueue(procedureData.studyId, blob, fileName, 'photo');
              }, 'image/jpeg', 0.90);

              wizardService.logAudit(procedureData.studyId, 'REPORT_SAVED', JSON.stringify({
                selected_media: updated,
                timestamp: new Date().toISOString()
              })).catch(console.warn);
            }
            return updated;
          });
          setValidationStatus(v => ({ ...v, captureWorking: true }));
          if (vaultRef.current) vaultRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          if (procedureData?.localStudyPath) localRecordService.saveCapture(procedureData.localStudyPath, captures.length + 1, dataUrl).catch(console.warn);
          setIsCapturing(true); setTimeout(() => setIsCapturing(false), 150);
        } catch (err) {
          console.error("Capture processing failed:", err);
          toast.error("Error al procesar fotografía.");
        }
      }
    } else {
      toast.error("Señal de video no lista para captura.");
    }
  };

  const handleStartRecording = () => {
    if (!videoRef.current?.srcObject) return;
    recordedChunksRef.current = [];
    try {
      const bitrateValue = config.quality.bitrate === 'Alto' ? 12000000 : 6000000;

      // Buscamos el formato de mayor compatibilidad (MP4/H264)
      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=h264')
        ? 'video/mp4;codecs=h264'
        : 'video/webm;codecs=h264';

      console.log(`🎥 LIARENA Video Engine: Grabando en formato ${mimeType}`);

      const recorder = new MediaRecorder((window as any).stream, {
        mimeType,
        videoBitsPerSecond: bitrateValue
      });

      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        if (procedureData?.studyId) {
          // Cloud Sync del Video (Background)
          cloudSyncService.enqueue(procedureData.studyId, blob, 'Procedimiento.mp4', 'video');
        }
        if (procedureData?.localStudyPath) {
          // Cambiamos la extensión a .mp4 en la llamada de guardado
          await localRecordService.saveVideo(procedureData.localStudyPath, blob);
        }
      };
      recorder.start(1000); mediaRecorderRef.current = recorder;
      setIsRecording(true); setIsPaused(false); setRecordingSeconds(0);
      setValidationStatus(v => ({ ...v, recordingWorking: true }));
    } catch (e) {
      console.error("Recording Engine Error:", e);
      toast.error("Error de motor de grabación H.264.");
    }
  };

  const handlePauseToggle = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (isPaused) { mediaRecorderRef.current.resume(); setIsPaused(false); }
    else { mediaRecorderRef.current.pause(); setIsPaused(true); }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); setIsRecording(false); setIsPaused(false);
      setIsStoppingPulse(true); setTimeout(() => setIsStoppingPulse(false), 800);
    }
  };

  const handleEndSession = async () => {
    if (!confirm("¿Desea finalizar la toma de capturas?")) return;
    setIsFinishing(true);

    try {
      // 0. Detener grabación si sigue activa para consolidar chunks
      if (isRecording) {
        handleStopRecording();
        // Dar un pequeño respiro para que el MediaRecorder termine de procesar el último chunk
        await new Promise(r => setTimeout(r, 500));
      }

      toast.info("Generando infraestructura local...");

      // 1. Crear carpetas definitivas
      const patientFolderName = `${procedureData.nombre} ${procedureData.apellidos}`;
      const localPatientPath = await localRecordService.ensurePatientFolder(patientFolderName, procedureData.birthDate);
      const localStudyPath = await localRecordService.ensureStudyFolder(localPatientPath, procedureData.procedureType);

      if (!localStudyPath) throw new Error("Fallo al crear directorios.");

      // 2. Volcar Fotografías a disco (Prioridad para el Reporte)
      toast.info(`Guardando ${captures.length} capturas...`);
      for (let i = 0; i < captures.length; i++) {
        try {
          await localRecordService.saveCapture(localStudyPath, i + 1, captures[i].image);
        } catch (capErr) {
          console.error(`Error saving capture ${i}:`, capErr);
        }
      }

      // 3. PROCESAMIENTO DE VIDEO EN SEGUNDO PLANO (Asíncrono no bloqueante)
      if (recordedChunksRef.current.length > 0) {
        const videoChunks = [...recordedChunksRef.current];
        recordedChunksRef.current = []; // Liberación inmediata de RAM en el hilo principal

        // Ejecución en segundo plano sin 'await'
        (async () => {
          try {
            console.log("🎬 LIARENA Background: Procesando video masivo...");
            const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
            await localRecordService.saveVideo(localStudyPath, videoBlob);
            console.log("🎬 LIARENA Background: Video guardado exitosamente.");
          } catch (videoErr) {
            console.error("🎬 LIARENA Background Error:", videoErr);
          }
        })();

        toast.success("Video procesándose en segundo plano...");
      }

      // 4. Guardar Metadata Inicial
      await localRecordService.saveMetadata(localStudyPath, {
        ...procedureData,
        capturesCount: captures.length,
        recordingSeconds,
        finalizedCaptureAt: new Date().toISOString()
      });

      // SINCRONIZACIÓN DE STATUS: Marcar como pendiente de reporte en Supabase
      await wizardService.markCaptureFinished(procedureData.studyId);

      // TRACKING DE SESIÓN
      const sessionStudiesStr = localStorage.getItem('liarena_session_studies');
      const sessionStudies = sessionStudiesStr ? JSON.parse(sessionStudiesStr) : [];
      sessionStudies.push({
        id: procedureData.studyId,
        type: procedureData.procedureType,
        timestamp: procedureData.timestamp,
        localPath: localStudyPath,
        isLast: true
      });
      localStorage.setItem('liarena_session_studies', JSON.stringify(sessionStudies));

      // 5. Actualizar sesión y NAVEGACIÓN INMEDIATA
      const finalProcedureData = {
        ...procedureData,
        localPatientPath,
        localStudyPath,
        recordingSeconds
      };

      localStorage.setItem('liarena_active_procedure', JSON.stringify(finalProcedureData));

      try {
        localStorage.setItem('liarena_active_captures', JSON.stringify(captures));
      } catch (lsErr) {
        console.warn("LocalStorage full:", lsErr);
      }

      // Notify Updater that procedure ended
      if ((window as any).ipcRenderer) {
        (window as any).ipcRenderer.update.setProcedureActive(false);
      }

      toast.success("Datos listos para reporte.");
      setTimeout(() => navigate("/procedure/finish"), 500);

    } catch (e) {
      console.error("Critical Persistence Error:", e);
      toast.error("Fallo crítico en la transición de datos.");
      setIsFinishing(false);
    }
  };

  const handleStartAdditionalProcedure = async () => {
    if (!newStudyType && !customStudyName) return;
    const finalType = newStudyType === "Otro..." ? customStudyName : newStudyType;

    setIsFinishing(true);
    const startTime = performance.now();

    try {
      if (isRecording) handleStopRecording();

      // 1. PERSISTENCIA LOCAL ACELERADA
      toast.info("Sincronizando primer estudio...");

      const patientFolderName = `${procedureData.nombre} ${procedureData.apellidos}`;
      const localPatientPath = procedureData.localPatientPath || await localRecordService.ensurePatientFolder(patientFolderName, procedureData.birthDate);
      const currentStudyPath = await localRecordService.ensureStudyFolder(localPatientPath, procedureData.procedureType);

      if (localPatientPath && currentStudyPath) {
        // Guardado en PARALELO para máxima velocidad
        const savePromises = [
          ...captures.map((cap, i) => localRecordService.saveCapture(currentStudyPath, i + 1, cap.image)),
          localRecordService.saveMetadata(currentStudyPath, {
            ...procedureData,
            capturesCount: captures.length,
            recordingSeconds,
            interruptedForAdditional: true,
            nextStudy: finalType
          })
        ];

        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          savePromises.push(localRecordService.saveVideo(currentStudyPath, blob));
        }

        await Promise.all(savePromises);
      }

      // SINCRONIZACIÓN DE STATUS: Marcar como pendiente de reporte en Supabase
      await wizardService.markCaptureFinished(procedureData.studyId);

      const saveDuration = (performance.now() - startTime).toFixed(0);
      console.log(`🚀 LIARENA Performance: Transición completada en ${saveDuration}ms`);

      // 2. Preparar el nuevo estudio en servidor
      const { data: { user: authUser } } = await supabase.auth.getUser();

      // TRACKING: Guardar el estudio que acabamos de terminar en la lista de la sesión
      const sessionStudiesStr = localStorage.getItem('liarena_session_studies');
      const sessionStudies = sessionStudiesStr ? JSON.parse(sessionStudiesStr) : [];
      sessionStudies.push({
        id: procedureData.studyId,
        type: procedureData.procedureType,
        timestamp: procedureData.timestamp,
        localPath: currentStudyPath
      });
      localStorage.setItem('liarena_session_studies', JSON.stringify(sessionStudies));

      const newStudyId = await wizardService.createStudyRecord({
        patientId: procedureData.patientId,
        procedureType: finalType,
        doctorId: procedureData.doctorId,
        roomId: procedureData.roomId
      }, []);

      if (!newStudyId) throw new Error("Fallo al reservar nuevo folio.");

      // 3. Resetear el estado de la pantalla para el nuevo estudio
      const newProcedureData = {
        ...procedureData,
        studyId: newStudyId,
        procedureType: finalType,
        localPatientPath, // Mantenemos la ruta del paciente
        localStudyPath: null, // Se creará al finalizar este nuevo estudio
        timestamp: new Date().toISOString()
      };

      setProcedureData(newProcedureData);
      localStorage.setItem('liarena_active_procedure', JSON.stringify(newProcedureData));

      // 4. ACTUALIZAR CONTEXTO DE REPORTE
      const ctxStr = localStorage.getItem('liarena_report_context');
      if (ctxStr) {
        const ctx = JSON.parse(ctxStr);
        ctx.study = {
          id: newStudyId,
          type: finalType,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('liarena_report_context', JSON.stringify(ctx));
      }

      // Limpiar estados locales de captura para el nuevo inicio
      setCaptures([]);
      setRecordingSeconds(0);
      recordedChunksRef.current = [];

      // RESETEAR PERFIL A ENDOSCOPIA POR DEFECTO
      setActiveProfileId('endos');
      const endosDefault = captureProfiles.find(p => p.id === 'endos');
      if (endosDefault) {
        const resetBox = { x: endosDefault.x, y: endosDefault.y, width: endosDefault.width, height: endosDefault.height };
        setCropBox(resetBox);
        cropBoxStateRef.current = resetBox;
      }

      setShowStudySelect(false);
      setNewStudyType("");
      setCustomStudyName("");

      toast.success(`Iniciado: ${finalType}`);
    } catch (e: any) {
      console.error("Additional Procedure Error:", e);
      toast.error("Error al encadenar estudio: " + e.message);
    } finally {
      setIsFinishing(false);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60); const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateAge = (dateString: string) => {
    if (!dateString) return "--";
    const today = new Date(); const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? `${age} años` : "--";
  };

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current && !resizingHandleRef.current) return;
    if (!containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
    const currentBox = dragStartRef.current;
    let nextBox = { ...cropBoxStateRef.current };
    if (isDraggingRef.current) {
      nextBox = { ...nextBox, x: Math.max(0, Math.min(100 - currentBox.boxW, currentBox.boxX + dx)), y: Math.max(0, Math.min(100 - currentBox.boxH, currentBox.boxY + dy)) };
    } else if (resizingHandleRef.current) {
      let { boxX: x, boxY: y, boxW: width, boxH: height } = currentBox; const handle = resizingHandleRef.current; const MIN_SIZE = 5;
      if (handle.includes('e')) width = Math.max(MIN_SIZE, Math.min(100 - x, width + dx));
      if (handle.includes('s')) height = Math.max(MIN_SIZE, Math.min(100 - y, height + dy));
      if (handle.includes('w')) { const newX = Math.max(0, Math.min(x + width - MIN_SIZE, x + dx)); width = Math.max(MIN_SIZE, width + (x - newX)); x = newX; }
      if (handle.includes('n')) { const newY = Math.max(0, Math.min(y + height - MIN_SIZE, y + dy)); height = Math.max(MIN_SIZE, height + (y - newY)); y = newY; }
      nextBox = { x, y, width, height };
    }
    setCropBox(nextBox);
  }, []);

  const handleGlobalMouseUp = useCallback(() => {
    if (isDraggingRef.current || resizingHandleRef.current) updateProfileData(cropBoxStateRef.current);
    isDraggingRef.current = false; resizingHandleRef.current = null;
  }, [updateProfileData]);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => { window.removeEventListener('mousemove', handleGlobalMouseMove); window.removeEventListener('mouseup', handleGlobalMouseUp); };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  const onMouseDownMove = (e: React.MouseEvent) => {
    e.stopPropagation(); isDraggingRef.current = true;
    const box = cropBoxStateRef.current; dragStartRef.current = { x: e.clientX, y: e.clientY, boxX: box.x, boxY: box.y, boxW: box.width, boxH: box.height };
  };

  const onMouseDownResize = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation(); resizingHandleRef.current = handle;
    const box = cropBoxStateRef.current; dragStartRef.current = { x: e.clientX, y: e.clientY, boxX: box.x, boxY: box.y, boxW: box.width, boxH: box.height };
  };

  useEffect(() => { if (showHardwareModal) loadDevices(); }, [showHardwareModal]);

  const goBackToDashboard = () => {
    if (userRole === 'doctor' || userRole === 'medic') {
      navigate("/medic");
    } else {
      navigate("/assistant");
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0B] text-[#F8FAFC] font-sans overflow-hidden select-none flex flex-col">
      {showAbTest && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <video autoPlay playsInline ref={(el) => { if (el && (window as any).stream) el.srcObject = (window as any).stream; }} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          <button onClick={() => setShowAbTest(false)} className="absolute top-10 right-10 p-4 bg-primary text-white rounded-full shadow-2xl z-[10000]"><X size={32} /></button>
        </div>
      )}

      {showMonitor && (
        <div className="fixed top-24 right-10 w-80 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 z-[100] shadow-2xl animate-in slide-in-from-right-4 duration-300">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3"><Terminal size={18} className="text-primary" /><span className="font-bold text-xs uppercase tracking-widest">Monitor Técnico</span></div>
              <button onClick={() => setShowMonitor(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
           </div>
           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-white/5 p-3 rounded-2xl"><p className="text-[8px] font-black text-slate-500 uppercase">FPS Real</p><p className="text-sm font-mono font-bold text-emerald-500">{trackStats?.frameRate?.toFixed(2) || '0.00'}</p></div>
                 <div className="bg-white/5 p-3 rounded-2xl"><p className="text-[8px] font-black text-slate-500 uppercase">Resolución</p><p className="text-sm font-mono font-bold text-white">{trackStats?.width}x{trackStats?.height}</p></div>
              </div>
              <div className="space-y-2 pt-2">
                 <p className="text-[8px] font-black text-slate-500 uppercase px-1">Hardware & System</p>
                 <div className="space-y-1">
                    <div className="flex justify-between items-center px-1"><span className="text-[10px] text-slate-400">CPU Usage</span><span className="text-[10px] font-mono font-bold">{systemStats?.cpuUsage}%</span></div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${systemStats?.cpuUsage}%` }} /></div>
                    <div className="flex justify-between items-center px-1 pt-1"><span className="text-[10px] text-slate-400">Memoria</span><span className="text-[10px] font-mono font-bold">{systemStats?.memoryUsage}</span></div>
                 </div>
              </div>
              <div className="pt-4 border-t border-white/5 space-y-3">
                 <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Pipeline Status</span>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px]">Stable</Badge>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    {Object.entries(validationStatus).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                         <div className={cn("w-1.5 h-1.5 rounded-full", val ? "bg-emerald-500" : "bg-slate-700")} />
                         <span className="text-[8px] text-slate-400 uppercase truncate">{key.replace(/([A-Z])/g, ' $1')}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      <header className="h-20 bg-[#111827] border-b border-white/5 flex items-center justify-between px-10 shrink-0 z-[60]">
         <div className="flex items-center gap-8">
            <button onClick={goBackToDashboard} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all group flex items-center gap-3">
               <Home size={18} />
               <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Inicio</span>
            </button>
            <div className="flex items-center gap-3">
               <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px]", signalStatus === 'active' ? "bg-emerald-500 shadow-emerald-500/50" : signalStatus === 'waiting' ? "bg-amber-500 shadow-amber-500/50" : "bg-danger shadow-danger-500/50")} />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">{signalStatus === 'active' ? "Señal Activa" : signalStatus === 'waiting' ? "Esperando Señal" : "Sin Señal"}</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400"><Monitor size={18} /></div>
               <div>
                  <p className="text-[10px] font-bold text-white uppercase tracking-tight">{activeProDevice?.label || "Buscando Hardware..."}</p>
                  <div className="flex items-center gap-3 text-[8px] font-black text-slate-500 uppercase">
                     <span className="text-primary">{activeProDevice?.brand}</span>
                     <span>•</span>
                     <span>{activeProDevice?.type} 3.0</span>
                     <span>•</span>
                     <span className="text-white/40">{trackStats?.width}x{trackStats?.height} @ {trackStats?.frameRate?.toFixed(0)} FPS</span>
                  </div>
               </div>
            </div>
         </div>
         <div className="flex items-center gap-4">
            {syncState.status === 'error' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-xl border border-red-500/20 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                 <WifiOff size={14} className="text-red-500" />
                 <span className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center">Sync Error</span>
              </div>
            )}
            {syncState.count > 0 && syncState.status !== 'error' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20 animate-pulse">
                 <Loader2 size={14} className="animate-spin text-primary" />
                 <span className="text-[10px] font-black text-primary uppercase tracking-widest">{syncState.count} Cloud Sync</span>
              </div>
            )}
            <button onClick={() => setShowMonitor(!showMonitor)} className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-all", showMonitor ? "bg-primary text-white" : "bg-white/5 text-slate-400 hover:text-white")}>
               <ActivitySquare size={20} />
            </button>
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
               <Database size={14} className="text-slate-500" />
               <span className="text-[10px] font-mono font-bold text-slate-400">Disk: {systemStats?.diskSpace || "Calculando..."}</span>
            </div>
         </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">

        {/* CONTENEDOR CENTRAL: VIDEO + OVERLAY IZQUIERDO */}
        <div className="flex-1 relative overflow-hidden bg-black">

          {/* ÁREA DE VIDEO (BASE LAYER - Fixed 100%) */}
          <main ref={containerRef} className="w-full h-full flex flex-col relative z-10 cursor-default isolation-auto overflow-hidden">
            <div className="flex-1 flex items-center justify-center relative bg-black">

              {/* NO VIDEO SIGNAL OVERLAY (Phase 5) */}
              {signalStatus !== 'active' && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0B] text-center space-y-6 animate-in fade-in duration-700">
                   <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                      <VideoOff size={80} className="text-slate-800 relative z-10" />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-xl font-black uppercase tracking-[0.3em] text-white">Sin señal de video</h3>
                      <p className="text-sm font-medium text-slate-500 italic uppercase tracking-widest">Esperando fuente {activeProDevice?.type === 'USB' ? 'USB 3.0 / HDMI' : activeProDevice?.type}...</p>
                   </div>
                   <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/5">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verificando Pipeline {activeProDevice?.brand}</span>
                   </div>
                </div>
              )}

              <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    opacity: 1,
                    filter: "none",
                    mixBlendMode: "normal",
                    objectFit: "contain",
                    objectPosition: "center",
                    backgroundColor: "black",
                    imageRendering: "auto",
                    transform: config.color.mirrorMode ? "scaleX(-1)" : "none",
                    WebkitTransform: config.color.mirrorMode ? "scaleX(-1)" : "none"
                  }}
                  className="w-full h-full z-10"
                />

                {/* MARCO DE RECORTE */}
                {config.videoDevice.deviceId && signalStatus === 'active' && isCropBoxVisible && (
                  <div
                    onMouseDown={onMouseDownMove}
                    style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.width}%`, height: `${cropBox.height}%` }}
                    className="absolute border-2 border-primary z-30 cursor-move bg-transparent"
                  >
                    <div onMouseDown={(e) => onMouseDownResize(e, 'nw')} className="absolute -top-3 -left-3 w-7 h-7 bg-white border-2 border-primary rounded-full cursor-nw-resize z-40 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"><Move size={12} className="text-primary" /></div>
                    <div onMouseDown={(e) => onMouseDownResize(e, 'ne')} className="absolute -top-3 -right-3 w-7 h-7 bg-white border-2 border-primary rounded-full cursor-ne-resize z-40 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"><Move size={12} className="text-primary" /></div>
                    <div onMouseDown={(e) => onMouseDownResize(e, 'sw')} className="absolute -bottom-3 -left-3 w-7 h-7 bg-white border-2 border-primary rounded-full cursor-sw-resize z-40 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"><Move size={12} className="text-primary" /></div>
                    <div onMouseDown={(e) => onMouseDownResize(e, 'se')} className="absolute -bottom-3 -right-3 w-7 h-7 bg-white border-2 border-primary rounded-full cursor-se-resize z-40 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"><Move size={12} className="text-primary" /></div>

                    <div onMouseDown={(e) => onMouseDownResize(e, 'n')} className="absolute -top-3 inset-x-10 h-6 cursor-n-resize z-30" />
                    <div onMouseDown={(e) => onMouseDownResize(e, 's')} className="absolute -bottom-3 inset-x-10 h-6 cursor-s-resize z-30" />
                    <div onMouseDown={(e) => onMouseDownResize(e, 'e')} className="absolute -right-3 inset-y-10 w-6 cursor-e-resize z-30" />
                    <div onMouseDown={(e) => onMouseDownResize(e, 'w')} className="absolute -left-3 inset-y-10 w-6 cursor-w-resize z-30" />

                    <div className="absolute -top-9 left-0 bg-primary px-4 py-1.5 rounded-t-xl text-[9px] font-black uppercase tracking-widest text-white flex items-center gap-2 shadow-xl">
                      <Scaling size={12} />
                      Marco: {captureProfiles.find(p => p.id === activeProfileId)?.name || 'ENDOSCOPIA'}
                    </div>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />

              {config.videoDevice.deviceId && signalStatus === 'active' && (
                 <div className="absolute top-6 right-8 flex flex-col items-end gap-1.5 pointer-events-none z-50">
                    {isRecording && (
                       <div className="flex items-center gap-2 text-danger">
                          <div className="w-2 h-2 rounded-full bg-danger animate-pulse shadow-[0_0_12px_rgba(255,0,0,0.8)]" />
                          <span className="text-[12px] font-mono font-black uppercase tracking-widest">REC {formatTime(recordingSeconds)}</span>
                       </div>
                    )}
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#F8FAFC] opacity-30">{trackStats?.width}x{trackStats?.height} @ {trackStats?.frameRate?.toFixed(0)} FPS</span>
                 </div>
              )}
            </div>
          </main>

          {/* PANEL IZQUIERDO (OVERLAY SOBRE VIDEO) */}
          <aside
            className={cn(
              "absolute left-0 top-0 bottom-0 z-50 bg-white border-r border-slate-100 flex flex-col shadow-2xl transition-transform duration-200 ease-in-out w-[320px]",
              isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
            )}
          >
            {/* Control Trigger */}
            <button
              onClick={toggleSidebar}
              className="absolute -right-6 top-8 w-6 h-10 bg-white border border-slate-200 rounded-r-xl flex items-center justify-center shadow-lg z-[70] hover:text-primary transition-all active:scale-95 text-slate-400"
              title={isSidebarCollapsed ? "Expandir" : "Contraer"}
            >
              {isSidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>

            <div className="h-full flex flex-col overflow-y-auto custom-scrollbar overflow-x-hidden p-6">
              <div className="space-y-12 w-[272px]">
                {/* Patient Section */}
                <section className="space-y-6">
                   <div className="flex items-center gap-3 opacity-40">
                      <User size={14} className="text-slate-900" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Paciente</span>
                   </div>
                   <div className="space-y-5 px-1">
                      {!procedureData ? (
                        <div className="space-y-3"><Skeleton className="h-4 w-full bg-slate-100" /><div className="grid grid-cols-2 gap-4"><Skeleton className="h-4 bg-slate-100" /><Skeleton className="h-4 bg-slate-100" /></div></div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Nombre Completo</p>
                            <p className="text-[13px] font-bold text-slate-900 uppercase tracking-tight truncate leading-tight" title={procedureData?.patientName}>{procedureData?.patientName}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-1.5">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Edad</p>
                               <p className="text-[12px] font-bold text-slate-700 italic">{calculateAge(procedureData?.birthDate)}</p>
                             </div>
                             <div className="space-y-1.5">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Sexo</p>
                               <p className="text-[12px] font-bold text-slate-700 uppercase">{procedureData?.sexo?.charAt(0) || 'M'}</p>
                             </div>
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Fecha de Nacimiento</p>
                            <p className="text-[12px] font-bold text-slate-700">{procedureData?.birthDate}</p>
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Expediente</p>
                            <p className="text-[12px] font-mono font-bold text-primary tracking-widest uppercase">{procedureData?.patientId?.slice(-8)}</p>
                          </div>
                        </>
                      )}
                   </div>
                </section>

                <div className="h-[1px] w-full bg-slate-50" />

                {/* Study Section */}
                <section className="space-y-6">
                   <div className="flex items-center gap-3 opacity-40">
                      <Layout size={14} className="text-slate-900" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Estudio</span>
                   </div>
                   <div className="space-y-5 px-1">
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Tipo de Procedimiento</p>
                        <p className="text-[13px] font-bold text-primary uppercase tracking-tight truncate italic leading-tight" title={procedureData?.procedureType}>{procedureData?.procedureType}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Fecha</p>
                        <p className="text-[12px] font-bold text-slate-700">{new Date().toLocaleDateString('es-MX', {day:'2-digit', month:'long', year:'numeric'})}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Hora de Inicio</p>
                        <p className="text-[12px] font-bold text-slate-700 uppercase">
                          {procedureData?.timestamp && !isNaN(new Date(procedureData.timestamp).getTime())
                            ? new Date(procedureData.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                            : '--:--'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Tiempo Transcurrido</p>
                        <p className="text-3xl font-mono font-black text-slate-900 tabular-nums tracking-tighter">{formatTime(recordingSeconds)}</p>
                      </div>
                   </div>
                </section>

                <div className="h-[1px] w-full bg-slate-50" />

                {/* CAPTURE PROFILES SELECTOR */}
                <section className="space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 opacity-40">
                         <Bookmark size={16} className="text-slate-900" />
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Perfiles</span>
                      </div>
                      <button onClick={handleAddProfile} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-all" title="Nuevo Perfil">
                        <Plus size={14} />
                      </button>
                   </div>

                   <div className="grid gap-2">
                      {captureProfiles.map(profile => (
                        <div key={profile.id} className="relative group min-w-0">
                           {isRenamingProfile === profile.id ? (
                             <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1 pr-3 border border-primary/50 animate-in fade-in duration-200">
                                <input autoFocus value={profile.name} onChange={(e) => handleRenameProfile(profile.id, e.target.value)} onBlur={() => setIsRenamingProfile(null)} onKeyDown={(e) => e.key === 'Enter' && setIsRenamingProfile(null)} className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-900 w-full px-2" />
                                <CheckCircle2 size={12} className="text-primary shrink-0" />
                             </div>
                           ) : (
                             <div className="flex gap-1 items-center">
                                <button onClick={() => setActiveProfileId(profile.id)} className={cn("flex-1 px-3 py-2.5 rounded-xl border transition-all text-left flex items-center justify-between group/btn min-w-0", activeProfileId === profile.id ? "bg-primary border-primary text-white shadow-lg" : "bg-slate-50 border-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100")}>
                                   <span className="text-[10px] font-bold uppercase tracking-widest truncate">{profile.name}</span>
                                   {activeProfileId === profile.id && <CheckCircle2 size={12} className="shrink-0 ml-1" />}
                                </button>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setIsRenamingProfile(profile.id)} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200" title="Renombrar"><Pencil size={10} /></button>
                                  <button onClick={() => handleDeleteProfile(profile.id)} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50" title="Eliminar"><Trash2 size={10} /></button>
                                </div>
                             </div>
                           )}
                        </div>
                      ))}
                   </div>

                   <div className="pt-2">
                      <button onClick={() => setIsCropBoxVisible(!isCropBoxVisible)} className={cn("w-full h-10 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-[9px] uppercase tracking-widest border", isCropBoxVisible ? "bg-primary/5 text-primary border-primary/10" : "bg-slate-100 text-slate-400 border-transparent")}>
                         {isCropBoxVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                         {isCropBoxVisible ? "Marco Visible" : "Marco Oculto"}
                      </button>
                   </div>
                </section>
              </div>
            </div>
          </aside>
        </div>

        {/* MEDIA PANEL (Fixed Column) */}
        <aside className="w-[280px] bg-[#111827] border-l border-white/5 flex flex-col shrink-0 overflow-hidden relative z-30">
           <div className="p-6 border-b border-white/5 bg-black/20"><h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-[#94A3B8]">Fotografías</h3></div>
           <div ref={vaultRef} className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
              {captures.length > 0 ? captures.map((cap) => (
                <div key={cap.id} className="space-y-3 animate-in slide-in-from-right duration-300 flex flex-col">
                   <div className="relative rounded-xl border border-white/10 overflow-hidden group shadow-2xl self-center w-full aspect-auto">
                      <img src={cap.image} alt={cap.label} className="w-full h-auto block" style={{ objectFit: 'contain' }} />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <button onClick={() => setCaptures(prev => prev.filter(c => c.id !== cap.id))} className="p-3 bg-danger text-white rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl"><Trash2 size={16} /></button>
                      </div>
                   </div>
                   <div className="px-1 space-y-1 text-center"><p className="text-[10px] font-black text-[#F8FAFC] uppercase tracking-widest">{cap.label}</p><p className="text-[12px] font-mono font-bold text-primary tracking-tighter">{cap.time}</p></div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center opacity-5 text-center space-y-4"><Camera size={40} className="text-[#94A3B8]" /><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94A3B8]">Awaiting Capture</p></div>
              )}
           </div>
        </aside>
      </div>

      <footer className="h-[68px] bg-white border-t border-slate-100 flex items-center justify-center px-5 shrink-0 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-6">
           <button onClick={() => setShowHardwareModal(true)} className="flex flex-col items-center justify-center gap-1 w-[56px] h-[52px] rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-150">
             <Settings2 size={18} /><span className="text-[10px] font-bold uppercase tracking-tighter">Ajustes</span>
           </button>
           <div className="w-[1px] h-8 bg-slate-100 mx-2" />
           <button onClick={handleStartRecording} disabled={isRecording || signalStatus !== 'active'} className={cn("flex flex-col items-center justify-center gap-1 w-[56px] h-[52px] rounded-xl transition-all duration-150 relative", (isRecording && !isPaused) ? "text-emerald-600 bg-emerald-50 shadow-sm" : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50/50 disabled:opacity-30")}>
             <Play size={18} fill={(isRecording && !isPaused) ? "currentColor" : "none"} /><span className="text-[10px] font-bold uppercase tracking-tighter">Iniciar</span>
             {(isRecording && !isPaused) && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
           </button>
           <button onClick={handlePauseToggle} disabled={!isRecording} className={cn("flex flex-col items-center justify-center gap-1 w-[56px] h-[52px] rounded-xl transition-all duration-150", isPaused ? "text-amber-600 bg-amber-50 shadow-sm" : "text-slate-400 hover:text-amber-500 hover:bg-amber-50/50 disabled:opacity-30")}>
             {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
             <span className="text-[10px] font-bold uppercase tracking-tighter">{isPaused ? "Reanudar" : "Pausar"}</span>
           </button>
           <button onClick={handleStopRecording} disabled={!isRecording && !isStoppingPulse} className={cn("flex flex-col items-center justify-center gap-1 w-[56px] h-[52px] rounded-xl transition-all duration-300", isStoppingPulse ? "text-red-600 bg-red-50 shadow-lg scale-95" : "text-slate-400 hover:text-red-500 hover:bg-red-50/50 transition-all duration-150 disabled:opacity-30")}>
             <Square size={18} fill={isStoppingPulse ? "currentColor" : "none"} /><span className="text-[10px] font-bold uppercase tracking-tighter">Detener</span>
           </button>
           <div className="w-[1px] h-8 bg-slate-100 mx-2" />
           <button onClick={() => setShowConfirmAdd(true)} className="flex flex-col items-center justify-center gap-1 w-[56px] h-[52px] rounded-xl text-slate-400 hover:text-primary hover:bg-slate-50 transition-all duration-150">
             <Layers size={18} /><span className="text-[10px] font-bold uppercase tracking-tighter text-center leading-tight">Adicional</span>
           </button>
           <button onClick={handleCapture} disabled={!config.videoDevice.deviceId || signalStatus !== 'active'} className="flex flex-col items-center justify-center gap-1 w-[56px] h-[52px] rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all duration-150 disabled:opacity-30">
             <Camera size={18} /><span className="text-[10px] font-bold uppercase tracking-tighter">Capturar</span>
           </button>
           <button onClick={handleEndSession} className="flex flex-col items-center justify-center gap-1 w-[56px] h-[52px] rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150">
             <CheckCircle2 size={18} /><span className="text-[10px] font-bold uppercase tracking-tighter">Finalizar</span>
           </button>
        </div>
      </footer>

      {/* CONFIRMATION MODAL */}
      {showConfirmAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
           <Card className="w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden border-none p-10 space-y-8">
              <div className="flex flex-col items-center text-center space-y-4">
                 <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><Layers size={32} /></div>
                 <h3 className="text-xl font-bold text-slate-900 uppercase italic">¿Nuevo procedimiento adicional?</h3>
                 <p className="text-sm text-slate-500 italic">Se mantendrá el contexto del paciente y el personal, pero se iniciará un expediente independiente para el nuevo estudio.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl space-y-2">
                 {['Paciente', 'Médico / Asistente', 'Sala y Sede', 'Ajustes de Captura'].map(item => (
                   <div key={item} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest"><CheckCircle2 size={12} className="text-emerald-500" /> {item}</div>
                 ))}
              </div>
              <div className="flex gap-4 pt-4">
                 <Button variant="ghost" onClick={() => setShowConfirmAdd(false)} className="flex-1 h-14 rounded-2xl text-slate-400 font-bold uppercase text-[11px]">Cancelar</Button>
                 <Button onClick={() => { setShowConfirmAdd(false); setShowStudySelect(true); }} className="flex-[2] h-14 rounded-2xl bg-primary text-white font-black uppercase text-[11px] shadow-xl">Continuar</Button>
              </div>
           </Card>
        </div>
      )}

      {/* STUDY SELECTOR MODAL */}
      {showStudySelect && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
           <Card className="w-full max-w-xl bg-white rounded-[48px] shadow-2xl overflow-hidden border-none p-10 space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                 <div className="p-3 bg-primary/10 text-primary rounded-2xl"><Zap size={24} /></div>
                 <div><h2 className="text-2xl font-bold text-slate-900 uppercase italic tracking-tighter">Seleccione el Estudio</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Paciente: {procedureData?.patientName}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                 {["Endoscopia", "Colonoscopia", "CPRE", "Sigmoidoscopia", "Otro..."].map(opt => (
                   <button key={opt} onClick={() => setNewStudyType(opt)} className={cn("h-14 px-6 rounded-2xl border-2 font-bold text-[10px] uppercase tracking-widest transition-all text-left flex items-center justify-between", newStudyType === opt ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-400 hover:bg-slate-50")}>{opt}{newStudyType === opt && <CheckCircle2 size={14} />}</button>
                 ))}
              </div>
              {newStudyType === "Otro..." && (
                <div className="animate-in slide-in-from-top-2 duration-300"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 italic">Especifique el estudio</label><Input placeholder="Nombre del estudio" value={customStudyName} onChange={(e) => setCustomStudyName(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-bold italic" autoFocus /></div>
              )}
              <div className="flex gap-4 pt-6">
                 <Button variant="ghost" onClick={() => setShowStudySelect(false)} className="flex-1 h-16 rounded-2xl text-slate-400 font-bold uppercase text-[11px]">Regresar</Button>
                 <Button onClick={handleStartAdditionalProcedure} disabled={!newStudyType || (newStudyType === "Otro..." && !customStudyName)} className="flex-[2] h-16 rounded-2xl bg-slate-900 text-white font-black uppercase text-[11px] shadow-xl gap-3">Iniciar Nuevo Estudio <ArrowRight size={18} /></Button>
              </div>
           </Card>
        </div>
      )}

      {showHardwareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-12">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => !isFinishing && setShowHardwareModal(false)} />
           <Card className="w-full max-w-5xl h-[85vh] bg-[#111827] border border-white/10 shadow-2xl relative z-10 rounded-[44px] overflow-hidden flex flex-col">
              <div className="p-10 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#0F172A]/50">
                 <div className="flex items-center gap-6"><div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-lg"><Settings2 size={24} /></div><div><h2 className="text-2xl font-bold text-[#F8FAFC] uppercase italic tracking-tighter">Acquisition Config</h2></div></div>
                 <button onClick={() => setShowHardwareModal(false)} className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="w-64 border-r border-white/5 bg-black/20 flex flex-col p-6 gap-2">
                   {[
                     { id: 'HARDWARE', label: 'Dispositivos', icon: Cpu },
                     { id: 'QUALITY', label: 'Calidad', icon: Zap },
                     { id: 'COLOR', label: 'Imagen', icon: Sliders },
                   ].map(tab => (
                     <button key={tab.id} onClick={() => setActiveConfigTab(tab.id)} className={cn("flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest", activeConfigTab === tab.id ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:bg-white/5")}>
                       <tab.icon size={16} />{tab.label}
                     </button>
                   ))}
                </div>
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                   <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
                      {activeConfigTab === 'HARDWARE' && (
                        <div className="space-y-8">
                           <div className="flex justify-between items-end">
                              <div className="space-y-2"><h3 className="text-xl font-bold text-white tracking-tight">Capturadoras Profesionales</h3><p className="text-sm text-slate-500">Seleccione la fuente de entrada para el procedimiento médico.</p></div>
                              <button onClick={loadDevices} className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all" title="Actualizar lista de dispositivos"><RefreshCw size={18} /></button>
                           </div>
                           <div className="grid gap-4">
                              {proDevices.map((dev) => (
                                <button key={dev.id} onClick={() => setConfig({ ...config, videoDevice: { ...config.videoDevice, deviceId: dev.id } })} className={cn("p-6 rounded-[28px] border-2 transition-all flex items-center justify-between text-left group", config.videoDevice.deviceId === dev.id ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(0,122,255,0.2)]" : "border-white/5 bg-white/5 hover:border-white/10")}>
                                  <div className="flex items-center gap-6">
                                     <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all", config.videoDevice.deviceId === dev.id ? "bg-primary text-white" : "bg-white/5 text-slate-400 group-hover:text-white")}><Monitor size={24} /></div>
                                     <div>
                                        <div className="flex items-center gap-3 mb-1"><span className="font-bold text-white text-lg tracking-tight">{dev.label}</span><Badge className="bg-white/10 text-[9px] font-black uppercase">{dev.brand}</Badge></div>
                                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500"><span className="flex items-center gap-1.5"><Zap size={10} className="text-primary" /> {dev.type}</span><span className="flex items-center gap-1.5"><Database size={10} /> {dev.status}</span></div>
                                     </div>
                                  </div>
                                  <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", config.videoDevice.deviceId === dev.id ? "border-primary bg-primary shadow-lg shadow-primary/50" : "border-white/20")}>{config.videoDevice.deviceId === dev.id && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}</div>
                                </button>
                              ))}
                           </div>
                        </div>
                      )}
                      {activeConfigTab === 'QUALITY' && (
                         <div className="space-y-8">
                            <h3 className="text-xl font-bold text-white tracking-tight">Preferencias de Calidad</h3>
                            <div className="grid grid-cols-2 gap-6">
                               <div className="space-y-4">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resolución Target</label>
                                  <div className="flex flex-wrap gap-2">
                                     {['1080p', '720p', '4K'].map(res => (
                                       <button key={res} onClick={() => setConfig({...config, quality: {...config.quality, resolution: res}})} className={cn("px-6 h-12 rounded-xl font-bold text-xs transition-all", config.quality.resolution === res ? "bg-primary text-white" : "bg-white/5 text-slate-400")}>{res}</button>
                                     ))}
                                  </div>
                               </div>
                               <div className="space-y-4">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Framerate</label>
                                  <div className="flex flex-wrap gap-2">
                                     {[30, 60].map(fps => (
                                       <button key={fps} onClick={() => setConfig({...config, quality: {...config.quality, fps}})} className={cn("px-6 h-12 rounded-xl font-bold text-xs transition-all", config.quality.fps === fps ? "bg-primary text-white" : "bg-white/5 text-slate-400")}>{fps} FPS</button>
                                     ))}
                                  </div>
                               </div>
                            </div>
                         </div>
                      )}
                      {activeConfigTab === 'COLOR' && (
                         <div className="space-y-12">
                            <div className="space-y-4"><h3 className="text-xl font-bold text-white tracking-tight">Corrección de Imagen</h3><p className="text-sm text-slate-500">Ajustes directos del pipeline de renderizado.</p></div>
                            <div className="grid gap-10">
                               {[
                                 { id: 'brightness', label: 'Brillo', icon: Zap },
                                 { id: 'contrast', label: 'Contraste', icon: Sliders },
                                 { id: 'saturation', label: 'Saturación', icon: RefreshCw },
                               ].map(control => (
                                 <div key={control.id} className="space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                       <div className="flex items-center gap-3"><control.icon size={14} className="text-primary" /><span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{control.label}</span></div>
                                       <span className="text-sm font-mono font-bold text-primary">{config.color[control.id]}%</span>
                                    </div>
                                    <input type="range" min="50" max="150" value={config.color[control.id]} onChange={(e) => setConfig({ ...config, color: { ...config.color, [control.id]: parseInt(e.target.value) } })} className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary" />
                                 </div>
                               ))}

                               <div className="pt-8 border-t border-white/5 space-y-4">
                                  <div className="flex items-center justify-between px-1">
                                     <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary"><Scaling size={14} /></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Modo Espejo (Mirror)</span>
                                     </div>
                                     <button
                                       onClick={() => setConfig({ ...config, color: { ...config.color, mirrorMode: !config.color.mirrorMode } })}
                                       className={cn(
                                         "w-12 h-6 rounded-full transition-all relative",
                                         config.color.mirrorMode ? "bg-primary" : "bg-white/10"
                                       )}
                                     >
                                        <div className={cn(
                                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md",
                                          config.color.mirrorMode ? "right-1" : "left-1"
                                        )} />
                                     </button>
                                  </div>
                                  <p className="text-[9px] text-slate-500 italic px-1 uppercase tracking-wider">Activar para Webcams, desactivar para Torres de Endoscopía.</p>
                               </div>

                               <button onClick={() => setConfig({ ...config, color: { brightness: 100, contrast: 100, saturation: 100, sharpness: 100, mirrorMode: true } })} className="flex items-center justify-center gap-3 h-14 rounded-2xl bg-white/5 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-all"><RotateCcw size={14} /> Restaurar Valores Predeterminados</button>
                            </div>
                         </div>
                      )}
                   </div>
                </div>
              </div>
              <div className="p-10 border-t border-white/5 flex justify-end gap-4 shrink-0 bg-[#0F172A]/50">
                 <Button variant="ghost" onClick={() => setShowHardwareModal(false)} className="h-14 px-10 rounded-2xl">Cancelar</Button>
                 <Button onClick={() => { localStorage.setItem('liarena_pro_capture_config', JSON.stringify(config)); setShowHardwareModal(false); toast.success("Ajustes aplicados."); }} className="h-14 px-12 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs">Guardar Cambios</Button>
              </div>
           </Card>
        </div>
      )}
      {isFinishing && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center gap-6 animate-in fade-in duration-1000">
           <Loader2 className="w-16 h-16 animate-spin text-primary opacity-50" />
           <p className="text-sm font-black text-primary uppercase tracking-[0.5em] italic">Consolidando Expediente...</p>
        </div>
      )}
    </div>
  );
}
