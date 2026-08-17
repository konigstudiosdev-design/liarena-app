import React, { useState, useEffect } from "react";
import {
  Database,
  Activity,
  Terminal,
  ShieldAlert,
  Zap,
  Cpu,
  RefreshCw,
  Play,
  Server,
  Lock,
  Globe,
  CheckCircle2
} from "lucide-react";
import { Card, Button, Badge, Tab, Tabs } from "../../components/ui";
import { cn } from "../../lib/utils";
import { supabase } from "../../lib/supabase";
import { qaService, AuditResult } from "../../lib/qa-service";

export default function SystemControl() {
  const [activeTab, setActiveTab] = useState("logs");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ onlineNodes: 0, eventsTotal: 0 });
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [qaResults, setQaResults] = useState<AuditResult[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          supabase.from('audit_logs').select('*, users(nombre, apellidos)').order('created_at', { ascending: false }).limit(20),
          supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('activo', true),
          supabase.from('audit_logs').select('*', { count: 'exact', head: true })
        ]);

        if (results[0].status === 'fulfilled') setLogs((results[0].value as any).data || []);

        setStats({
          onlineNodes: results[1].status === 'fulfilled' ? (results[1].value as any).count || 0 : 0,
          eventsTotal: results[2].status === 'fulfilled' ? (results[2].status === 'fulfilled' ? (results[2].value as any).count : 0) : 0
        });

        if ((window as any).ipcRenderer) {
           const info = await (window as any).ipcRenderer.invoke('get-system-info');
           setSystemInfo(info);
        }

        runQA();
      } catch (e) {
        console.error("Error fetching system control data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function runQA() {
    setIsAuditing(true);
    const results = await qaService.runFullAudit();
    setQaResults(results);
    setIsAuditing(false);
  }

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-700">
      <div className="flex items-end justify-between px-2">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Administración Global del Sistema</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 italic">Control Maestro</h1>
        </div>
      </div>

      <Tabs>
         <Tab active={activeTab === "logs"} onClick={() => setActiveTab("logs")}>Nucleus Events</Tab>
         <Tab active={activeTab === "health"} onClick={() => setActiveTab("health")}>Health Monitor</Tab>
         <Tab active={activeTab === "qa"} onClick={() => setActiveTab("qa")}>QA Certification</Tab>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8">
            {activeTab === "logs" && (
               <Card className="border-none shadow-premium bg-[#0A0A0B] text-slate-300 rounded-[40px] overflow-hidden flex flex-col h-[650px] border border-white/5">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                     <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Real-time Nucleus Feed</span>
                     </div>
                     <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        <span className="text-[9px] font-bold">STREAMING</span>
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 font-mono text-xs space-y-4 custom-scrollbar">
                     {logs.length > 0 ? logs.map((log) => (
                        <div key={log.id} className="flex gap-6 group hover:bg-white/[0.02] -mx-4 px-4 py-1 transition-colors">
                           <span className="text-slate-600 shrink-0">[{new Date(log.created_at || log.timestamp).toLocaleTimeString()}]</span>
                           <span className="font-black uppercase tracking-tighter shrink-0 min-w-[80px] text-primary">{log.entidad || 'CORE'}</span>
                           <span className="text-slate-700 italic">::</span>
                           <span className="text-slate-300 font-medium">
                              {log.accion || log.action} - <span className="text-slate-500 italic">{log.users?.nombre || 'SYSTEM'}</span>
                              {log.detalles && <span className="text-slate-600 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">({log.detalles})</span>}
                           </span>
                        </div>
                     )) : (
                        <div className="h-full flex items-center justify-center opacity-20 italic font-bold">
                           <p>Esperando primer evento del núcleo...</p>
                        </div>
                     )}
                  </div>
               </Card>
            )}

            {activeTab === "health" && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-500">
                  <Card className="border-none shadow-sm bg-white p-8 rounded-[40px] space-y-6">
                     <div className="flex items-center gap-3 mb-2">
                        <Cpu className="w-5 h-5 text-primary" />
                        <h4 className="text-lg font-bold italic">Procesamiento (Local)</h4>
                     </div>
                     <div className="space-y-4">
                        <div>
                           <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">CPU</div>
                           <p className="text-xs font-bold text-slate-700">{systemInfo?.cpu || 'Detectando...'}</p>
                        </div>
                     </div>
                  </Card>
                  <Card className="border-none shadow-sm bg-white p-8 rounded-[40px] space-y-6">
                     <div className="flex items-center gap-3 mb-2">
                        <Database className="w-5 h-5 text-primary" />
                        <h4 className="text-lg font-bold italic">Memoria (Local)</h4>
                     </div>
                     <div className="space-y-4">
                        <div>
                           <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">RAM</div>
                           <p className="text-xs font-bold text-slate-700">{systemInfo?.ram || '---'}</p>
                        </div>
                     </div>
                  </Card>
               </div>
            )}
            {activeTab === "qa" && (
               <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between px-2">
                     <h3 className="text-xl font-bold italic uppercase tracking-widest text-slate-800">Auditoría de Certificación RC</h3>
                     <Button onClick={runQA} disabled={isAuditing} variant="outline" size="sm" className="rounded-xl h-10 px-6 border-slate-200">
                        {isAuditing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Re-auditar Núcleo
                     </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                     {qaResults.map((res, i) => (
                        <Card key={i} className="p-8 bg-white rounded-[40px] border border-slate-100 flex items-center justify-between shadow-sm">
                           <div className="flex items-center gap-8">
                              <div className={cn(
                                 "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                                 res.status === 'OK' ? "bg-emerald-50 text-emerald-600 shadow-emerald-500/10" :
                                 res.status === 'WARNING' ? "bg-amber-50 text-amber-600 shadow-amber-500/10" :
                                 "bg-danger/5 text-danger shadow-danger/10"
                              )}>
                                 {res.status === 'OK' ? <CheckCircle2 size={24} /> :
                                  res.status === 'WARNING' ? <AlertCircle size={24} /> :
                                  <ShieldAlert size={24} />}
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{res.module}</p>
                                 <h4 className="text-lg font-bold text-slate-900 tracking-tight italic">{res.message}</h4>
                              </div>
                           </div>
                           <Badge variant={res.status === 'OK' ? "success" : res.status === 'WARNING' ? "warning" : "danger"} className="h-6 px-4 uppercase text-[8px] font-black tracking-widest rounded-lg">
                              {res.status === 'OK' ? "Certified" : res.status === 'WARNING' ? "Observation" : "Critical"}
                           </Badge>
                        </Card>
                     ))}
                  </div>
               </div>
            )}
         </div>

         <div className="lg:col-span-4 space-y-8">
            <Card className="border-none shadow-premium bg-slate-900 text-white rounded-[40px] p-8 overflow-hidden relative group">
               <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Activity className="w-24 h-24" />
               </div>
               <div className="space-y-8 relative z-10">
                  <div className="flex items-center gap-3">
                     <Server className="w-5 h-5 text-primary" />
                     <h4 className="font-bold text-sm uppercase tracking-widest italic">Live Node Performance</h4>
                  </div>

                  <div className="space-y-6">
                     <div>
                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">
                           <span>Nodos Sincronizados</span>
                           <span className="text-success">{stats.onlineNodes} Online</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full w-[100%] bg-success shadow-[0_0_8px_rgba(52,199,89,0.5)]" />
                        </div>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Event Store</span>
                        <span className="text-sm font-bold italic">{stats.eventsTotal} Registros</span>
                     </div>
                  </div>
               </div>
            </Card>

            <Card className="border-none shadow-sm bg-white p-8 rounded-[40px] space-y-6">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic px-1">Global Security Build</h4>
               <div className="space-y-4">
                  {[
                     { label: "SSL Shield", status: "Active", icon: ShieldAlert, color: "text-primary" },
                     { label: "DB Encryption", status: "Active", icon: Lock, color: "text-success" },
                     { label: "IP Whitelisting", status: "Enabled", icon: Globe, color: "text-warning" }
                  ].map((s, i) => (
                     <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-white transition-all cursor-default border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-3">
                           <s.icon className={cn("w-3.5 h-3.5", s.color)} />
                           <span className="text-xs font-bold text-slate-600 italic">{s.label}</span>
                        </div>
                        <CheckCircle2 className="w-3.5 h-3.5 text-success opacity-40" />
                     </div>
                  ))}
               </div>
            </Card>
         </div>
      </div>
    </div>
  );
}
