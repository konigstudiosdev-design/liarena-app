import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  ArrowRight,
  Mail,
  Shield,
  Activity,
  Inbox,
  Trash2,
  Loader2,
  Building2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, Button, Badge, Input, Avatar, toast } from "../../components/ui/index";
import { supabase } from "../../lib/supabase";

export default function UserList() {
  const [users, setUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedOrgs, setCollapsedOrgs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [usersRes, orgsRes] = await Promise.all([
        supabase
          .from('users')
          .select('*, organization:organization_id(nombre)')
          .is('deleted_at', null)
          .order('nombre', { ascending: true }),
        supabase
          .from('organizations')
          .select('id, nombre')
          .is('deleted_at', null)
      ]);

      if (usersRes.error) throw usersRes.error;
      if (orgsRes.error) throw orgsRes.error;

      setUsers(usersRes.data || []);
      setOrganizations(orgsRes.data || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este usuario del sistema global?")) return;
    try {
      const { error } = await supabase.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success("Usuario revocado");
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredUsers = (users || []).filter(user =>
    (user?.nombre || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
    (user?.correo || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
    (user?.role || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
    (user?.organization?.nombre || "").toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  // Grouping logic
  const groupedUsers = filteredUsers.reduce((acc: Record<string, any[]>, user) => {
    const orgName = user.organization?.nombre || "SISTEMA / ROOT";
    if (!acc[orgName]) acc[orgName] = [];
    acc[orgName].push(user);
    return acc;
  }, {});

  const toggleOrg = (orgName: string) => {
    setCollapsedOrgs(prev => ({ ...prev, [orgName]: !prev[orgName] }));
  };

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-700">
      <div className="flex items-end justify-between px-2">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Directorio Global de Usuarios</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 italic">Usuarios de la Red</h1>
        </div>
      </div>

      <Card className="border-none shadow-premium bg-white p-6 rounded-[32px]">
         <div className="relative group">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por nombre, correo, rol u organización..."
              className="h-12 pl-12 bg-slate-50 border-none rounded-2xl font-bold text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
      </Card>

      <div className="space-y-8">
         {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30 italic font-bold">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>Consultando identidades en la red...</p>
            </div>
         ) : Object.keys(groupedUsers).length > 0 ? Object.entries(groupedUsers).map(([orgName, orgUsers]) => (
            <div key={orgName} className="space-y-4">
               <button
                onClick={() => toggleOrg(orgName)}
                className="flex items-center justify-between w-full px-6 py-4 bg-slate-900 text-white rounded-[24px] shadow-lg group hover:bg-black transition-all"
               >
                  <div className="flex items-center gap-4">
                     <Building2 className="w-5 h-5 text-primary" />
                     <h2 className="text-sm font-black uppercase tracking-[0.2em] italic">{orgName}</h2>
                     <Badge variant="primary" className="bg-white/10 text-white border-none ml-2">{orgUsers.length}</Badge>
                  </div>
                  {collapsedOrgs[orgName] ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronUp className="w-5 h-5 text-slate-500" />}
               </button>

               {!collapsedOrgs[orgName] && (
                 <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-top-2 duration-300">
                    {orgUsers.map((user) => (
                       <Card key={user.id} className="border-none shadow-sm bg-white p-6 rounded-[32px] group hover:shadow-xl transition-all duration-500 border border-transparent hover:border-primary/10">
                          <div className="flex items-center gap-8">
                             <Avatar fallback={(user.nombre?.[0] || "") + (user.apellidos?.[0] || "")} className="h-14 w-14 text-lg font-black bg-slate-50" />

                             <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-4">
                                   <h3 className="text-lg font-bold text-slate-900 italic tracking-tight uppercase">{user.nombre} {user.apellidos}</h3>
                                   <Badge variant={user.role === 'developer' ? 'primary' : user.role === 'organization_admin' ? 'success' : 'neutral'} className="h-5 px-3 uppercase text-[8px] font-black border-none">
                                      {user.role === 'organization_admin' ? 'ADMIN' : user.role.toUpperCase()}
                                   </Badge>
                                </div>
                                <div className="flex items-center gap-6 mt-2">
                                   <div className="flex items-center gap-2 text-slate-400">
                                      <Mail className="w-3.5 h-3.5" />
                                      <span className="text-[10px] font-bold uppercase tracking-widest italic">{user.correo}</span>
                                   </div>
                                   <div className="flex items-center gap-2 text-slate-400">
                                      <Shield className="w-3.5 h-3.5" />
                                      <span className="text-[10px] font-bold uppercase tracking-widest italic">{user.username || "SIN USERNAME"}</span>
                                   </div>
                                </div>
                             </div>

                             <div className="flex items-center gap-4 pr-4">
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-200 hover:text-danger transition-all" onClick={() => handleDelete(user.id)}><Trash2 className="w-5 h-5" /></Button>
                             </div>
                          </div>
                       </Card>
                    ))}
                 </div>
               )}
            </div>
         )) : (
            <div className="py-24 text-center flex flex-col items-center justify-center opacity-20 italic font-bold">
               <Inbox className="w-16 h-16 mb-6 text-slate-300" />
               <p className="text-xl text-slate-800 tracking-tight">Sin identidades detectadas</p>
            </div>
         )}
      </div>
    </div>
  );
}
