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
import { Plus, Search, Eye, Upload, Trash2, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";


export default function Galerias() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [galerias, setGalerias] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [clienteFilter, setClienteFilter] = useState(searchParams.get("cliente") || "");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    titulo: "", cliente_id: "", valor_total: "", preco_avulso: "",
  });

  useEffect(() => {
    loadGalerias(); loadClientes();
  }, []);

  const loadGalerias = async () => {
    const { data } = await supabase
      .from("galerias")
      .select("*, clientes(nome), fotos(id)")
      .order("created_at", { ascending: false });
    setGalerias(data || []);
  };

  const loadClientes = async () => {
    const { data } = await supabase.from("clientes").select("id, nome");
    setClientes(data || []);
  };

  const filtered = galerias.filter((g) => {
    const matchSearch = g.titulo.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || g.status === statusFilter;
    const matchCliente = !clienteFilter || g.cliente_id === clienteFilter;
    return matchSearch && matchStatus && matchCliente;
  });

  const clienteFilterName = clienteFilter ? clientes.find(c => c.id === clienteFilter)?.nome : "";

  const clearClienteFilter = () => {
    setClienteFilter("");
    setSearchParams({});
  };

  const handleCreate = async () => {
    if (!form.titulo.trim() || !form.cliente_id) {
      toast.error("Título e cliente são obrigatórios");
      return;
    }

    const linkPublico = crypto.randomUUID().slice(0, 8);
    const { error } = await supabase.from("galerias").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      cliente_id: form.cliente_id,
      titulo: form.titulo,
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

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Galerias</h1>
        <Button onClick={() => { setForm({ titulo: "", cliente_id: "", valor_total: "", preco_avulso: "" }); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Galeria
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
        {clienteFilter && (
          <div className="flex items-center gap-1 bg-primary/20 text-primary text-sm px-3 py-1.5 rounded-full">
            <span>Cliente: {clienteFilterName || "..."}</span>
            <button onClick={clearClienteFilter} className="ml-1 hover:text-primary-foreground"><X className="h-3 w-3" /></button>
          </div>
        )}
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
