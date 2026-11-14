import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Save,
  CheckCircle2,
  Download,
  Eye,
  ArrowLeft,
  Loader2,
  Sparkles,
  Stethoscope,
  User,
  Calendar,
  Building2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Camera,
  RotateCcw,
  Check
} from "lucide-react";
import { Card, Button, Badge, Avatar, Input, toast } from "../../components/ui/index";
import { supabase } from "../../lib/supabase";
import { formatDoctorName, cn } from "../../lib/utils";
import { pdfGenerator } from "../../lib/pdf-generator";
import { profileService } from "../../lib/profile-service";
import { wizardService } from "../../lib/wizard-service";

export default function DocumentEditor() {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const [study, setStudy] = useState<any>(null);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);

  // Form states
  const [findings, setFindings] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");

  const autoSaveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (studyId) {
      loadStudyDocument();
    }
  }, [studyId]);

  async function loadStudyDocument() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no válida");

      // 1. Load Study with relations
      const { data, error } = await supabase
        .from('studies')
        .select(`
          *,
          patient:patient_id(*),
          doctor:doctor_id(id, nombre, apellidos, role, doctor_profiles(*))
        `)
        .eq('id', studyId)
        .single();

      if (error || !data) throw new Error("Documento no encontrado o sin permisos de acceso.");

      setStudy(data);

      // 2. Doctor profile
      if (data.doctor_id) {
        const docProf = await profileService.getDoctorProfile(data.doctor_id);
        setDoctorProfile(docProf);
      }

      // 3. Parse findings and diagnosis from observations
      const obs = data.observaciones || "";
      if (obs && !obs.includes('[PENDIENTE_REPORTE]')) {
        const parsedFindings = obs.split('DIAGNÓSTICO:')[0]?.replace('HALLAZGOS:', '').trim() || "";
        const parsedDiagnosis = obs.split('DIAGNÓSTICO:')[1]?.trim() || "";
        setFindings(parsedFindings);
        setDiagnosis(parsedDiagnosis);
      }

      // 4. Retrieve Photos Snapshot from audit logs
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('detalles')
        .eq('study_id', studyId)
        .eq('accion', 'REPORT_SAVED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (auditData?.detalles) {
        try {
          const snapshot = JSON.parse(auditData.detalles);
          if (snapshot.selected_media && Array.isArray(snapshot.selected_media)) {
            setPhotos(snapshot.selected_media);
          }
        } catch (e) {}
      }

      // Log view audit
      await wizardService.logAudit(studyId!, 'DOCUMENT_VIEWED', 'Documento consultado en LIARENA Web Editor');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error al cargar documento");
    } finally {
      setLoading(false);
    }
  }

  // Auto-Save Draft Debounce
  const handleContentChange = (newFindings: string, newDiagnosis: string) => {
    setFindings(newFindings);
    setDiagnosis(newDiagnosis);
    if (study?.fecha_fin) return; // Readonly if finalized

    setAutoSaveStatus('saving');
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraft(newFindings, newDiagnosis, true);
    }, 2000);
  };

  const saveDraft = async (fText = findings, dText = diagnosis, isSilent = false) => {
    if (!studyId || study?.fecha_fin) return;

    if (!isSilent) setSaving(true);
    try {
      const reportText = `
HALLAZGOS: ${fText || 'Sin observaciones'}
DIAGNÓSTICO: ${dText || 'Pendiente'}
      `.trim();

      const { error } = await supabase
        .from('studies')
        .update({ observaciones: reportText })
        .eq('id', studyId);

      if (error) throw error;

      await wizardService.logAudit(studyId, 'DRAFT_SAVED', 'Borrador actualizado desde LIARENA Web Editor');
      setAutoSaveStatus('saved');
      if (!isSilent) toast.success("Borrador guardado correctamente");
    } catch (e: any) {
      console.error("Draft save error:", e);
      setAutoSaveStatus('idle');
      if (!isSilent) toast.error("Error al guardar borrador");
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizeDocument = async () => {
    if (!findings.trim() || !diagnosis.trim()) {
      toast.error("Hallazgos y Diagnóstico son campos requeridos para finalizar.");
      return;
    }

    if (!confirm("¿Desea marcar este expediente como FINALIZADO? Una vez firmado no podrá modificarse directamente.")) return;

    setSaving(true);
    try {
      const reportText = `
HALLAZGOS: ${findings.trim()}
DIAGNÓSTICO: ${diagnosis.trim()}
      `.trim();

      const nowIso = new Date().toISOString();

      const { error } = await supabase
        .from('studies')
        .update({
          observaciones: reportText,
          fecha_fin: nowIso
        })
        .eq('id', studyId);

      if (error) throw error;

      await wizardService.logAudit(studyId!, 'DOCUMENT_FINALIZED', 'Documento firmado y finalizado desde LIARENA Web Editor');
      toast.success("Documento finalizado y sellado exitosamente.");
      loadStudyDocument();
    } catch (e: any) {
      console.error(e);
      toast.error("Error al finalizar documento");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAIDraft = async () => {
    setIsGeneratingAI(true);
    try {
      const aiResult = await wizardService.generateAIDraft(
        study?.tipo_estudio || 'Endoscopia',
        photos.length,
        notes
      );
      setFindings(aiResult.findings);
      setDiagnosis(aiResult.diagnosis);
      handleContentChange(aiResult.findings, aiResult.diagnosis);
      toast.success("Borrador asistido por IA generado.");
    } catch (e) {
      toast.error("Error en asistente de IA.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleDownloadPDF = async () => {
    setSaving(true);
    try {
      await wizardService.logAudit(studyId!, 'DOCUMENT_DOWNLOADED', 'PDF generado desde Web Editor');

      const doc = await pdfGenerator.generateStudyReport({
        patientName: `${study.patient?.nombre || ''} ${study.patient?.apellidos || ''}`.trim() || "PACIENTE",
        age: study.patient?.fecha_nacimiento ? calculateAge(study.patient.fecha_nacimiento) : "--",
        sexo: study.patient?.sexo || "--",
        birthDate: study.patient?.fecha_nacimiento,
        expediente: study.patient?.expediente,
        procedureType: study.tipo_estudio,
        studyId: study.id,
        report: { findings, diagnosis },
        doctorName: doctorProfile ? formatDoctorName(doctorProfile) : formatDoctorName(study.doctor),
        doctor: doctorProfile || study.doctor,
        signature: doctorProfile?.firma,
        cedulaProf: doctorProfile?.cedula_profesional,
        cedulaEsp: doctorProfile?.cedula_especialidad,
        specialty: doctorProfile?.especialidad,
        orgLogo: doctorProfile?.organization?.logo
      }, photos);

      doc.save(`Reporte_${study.patient?.nombre || 'Estudio'}_${study.patient?.apellidos || ''}.pdf`);
      toast.success("PDF generado exitosamente");
    } catch (e: any) {
      console.error(e);
      toast.error("Error al generar PDF");
    } finally {
      setSaving(false);
    }
  };

  const calculateAge = (dateString: string) => {
    if (!dateString) return "--";
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return `${age} años`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex flex-col items-center justify-center p-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-30 mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando Editor Documental Web...</p>
      </div>
    );
  }

  const isFinalized = !!study?.fecha_fin;

  return (
    <div className="min-h-screen bg-[#FBFBFD] p-4 sm:p-6 lg:p-10 font-sans animate-in fade-in duration-700">

      {/* HEADER DE CONTROL */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 px-2">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/documents')}
            className="h-12 w-12 rounded-2xl bg-white border border-slate-100 text-slate-600 hover:text-slate-900 shadow-sm p-0 flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Editor Documental Clínico</span>
              {autoSaveStatus === 'saving' && (
                <Badge variant="warning" className="h-5 text-[8px] bg-amber-50 text-amber-600 border-none animate-pulse">Guardando...</Badge>
              )}
              {autoSaveStatus === 'saved' && (
                <Badge variant="success" className="h-5 text-[8px] bg-emerald-50 text-emerald-600 border-none flex items-center gap-1"><Check size={10} /> Borrador Guardado</Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 italic uppercase">
              {study?.patient?.nombre} {study?.patient?.apellidos}
            </h1>
          </div>
        </div>

        {/* ACCIONES DEL EDITOR */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          {!isFinalized ? (
            <>
              <Button
                variant="outline"
                onClick={() => saveDraft(findings, diagnosis, false)}
                disabled={saving}
                className="h-12 px-5 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest gap-2 bg-white"
              >
                <Save size={16} /> Guardar Borrador
              </Button>

              <Button
                onClick={handleFinalizeDocument}
                disabled={saving}
                className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 size={16} /> Finalizar & Sellar
              </Button>
            </>
          ) : (
            <Badge variant="success" className="h-12 px-6 rounded-2xl bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-widest border-none flex items-center gap-2">
              <ShieldCheck size={18} /> DOCUMENTO FINALIZADO Y OFICIAL
            </Badge>
          )}

          <Button
            onClick={handleDownloadPDF}
            disabled={saving}
            className="h-12 px-6 rounded-2xl bg-slate-900 text-white hover:bg-primary font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-slate-900/10"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={16} />} Descargar PDF
          </Button>
        </div>
      </header>

      {/* AVISO DOCUMENTO FINALIZADO */}
      {isFinalized && (
        <Card className="p-4 bg-emerald-50 border-emerald-100 rounded-3xl mb-8 flex items-center gap-4 text-emerald-800">
           <ShieldCheck className="w-6 h-6 shrink-0 text-emerald-600" />
           <p className="text-xs font-bold italic">
             Este expediente clínico ha sido finalizado. Los campos se encuentran en modo de lectura oficial protegida.
           </p>
        </Card>
      )}

      {/* ESTRUCTURA EDITOR - GRID DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* COLUMNA IZQUIERDA: REDACCIÓN DE CLÍNICA */}
        <div className="lg:col-span-8 space-y-8">
           {/* SECCIÓN HALLAZGOS */}
           <Card className="p-8 bg-white border-none rounded-[40px] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold italic uppercase tracking-tight text-slate-800">Hallazgos Endoscópicos</h3>
                 </div>
                 {!isFinalized && (
                   <Button
                     size="sm"
                     variant="ghost"
                     onClick={handleGenerateAIDraft}
                     disabled={isGeneratingAI}
                     className="text-primary hover:bg-primary/5 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2"
                   >
                     {isGeneratingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                     Asistente IA
                   </Button>
                 )}
              </div>

              <textarea
                value={findings}
                onChange={(e) => handleContentChange(e.target.value, diagnosis)}
                readOnly={isFinalized}
                placeholder="Describa la evidencia visual, mucosa y observaciones encontradas durante el procedimiento..."
                rows={6}
                className={cn(
                  "w-full p-6 bg-slate-50 border-none rounded-[28px] font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-primary/10 transition-all italic leading-relaxed custom-scrollbar",
                  isFinalized && "bg-slate-50/50 cursor-not-allowed"
                )}
              />
           </Card>

           {/* SECCIÓN DIAGNÓSTICO */}
           <Card className="p-8 bg-white border-none rounded-[40px] shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                 <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                 <h3 className="text-lg font-bold italic uppercase tracking-tight text-slate-800">Diagnóstico Final</h3>
              </div>

              <textarea
                value={diagnosis}
                onChange={(e) => handleContentChange(findings, e.target.value)}
                readOnly={isFinalized}
                placeholder="Ingrese la conclusión o diagnóstico definitivo..."
                rows={4}
                className={cn(
                  "w-full p-6 bg-slate-50 border-none rounded-[28px] font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-primary/10 transition-all italic leading-relaxed custom-scrollbar",
                  isFinalized && "bg-slate-50/50 cursor-not-allowed"
                )}
              />
           </Card>

           {/* EVIDENCIA FOTOGRÁFICA EN VIVO */}
           {photos.length > 0 && (
             <Card className="p-8 bg-white border-none rounded-[40px] shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-lg font-bold italic uppercase tracking-tight text-slate-800 flex items-center gap-3">
                      <Camera className="w-5 h-5 text-primary" /> Evidencia Multimedia Capturada ({photos.length} fotogramas)
                   </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                   {photos.map((p, idx) => (
                     <div key={idx} className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/60 relative group shadow-sm">
                        <img src={p.image} className="w-full h-full object-cover" />
                        {p.comment && (
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-1.5 text-white text-[9px] font-bold text-center truncate italic">
                             {p.comment}
                          </div>
                        )}
                     </div>
                   ))}
                </div>
             </Card>
           )}
        </div>

        {/* COLUMNA DERECHA: DATOS DEL PROCEDIMIENTO Y MÉDICO */}
        <div className="lg:col-span-4 space-y-8">
           {/* PACIENTE */}
           <Card className="p-8 bg-white border-none rounded-[40px] shadow-sm space-y-6">
              <div className="flex items-center gap-4">
                 <Avatar fallback={study?.patient?.nombre?.[0] || "P"} className="h-14 w-14 text-xl font-bold bg-slate-50 ring-2 ring-slate-100" />
                 <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Paciente</span>
                    <h4 className="font-bold text-slate-900 uppercase italic text-lg leading-tight">
                       {study?.patient?.nombre} {study?.patient?.apellidos}
                    </h4>
                    <p className="text-[10px] font-mono text-primary font-bold uppercase">{study?.patient?.expediente || 'S/ EXPEDIENTE'}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-600">
                 <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Edad / Sexo</span>
                    <span>{calculateAge(study?.patient?.fecha_nacimiento)} • {study?.patient?.sexo || '--'}</span>
                 </div>
                 <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">F. Nacimiento</span>
                    <span>{study?.patient?.fecha_nacimiento || '--'}</span>
                 </div>
              </div>
           </Card>

           {/* MÉDICO RESPONSABLE */}
           <Card className="p-8 bg-white border-none rounded-[40px] shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                 <Stethoscope className="w-5 h-5 text-primary" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Médico Especialista</span>
              </div>

              <div className="space-y-3">
                 <h4 className="text-xl font-bold text-slate-900 uppercase italic tracking-tight">
                   {doctorProfile ? formatDoctorName(doctorProfile) : formatDoctorName(study?.doctor)}
                 </h4>
                 <Badge variant="primary" className="bg-slate-900 text-white border-none text-[8px] font-black uppercase tracking-widest px-3 h-5">
                   {doctorProfile?.especialidad || 'Especialista'}
                 </Badge>

                 <div className="pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-500 space-y-1">
                    <p>CÉD. PROF: {doctorProfile?.cedula_profesional || '---'}</p>
                    <p>CÉD. ESP: {doctorProfile?.cedula_especialidad || '---'}</p>
                 </div>
              </div>
           </Card>

           {/* PROCEDIMIENTO Y SEDE */}
           <Card className="p-8 bg-white border-none rounded-[40px] shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                 <Building2 className="w-5 h-5 text-slate-400" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Ficha Técnica</span>
              </div>

              <div className="space-y-4 text-xs font-bold text-slate-700">
                 <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Procedimiento</span>
                    <span className="text-sm font-black text-primary italic uppercase">{study?.tipo_estudio}</span>
                 </div>
                 <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fecha de Registro</span>
                    <span>{new Date(study?.created_at).toLocaleString('es-MX')}</span>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
