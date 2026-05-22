import { useEffect, useMemo, useState } from "react";
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
import { DollarSign, TrendingDown, Wallet, TrendingUp, CreditCard, Plus, Trash2, Target, Bell, CheckCircle2, XCircle, AlertTriangle, Percent } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";

const CATEGORIAS = [
  { value: "ferramenta_ia", label: "Ferramenta de IA" },
  { value: "marketing", label: "Marketing" },
  { value: "infraestrutura", label: "Infraestrutura" },
  { value: "saude", label: "Saúde" },
  { value: "educacao", label: "Educação" },
  { value: "outro", label: "Outro" },
];

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const formatCurrency = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;
const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, "0")}`;

// --- helpers de despesa por mês ---
function getDespesaStatusMes(d: any, key: string): "pago" | "nao_pago" {
  const e = d.status_mes?.[key];
  if (!e) return "nao_pago";
  if (typeof e === "string") return e === "pago" ? "pago" : "nao_pago";
  return e.status === "pago" ? "pago" : "nao_pago";
}
function getDespesaValorMes(d: any, key: string): number {
  if (d.tipo === "variavel") {
    const e = d.status_mes?.[key];
    if (e && typeof e === "object" && e.valor != null) return Number(e.valor);
  }
  return Number(d.valor) || 0;
}

export default function Pagamentos() {
  const { user } = useAuth();
  const now = new Date();
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [metaInvestimentos, setMetaInvestimentos] = useState<any[]>([]);
  const [retiradas, setRetiradas] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [taxaMetaAds, setTaxaMetaAds] = useState(14);
  const [statusFilter, setStatusFilter] = useState("todos");

  // Filtros globais (mês/ano e ano do fluxo)
  const [mesFiltro, setMesFiltro] = useState(now.getMonth());
  const [anoFiltro, setAnoFiltro] = useState(now.getFullYear());
  const [anoFluxo, setAnoFluxo] = useState(now.getFullYear());
  const [saldoInicialAno, setSaldoInicialAno] = useState<string>("0");

  // Distribuição & meta
  const [pctProLabore, setPctProLabore] = useState(50);
  const [pctReinvest, setPctReinvest] = useState(30);
  const [pctReserva, setPctReserva] = useState(20);
  const [metaMensal, setMetaMensal] = useState("0");

  // Modais
  const [despesaModal, setDespesaModal] = useState(false);
  const [despesaForm, setDespesaForm] = useState({
    nome: "", valor: "", categoria: "outro", tipo: "fixa" as "fixa" | "variavel", dia_vencimento: "1",
  });
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

  // Quando troca o ano do fluxo, carrega saldo inicial salvo
  useEffect(() => {
    const v = profile?.saldo_inicial_ano?.[String(anoFluxo)] ?? 0;
    setSaldoInicialAno(String(v));
  }, [profile, anoFluxo]);

  // === Cálculos do mês filtrado ===
  const mesKey = monthKey(anoFiltro, mesFiltro);
  const mesStart = startOfMonth(new Date(anoFiltro, mesFiltro, 1));
  const mesEnd = endOfMonth(new Date(anoFiltro, mesFiltro, 1));

  const fixas = useMemo(() => despesas.filter(d => d.tipo !== "variavel"), [despesas]);
  const variaveis = useMemo(() => despesas.filter(d => d.tipo === "variavel"), [despesas]);

  const metaAdsMes = useMemo(() => {
    const investido = metaInvestimentos
      .filter(i => { const d = new Date(i.data + "T00:00:00"); return d >= mesStart && d <= mesEnd; })
      .reduce((s, i) => s + Number(i.valor_investido), 0);
    return investido * (1 + taxaMetaAds / 100);
  }, [metaInvestimentos, taxaMetaAds, mesStart, mesEnd]);

  const totalFixasPagas = fixas
    .filter(d => getDespesaStatusMes(d, mesKey) === "pago")
    .reduce((s, d) => s + getDespesaValorMes(d, mesKey), 0);
  const totalVariaveisMes = variaveis.reduce((s, d) => s + getDespesaValorMes(d, mesKey), 0);
  const despesasMes = totalFixasPagas + totalVariaveisMes + metaAdsMes;

  const receitaMes = pagamentos
    .filter(p => {
      const d = new Date(p.updated_at || p.created_at);
      return p.status === "pago" && d >= mesStart && d <= mesEnd;
    })
    .reduce((s, p) => s + Number(p.valor_pago), 0);

  const lucroLiquido = receitaMes - despesasMes;
  const margem = receitaMes > 0 ? (lucroLiquido / receitaMes) * 100 : 0;

  const retiradasMes = retiradas
    .filter(r => { const d = new Date(r.data + "T00:00:00"); return d >= mesStart && d <= mesEnd; });
  const totalRetiradasMes = retiradasMes.reduce((s, r) => s + Number(r.valor), 0);
  const saldoEmpresa = lucroLiquido - totalRetiradasMes;

  // === Alertas (mês atual real, não filtrado) ===
  const hoje = new Date();
  const alertasMes = fixas
    .filter(d => {
      if (getDespesaStatusMes(d, monthKey(hoje.getFullYear(), hoje.getMonth())) === "pago") return false;
      const dia = Number(d.dia_vencimento) || 1;
      const venc = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
      const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 5;
    })
    .sort((a, b) => Number(a.dia_vencimento) - Number(b.dia_vencimento));

  // === DRE ===
  const dreReceita = pagamentos.filter(p => {
    const d = new Date(p.updated_at || p.created_at);
    return p.status === "pago" && d >= mesStart && d <= mesEnd;
  });
  const dreReceitaTotal = dreReceita.reduce((s, p) => s + Number(p.valor_pago), 0);
  const dreReceitaAds = dreReceita.filter(p => p.pedidos?.origem_cliente === "meta_ads").reduce((s, p) => s + Number(p.valor_pago), 0);
  const dreReceitaOrganico = dreReceitaTotal - dreReceitaAds;
  const dreLucro = dreReceitaTotal - despesasMes;
  const dreMargem = dreReceitaTotal > 0 ? (dreLucro / dreReceitaTotal) * 100 : 0;
  const dreSaldo = dreLucro - totalRetiradasMes;

  // === Fluxo de Caixa Anual ===
  const fluxoCaixa = useMemo(() => {
    const rows: { mes: number; saldoInicial: number; entradas: number; saidas: number; saldoFinal: number }[] = [];
    let saldoAnterior = Number(String(saldoInicialAno).replace(",", ".")) || 0;
    for (let m = 0; m < 12; m++) {
      const k = monthKey(anoFluxo, m);
      const s = startOfMonth(new Date(anoFluxo, m, 1));
      const e = endOfMonth(new Date(anoFluxo, m, 1));
      const entradas = pagamentos
        .filter(p => {
          const d = new Date(p.updated_at || p.created_at);
          return p.status === "pago" && d >= s && d <= e;
        })
        .reduce((acc, p) => acc + Number(p.valor_pago), 0);
      const fxPagas = fixas.filter(d => getDespesaStatusMes(d, k) === "pago").reduce((acc, d) => acc + getDespesaValorMes(d, k), 0);
      const varTotal = variaveis.reduce((acc, d) => acc + getDespesaValorMes(d, k), 0);
      const ads = metaInvestimentos
        .filter(i => { const d = new Date(i.data + "T00:00:00"); return d >= s && d <= e; })
        .reduce((acc, i) => acc + Number(i.valor_investido), 0) * (1 + taxaMetaAds / 100);
      const saidas = fxPagas + varTotal + ads;
      const saldoFinal = saldoAnterior + entradas - saidas;
      rows.push({ mes: m, saldoInicial: saldoAnterior, entradas, saidas, saldoFinal });
      saldoAnterior = saldoFinal;
    }
    return rows;
  }, [pagamentos, fixas, variaveis, metaInvestimentos, taxaMetaAds, saldoInicialAno, anoFluxo]);

  // === Handlers ===
  const filtered = pagamentos.filter(p => statusFilter === "todos" || p.status === statusFilter);
  const somaPct = pctProLabore + pctReinvest + pctReserva;
  const distOk = somaPct === 100;
  const distLucroBase = Math.max(lucroLiquido, 0);
  const metaValor = Number(metaMensal.replace(",", ".")) || 0;
  const metaProgresso = metaValor > 0 ? Math.min((receitaMes / metaValor) * 100, 100) : 0;

  const handlePay = async (pag: any, etapa: "primeira" | "segunda") => {
    const metade = Number(pag.valor_total) / 2;
    const newPago = etapa === "primeira" ? metade : Number(pag.valor_total);
    const newStatus = etapa === "primeira" ? "parcial" : "pago";
    const patch: any = { valor_pago: newPago, status: newStatus, origem: "manual" };
    if (etapa === "primeira") patch.entrada_paga_em = new Date().toISOString();
    else patch.saldo_pago_em = new Date().toISOString();
    await supabase.from("pagamentos").update(patch).eq("id", pag.id);
    toast.success(etapa === "primeira" ? "1ª etapa registrada!" : "Pagamento completo!");
    loadAll();
  };

  const openNovaDespesa = (tipo: "fixa" | "variavel") => {
    setDespesaForm({ nome: "", valor: "", categoria: "outro", tipo, dia_vencimento: "1" });
    setDespesaModal(true);
  };

  const handleAddDespesa = async () => {
    if (!despesaForm.nome.trim() || !despesaForm.valor) { toast.error("Preencha nome e valor"); return; }
    if (!user) { toast.error("Sessão expirada"); return; }
    const dia = Math.min(31, Math.max(1, Number(despesaForm.dia_vencimento) || 1));
    const { error } = await supabase.from("despesas").insert({
      user_id: user.id,
      nome: despesaForm.nome,
      valor: Number(despesaForm.valor.replace(",", ".")),
      categoria: despesaForm.categoria,
      tipo: despesaForm.tipo,
      dia_vencimento: dia,
      recorrente: true,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Despesa adicionada!");
    setDespesaModal(false);
    loadAll();
  };

  const handleDeleteDespesa = async (id: string) => {
    await supabase.from("despesas").delete().eq("id", id);
    toast.success("Despesa removida");
    loadAll();
  };

  const toggleDespesaStatus = async (d: any) => {
    const atual = getDespesaStatusMes(d, mesKey);
    const novo = atual === "pago" ? "nao_pago" : "pago";
    const entryAtual = d.status_mes?.[mesKey];
    let newEntry: any;
    if (d.tipo === "variavel") {
      const valor = entryAtual && typeof entryAtual === "object" ? entryAtual.valor ?? Number(d.valor) : Number(d.valor);
      newEntry = { status: novo, valor };
    } else {
      newEntry = novo;
    }
    const next = { ...(d.status_mes || {}), [mesKey]: newEntry };
    await supabase.from("despesas").update({ status_mes: next } as any).eq("id", d.id);
    loadAll();
  };

  const updateValorVariavel = async (d: any, valor: string) => {
    const v = Number(valor.replace(",", "."));
    if (isNaN(v)) return;
    const entryAtual = d.status_mes?.[mesKey];
    const status = entryAtual && typeof entryAtual === "object" ? entryAtual.status || "nao_pago" : (entryAtual === "pago" ? "pago" : "nao_pago");
    const next = { ...(d.status_mes || {}), [mesKey]: { status, valor: v } };
    await supabase.from("despesas").update({ status_mes: next } as any).eq("id", d.id);
    loadAll();
  };

  const updateDespesaBase = async (id: string, patch: any) => {
    await supabase.from("despesas").update(patch).eq("id", id);
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

  const handleSaveSaldoInicial = async () => {
    if (!profile) return;
    const v = Number(String(saldoInicialAno).replace(",", ".")) || 0;
    const next = { ...(profile.saldo_inicial_ano || {}), [String(anoFluxo)]: v };
    const { error } = await supabase.from("profiles").update({ saldo_inicial_ano: next } as any).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saldo inicial salvo!");
    loadAll();
  };

  const anos = Array.from(new Set([now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1])).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-display font-bold">Financeiro</h1>
        <div className="flex gap-2">
          <Select value={String(mesFiltro)} onValueChange={(v) => setMesFiltro(Number(v))}>
            <SelectTrigger className="w-[140px] bg-input border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{MESES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(anoFiltro)} onValueChange={(v) => setAnoFiltro(Number(v))}>
            <SelectTrigger className="w-[100px] bg-input border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><DollarSign className="h-4 w-4" /><span className="text-xs">💵 Faturamento do Mês</span></div>
          <p className="text-2xl font-bold">{formatCurrency(receitaMes)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive mb-1"><TrendingDown className="h-4 w-4" /><span className="text-xs">💸 Total Despesas do Mês</span></div>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(despesasMes)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className={`flex items-center gap-2 mb-1 ${lucroLiquido >= 0 ? "text-success" : "text-destructive"}`}>
            <TrendingUp className="h-4 w-4" /><span className="text-xs">💰 Lucro Líquido</span>
          </div>
          <p className={`text-2xl font-bold ${lucroLiquido >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(lucroLiquido)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className={`flex items-center gap-2 mb-1 ${margem >= 0 ? "text-success" : "text-destructive"}`}>
            <Percent className="h-4 w-4" /><span className="text-xs">📊 Margem de Lucro</span>
          </div>
          <p className={`text-2xl font-bold ${margem >= 0 ? "text-success" : "text-destructive"}`}>{margem.toFixed(1)}%</p>
        </CardContent></Card>
      </div>

      {/* Alertas do Mês */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-warning" /> Alertas do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertasMes.length > 0 ? (
            <div className="space-y-2">
              {alertasMes.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-md border border-warning/30 bg-warning/5">
                  <span className="text-sm">🔔 <span className="font-medium">{d.nome}</span> vence dia {d.dia_vencimento}</span>
                  <span className="font-bold">{formatCurrency(Number(d.valor))}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-success">✅ Nenhuma despesa vencendo em breve</p>
          )}
        </CardContent>
      </Card>

      {/* Despesas Fixas */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Despesas Fixas 📌</CardTitle>
          <Button size="sm" onClick={() => openNovaDespesa("fixa")}>
            <Plus className="h-4 w-4 mr-1" /> Nova Despesa Fixa
          </Button>
        </CardHeader>
        <CardContent>
          <DespesasTable
            despesas={fixas}
            mesKey={mesKey}
            mostraMesAtual={anoFiltro === hoje.getFullYear() && mesFiltro === hoje.getMonth()}
            tipo="fixa"
            onToggleStatus={toggleDespesaStatus}
            onDelete={handleDeleteDespesa}
            onUpdateBase={updateDespesaBase}
          />
        </CardContent>
      </Card>

      {/* Despesas Variáveis */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Despesas Variáveis 📊</CardTitle>
          <Button size="sm" onClick={() => openNovaDespesa("variavel")}>
            <Plus className="h-4 w-4 mr-1" /> Nova Despesa Variável
          </Button>
        </CardHeader>
        <CardContent>
          <DespesasTable
            despesas={variaveis}
            mesKey={mesKey}
            mostraMesAtual={anoFiltro === hoje.getFullYear() && mesFiltro === hoje.getMonth()}
            tipo="variavel"
            onToggleStatus={toggleDespesaStatus}
            onDelete={handleDeleteDespesa}
            onUpdateBase={updateDespesaBase}
            onUpdateValorMes={updateValorVariavel}
          />
          {metaAdsMes > 0 && (
            <div className="mt-3 flex items-center justify-between p-3 rounded-md border border-border bg-background/50 text-sm">
              <span>📢 <span className="font-medium">Meta Ads</span> <Badge variant="secondary" className="ml-2 text-[10px]">Automático</Badge></span>
              <span className="font-bold">{formatCurrency(metaAdsMes)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fluxo de Caixa Anual */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="font-display text-lg">Fluxo de Caixa Anual</CardTitle>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Saldo inicial de Janeiro</Label>
                <Input
                  value={saldoInicialAno}
                  onChange={(e) => setSaldoInicialAno(e.target.value)}
                  onBlur={handleSaveSaldoInicial}
                  className="bg-input border-border h-9 w-32"
                />
              </div>
              <Select value={String(anoFluxo)} onValueChange={(v) => setAnoFluxo(Number(v))}>
                <SelectTrigger className="w-[100px] bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Saldo Inicial</TableHead>
                  <TableHead className="text-right">(+) Entradas</TableHead>
                  <TableHead className="text-right">(−) Saídas</TableHead>
                  <TableHead className="text-right">Saldo Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fluxoCaixa.map(row => {
                  const isAtual = anoFluxo === hoje.getFullYear() && row.mes === hoje.getMonth();
                  return (
                    <TableRow key={row.mes} className={isAtual ? "bg-primary/10" : ""}>
                      <TableCell className={isAtual ? "font-bold" : ""}>{MESES[row.mes]}{isAtual && " •"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.saldoInicial)}</TableCell>
                      <TableCell className="text-right text-success">{formatCurrency(row.entradas)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(row.saidas)}</TableCell>
                      <TableCell className={`text-right font-bold ${row.saldoFinal >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(row.saldoFinal)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
          <CardTitle className="font-display text-lg">DRE Simplificado — {MESES[mesFiltro]}/{anoFiltro}</CardTitle>
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
              <TableRow><TableCell className="font-medium">Total Despesas</TableCell><TableCell className="text-right font-medium text-destructive">− {formatCurrency(despesasMes)}</TableCell></TableRow>
              <TableRow><TableCell className="pl-6 text-xs text-muted-foreground">→ Despesas Fixas (pagas)</TableCell><TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(totalFixasPagas)}</TableCell></TableRow>
              <TableRow><TableCell className="pl-6 text-xs text-muted-foreground">→ Despesas Variáveis</TableCell><TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(totalVariaveisMes)}</TableCell></TableRow>
              <TableRow><TableCell className="pl-6 text-xs text-muted-foreground">→ Meta Ads (auto)</TableCell><TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(metaAdsMes)}</TableCell></TableRow>
              <TableRow><TableCell className="font-bold">Lucro Líquido</TableCell><TableCell className={`text-right font-bold ${dreLucro >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(dreLucro)}</TableCell></TableRow>
              <TableRow><TableCell className="font-medium">Total Retiradas</TableCell><TableCell className="text-right font-medium">− {formatCurrency(totalRetiradasMes)}</TableCell></TableRow>
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
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {(p as any).origem === "pix_auto" ? "PIX automático" : "Confirmado manualmente"}
                    </Badge>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={despesaForm.tipo} onValueChange={(v: any) => setDespesaForm({ ...despesaForm, tipo: v })}>
                  <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixa">Fixa</SelectItem>
                    <SelectItem value="variavel">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dia de vencimento</Label>
                <Input type="number" min={1} max={31} value={despesaForm.dia_vencimento} onChange={(e) => setDespesaForm({ ...despesaForm, dia_vencimento: e.target.value })} className="bg-input border-border" />
              </div>
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

// ============ Subcomponente: tabela de despesas ============
function DespesasTable({
  despesas, mesKey, mostraMesAtual, tipo, onToggleStatus, onDelete, onUpdateBase, onUpdateValorMes,
}: {
  despesas: any[];
  mesKey: string;
  mostraMesAtual: boolean;
  tipo: "fixa" | "variavel";
  onToggleStatus: (d: any) => void;
  onDelete: (id: string) => void;
  onUpdateBase: (id: string, patch: any) => void;
  onUpdateValorMes?: (d: any, valor: string) => void;
}) {
  if (!despesas.length) {
    return <p className="text-sm text-muted-foreground text-center py-6">Nenhuma despesa {tipo === "fixa" ? "fixa" : "variável"} cadastrada</p>;
  }
  const hoje = new Date();
  const totalLinha = despesas.reduce((s, d) => s + getDespesaValorMes(d, mesKey), 0);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="w-20">Dia Venc.</TableHead>
            <TableHead className="text-right w-32">Valor</TableHead>
            <TableHead className="w-44">Status do mês</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {despesas.map(d => {
            const status = getDespesaStatusMes(d, mesKey);
            const valor = getDespesaValorMes(d, mesKey);
            const dia = Number(d.dia_vencimento) || 1;
            const diff = mostraMesAtual ? Math.ceil((new Date(hoje.getFullYear(), hoje.getMonth(), dia).getTime() - hoje.getTime()) / 86400000) : null;
            const vencendoLogo = diff !== null && diff >= 0 && diff <= 3 && status !== "pago";
            const vencida = diff !== null && diff < 0 && status !== "pago";
            return (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="font-medium">{d.nome}</div>
                  <div className="flex gap-1 mt-1">
                    {vencendoLogo && <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px]">🔔 vence em {diff}d</Badge>}
                    {vencida && <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />VENCIDA</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{CATEGORIAS.find(c => c.value === d.categoria)?.label || d.categoria}</Badge>
                </TableCell>
                <TableCell>
                  <Input
                    type="number" min={1} max={31}
                    defaultValue={dia}
                    onBlur={(e) => onUpdateBase(d.id, { dia_vencimento: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
                    className="bg-input border-border h-8 w-16"
                  />
                </TableCell>
                <TableCell className="text-right">
                  {tipo === "variavel" && onUpdateValorMes ? (
                    <Input
                      type="text"
                      defaultValue={Number(valor).toFixed(2)}
                      onBlur={(e) => onUpdateValorMes(d, e.target.value)}
                      className="bg-input border-border h-8 w-28 text-right ml-auto"
                    />
                  ) : (
                    <Input
                      type="text"
                      defaultValue={Number(d.valor).toFixed(2)}
                      onBlur={(e) => onUpdateBase(d.id, { valor: Number(e.target.value.replace(",", ".")) || 0 })}
                      className="bg-input border-border h-8 w-28 text-right ml-auto"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToggleStatus(d)}
                    className={status === "pago" ? "border-success/40 text-success" : "border-border text-muted-foreground"}
                  >
                    {status === "pago"
                      ? <><CheckCircle2 className="h-4 w-4 mr-1" /> Pago</>
                      : <><XCircle className="h-4 w-4 mr-1" /> Não pago</>}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(d.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow>
            <TableCell colSpan={3} className="font-medium text-sm">Total do mês</TableCell>
            <TableCell className="text-right font-bold text-destructive">{formatCurrency(totalLinha)}</TableCell>
            <TableCell colSpan={2}></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
