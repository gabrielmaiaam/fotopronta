import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingDown, TrendingUp, Percent, CreditCard, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";

const CATEGORIAS = [
  { value: "ferramenta_ia", label: "Ferramenta de IA" },
  { value: "marketing", label: "Marketing" },
  { value: "infraestrutura", label: "Infraestrutura" },
  { value: "outro", label: "Outro" },
];

const formatCurrency = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;

export default function Pagamentos() {
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("todos");

  // DRE filter
  const now = new Date();
  const [dreMonth, setDreMonth] = useState(now.getMonth());
  const [dreYear, setDreYear] = useState(now.getFullYear());

  // Despesa modal
  const [despesaModal, setDespesaModal] = useState(false);
  const [despesaForm, setDespesaForm] = useState({ nome: "", valor: "", categoria: "outro" });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [pg, dp] = await Promise.all([
      supabase.from("pagamentos").select("*, clientes(nome), pedidos(servico, origem_cliente)").order("created_at", { ascending: false }),
      supabase.from("despesas").select("*").order("created_at", { ascending: false }),
    ]);
    setPagamentos(pg.data || []);
    setDespesas(dp.data || []);
  };

  // Período corrente (mês atual) para os cards de topo
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  const receitaMes = pagamentos
    .filter(p => {
      const d = new Date(p.updated_at || p.created_at);
      return p.status === "pago" && d >= currentMonthStart && d <= currentMonthEnd;
    })
    .reduce((s, p) => s + Number(p.valor_pago), 0);

  const despesasMes = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const lucroLiquido = receitaMes - despesasMes;
  const margem = receitaMes > 0 ? (lucroLiquido / receitaMes) * 100 : 0;

  // DRE filtrado pelo seletor
  const dreStart = startOfMonth(new Date(dreYear, dreMonth, 1));
  const dreEnd = endOfMonth(new Date(dreYear, dreMonth, 1));
  const dreReceita = pagamentos
    .filter(p => {
      const d = new Date(p.updated_at || p.created_at);
      return p.status === "pago" && d >= dreStart && d <= dreEnd;
    });
  const dreReceitaTotal = dreReceita.reduce((s, p) => s + Number(p.valor_pago), 0);
  const dreReceitaAds = dreReceita.filter(p => p.pedidos?.origem_cliente === "meta_ads").reduce((s, p) => s + Number(p.valor_pago), 0);
  const dreReceitaOrganico = dreReceitaTotal - dreReceitaAds;
  const dreLucro = dreReceitaTotal - despesasMes;
  const dreMargem = dreReceitaTotal > 0 ? (dreLucro / dreReceitaTotal) * 100 : 0;

  const filtered = pagamentos.filter(p => statusFilter === "todos" || p.status === statusFilter);

  const handlePay = async (pag: any, etapa: "primeira" | "segunda") => {
    const metade = Number(pag.valor_total) / 2;
    const newPago = etapa === "primeira" ? metade : Number(pag.valor_total);
    const newStatus = etapa === "primeira" ? "parcial" : "pago";
    await supabase.from("pagamentos").update({ valor_pago: newPago, status: newStatus }).eq("id", pag.id);
    toast.success(etapa === "primeira" ? "1ª etapa registrada!" : "Pagamento completo!");
    loadAll();
  };

  const handleAddDespesa = async () => {
    if (!despesaForm.nome.trim() || !despesaForm.valor) {
      toast.error("Preencha nome e valor");
      return;
    }
    const { error } = await supabase.from("despesas").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      nome: despesaForm.nome,
      valor: Number(despesaForm.valor.replace(",", ".")),
      categoria: despesaForm.categoria,
      recorrente: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Despesa adicionada!");
    setDespesaModal(false);
    setDespesaForm({ nome: "", valor: "", categoria: "outro" });
    loadAll();
  };

  const handleUpdateDespesaValor = async (id: string, valor: string) => {
    const v = Number(valor.replace(",", "."));
    if (isNaN(v)) return;
    await supabase.from("despesas").update({ valor: v }).eq("id", id);
    loadAll();
  };

  const handleDeleteDespesa = async (id: string) => {
    await supabase.from("despesas").delete().eq("id", id);
    toast.success("Despesa removida");
    loadAll();
  };

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const anos = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Pagamentos & Financeiro</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><DollarSign className="h-4 w-4" /><span className="text-xs">💵 Receita do Mês</span></div>
          <p className="text-2xl font-bold">{formatCurrency(receitaMes)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive mb-1"><TrendingDown className="h-4 w-4" /><span className="text-xs">💸 Despesas do Mês</span></div>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(despesasMes)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className={`flex items-center gap-2 mb-1 ${lucroLiquido >= 0 ? "text-success" : "text-destructive"}`}>
            <TrendingUp className="h-4 w-4" /><span className="text-xs">💰 Lucro Líquido</span>
          </div>
          <p className={`text-2xl font-bold ${lucroLiquido >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(lucroLiquido)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Percent className="h-4 w-4" /><span className="text-xs">📊 Margem de Lucro</span></div>
          <p className={`text-2xl font-bold ${margem >= 0 ? "text-success" : "text-destructive"}`}>{margem.toFixed(1)}%</p>
        </CardContent></Card>
      </div>

      {/* Despesas */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Despesas do Mês</CardTitle>
          <Button size="sm" onClick={() => setDespesaModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Despesa
          </Button>
        </CardHeader>
        <CardContent>
          {despesas.length > 0 ? (
            <div className="space-y-2">
              {despesas.map(d => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-md border border-border bg-background/50">
                  <div className="flex-1">
                    <p className="font-medium">{d.nome}</p>
                    <Badge variant="outline" className="mt-1 text-xs">{CATEGORIAS.find(c => c.value === d.categoria)?.label || d.categoria}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <Input
                      type="text"
                      defaultValue={Number(d.valor).toFixed(2)}
                      onBlur={(e) => handleUpdateDespesaValor(d.id, e.target.value)}
                      className="w-24 h-8 bg-input border-border text-right"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteDespesa(d.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 mt-2 border-t border-border">
                <span className="font-medium text-sm">Total</span>
                <span className="font-bold text-destructive">{formatCurrency(despesasMes)}</span>
              </div>
              <p className="text-xs text-muted-foreground pt-2">↻ Despesas recorrentes — repetem todo mês automaticamente.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma despesa cadastrada</p>
          )}
        </CardContent>
      </Card>

      {/* DRE */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="font-display text-lg">DRE Simplificado</CardTitle>
            <div className="flex gap-2">
              <Select value={String(dreMonth)} onValueChange={(v) => setDreMonth(Number(v))}>
                <SelectTrigger className="w-[140px] bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{meses.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={String(dreYear)} onValueChange={(v) => setDreYear(Number(v))}>
                <SelectTrigger className="w-[100px] bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Item</TableHead><TableHead className="text-right">Valor</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell>Receita Bruta</TableCell><TableCell className="text-right font-medium">{formatCurrency(dreReceitaTotal)}</TableCell></TableRow>
              <TableRow><TableCell>Despesas do Mês</TableCell><TableCell className="text-right font-medium text-destructive">− {formatCurrency(despesasMes)}</TableCell></TableRow>
              <TableRow><TableCell className="font-bold">Lucro Líquido</TableCell><TableCell className={`text-right font-bold ${dreLucro >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(dreLucro)}</TableCell></TableRow>
              <TableRow><TableCell className="font-bold">Margem de Lucro</TableCell><TableCell className={`text-right font-bold ${dreMargem >= 0 ? "text-success" : "text-destructive"}`}>{dreMargem.toFixed(1)}%</TableCell></TableRow>
            </TableBody>
          </Table>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-md border border-border bg-background/50">
              <p className="text-xs text-muted-foreground">📢 Veio de Anúncios</p>
              <p className="text-lg font-bold">{formatCurrency(dreReceitaAds)}</p>
            </div>
            <div className="p-3 rounded-md border border-border bg-background/50">
              <p className="text-xs text-muted-foreground">🌱 Veio Orgânico</p>
              <p className="text-lg font-bold">{formatCurrency(dreReceitaOrganico)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de pagamentos */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold">Histórico de Pagamentos</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-input border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.id} className="border-border bg-card">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{p.clientes?.nome}</p>
                  <p className="text-sm text-muted-foreground">{p.pedidos?.servico || "—"}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), "dd/MM/yyyy")}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(Number(p.valor_total))}</p>
                    <p className="text-xs text-muted-foreground">Pago: {formatCurrency(Number(p.valor_pago))}</p>
                  </div>
                  <StatusBadge status={p.status} />
                  {p.status === "pendente" && (
                    <Button size="sm" onClick={() => handlePay(p, "primeira")}>50% Inicial</Button>
                  )}
                  {p.status === "parcial" && (
                    <Button size="sm" onClick={() => handlePay(p, "segunda")}>50% Final</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum pagamento</p>
          </CardContent>
        </Card>
      )}

      {/* Modal Nova Despesa */}
      <Dialog open={despesaModal} onOpenChange={setDespesaModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle className="font-display">Nova Despesa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da despesa</Label>
              <Input
                value={despesaForm.nome}
                onChange={(e) => setDespesaForm({ ...despesaForm, nome: e.target.value })}
                placeholder="Ex: Midjourney, Canva Pro, Internet, Lovable..."
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                value={despesaForm.valor}
                onChange={(e) => setDespesaForm({ ...despesaForm, valor: e.target.value })}
                placeholder="0,00"
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={despesaForm.categoria} onValueChange={(v) => setDespesaForm({ ...despesaForm, categoria: v })}>
                <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">↻ Esta despesa será considerada todo mês automaticamente.</p>
          </div>
          <DialogFooter>
            <Button onClick={handleAddDespesa} className="w-full">Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
