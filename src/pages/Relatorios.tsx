import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const formatCurrency = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;

const ORIGEM_LABEL: Record<string, string> = {
  meta_ads: "Meta Ads",
  organico: "Orgânico",
  indicacao: "Indicação",
};

const CAT_LABEL: Record<string, string> = {
  ferramenta_ia: "Ferramenta de IA",
  marketing: "Marketing",
  infraestrutura: "Infraestrutura",
  outro: "Outro",
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--muted-foreground))"];

export default function Relatorios() {
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [metaInvest, setMetaInvest] = useState<any[]>([]);
  const [retiradas, setRetiradas] = useState<any[]>([]);
  const [taxa, setTaxa] = useState(14);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [pg, pd, dp, mi, rt, pf] = await Promise.all([
      supabase.from("pagamentos").select("*, pedidos(origem_cliente)"),
      supabase.from("pedidos").select("*"),
      supabase.from("despesas").select("*"),
      supabase.from("meta_ads_investimentos").select("*"),
      supabase.from("retiradas").select("*").order("data", { ascending: false }),
      supabase.from("profiles").select("meta_ads_taxa_imposto").limit(1).single(),
    ]);
    setPagamentos(pg.data || []);
    setPedidos(pd.data || []);
    setDespesas(dp.data || []);
    setMetaInvest(mi.data || []);
    setRetiradas(rt.data || []);
    if (pf.data) setTaxa(Number(pf.data.meta_ads_taxa_imposto ?? 14));
  };

  const periodMonths = useMemo(() => {
    const arr: { start: Date; end: Date; label: string; key: string }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      arr.push({
        start: startOfMonth(d),
        end: endOfMonth(d),
        label: format(d, "MMM/yy", { locale: ptBR }),
        key: format(d, "yyyy-MM"),
      });
    }
    return arr;
  }, [months]);

  // Gráfico 1 — faturamento mensal
  const faturamentoMensal = periodMonths.map(m => ({
    mes: m.label,
    valor: pagamentos
      .filter(p => p.status === "pago")
      .filter(p => { const d = new Date(p.updated_at || p.created_at); return d >= m.start && d <= m.end; })
      .reduce((s, p) => s + Number(p.valor_pago), 0),
  }));

  // Gráfico 2 — origem das vendas
  const origemData = useMemo(() => {
    const counts: Record<string, number> = { "Meta Ads": 0, "Orgânico": 0, "Indicação": 0, "Outros": 0 };
    pagamentos.filter(p => p.status === "pago").forEach(p => {
      const o = p.pedidos?.origem_cliente;
      const label = ORIGEM_LABEL[o] || "Outros";
      counts[label] = (counts[label] || 0) + Number(p.valor_pago);
    });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [pagamentos]);

  // Gráfico 3 — despesas por categoria (inclui Meta Ads dentro de Marketing)
  const despesasPorCategoria = useMemo(() => {
    const totals: Record<string, number> = { ferramenta_ia: 0, marketing: 0, infraestrutura: 0, outro: 0 };
    despesas.forEach(d => { totals[d.categoria] = (totals[d.categoria] || 0) + Number(d.valor); });
    const totalMetaAds = metaInvest.reduce((s, i) => s + Number(i.valor_investido) * (1 + taxa / 100), 0);
    totals.marketing += totalMetaAds;
    return Object.entries(totals).map(([k, v]) => ({ categoria: CAT_LABEL[k], valor: v }));
  }, [despesas, metaInvest, taxa]);

  // Gráfico 4 — evolução do lucro
  const lucroMensal = periodMonths.map(m => {
    const receita = pagamentos
      .filter(p => p.status === "pago")
      .filter(p => { const d = new Date(p.updated_at || p.created_at); return d >= m.start && d <= m.end; })
      .reduce((s, p) => s + Number(p.valor_pago), 0);
    const fixas = despesas.reduce((s, d) => s + Number(d.valor), 0);
    const ads = metaInvest
      .filter(i => { const d = new Date(i.data + "T00:00:00"); return d >= m.start && d <= m.end; })
      .reduce((s, i) => s + Number(i.valor_investido), 0) * (1 + taxa / 100);
    return { mes: m.label, lucro: receita - fixas - ads };
  });

  const totalRetiradas = retiradas.reduce((s, r) => s + Number(r.valor), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-display font-bold">Relatórios</h1>
        <div className="flex gap-2">
          {([3, 6, 12] as const).map(m => (
            <Button key={m} size="sm" variant={months === m ? "default" : "outline"} onClick={() => setMonths(m)}>
              Últimos {m} meses
            </Button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="font-display text-lg">Faturamento Mensal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={faturamentoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="font-display text-lg">Origem das Vendas</CardTitle></CardHeader>
          <CardContent>
            {origemData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={origemData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {origemData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Sem vendas registradas</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="font-display text-lg">Despesas por Categoria</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={despesasPorCategoria}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="categoria" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="font-display text-lg">Evolução do Lucro Líquido</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={lucroMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="lucro" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="font-display text-lg">Histórico de Retiradas</CardTitle></CardHeader>
        <CardContent>
          {retiradas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {retiradas.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{format(new Date(r.data + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{r.descricao || "—"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(r.valor))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totalRetiradas)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhuma retirada registrada</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
