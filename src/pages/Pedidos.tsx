import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Calendar as CalIcon, List, CheckCircle, Link2, Clock, TrendingUp, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInMinutes, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";


export default function Pedidos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [form, setForm] = useState({
    cliente_id: "", servico: "", data_entrega: "",
  });

  useEffect(() => {
    if (user) { loadPedidos(); loadClientes(); }
  }, [user]);

  const loadPedidos = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pedidos")
      .select("*, clientes(nome)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPedidos(data || []);
  };

  const loadClientes = async () => {
    if (!user) return;
    const { data } = await supabase.from("clientes").select("id, nome").eq("user_id", user.id);
    setClientes(data || []);
  };

  const handleCreate = async () => {
    if (!user || !form.cliente_id || !form.servico.trim()) {
      toast.error("Cliente e serviço são obrigatórios");
      return;
    }

    const linkComprovante = crypto.randomUUID().slice(0, 8);
    const { error } = await supabase.from("pedidos").insert({
      user_id: user.id,
      cliente_id: form.cliente_id,
      servico: form.servico,
      data_entrega: form.data_entrega ? new Date(form.data_entrega).toISOString() : null,
      tempo_estimado_minutos: parseInt(form.tempo_estimado) || 120,
      link_comprovante: linkComprovante,
    });

    if (error) { toast.error(error.message); return; }
    toast.success("Pedido criado!");
    setModalOpen(false);
    loadPedidos();
  };

  const markComplete = async (id: string) => {
    await supabase.from("pedidos").update({ status: "finalizado" }).eq("id", id);
    toast.success("Pedido finalizado!");
    loadPedidos();
  };

  const copyComprovante = (link: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/comprovante/${link}`);
    toast.success("Link copiado!");
  };

  const todayCount = pedidos.filter(p => isSameDay(new Date(p.created_at), new Date())).length;
  const emAndamento = pedidos.filter(p => p.status === "em_andamento").length;
  const proximaEntrega = pedidos
    .filter(p => p.data_entrega && new Date(p.data_entrega) > new Date() && p.status !== "finalizado")
    .sort((a, b) => new Date(a.data_entrega).getTime() - new Date(b.data_entrega).getTime())[0];

  const getProgress = (p: any) => {
    if (p.status === "finalizado") return 100;
    if (p.status === "aguardando") return 0;
    if (!p.data_entrega) return 50;
    const total = p.tempo_estimado_minutos;
    const elapsed = differenceInMinutes(new Date(), new Date(p.created_at));
    return Math.min(Math.round((elapsed / total) * 100), 99);
  };

  const getElapsed = (p: any) => {
    const mins = differenceInMinutes(new Date(), new Date(p.created_at));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}min`;
  };

  // Calendar helpers
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();

  const statusColor: Record<string, string> = {
    aguardando: "bg-muted-foreground",
    em_andamento: "bg-info",
    finalizado: "bg-success",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus pedidos e acompanhe o progresso</p>
        </div>
        <Button onClick={() => { setForm({ cliente_id: "", servico: "", data_entrega: "", tempo_estimado: "120" }); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Pedido
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><CalendarDays className="h-4 w-4" /><span className="text-xs">Pedidos Hoje</span></div>
          <p className="text-2xl font-bold">{todayCount}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-info mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs">Em Andamento</span></div>
          <p className="text-2xl font-bold text-info">{emAndamento}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="text-xs">Próxima Entrega</span></div>
          <p className="text-sm font-bold">{proximaEntrega ? format(new Date(proximaEntrega.data_entrega), "dd/MM HH:mm") : "—"}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="text-xs">Tempo Médio</span></div>
          <p className="text-sm font-bold">120 min</p>
        </CardContent></Card>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}><List className="h-4 w-4 mr-1" /> Lista</Button>
        <Button variant={view === "calendar" ? "default" : "outline"} size="sm" onClick={() => setView("calendar")}><CalIcon className="h-4 w-4 mr-1" /> Calendário</Button>
      </div>

      {view === "list" ? (
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.length > 0 ? pedidos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.clientes?.nome}</TableCell>
                      <TableCell>{p.servico}</TableCell>
                      <TableCell>{p.data_entrega ? format(new Date(p.data_entrega), "dd/MM/yyyy HH:mm") : "—"}</TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Progress value={getProgress(p)} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground">{getProgress(p)}%</span>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell><span className="text-xs text-info font-mono">{getElapsed(p)}</span></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {p.status !== "finalizado" && (
                            <Button variant="ghost" size="icon" onClick={() => markComplete(p.id)} title="Finalizar">
                              <CheckCircle className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          {p.link_comprovante && (
                            <Button variant="ghost" size="icon" onClick={() => copyComprovante(p.link_comprovante)} title="Copiar link">
                              <Link2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum pedido</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>←</Button>
            <CardTitle className="font-display text-lg">{format(calendarMonth, "MMMM yyyy", { locale: ptBR })}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>→</Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} />)}
              {days.map((day) => {
                const dayPedidos = pedidos.filter(p => p.data_entrega && isSameDay(new Date(p.data_entrega), day));
                return (
                  <div key={day.toISOString()} className="min-h-[60px] p-1 border border-border rounded text-xs">
                    <span className={isSameDay(day, new Date()) ? "text-primary font-bold" : "text-muted-foreground"}>
                      {format(day, "d")}
                    </span>
                    {dayPedidos.map(p => (
                      <div key={p.id} className={`mt-1 px-1 rounded text-[10px] truncate text-foreground ${statusColor[p.status] || "bg-muted"}`}>
                        {p.servico}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted-foreground" /> Aguardando</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-info" /> Em andamento</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success" /> Finalizado</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Criar Pedido</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serviço</Label>
              <Input value={form.servico} onChange={(e) => setForm({ ...form, servico: e.target.value })} placeholder="Ex: Ensaio Aniversário, Ensaio Infantil..." className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>Data e hora de entrega</Label>
              <Input type="datetime-local" value={form.data_entrega} onChange={(e) => setForm({ ...form, data_entrega: e.target.value })} className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>Tempo estimado (minutos)</Label>
              <Input type="number" value={form.tempo_estimado} onChange={(e) => setForm({ ...form, tempo_estimado: e.target.value })} className="bg-input border-border" />
            </div>
            <p className="text-xs text-muted-foreground">◆ Ao criar: comprovante gerado automaticamente com link para o cliente acompanhar</p>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} className="w-full">Criar Pedido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
