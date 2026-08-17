import React, { useState, useEffect } from "react";
import {
  Monitor,
  Search,
  Activity,
  Settings,
  CheckCircle2,
  Usb,
  Trash2,
  Loader2,
  X
} from "lucide-react";
import { Card, Button, Badge, Input, toast } from "../../components/ui/index";
import { cn } from "../../lib/utils";
import { supabase } from "../../lib/supabase";

export default function DevInfrastructure() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);

  useEffect(() => {
    fetchInfrastructure();
  }, []);

  async function fetchInfrastructure() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, organizations(nombre)')
        .is('deleted_at', null);
      if (error) throw error;
      setRooms(data || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta sala del sistema?")) return;
    try {
      const { error } = await supabase.from('rooms').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success("Sala eliminada");
      fetchInfrastructure();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpdate = async () => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ nombre: editingRoom.nombre, activa: editingRoom.activa })
        .eq('id', editingRoom.id);
      if (error) throw error;
      toast.success("Configuración actualizada");
      setShowEdit(false);
      fetchInfrastructure();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-700">
      <div className="flex items-end justify-between px-2">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Gestión de Hardware</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 italic">Salas y Equipos</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-bold italic tracking-tight text-slate-800">Monitoreo Global</h2>
              <Badge variant="neutral" className="bg-slate-100 text-slate-500 border-none px-4">{rooms.length} Salas Activas</Badge>
           </div>

           <div className="grid grid-cols-1 gap-4">
              {loading ? (
                 <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30 italic font-bold">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p>Escaneando infraestructura...</p>
                 </div>
              ) : rooms.length > 0 ? (
                 rooms.map((room) => (
                    <Card key={room.id} className="border-none shadow-sm bg-white p-6 rounded-[32px] group hover:shadow-md transition-all border border-transparent hover:border-primary/10">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                             <Monitor className="w-8 h-8 text-slate-300 group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1">
                             <h3 className="text-lg font-bold text-slate-900 italic tracking-tight uppercase">{room.nombre}</h3>
                             <div className="flex items-center gap-4 mt-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{room.organizations?.nombre || "Sin Asignar"}</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <Badge variant={room.activa ? "success" : "neutral"} className="h-6 px-4">
                                {room.activa ? "Online" : "Offline"}
                             </Badge>
                             <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-300 hover:text-primary" onClick={() => { setEditingRoom(room); setShowEdit(true); }}><Settings className="w-5 h-5" /></Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-200 hover:text-danger" onClick={() => handleDelete(room.id)}><Trash2 className="w-5 h-5" /></Button>
                             </div>
                          </div>
                       </div>
                    </Card>
                 ))
              ) : (
                 <Card className="border-none shadow-sm bg-white p-20 rounded-[40px] text-center opacity-20 italic">
                    <Monitor className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest">Cero equipos detectados</p>
                 </Card>
              )}
           </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <Card className="border-none shadow-premium bg-slate-900 text-white rounded-[40px] p-8 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Usb size={100} />
              </div>
              <div className="space-y-6 relative z-10">
                 <h4 className="font-bold text-sm uppercase tracking-widest italic flex items-center gap-2 text-primary">
                    <Activity className="w-4 h-4" /> Node Status
                 </h4>
                 <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-[10px] font-bold text-slate-400 italic">Core Sincronizado</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    </div>
                 </div>
              </div>
           </Card>
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-6">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in" onClick={() => setShowEdit(false)} />
           <div className="w-full max-w-[500px] h-full bg-white shadow-2xl relative z-10 animate-in slide-in-from-right-full duration-700 rounded-[48px] flex flex-col overflow-hidden">
              <div className="p-10 bg-slate-900 text-white flex items-center justify-between shrink-0">
                 <h2 className="text-3xl font-bold italic tracking-tighter uppercase">Editar Equipo</h2>
                 <button onClick={() => setShowEdit(false)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12">
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre de la Sala / Equipo</label>
                       <Input value={editingRoom.nombre} onChange={(e) => setEditingRoom({...editingRoom, nombre: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Estado de Red</label>
                       <div className="flex gap-2">
                          <button onClick={() => setEditingRoom({...editingRoom, activa: true})} className={cn("flex-1 h-12 rounded-xl border-2 font-black uppercase text-[10px] transition-all", editingRoom.activa ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-300")}>Online</button>
                          <button onClick={() => setEditingRoom({...editingRoom, activa: false})} className={cn("flex-1 h-12 rounded-xl border-2 font-black uppercase text-[10px] transition-all", !editingRoom.activa ? "border-danger bg-danger/5 text-danger" : "border-slate-100 text-slate-300")}>Offline</button>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-10 border-t border-slate-50">
                 <Button onClick={handleUpdate} className="w-full h-16 rounded-[28px] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-primary/20">
                    Sincronizar Cambios
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
