import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingDown, TrendingUp, DollarSign, Landmark, BarChart3, Zap, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;

export default function MetaAds() {
  const { user } = useAuth();
  const [investimentos, setInvestimentos] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [taxa, setTaxa] = useState(14);
  const [periodoMeses, setPeriodoMeses] = useState(3);

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ data: format(new Date(), "yyyy-MM-dd"), valor_investido: "" });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [inv, pg, pf] = await Promise.all([
      supabase.from("meta_ads_investimentos").select("*").order("data", { ascending: false }),
      supabase.from("pagamentos").select("*, pedidos(origem_cliente)").eq("status", "pago"),
      supabase.from("profiles").select("*").limit(1).single(),
    ]);
    setInvestimentos(inv.data || []);
    setPagamentos(pg.data || []);
    if (pf.data) {
      setProfile(pf.data);
      setTaxa(Number(pf.data.meta_ads_taxa_imposto ?? 14));
    }
  };

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Mês corrente
  const investidoMes = investimentos
    .filter(i => { const d = new Date(i.data); return d >= monthStart && d <= monthEnd; })
    .reduce((s, i) => s + Number(i.valor_investido), 0);
  const impostoMes = investidoMes * (taxa / 100);
  const retornoMes = pagamentos
    .filter(p => p.pedidos?.origem_cliente === "meta_ads")
    .filter(p => { const d = new Date(p.updated_at || p.created_at); return d >= monthStart && d <= monthEnd; })
    .reduce((s, p) => s + Number(p.valor_pago), 0);
  const lucroMes = retornoMes - investidoMes - impostoMes;
  const roi = investidoMes > 0 ? (lucroMes / investidoMes) * 100 : 0;
  const roas = investidoMes > 0 ? retornoMes / investidoMes : 0;

  const handleAdd = async () => {
    if (!form.valor_investido || !form.data) {
      toast.error("Preencha data e valor");
      return;
    }
    if (!user) { toast.error("Sessão expirada"); return; }
    const { error } = await supabase.from("meta_ads_investimentos").insert({
      user_id: user.id,
      data: form.data,
      valor_investido: Number(form.valor_investido.replace(",", ".")),
      taxa_imposto: taxa,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Investimento registrado!");
    setModal(false);
    setForm({ data: format(new Date(), "yyyy-MM-dd"), valor_investido: "" });
    loadAll();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("meta_ads_investimentos").delete().eq("id", id);
    toast.success("Removido");
    loadAll();
  };

  const handleSaveTaxa = async () => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ meta_ads_taxa_imposto: taxa }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Taxa atualizada!");
  };

  // Lançamentos do mês corrente
  const lancamentosMes = investimentos.filter(i => {
    const d = new Date(i.data);
    return d >= monthStart && d <= monthEnd;
  });

  // Tabela histórica agrupada por mês
  const meses: { key: string; label: string; start: Date; end: Date }[] = [];
  for (let i = 0; i < periodoMeses; i++) {
    const d = subMonths(now, i);
    meses.push({
      key: format(d, "yyyy-MM"),
      label: format(d, "MMM/yyyy", { locale: ptBR }),
      start: startOfMonth(d),
      end: endOfMonth(d),
    });
  }

  const historico = meses.map(m => {
    const inv = investimentos
      .filter(i => { const d = new Date(i.data); return d >= m.start && d <= m.end; })
      .reduce((s, i) => s + Number(i.valor_investido), 0);
    const imp = inv * (taxa / 100);
    const ret = pagamentos
      .filter(p => p.pedidos?.origem_cliente === "meta_ads")
      .filter(p => { const d = new Date(p.updated_at || p.created_at); return d >= m.start && d <= m.end; })
      .reduce((s, p) => s + Number(p.valor_pago), 0);
    const lucro = ret - inv - imp;
    const roiM = inv > 0 ? (lucro / inv) * 100 : 0;
    const roasM = inv > 0 ? ret / inv : 0;
    return { ...m, inv, imp, ret, lucro, roi: roiM, roas: roasM };
  });

  const totalInv = historico.reduce((s, h) => s + h.inv, 0);
  const totalImp = historico.reduce((s, h) => s + h.imp, 0);
  const totalRet = historico.reduce((s, h) => s + h.ret, 0);
  const totalLucro = totalRet - totalInv - totalImp;
  const totalRoi = totalInv > 0 ? (totalLucro / totalInv) * 100 : 0;
  const totalRoas = totalInv > 0 ? totalRet / totalInv : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Meta Ads</h1>
        <p className="text-sm text-muted-foreground">Acompanhe o desempenho dos seus anúncios e o ROI das campanhas.</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><TrendingDown className="h-4 w-4" /><span className="text-xs">💸 Investido</span></div>
          <p className="text-xl font-bold">{formatCurrency(investidoMes)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Landmark className="h-4 w-4" /><span className="text-xs">🏦 Imposto Meta</span></div>
          <p className="text-xl font-bold">{formatCurrency(impostoMes)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-success mb-1"><DollarSign className="h-4 w-4" /><span className="text-xs">💵 Retorno</span></div>
          <p className="text-xl font-bold text-success">{formatCurrency(retornoMes)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className={`flex items-center gap-2 mb-1 ${lucroMes >= 0 ? "text-success" : "text-destructive"}`}><TrendingUp className="h-4 w-4" /><span className="text-xs">💰 Lucro</span></div>
          <p className={`text-xl font-bold ${lucroMes >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(lucroMes)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><BarChart3 className="h-4 w-4" /><span className="text-xs">📈 ROI</span></div>
          <p className={`text-xl font-bold ${roi >= 0 ? "text-success" : "text-destructive"}`}>{roi.toFixed(1)}%</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Zap className="h-4 w-4" /><span className="text-xs">⚡ ROAS</span></div>
          <p className="text-xl font-bold">{roas.toFixed(2)}x</p>
        </CardContent></Card>
      </div>

      {/* Lançamentos do mês */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Lançamentos de {format(now, "MMMM/yyyy", { locale: ptBR })}</CardTitle>
          <Button size="sm" onClick={() => setModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> Registrar Investimento
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lancamentosMes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Investido</TableHead>
                  <TableHead className="text-right">Imposto ({taxa}%)</TableHead>
                  <TableHead className="text-right">Faturado</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentosMes.map(l => {
                  const faturadoDia = pagamentos
                    .filter(p => p.pedidos?.origem_cliente === "meta_ads")
                    .filter(p => format(new Date(p.updated_at || p.created_at), "yyyy-MM-dd") === l.data)
                    .reduce((s, p) => s + Number(p.valor_pago), 0);
                  const lucroDia = faturadoDia - Number(l.valor_investido);
                  return (
                    <TableRow key={l.id}>
                      <TableCell>{format(new Date(l.data + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(l.valor_investido))}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(Number(l.valor_investido) * (taxa / 100))}</TableCell>
                      <TableCell className="text-right text-success">{formatCurrency(faturadoDia)}</TableCell>
                      <TableCell className={`text-right font-medium ${lucroDia >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(lucroDia)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum investimento registrado este mês</p>
          )}

          {/* Totais do mês */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <Card className="border-border bg-background"><CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1"><TrendingDown className="h-4 w-4" /><span className="text-xs">💸 Total Investido</span></div>
              <p className="text-lg font-bold">{formatCurrency(investidoMes)}</p>
            </CardContent></Card>
            <Card className="border-border bg-background"><CardContent className="p-4">
              <div className="flex items-center gap-2 text-success mb-1"><DollarSign className="h-4 w-4" /><span className="text-xs">💵 Total Faturado</span></div>
              <p className="text-lg font-bold text-success">{formatCurrency(retornoMes)}</p>
            </CardContent></Card>
            {(() => {
              const lucroMesSimples = retornoMes - investidoMes;
              const roiMes = investidoMes > 0 ? (lucroMesSimples / investidoMes) * 100 : 0;
              return (
                <>
                  <Card className="border-border bg-background"><CardContent className="p-4">
                    <div className={`flex items-center gap-2 mb-1 ${lucroMesSimples >= 0 ? "text-success" : "text-destructive"}`}><TrendingUp className="h-4 w-4" /><span className="text-xs">💰 Total Lucro</span></div>
                    <p className={`text-lg font-bold ${lucroMesSimples >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(lucroMesSimples)}</p>
                  </CardContent></Card>
                  <Card className="border-border bg-background"><CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1"><BarChart3 className="h-4 w-4" /><span className="text-xs">📈 ROI do Mês</span></div>
                    <p className={`text-lg font-bold ${roiMes >= 0 ? "text-success" : "text-destructive"}`}>{investidoMes > 0 ? `${roiMes.toFixed(1)}%` : "—"}</p>
                  </CardContent></Card>
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Tabela histórica */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Histórico Mensal</CardTitle>
          <Select value={String(periodoMeses)} onValueChange={(v) => setPeriodoMeses(Number(v))}>
            <SelectTrigger className="w-[180px] bg-input border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Investido</TableHead>
                  <TableHead className="text-right">Imposto</TableHead>
                  <TableHead className="text-right">Retorno</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map(h => (
                  <TableRow key={h.key}>
                    <TableCell className="capitalize">{h.label}</TableCell>
                    <TableCell className="text-right">{formatCurrency(h.inv)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(h.imp)}</TableCell>
                    <TableCell className="text-right text-success">{formatCurrency(h.ret)}</TableCell>
                    <TableCell className={`text-right font-medium ${h.lucro >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(h.lucro)}</TableCell>
                    <TableCell className={`text-right ${h.roi >= 0 ? "text-success" : "text-destructive"}`}>{h.roi.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{h.roas.toFixed(2)}x</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">TOTAL</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totalInv)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totalImp)}</TableCell>
                  <TableCell className="text-right font-bold text-success">{formatCurrency(totalRet)}</TableCell>
                  <TableCell className={`text-right font-bold ${totalLucro >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(totalLucro)}</TableCell>
                  <TableCell className={`text-right font-bold ${totalRoi >= 0 ? "text-success" : "text-destructive"}`}>{totalRoi.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-bold">{totalRoas.toFixed(2)}x</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Configuração */}
      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="font-display text-lg">Configuração</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label>Taxa de imposto sobre investimento (%)</Label>
          <div className="flex gap-2 max-w-xs">
            <Input
              type="number"
              step="0.1"
              value={taxa}
              onChange={(e) => setTaxa(Number(e.target.value))}
              className="bg-input border-border"
            />
            <Button onClick={handleSaveTaxa}>Salvar</Button>
          </div>
          <p className="text-xs text-muted-foreground">Padrão: 14%. Aplica-se ao cálculo do imposto sobre o valor investido.</p>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle className="font-display">Registrar Investimento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>Valor investido (R$)</Label>
              <Input value={form.valor_investido} onChange={(e) => setForm({ ...form, valor_investido: e.target.value })} placeholder="0,00" className="bg-input border-border" />
            </div>
            <p className="text-xs text-muted-foreground">🏦 Imposto de {taxa}% será calculado automaticamente.</p>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} className="w-full">Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
