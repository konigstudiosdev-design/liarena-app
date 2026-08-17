import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Search,
  ArrowRight,
  Globe,
  Trash2,
  Edit3,
  Zap,
  Activity,
  X,
  Loader2
} from "lucide-react";
import { Card, Button, Badge, Input, toast } from "../../components/ui/index";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { supabase } from "../../lib/supabase";

export default function OrganizationList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingOrg, setEditingId] = useState<any>(null);

  useEffect(() => {
    fetchOrgs();
  }, []);

  async function fetchOrgs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, nombre, slug, activo, created_at')
        .is('deleted_at', null)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error al cargar organizaciones");
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta organización?")) return;
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ deleted_at: new Date().toISOString(), activo: false })
        .eq('id', id);

      if (error) throw error;
      toast.success("Organización eliminada");
      fetchOrgs();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          nombre: editingOrg.nombre,
          slug: editingOrg.nombre.toLowerCase().replace(/\s+/g, '-'),
          activo: editingOrg.activo
        })
        .eq('id', editingOrg.id);

      if (error) throw error;
      toast.success("Organización actualizada");
      setShowEditForm(false);
      fetchOrgs();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredOrgs = organizations.filter(org =>
    (org.nombre || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.slug || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-700">
      <div className="flex items-end justify-between px-2">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Infraestructura Global</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 italic">Nodos de Organización</h1>
        </div>
        <Button onClick={() => navigate("/dev/organizations/new")} className="rounded-[24px] shadow-xl shadow-primary/20 h-14 font-black text-[11px] uppercase tracking-widest px-10 gap-3">
          <Plus className="w-4 h-4" /> Desplegar Nodo
        </Button>
      </div>

      <Card className="border-none shadow-premium bg-white p-6 rounded-[32px]">
         <div className="flex gap-4">
            <div className="relative flex-1 group">
               <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
               <Input
                 placeholder="Filtrar por nombre o identificador..."
                 className="h-12 pl-12 bg-slate-50 border-none rounded-2xl font-bold text-sm"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>
         </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
         {loading ? (
           <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30 italic font-bold">
             <Loader2 className="w-8 h-8 animate-spin" />
             <p>Invocando registros del núcleo...</p>
           </div>
         ) : filteredOrgs.length > 0 ? filteredOrgs.map((org) => (
            <Card key={org.id} className="border-none shadow-sm bg-white p-6 rounded-[32px] group hover:shadow-xl transition-all duration-500 border border-transparent hover:border-primary/10">
               <div className="flex items-center gap-8">
                  <div className="w-20 h-20 rounded-[28px] bg-slate-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors shrink-0">
                     <Building2 className="w-8 h-8 text-slate-200 group-hover:text-primary transition-colors" />
                  </div>

                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors italic tracking-tight">{org.nombre || "Sin Nombre"}</h3>
                        <Badge variant={org.activo ? "success" : "danger"} className="h-5 px-3 uppercase text-[8px] font-black">{org.activo ? "Online" : "Offline"}</Badge>
                     </div>
                     <div className="flex items-center gap-8 mt-3">
                        <div className="flex items-center gap-2 text-slate-400">
                           <Globe className="w-3.5 h-3.5" />
                           <span className="text-[10px] font-black uppercase tracking-widest">{org.slug || "no-id"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-primary font-black">
                           <Zap className="w-3.5 h-3.5" />
                           <span className="text-[10px] uppercase tracking-[0.2em] font-mono">LIA-{org.id.substring(0, 8).toUpperCase()}</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-4 pr-6">
                     <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-300 hover:text-primary transition-all" onClick={() => { setEditingId(org); setShowEditForm(true); }}><Edit3 className="w-5 h-5" /></Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-300 hover:text-danger transition-all" onClick={() => handleDelete(org.id)}><Trash2 className="w-5 h-5" /></Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100 text-slate-900 transition-all" onClick={() => navigate(`/dev/organizations/${org.id}`)}><ArrowRight className="w-5 h-5" /></Button>
                     </div>
                  </div>
               </div>
            </Card>
         )) : (
            <div className="py-20 text-center flex flex-col items-center justify-center opacity-20 italic font-bold">
               <Activity className="w-16 h-16 mb-4 text-slate-300" />
               <p className="text-sm uppercase tracking-widest">Sin nodos registrados</p>
            </div>
         )}
      </div>

      {showEditForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-6">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in" onClick={() => !isProcessing && setShowEditForm(false)} />
           <div className="w-full max-w-[500px] h-full bg-white shadow-2xl relative z-10 animate-in slide-in-from-right-full duration-700 rounded-[48px] flex flex-col overflow-hidden">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-900 text-white shrink-0">
                 <h2 className="text-3xl font-bold italic tracking-tighter">Editar Nodo</h2>
                 <button onClick={() => setShowEditForm(false)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12">
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre de la Organización</label>
                       <Input value={editingOrg.nombre} onChange={(e) => setEditingId({...editingOrg, nombre: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-lg" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Estado</label>
                       <div className="flex gap-2">
                          <button onClick={() => setEditingId({...editingOrg, activo: true})} className={cn("flex-1 h-12 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all", editingOrg.activo ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-300")}>Online</button>
                          <button onClick={() => setEditingId({...editingOrg, activo: false})} className={cn("flex-1 h-12 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all", !editingOrg.activo ? "border-danger bg-danger/5 text-danger" : "border-slate-100 text-slate-300")}>Offline</button>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-10 border-t border-slate-50">
                 <Button onClick={handleUpdate} disabled={isProcessing} className="w-full h-16 rounded-[28px] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-primary/20">
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
