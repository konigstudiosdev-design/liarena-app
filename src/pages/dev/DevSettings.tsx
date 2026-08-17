import React, { useState } from "react";
import {
  Globe,
  RefreshCw,
  Activity,
  Save,
  Info
} from "lucide-react";
import { Card, CardContent, Button, Input, Tab, Tabs, toast } from "../../components/ui/index";

export default function DevSettings() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    region: "LATAM-MEX",
    apiUrl: "https://api.liarena.com/v1"
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulación de guardado en Supabase/Backend
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success("Configuración global actualizada correctamente");
    } catch (e) {
      toast.error("Error al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-10 pb-10">
      <div className="flex items-end justify-between px-2">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">System Configuration</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 italic">Configuración Global</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-2xl h-12 px-10 font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 gap-3"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <Tabs>
         <Tab active={activeTab === "general"} onClick={() => setActiveTab("general")}>General</Tab>
         <Tab active={activeTab === "maintenance"} onClick={() => setActiveTab("maintenance")}>Mantenimiento</Tab>
         <Tab active={activeTab === "version"} onClick={() => setActiveTab("version")}>Información</Tab>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 space-y-6">
            {activeTab === "general" && (
               <Card className="border-none shadow-sm bg-white rounded-[40px] overflow-hidden">
                  <div className="p-10 space-y-10">
                     <h3 className="text-xl font-bold italic tracking-tight">Variables Globales</h3>
                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Región Principal</label>
                           <Input
                            value={formData.region}
                            onChange={(e) => setFormData({...formData, region: e.target.value})}
                            className="h-12 bg-slate-50 border-none rounded-xl font-bold italic"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">URL Base de API</label>
                           <Input
                            value={formData.apiUrl}
                            onChange={(e) => setFormData({...formData, apiUrl: e.target.value})}
                            className="h-12 bg-slate-50 border-none rounded-xl font-bold italic"
                           />
                        </div>
                     </div>
                  </div>
               </Card>
            )}

            {activeTab === "maintenance" && (
               <div className="grid grid-cols-1 gap-4">
                  <Card className="border-none shadow-sm bg-white p-10 rounded-[40px] space-y-8">
                     <h3 className="text-xl font-bold italic tracking-tight">Acciones de Mantenimiento</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          variant="outline"
                          onClick={() => toast.success("Caché global vaciada")}
                          className="h-16 rounded-[20px] bg-slate-50 border-none font-bold text-[10px] uppercase tracking-widest text-slate-600 justify-start px-6 gap-3"
                        >
                           Vaciar Caché Global
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => toast.success("Bóveda reindexada")}
                          className="h-16 rounded-[20px] bg-slate-50 border-none font-bold text-[10px] uppercase tracking-widest text-slate-600 justify-start px-6 gap-3"
                        >
                           Reindexar Bóveda
                        </Button>
                     </div>
                  </Card>
               </div>
            )}

            {activeTab === "version" && (
               <Card className="border-none shadow-sm bg-white p-10 rounded-[40px] space-y-6 text-center">
                  <h3 className="text-2xl font-bold italic text-slate-900 tracking-tight">LIARENA clinical-os</h3>
                  <p className="text-sm font-medium text-slate-400">Versión 1.0.4-build.842</p>
               </Card>
            )}
         </div>
      </div>
    </div>
  );
}
