import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Image, Pencil, Trash2, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const CORES = [
  "#5B7FFF", "#8B5CF6", "#F97316", "#22C55E", "#EF4444",
  "#EC4899", "#06B6D4", "#EAB308", "#84CC16", "#9CA3AF",
];

type Etiqueta = { id: string; nome: string; cor: string };

export default function Clientes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nome: "", whatsapp: "", email: "", data_cadastro: "" });

  // Etiquetas state
  const [painelAberto, setPainelAberto] = useState(false);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [novaEtiqueta, setNovaEtiqueta] = useState("");
  const [corSelecionada, setCorSelecionada] = useState(CORES[0]);
  const [clienteEtiquetas, setClienteEtiquetas] = useState<Record<string, string[]>>({});
  const [editEtiquetasSelecionadas, setEditEtiquetasSelecionadas] = useState<string[]>([]);

  useEffect(() => {
    loadClientes();
    loadEtiquetas();
  }, []);

  const loadClientes = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("*, galerias(id)")
      .order("created_at", { ascending: false });
    setClientes(data || []);
    // Load junction
    const { data: ce } = await supabase
      .from("cliente_etiquetas")
      .select("cliente_id, etiqueta_id")
      .in("cliente_id", (data || []).map((c: any) => c.id));
    const map: Record<string, string[]> = {};
    (ce || []).forEach((row: any) => {
      if (!map[row.cliente_id]) map[row.cliente_id] = [];
      map[row.cliente_id].push(row.etiqueta_id);
    });
    setClienteEtiquetas(map);
  };

  const loadEtiquetas = async () => {
    const { data } = await supabase
      .from("etiquetas")
      .select("*")
      .order("created_at", { ascending: true });
    setEtiquetas(data || []);
  };

  const criarEtiqueta = async () => {
    if (!novaEtiqueta.trim()) return;
    if (!user) { toast.error("Sessão expirada"); return; }
    const { error } = await supabase.from("etiquetas").insert({
      user_id: user.id,
      nome: novaEtiqueta.trim(),
      cor: corSelecionada,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Etiqueta criada!");
    setNovaEtiqueta("");
    loadEtiquetas();
  };

  const excluirEtiqueta = async (id: string) => {
    const { error } = await supabase.from("etiquetas").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Etiqueta excluída!");
    loadEtiquetas();
    loadClientes();
  };

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditing(null);
    setForm({ nome: "", whatsapp: "", email: "", data_cadastro: format(new Date(), "yyyy-MM-dd") });
    setEditEtiquetasSelecionadas([]);
    setModalOpen(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ nome: c.nome, whatsapp: c.whatsapp || "", email: c.email || "", data_cadastro: c.created_at ? format(new Date(c.created_at), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd") });
    setEditEtiquetasSelecionadas(clienteEtiquetas[c.id] || []);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    let clienteId = editing?.id;

    if (editing) {
      const { error } = await supabase
        .from("clientes")
        .update({ nome: form.nome, whatsapp: form.whatsapp || null, email: form.email || null })
        .eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      if (!user) { toast.error("Sessão expirada"); return; }
      const { data, error } = await supabase
        .from("clientes")
        .insert({ user_id: user.id, nome: form.nome, whatsapp: form.whatsapp || null, email: form.email || null })
        .select("id")
        .single();
      if (error) { toast.error(error.message); return; }
      clienteId = data.id;
    }

    // Sync etiquetas
    await supabase.from("cliente_etiquetas").delete().eq("cliente_id", clienteId);
    if (editEtiquetasSelecionadas.length > 0) {
      await supabase.from("cliente_etiquetas").insert(
        editEtiquetasSelecionadas.map((eid) => ({ cliente_id: clienteId, etiqueta_id: eid }))
      );
    }

    toast.success(editing ? "Cliente atualizado!" : "Cliente criado!");
    setModalOpen(false);
    loadClientes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este cliente?")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Cliente excluído!");
    loadClientes();
  };

  const formatWhatsApp = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const toggleEtiqueta = (id: string) => {
    setEditEtiquetasSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const getEtiquetaById = (id: string) => etiquetas.find((e) => e.id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Clientes</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPainelAberto(!painelAberto)}>
            <Tag className="h-4 w-4 mr-1" /> Etiquetas
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* Painel de gerenciamento de etiquetas */}
      {painelAberto && (
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm">Gerenciar Etiquetas</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Nova etiqueta..."
                value={novaEtiqueta}
                onChange={(e) => setNovaEtiqueta(e.target.value)}
                className="w-40 bg-input border-border"
                onKeyDown={(e) => e.key === "Enter" && criarEtiqueta()}
              />
              <div className="flex gap-1">
                {CORES.map((cor) => (
                  <button
                    key={cor}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      corSelecionada === cor ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: cor }}
                    onClick={() => setCorSelecionada(cor)}
                  />
                ))}
              </div>
              <Button size="sm" onClick={criarEtiqueta} disabled={!novaEtiqueta.trim()}>
                <Plus className="h-3 w-3 mr-1" /> Criar
              </Button>
            </div>
            {etiquetas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {etiquetas.map((et) => (
                  <Badge
                    key={et.id}
                    className="text-white flex items-center gap-1 pr-1"
                    style={{ backgroundColor: et.cor }}
                  >
                    {et.nome}
                    <button
                      onClick={() => excluirEtiqueta(et.id)}
                      className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-input border-border"
        />
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Etiquetas</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Galerias</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(clienteEtiquetas[c.id] || []).map((eid) => {
                            const et = getEtiquetaById(eid);
                            if (!et) return null;
                            return (
                              <Badge
                                key={eid}
                                className="text-white text-xs"
                                style={{ backgroundColor: et.cor }}
                              >
                                {et.nome}
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{c.whatsapp || "—"}</TableCell>
                      <TableCell>{c.galerias?.length || 0}</TableCell>
                      <TableCell>{format(new Date(c.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="Galerias" onClick={() => navigate(`/galerias?cliente=${c.id}`)}>
                            <Image className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome do cliente"
                className="bg-input border-border focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: formatWhatsApp(e.target.value) })}
                placeholder="(11) 99999-9999"
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemplo.com"
                className="bg-input border-border"
              />
            </div>
            {etiquetas.length > 0 && (
              <div className="space-y-2">
                <Label>Etiquetas</Label>
                <div className="flex flex-wrap gap-2">
                  {etiquetas.map((et) => {
                    const selected = editEtiquetasSelecionadas.includes(et.id);
                    return (
                      <button
                        key={et.id}
                        onClick={() => toggleEtiqueta(et.id)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all border-2 ${
                          selected ? "text-white" : "opacity-40"
                        }`}
                        style={{
                          backgroundColor: selected ? et.cor : "transparent",
                          borderColor: et.cor,
                          color: selected ? "white" : et.cor,
                        }}
                      >
                        {et.nome}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
