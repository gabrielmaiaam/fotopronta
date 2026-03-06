import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Eye, Upload, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const TIPOS_ENSAIO = [
  { value: "aniversario", label: "Aniversário 🎉" },
  { value: "infantil", label: "Infantil 🧒" },
  { value: "formatura", label: "Formatura 🎓" },
  { value: "casal", label: "Casal 💑" },
  { value: "corporativo", label: "Corporativo 💼" },
];

const PACOTES = [
  { value: "mini", label: "Mini (3 fotos - R$ 29,90)", preco: 29.9 },
  { value: "essencial", label: "Essencial (7 fotos - R$ 49,90)", preco: 49.9 },
  { value: "premium", label: "Premium (10 fotos - R$ 69,90)", preco: 69.9 },
];

export default function Galerias() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [galerias, setGalerias] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    titulo: "", cliente_id: "", tipo_ensaio: "", pacote: "",
    valor_total: "", preco_avulso: "",
  });

  useEffect(() => {
    if (user) { loadGalerias(); loadClientes(); }
  }, [user]);

  const loadGalerias = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("galerias")
      .select("*, clientes(nome), fotos(id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setGalerias(data || []);
  };

  const loadClientes = async () => {
    if (!user) return;
    const { data } = await supabase.from("clientes").select("id, nome").eq("user_id", user.id);
    setClientes(data || []);
  };

  const filtered = galerias.filter((g) => {
    const matchSearch = g.titulo.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    if (!user || !form.titulo.trim() || !form.cliente_id) {
      toast.error("Título e cliente são obrigatórios");
      return;
    }

    const linkPublico = crypto.randomUUID().slice(0, 8);
    const { error } = await supabase.from("galerias").insert({
      user_id: user.id,
      cliente_id: form.cliente_id,
      titulo: form.titulo,
      tipo_ensaio: form.tipo_ensaio || null,
      pacote: form.pacote || null,
      valor_total: parseFloat(form.valor_total) || 0,
      preco_avulso: form.preco_avulso ? parseFloat(form.preco_avulso) : null,
      link_publico: linkPublico,
    });

    if (error) { toast.error(error.message); return; }
    toast.success("Galeria criada!");
    setModalOpen(false);
    loadGalerias();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta galeria?")) return;
    const { error } = await supabase.from("galerias").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Galeria excluída!");
    loadGalerias();
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/galeria/${link}`);
    toast.success("Link copiado!");
  };

  const handlePacoteChange = (pacote: string) => {
    const p = PACOTES.find((x) => x.value === pacote);
    setForm({ ...form, pacote, valor_total: p ? p.preco.toFixed(2) : form.valor_total });
  };

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Galerias</h1>
        <Button onClick={() => { setForm({ titulo: "", cliente_id: "", tipo_ensaio: "", pacote: "", valor_total: "", preco_avulso: "" }); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Galeria
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-input border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-input border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="previa">Prévia</SelectItem>
            <SelectItem value="liberada">Liberada</SelectItem>
            <SelectItem value="finalizada">Finalizada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fotos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.titulo}</TableCell>
                    <TableCell>{g.clientes?.nome}</TableCell>
                    <TableCell>{g.fotos?.length || 0}</TableCell>
                    <TableCell><StatusBadge status={g.status} /></TableCell>
                    <TableCell>{formatCurrency(Number(g.valor_total))}</TableCell>
                    <TableCell>
                      {g.link_publico && (
                        <Button variant="ghost" size="sm" onClick={() => copyLink(g.link_publico)}>
                          <Copy className="h-3 w-3 mr-1" /> Copiar
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/galerias/${g.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/galerias/${g.id}`)}>
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma galeria encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Nova Galeria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título da galeria" className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de ensaio</Label>
              <Select value={form.tipo_ensaio} onValueChange={(v) => setForm({ ...form, tipo_ensaio: v })}>
                <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_ENSAIO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pacote</Label>
              <Select value={form.pacote} onValueChange={handlePacoteChange}>
                <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {PACOTES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor do pacote completo (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>Preço por foto avulsa (R$)</Label>
              <Input type="number" step="0.01" value={form.preco_avulso} onChange={(e) => setForm({ ...form, preco_avulso: e.target.value })} placeholder="Deixe vazio para desativar seleção avulsa" className="bg-input border-border" />
              <p className="text-xs text-muted-foreground">Se preenchido, o cliente poderá selecionar fotos individuais na galeria pública</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} className="w-full">Criar Galeria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
