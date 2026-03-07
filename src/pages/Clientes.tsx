import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Image, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function Clientes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nome: "", whatsapp: "", email: "" });

  useEffect(() => {
    if (user) loadClientes();
  }, [user]);

  const loadClientes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("clientes")
      .select("*, galerias(id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setClientes(data || []);
  };

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditing(null);
    setForm({ nome: "", whatsapp: "", email: "" });
    setModalOpen(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ nome: c.nome, whatsapp: c.whatsapp || "", email: c.email || "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (editing) {
      const { error } = await supabase
        .from("clientes")
        .update({ nome: form.nome, whatsapp: form.whatsapp || null, email: form.email || null })
        .eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Cliente atualizado!");
    } else {
      const { error } = await supabase
        .from("clientes")
        .insert({ user_id: user.id, nome: form.nome, whatsapp: form.whatsapp || null, email: form.email || null });
      if (error) { toast.error(error.message); return; }
      toast.success("Cliente criado!");
    }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Clientes</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Cliente
        </Button>
      </div>

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
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
