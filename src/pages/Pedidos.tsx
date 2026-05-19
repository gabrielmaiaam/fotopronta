import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Calendar as CalIcon, List, Play, Pencil, Trash2, Link2, Clock, TrendingUp, CalendarDays, SlidersHorizontal, CheckCircle2, Eye } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, differenceInMinutes, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateTimePicker } from "@/components/DateTimePicker";
import { PagamentoSection } from "@/components/PagamentoSection";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const fmtBRL = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;

export default function Pedidos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editOriginalPagStatus, setEditOriginalPagStatus] = useState<"pago" | "pendente">("pendente");
  const [editConfirm, setEditConfirm] = useState<null | "to_pago" | "to_pendente">(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPedido, setDetailPedido] = useState<any>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [form, setForm] = useState<any>({ cliente_id: "", servico: "", data_entrega: "", origem_cliente: "", pacote: "", valor: "", pagamento_status: "pendente", data_cadastro: "" });
  const [togglePed, setTogglePed] = useState<any>(null);
  const [ordenacao, setOrdenacao] = useState<"mais_novo" | "mais_antigo">("mais_novo");
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadPedidos(); loadClientes(); loadPacotes();
  }, []);

  const loadPedidos = async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("*, clientes(nome), pagamentos(id, status, modo_pagamento, valor_total, valor_pago)")
      .order("created_at", { ascending: false });
    setPedidos(data || []);
  };

  const loadClientes = async () => {
    const { data } = await supabase.from("clientes").select("id, nome");
    setClientes(data || []);
  };

  const loadPacotes = async () => {
    const { data } = await supabase.from("pacotes" as any).select("*").order("ordem");
    setPacotes((data as any[]) || []);
  };

  const onPacoteChange = (v: string, target: "form" | "edit") => {
    let pacote = "";
    let valor: string | undefined;
    if (v === "__none__") { pacote = ""; valor = ""; }
    else if (v === "__outro__") { pacote = "Outro"; valor = ""; }
    else {
      pacote = v;
      const p = pacotes.find((pp) => pp.nome === v);
      valor = p ? Number(p.preco).toFixed(2) : "";
    }
    if (target === "form") setForm({ ...form, pacote, valor });
    else setEditForm({ ...editForm, pacote, valor });
  };

  const upsertPagamento = async (pedido: any, status: "pago" | "pendente", valorTotal: number) => {
    const now = new Date().toISOString();
    const existing = pedido.pagamentos?.[0];
    const payload: any = {
      user_id: pedido.user_id,
      cliente_id: pedido.cliente_id,
      pedido_id: pedido.id,
      valor_total: valorTotal,
      modo_pagamento: "total_antecipado",
      percentual_entrada: 100,
      origem: "manual",
      status,
      valor_pago: status === "pago" ? valorTotal : 0,
      entrada_paga_em: status === "pago" ? now : null,
      saldo_pago_em: status === "pago" ? now : null,
    };
    if (existing?.id) {
      const { error } = await supabase.from("pagamentos").update(payload).eq("id", existing.id);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.from("pagamentos").insert(payload);
      if (error) toast.error(error.message);
    }
  };

  const handleCreate = async () => {
    if (!form.cliente_id || !form.servico.trim()) { toast.error("Cliente e serviço são obrigatórios"); return; }
    if (!form.origem_cliente) { toast.error("Selecione a origem do cliente"); return; }
    if (!user) { toast.error("Sessão expirada"); return; }
    const linkComprovante = crypto.randomUUID().slice(0, 8);
    const tempoEstimado = form.data_entrega
      ? Math.max(differenceInMinutes(new Date(form.data_entrega), new Date()), 1)
      : 120;
    const valorNum = Number(String(form.valor).replace(",", ".")) || 0;
    const { data: inserted, error } = await supabase.from("pedidos").insert({
      user_id: user.id,
      cliente_id: form.cliente_id,
      servico: form.servico,
      pacote: form.pacote || null,
      valor: valorNum > 0 ? valorNum : null,
      data_entrega: form.data_entrega ? new Date(form.data_entrega).toISOString() : null,
      tempo_estimado_minutos: tempoEstimado,
      link_comprovante: linkComprovante,
      origem_cliente: form.origem_cliente,
      ...(form.data_cadastro ? { created_at: new Date(`${form.data_cadastro}T12:00:00`).toISOString() } : {}),
    } as any).select().single();
    if (error || !inserted) { toast.error(error?.message || "Erro"); return; }
    await upsertPagamento({ ...inserted, pagamentos: [] }, form.pagamento_status, valorNum);
    toast.success("Pedido criado!");
    setModalOpen(false);
    loadPedidos();
  };

  const handleStart = async (id: string) => {
    await supabase.from("pedidos").update({ status: "em_andamento" }).eq("id", id);
    toast.success("Pedido iniciado!");
    loadPedidos();
  };

  const handleEdit = (p: any) => {
    const pag = p.pagamentos?.[0];
    const status: "pago" | "pendente" = pag?.status === "pago" ? "pago" : "pendente";
    setEditOriginalPagStatus(status);
    const valor = p.valor != null
      ? Number(p.valor).toFixed(2)
      : (pag?.valor_total
          ? Number(pag.valor_total).toFixed(2)
          : (pacotes.find(pp => pp.nome === p.pacote)?.preco
              ? Number(pacotes.find(pp => pp.nome === p.pacote)!.preco).toFixed(2)
              : ""));
    setEditForm({
      id: p.id,
      user_id: p.user_id,
      cliente_id: p.cliente_id,
      servico: p.servico,
      pacote: p.pacote || "",
      valor,
      data_entrega: p.data_entrega ? format(new Date(p.data_entrega), "yyyy-MM-dd'T'HH:mm") : "",
      origem_cliente: p.origem_cliente || "",
      pagamento_status: status,
      pagamentos: p.pagamentos || [],
      clientes: p.clientes,
    });
    setEditModalOpen(true);
  };

  const persistEdit = async () => {
    const tempoEstimado = editForm.data_entrega
      ? Math.max(differenceInMinutes(new Date(editForm.data_entrega), new Date()), 1)
      : 120;
    const valorNum = Number(String(editForm.valor).replace(",", ".")) || 0;
    const { error } = await supabase.from("pedidos").update({
      cliente_id: editForm.cliente_id,
      servico: editForm.servico,
      pacote: editForm.pacote || null,
      valor: valorNum > 0 ? valorNum : null,
      data_entrega: editForm.data_entrega ? new Date(editForm.data_entrega).toISOString() : null,
      tempo_estimado_minutos: tempoEstimado,
      origem_cliente: editForm.origem_cliente,
    } as any).eq("id", editForm.id);
    if (error) { toast.error(error.message); return; }
    await upsertPagamento(
      { id: editForm.id, user_id: editForm.user_id, cliente_id: editForm.cliente_id, pagamentos: editForm.pagamentos },
      editForm.pagamento_status,
      valorNum,
    );
    toast.success("Pedido atualizado!");
    setEditModalOpen(false);
    loadPedidos();
  };

  const handleEditSave = async () => {
    if (!editForm) return;
    if (!editForm.origem_cliente) { toast.error("Selecione a origem do cliente"); return; }
    if (editForm.pagamento_status !== editOriginalPagStatus) {
      setEditConfirm(editForm.pagamento_status === "pago" ? "to_pago" : "to_pendente");
      return;
    }
    await persistEdit();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("pedidos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pedido excluído!");
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

  const confirmToggle = async () => {
    if (!togglePed) return;
    const pag = togglePed.pagamentos?.[0];
    const isPaid = pag?.status === "pago";
    const valorTotal = pag?.valor_total
      ? Number(pag.valor_total)
      : Number(pacotes.find(pp => pp.nome === togglePed.pacote)?.preco || 0);
    await upsertPagamento(togglePed, isPaid ? "pendente" : "pago", valorTotal);
    toast.success(isPaid ? "Recebimento cancelado" : "Pagamento confirmado");
    setTogglePed(null);
    loadPedidos();
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

  const getCronometro = (p: any) => {
    if (p.status !== "em_andamento") return "—";
    const mins = differenceInMinutes(new Date(), new Date(p.updated_at));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}min`;
  };

  const formatProximaEntrega = () => {
    if (!proximaEntrega) return "—";
    const d = new Date(proximaEntrega.data_entrega);
    if (isSameDay(d, new Date())) return `Hoje ${format(d, "HH:mm")}`;
    return format(d, "dd/MM HH:mm");
  };

  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();

  const statusColor: Record<string, string> = {
    aguardando: "bg-muted-foreground",
    em_andamento: "bg-info",
    finalizado: "bg-success",
  };

  const PagToggle = ({ value, onChange }: { value: "pago" | "pendente"; onChange: (v: "pago" | "pendente") => void }) => (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange("pendente")}
        className={cn(
          "px-3 py-2 rounded-md border text-sm font-medium transition-colors",
          value === "pendente"
            ? "bg-destructive/20 text-destructive border-destructive/40"
            : "bg-input border-border text-muted-foreground hover:bg-muted/40",
        )}
      >🔴 Pendente</button>
      <button
        type="button"
        onClick={() => onChange("pago")}
        className={cn(
          "px-3 py-2 rounded-md border text-sm font-medium transition-colors",
          value === "pago"
            ? "bg-success/20 text-success border-success/40"
            : "bg-input border-border text-muted-foreground hover:bg-muted/40",
        )}
      >🟢 Pago</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus pedidos e acompanhe o progresso</p>
        </div>
        <Button onClick={() => { setForm({ cliente_id: "", servico: "", data_entrega: "", origem_cliente: "", pacote: "", valor: "", pagamento_status: "pendente", data_cadastro: "" }); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Pedido
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Pedidos Hoje</p>
              <p className="text-2xl font-bold">{todayCount}</p>
            </div>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Em Andamento</p>
              <p className="text-2xl font-bold">{emAndamento}</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Próxima Entrega</p>
              <p className="text-lg font-bold">{formatProximaEntrega()}</p>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Tempo Médio</p>
              <p className="text-lg font-bold">—</p>
            </div>
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}><List className="h-4 w-4 mr-1" /> Lista</Button>
        <Button variant={view === "calendar" ? "default" : "outline"} size="sm" onClick={() => setView("calendar")}><CalIcon className="h-4 w-4 mr-1" /> Calendário</Button>
        <div className="flex gap-2 ml-auto">
          <Button variant={ordenacao === "mais_novo" ? "default" : "outline"} size="sm" onClick={() => setOrdenacao("mais_novo")}>Mais novo</Button>
          <Button variant={ordenacao === "mais_antigo" ? "default" : "outline"} size="sm" onClick={() => setOrdenacao("mais_antigo")}>Mais antigo</Button>
        </div>
      </div>

      {view === "list" ? (
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Cronômetro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.length > 0 ? [...pedidos].sort((a, b) => {
                    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    if (diff !== 0) return ordenacao === "mais_novo" ? -diff : diff;
                    return ordenacao === "mais_novo"
                      ? b.id.localeCompare(a.id)
                      : a.id.localeCompare(b.id);
                  }).map((p) => {
                    const pago = p.pagamentos?.[0]?.status === "pago";
                    return (
                    <TableRow key={p.id}>
                      <TableCell>{p.clientes?.nome}</TableCell>
                      <TableCell>{format(new Date(p.created_at), "dd/MM/yy")}</TableCell>
                      <TableCell>{p.servico}</TableCell>
                      <TableCell>{p.valor ? `R$ ${Number(p.valor).toFixed(2).replace(".", ",")}` : "—"}</TableCell>
                      <TableCell>{p.data_entrega ? format(new Date(p.data_entrega), "dd/MM/yy HH:mm") : "—"}</TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Progress value={getProgress(p)} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground">{getProgress(p)}%</span>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell>
                        <button onClick={() => setTogglePed(p)} title="Alternar status">
                          {pago ? (
                            <Badge className="bg-success/20 text-success border-success/30 border cursor-pointer hover:bg-success/30">🟢 Pago</Badge>
                          ) : (
                            <Badge className="bg-destructive/20 text-destructive border-destructive/30 border cursor-pointer hover:bg-destructive/30">🔴 Pendente</Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">{getCronometro(p)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setDetailPedido(p); setDetailOpen(true); }} title="Detalhes">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {p.status === "aguardando" && (
                            <Button variant="ghost" size="icon" onClick={() => handleStart(p.id)} title="Iniciar">
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {p.status === "em_andamento" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Finalizar">
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Finalizar pedido</AlertDialogTitle>
                                  <AlertDialogDescription>Deseja marcar este pedido como finalizado?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => markComplete(p.id)}>Finalizar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          {p.link_comprovante && (
                            <Button variant="ghost" size="icon" onClick={() => copyComprovante(p.link_comprovante)} title="Copiar link">
                              <Link2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}) : (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum pedido</TableCell></TableRow>
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
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
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
              <Label>Pacote</Label>
              <Select
                value={form.pacote === "Outro" ? "__outro__" : (form.pacote || "__none__")}
                onValueChange={(v) => onPacoteChange(v, "form")}
              >
                <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem pacote</SelectItem>
                  {pacotes.map((p) => (
                    <SelectItem key={p.id} value={p.nome}>
                      {p.icone} {p.nome} — {fmtBRL(Number(p.preco))}
                    </SelectItem>
                  ))}
                  <SelectItem value="__outro__">✏️ Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor do pedido (R$)</Label>
              <Input
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="0,00"
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Serviço</Label>
              <Input value={form.servico} onChange={(e) => setForm({ ...form, servico: e.target.value })} placeholder="Ex: Ensaio Aniversário, Ensaio Infantil..." className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>Data e hora de entrega</Label>
              <DateTimePicker value={form.data_entrega} onChange={(v) => setForm({ ...form, data_entrega: v })} />
            </div>
            <div className="space-y-2">
              <Label>Origem do cliente *</Label>
              <Select value={form.origem_cliente} onValueChange={(v) => setForm({ ...form, origem_cliente: v })}>
                <SelectTrigger className="bg-input border-border"><SelectValue placeholder="De onde veio o cliente?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta_ads">📢 Meta Ads</SelectItem>
                  <SelectItem value="indicacao">👥 Indicação</SelectItem>
                  <SelectItem value="instagram_organico">📱 Instagram Orgânico</SelectItem>
                  <SelectItem value="whatsapp_direto">💬 WhatsApp Direto</SelectItem>
                  <SelectItem value="outro">🔗 Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pagamento</Label>
              <PagToggle value={form.pagamento_status} onChange={(v) => setForm({ ...form, pagamento_status: v })} />
            </div>
            <div className="space-y-2">
              <Label>Data do pedido</Label>
              <Input
                type="date"
                value={form.data_cadastro}
                onChange={(e) => setForm({ ...form, data_cadastro: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <p className="text-xs text-muted-foreground">⏱ O tempo estimado será calculado automaticamente ao iniciar o pedido.</p>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} className="w-full">Criar Pedido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Editar Pedido</DialogTitle></DialogHeader>
          {editForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={editForm.cliente_id} onValueChange={(v) => setEditForm({ ...editForm, cliente_id: v })}>
                  <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pacote</Label>
                <Select
                  value={editForm.pacote === "Outro" ? "__outro__" : (editForm.pacote || "__none__")}
                  onValueChange={(v) => onPacoteChange(v, "edit")}
                >
                  <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem pacote</SelectItem>
                    {pacotes.map((p) => (
                      <SelectItem key={p.id} value={p.nome}>
                        {p.icone} {p.nome} — {fmtBRL(Number(p.preco))}
                      </SelectItem>
                    ))}
                    <SelectItem value="__outro__">✏️ Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor do pedido (R$)</Label>
                <Input
                  value={editForm.valor}
                  onChange={(e) => setEditForm({ ...editForm, valor: e.target.value })}
                  placeholder="0,00"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Input value={editForm.servico} onChange={(e) => setEditForm({ ...editForm, servico: e.target.value })} className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label>Data e hora de entrega</Label>
                <DateTimePicker value={editForm.data_entrega} onChange={(v) => setEditForm({ ...editForm, data_entrega: v })} />
              </div>
              <div className="space-y-2">
                <Label>Origem do cliente *</Label>
                <Select value={editForm.origem_cliente} onValueChange={(v) => setEditForm({ ...editForm, origem_cliente: v })}>
                  <SelectTrigger className="bg-input border-border"><SelectValue placeholder="De onde veio o cliente?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meta_ads">📢 Meta Ads</SelectItem>
                    <SelectItem value="indicacao">👥 Indicação</SelectItem>
                    <SelectItem value="instagram_organico">📱 Instagram Orgânico</SelectItem>
                    <SelectItem value="whatsapp_direto">💬 WhatsApp Direto</SelectItem>
                    <SelectItem value="outro">🔗 Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pagamento</Label>
                <PagToggle value={editForm.pagamento_status} onChange={(v) => setEditForm({ ...editForm, pagamento_status: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleEditSave} className="w-full">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit pagamento confirmation */}
      <AlertDialog open={editConfirm !== null} onOpenChange={(o) => !o && setEditConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editConfirm === "to_pago" ? "Confirmar recebimento" : "Cancelar recebimento"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editConfirm === "to_pago"
                ? `Confirmar recebimento de ${fmtBRL(Number(String(editForm?.valor || 0).replace(",", ".")))} referente ao pedido de ${editForm?.clientes?.nome || "cliente"}?`
                : "Deseja cancelar o recebimento deste pagamento? O valor será removido do Financeiro."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { setEditConfirm(null); await persistEdit(); }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick toggle from list */}
      <AlertDialog open={togglePed !== null} onOpenChange={(o) => !o && setTogglePed(null)}>
        <AlertDialogContent>
          {togglePed && (() => {
            const pag = togglePed.pagamentos?.[0];
            const isPaid = pag?.status === "pago";
            const valor = pag?.valor_total
              ? Number(pag.valor_total)
              : Number(pacotes.find(pp => pp.nome === togglePed.pacote)?.preco || 0);
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>{isPaid ? "Cancelar recebimento" : "Confirmar recebimento"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isPaid
                      ? "Deseja cancelar o recebimento deste pagamento? O valor será removido do Financeiro."
                      : `Confirmar recebimento de ${fmtBRL(valor)} referente ao pedido de ${togglePed.clientes?.nome || "cliente"}?`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmToggle}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Detalhes do Pedido</DialogTitle></DialogHeader>
          {detailPedido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Cliente</p><p className="font-medium">{detailPedido.clientes?.nome}</p></div>
                <div><p className="text-xs text-muted-foreground">Serviço</p><p className="font-medium">{detailPedido.servico}</p></div>
                {detailPedido.pacote && <div><p className="text-xs text-muted-foreground">Pacote</p><p className="font-medium">{detailPedido.pacote}</p></div>}
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={detailPedido.status} /></div>
                {detailPedido.data_entrega && <div className="col-span-2"><p className="text-xs text-muted-foreground">Entrega</p><p className="font-medium">{format(new Date(detailPedido.data_entrega), "dd/MM/yyyy HH:mm")}</p></div>}
              </div>
              <PagamentoSection
                pedido={detailPedido}
                defaultValor={Number(detailPedido.pagamentos?.[0]?.valor_total || pacotes.find(pp => pp.nome === detailPedido.pacote)?.preco || 0)}
                onChanged={loadPedidos}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
