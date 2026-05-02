import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DollarSign, TrendingDown, Wallet, TrendingUp, CreditCard, Plus, Trash2, Target } from "lucide-react";
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
  const { user } = useAuth();
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [metaInvestimentos, setMetaInvestimentos] = useState<any[]>([]);
  const [retiradas, setRetiradas] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [taxaMetaAds, setTaxaMetaAds] = useState(14);
  const [statusFilter, setStatusFilter] = useState("todos");

  // Distribuição & meta (formulário)
  const [pctProLabore, setPctProLabore] = useState(50);
  const [pctReinvest, setPctReinvest] = useState(30);
  const [pctReserva, setPctReserva] = useState(20);
  const [metaMensal, setMetaMensal] = useState("0");

  // DRE filter
  const now = new Date();
  const [dreMonth, setDreMonth] = useState(now.getMonth());
  const [dreYear, setDreYear] = useState(now.getFullYear());

  // Modais
  const [despesaModal, setDespesaModal] = useState(false);
  const [despesaForm, setDespesaForm] = useState({ nome: "", valor: "", categoria: "outro" });
  const [retiradaModal, setRetiradaModal] = useState(false);
  const [retiradaForm, setRetiradaForm] = useState({
    data: format(new Date(), "yyyy-MM-dd"),
    valor: "",
    descricao: "",
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [pg, dp, mi, rt, pf] = await Promise.all([
      supabase.from("pagamentos").select("*, clientes(nome), pedidos(servico, origem_cliente)").order("created_at", { ascending: false }),
      supabase.from("despesas").select("*").order("created_at", { ascending: false }),
      supabase.from("meta_ads_investimentos").select("*"),
      supabase.from("retiradas").select("*").order("data", { ascending: false }),
      supabase.from("profiles").select("*").limit(1).single(),
    ]);
    setPagamentos(pg.data || []);
    setDespesas(dp.data || []);
    setMetaInvestimentos(mi.data || []);
    setRetiradas(rt.data || []);
    if (pf.data) {
      setProfile(pf.data);
      setTaxaMetaAds(Number(pf.data.meta_ads_taxa_imposto ?? 14));
      setPctProLabore(Number(pf.data.distribuicao_pro_labore ?? 50));
      setPctReinvest(Number(pf.data.distribuicao_reinvest ?? 30));
      setPctReserva(Number(pf.data.distribuicao_reserva ?? 20));
      setMetaMensal(String(pf.data.meta_faturamento_mensal ?? 0));
    }
  };

  const calcMetaAdsTotal = (start: Date, end: Date) => {
    const investido = metaInvestimentos
      .filter(i => { const d = new Date(i.data + "T00:00:00"); return d >= start && d <= end; })
      .reduce((s, i) => s + Number(i.valor_investido), 0);
    const imposto = investido * (taxaMetaAds / 100);
    return { investido, imposto, total: investido + imposto };
  };

  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  const receitaMes = pagamentos
    .filter(p => {
      const d = new Date(p.updated_at || p.created_at);
      return p.status === "pago" && d >= currentMonthStart && d <= currentMonthEnd;
    })
    .reduce((s, p) => s + Number(p.valor_pago), 0);

  const despesasFixas = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const metaAdsMesAtual = calcMetaAdsTotal(currentMonthStart, currentMonthEnd);
  const despesasMes = despesasFixas + metaAdsMesAtual.total;

  const retiradasMes = retiradas
    .filter(r => { const d = new Date(r.data + "T00:00:00"); return d >= currentMonthStart && d <= currentMonthEnd; });
  const totalRetiradasMes = retiradasMes.reduce((s, r) => s + Number(r.valor), 0);

  const lucroLiquido = receitaMes - despesasMes;
  const saldoEmpresa = lucroLiquido - totalRetiradasMes;
  const margem = receitaMes > 0 ? (lucroLiquido / receitaMes) * 100 : 0;

  // DRE filtrado
  const dreStart = startOfMonth(new Date(dreYear, dreMonth, 1));
  const dreEnd = endOfMonth(new Date(dreYear, dreMonth, 1));
  const dreReceita = pagamentos.filter(p => {
    const d = new Date(p.updated_at || p.created_at);
    return p.status === "pago" && d >= dreStart && d <= dreEnd;
  });
  const dreReceitaTotal = dreReceita.reduce((s, p) => s + Number(p.valor_pago), 0);
  const dreReceitaAds = dreReceita.filter(p => p.pedidos?.origem_cliente === "meta_ads").reduce((s, p) => s + Number(p.valor_pago), 0);
  const dreReceitaOrganico = dreReceitaTotal - dreReceitaAds;
  const dreMetaAds = calcMetaAdsTotal(dreStart, dreEnd);
  const dreDespesas = despesasFixas + dreMetaAds.total;
  const dreLucro = dreReceitaTotal - dreDespesas;
  const dreRetiradas = retiradas
    .filter(r => { const d = new Date(r.data + "T00:00:00"); return d >= dreStart && d <= dreEnd; })
    .reduce((s, r) => s + Number(r.valor), 0);
  const dreSaldo = dreLucro - dreRetiradas;
  const dreMargem = dreReceitaTotal > 0 ? (dreLucro / dreReceitaTotal) * 100 : 0;

  const filtered = pagamentos.filter(p => statusFilter === "todos" || p.status === statusFilter);

  // Distribuição
  const somaPct = pctProLabore + pctReinvest + pctReserva;
  const distOk = somaPct === 100;
  const distLucroBase = Math.max(lucroLiquido, 0);

  // Meta
  const metaValor = Number(metaMensal.replace(",", ".")) || 0;
  const metaProgresso = metaValor > 0 ? Math.min((receitaMes / metaValor) * 100, 100) : 0;

  const handlePay = async (pag: any, etapa: "primeira" | "segunda") => {
    const metade = Number(pag.valor_total) / 2;
    const newPago = etapa === "primeira" ? metade : Number(pag.valor_total);
    const newStatus = etapa === "primeira" ? "parcial" : "pago";
    await supabase.from("pagamentos").update({ valor_pago: newPago, status: newStatus }).eq("id", pag.id);
    toast.success(etapa === "primeira" ? "1ª etapa registrada!" : "Pagamento completo!");
    loadAll();
  };

  const handleAddDespesa = async () => {
    if (!despesaForm.nome.trim() || !despesaForm.valor) { toast.error("Preencha nome e valor"); return; }
    if (!user) { toast.error("Sessão expirada"); return; }
    const { error } = await supabase.from("despesas").insert({
      user_id: user.id,
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

  const handleAddRetirada = async () => {
    if (!retiradaForm.valor) { toast.error("Informe o valor"); return; }
    if (!user) { toast.error("Sessão expirada"); return; }
    const { error } = await supabase.from("retiradas").insert({
      user_id: user.id,
      data: retiradaForm.data,
      valor: Number(retiradaForm.valor.replace(",", ".")),
      descricao: retiradaForm.descricao || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Retirada registrada!");
    setRetiradaModal(false);
    setRetiradaForm({ data: format(new Date(), "yyyy-MM-dd"), valor: "", descricao: "" });
    loadAll();
  };

  const handleDeleteRetirada = async (id: string) => {
    await supabase.from("retiradas").delete().eq("id", id);
    toast.success("Retirada removida");
    loadAll();
  };

  const handleSaveDistribuicao = async () => {
    if (!profile) return;
    if (!distOk) { toast.error("Os percentuais devem somar 100%"); return; }
    const { error } = await supabase.from("profiles").update({
      distribuicao_pro_labore: pctProLabore,
      distribuicao_reinvest: pctReinvest,
      distribuicao_reserva: pctReserva,
    }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Distribuição salva!");
  };

  const handleSaveMeta = async () => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({
      meta_faturamento_mensal: metaValor,
    }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Meta salva!");
    loadAll();
  };

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const anos = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Financeiro</h1>

      {/* Cards topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><DollarSign className="h-4 w-4" /><span className="text-xs">Faturamento Total</span></div>
          <p className="text-2xl font-bold">{formatCurrency(receitaMes)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive mb-1"><TrendingDown className="h-4 w-4" /><span className="text-xs">Total Despesas</span></div>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(despesasMes)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Wallet className="h-4 w-4" /><span className="text-xs">Total Retiradas</span></div>
          <p className="text-2xl font-bold">{formatCurrency(totalRetiradasMes)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className={`flex items-center gap-2 mb-1 ${lucroLiquido >= 0 ? "text-success" : "text-destructive"}`}>
            <TrendingUp className="h-4 w-4" /><span className="text-xs">Lucro Líquido</span>
          </div>
          <p className={`text-2xl font-bold ${lucroLiquido >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(lucroLiquido)}</p>
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
          {(despesas.length > 0 || metaAdsMesAtual.total > 0) ? (
            <div className="space-y-2">
              {metaAdsMesAtual.total > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-background/50">
                  <div className="flex-1">
                    <p className="font-medium">📢 Meta Ads</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">Marketing</Badge>
                      <Badge variant="secondary" className="text-xs">Automático</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <span className="w-24 h-8 inline-flex items-center justify-end px-2 text-sm font-medium">
                      {Number(metaAdsMesAtual.total).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="w-9" />
                </div>
              )}
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
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma despesa cadastrada</p>
          )}
        </CardContent>
      </Card>

      {/* Retiradas */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Retiradas (Pró-labore)</CardTitle>
          <Button size="sm" onClick={() => setRetiradaModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Retirada
          </Button>
        </CardHeader>
        <CardContent>
          {retiradasMes.length > 0 ? (
            <div className="space-y-2">
              {retiradasMes.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-md border border-border bg-background/50">
                  <div className="flex-1">
                    <p className="font-medium">{r.descricao || "Retirada"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(r.data + "T00:00:00"), "dd/MM/yyyy")}</p>
                  </div>
                  <span className="font-bold">{formatCurrency(Number(r.valor))}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteRetirada(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 mt-2 border-t border-border">
                <span className="font-medium text-sm">Total no mês</span>
                <span className="font-bold">{formatCurrency(totalRetiradasMes)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma retirada neste mês</p>
          )}
        </CardContent>
      </Card>

      {/* Distribuição do Lucro */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Distribuição do Lucro</CardTitle>
          <p className="text-sm text-muted-foreground">Defina os percentuais ideais. Os três devem somar 100%.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>💰 Pró-labore (%)</Label>
              <Input type="number" min={0} max={100} value={pctProLabore} onChange={(e) => setPctProLabore(Number(e.target.value))} className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>🔄 Reinvestimento (%)</Label>
              <Input type="number" min={0} max={100} value={pctReinvest} onChange={(e) => setPctReinvest(Number(e.target.value))} className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>🛡️ Reserva (%)</Label>
              <Input type="number" min={0} max={100} value={pctReserva} onChange={(e) => setPctReserva(Number(e.target.value))} className="bg-input border-border" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className={`text-xs ${distOk ? "text-success" : "text-destructive"}`}>Soma atual: {somaPct}%</p>
            <Button onClick={handleSaveDistribuicao} disabled={!distOk}>Salvar configuração</Button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-md border border-success/30 bg-background/40">
              <p className="text-xs text-muted-foreground">💰 Pró-labore sugerido</p>
              <p className="text-xl font-bold text-success">{formatCurrency(distLucroBase * pctProLabore / 100)}</p>
            </div>
            <div className="p-4 rounded-md border border-info/30 bg-background/40">
              <p className="text-xs text-muted-foreground">🔄 Reinvestir</p>
              <p className="text-xl font-bold text-info">{formatCurrency(distLucroBase * pctReinvest / 100)}</p>
            </div>
            <div className="p-4 rounded-md border border-warning/30 bg-background/40">
              <p className="text-xs text-muted-foreground">🛡️ Reserva</p>
              <p className="text-xl font-bold text-warning">{formatCurrency(distLucroBase * pctReserva / 100)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meta mensal */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Meta Mensal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="space-y-2 flex-1">
              <Label>Meta de faturamento mensal (R$)</Label>
              <Input type="text" value={metaMensal} onChange={(e) => setMetaMensal(e.target.value)} className="bg-input border-border" />
            </div>
            <Button onClick={handleSaveMeta}>Salvar meta</Button>
          </div>
          {metaValor > 0 && (
            <div className="space-y-2">
              <Progress value={metaProgresso} />
              <p className="text-sm text-muted-foreground">
                Você atingiu <span className="font-bold text-primary">{metaProgresso.toFixed(1)}%</span> da sua meta — {formatCurrency(receitaMes)} de {formatCurrency(metaValor)}
              </p>
              {metaProgresso >= 100 && <p className="text-success font-medium">🎉 Meta do mês atingida!</p>}
            </div>
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Item</TableHead><TableHead className="text-right">Valor</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell className="font-medium">Receita Bruta</TableCell><TableCell className="text-right font-medium">{formatCurrency(dreReceitaTotal)}</TableCell></TableRow>
              <TableRow><TableCell className="pl-6 text-xs text-muted-foreground">→ Veio de Anúncios</TableCell><TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(dreReceitaAds)}</TableCell></TableRow>
              <TableRow><TableCell className="pl-6 text-xs text-muted-foreground">→ Veio Orgânico</TableCell><TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(dreReceitaOrganico)}</TableCell></TableRow>
              <TableRow><TableCell className="font-medium">Total Despesas</TableCell><TableCell className="text-right font-medium text-destructive">− {formatCurrency(dreDespesas)}</TableCell></TableRow>
              <TableRow><TableCell className="pl-6 text-xs text-muted-foreground">→ Meta Ads (auto)</TableCell><TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(dreMetaAds.total)}</TableCell></TableRow>
              <TableRow><TableCell className="pl-6 text-xs text-muted-foreground">→ Despesas Fixas</TableCell><TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(despesasFixas)}</TableCell></TableRow>
              <TableRow><TableCell className="font-bold">Lucro Líquido</TableCell><TableCell className={`text-right font-bold ${dreLucro >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(dreLucro)}</TableCell></TableRow>
              <TableRow><TableCell className="font-medium">Total Retiradas</TableCell><TableCell className="text-right font-medium">− {formatCurrency(dreRetiradas)}</TableCell></TableRow>
              <TableRow><TableCell className="font-bold">Saldo na Empresa</TableCell><TableCell className={`text-right font-bold ${dreSaldo >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(dreSaldo)}</TableCell></TableRow>
              <TableRow><TableCell className="font-bold">Margem de Lucro</TableCell><TableCell className={`text-right font-bold ${dreMargem >= 0 ? "text-success" : "text-destructive"}`}>{dreMargem.toFixed(1)}%</TableCell></TableRow>
            </TableBody>
          </Table>
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
              <Input value={despesaForm.nome} onChange={(e) => setDespesaForm({ ...despesaForm, nome: e.target.value })} placeholder="Ex: Midjourney, Canva Pro..." className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input value={despesaForm.valor} onChange={(e) => setDespesaForm({ ...despesaForm, valor: e.target.value })} placeholder="0,00" className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={despesaForm.categoria} onValueChange={(v) => setDespesaForm({ ...despesaForm, categoria: v })}>
                <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDespesaModal(false)}>Cancelar</Button>
            <Button onClick={handleAddDespesa}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Retirada */}
      <Dialog open={retiradaModal} onOpenChange={setRetiradaModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle className="font-display">Nova Retirada</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={retiradaForm.data} onChange={(e) => setRetiradaForm({ ...retiradaForm, data: e.target.value })} className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input value={retiradaForm.valor} onChange={(e) => setRetiradaForm({ ...retiradaForm, valor: e.target.value })} placeholder="0,00" className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input value={retiradaForm.descricao} onChange={(e) => setRetiradaForm({ ...retiradaForm, descricao: e.target.value })} placeholder="Ex: Pró-labore mensal" className="bg-input border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetiradaModal(false)}>Cancelar</Button>
            <Button onClick={handleAddRetirada}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
