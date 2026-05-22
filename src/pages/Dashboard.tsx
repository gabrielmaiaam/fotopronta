import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Image, Users, Clock, CheckCircle2 } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format } from "date-fns";

type Periodo = "hoje" | "7d" | "30d" | "mes";

const formatCurrency = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;

const PERIODO_LABEL: Record<Periodo, string> = {
  hoje: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  mes: "Este mês",
};

export default function Dashboard() {
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [metaInvest, setMetaInvest] = useState<any[]>([]);
  const [taxa, setTaxa] = useState(14);
  const [stats, setStats] = useState({ galerias: 0, clientes: 0 });
  const [recentGalerias, setRecentGalerias] = useState<any[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("7d");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [g, c, p, pd, dp, mi, pf, recent] = await Promise.all([
      supabase.from("galerias").select("id"),
      supabase.from("clientes").select("id"),
      supabase.from("pagamentos").select("*"),
      supabase.from("pedidos").select("id, status"),
      supabase.from("despesas").select("*"),
      supabase.from("meta_ads_investimentos").select("*"),
      supabase.from("profiles").select("meta_ads_taxa_imposto").limit(1).single(),
      supabase.from("galerias").select("*, clientes(nome)").order("created_at", { ascending: false }).limit(5),
    ]);
    setPagamentos(p.data || []);
    setPedidos(pd.data || []);
    setDespesas(dp.data || []);
    setMetaInvest(mi.data || []);
    if (pf.data) setTaxa(Number(pf.data.meta_ads_taxa_imposto ?? 14));
    setStats({ galerias: g.data?.length || 0, clientes: c.data?.length || 0 });
    setRecentGalerias(recent.data || []);
  };

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Período do gráfico
  const { start, end, granularidade } = useMemo(() => {
    if (periodo === "hoje") return { start: startOfDay(now), end: endOfDay(now), granularidade: "hora" as const };
    if (periodo === "7d") return { start: startOfDay(subDays(now, 6)), end: endOfDay(now), granularidade: "dia" as const };
    if (periodo === "30d") return { start: startOfDay(subDays(now, 29)), end: endOfDay(now), granularidade: "dia" as const };
    return { start: monthStart, end: monthEnd, granularidade: "dia" as const };
  }, [periodo]);

  const pagosPeriodo = pagamentos.filter(p => {
    const d = new Date(p.updated_at || p.created_at);
    return p.status === "pago" && d >= start && d <= end;
  });
  const totalPeriodo = pagosPeriodo.reduce((s, p) => s + Number(p.valor_pago), 0);

  const chartData = useMemo(() => {
    if (granularidade === "hora") {
      const buckets = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, "0")}h`, valor: 0 }));
      pagosPeriodo.forEach(p => {
        const d = new Date(p.updated_at || p.created_at);
        buckets[d.getHours()].valor += Number(p.valor_pago);
      });
      return buckets;
    }
    const days: { label: string; key: string; valor: number }[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push({ label: format(cursor, "dd/MM"), key: format(cursor, "yyyy-MM-dd"), valor: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    pagosPeriodo.forEach(p => {
      const k = format(new Date(p.updated_at || p.created_at), "yyyy-MM-dd");
      const b = days.find(d => d.key === k);
      if (b) b.valor += Number(p.valor_pago);
    });
    return days;
  }, [pagosPeriodo, granularidade, start, end]);

  // Cards
  const receitaMes = pagamentos
    .filter(p => p.status === "pago")
    .filter(p => { const d = new Date(p.updated_at || p.created_at); return d >= monthStart && d <= monthEnd; })
    .reduce((s, p) => s + Number(p.valor_pago), 0);
  const fixas = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const ads = metaInvest
    .filter(i => { const d = new Date(i.data + "T00:00:00"); return d >= monthStart && d <= monthEnd; })
    .reduce((s, i) => s + Number(i.valor_investido), 0) * (1 + taxa / 100);
  const lucro = receitaMes - fixas - ads;
  const pedidosPendentes = pedidos.filter(p => p.status !== "pronto" && p.status !== "finalizado").length;
  const pedidosPagosMes = pagamentos.filter(p => {
    const d = new Date(p.updated_at || p.created_at);
    return p.status === "pago" && d >= monthStart && d <= monthEnd;
  }).length;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-display font-bold">Dashboard</h1>

      {/* Seção 1 — Gráfico de Receita */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-lg">Receita</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{PERIODO_LABEL[periodo]}</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(totalPeriodo)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["hoje", "7d", "30d", "mes"] as Periodo[]).map(p => (
                <Button
                  key={p}
                  size="sm"
                  variant={periodo === p ? "default" : "outline"}
                  onClick={() => setPeriodo(p)}
                >
                  {p === "hoje" ? "Hoje" : p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "Este mês"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalPeriodo > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#receitaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-16">Nenhuma venda neste período</p>
          )}
        </CardContent>
      </Card>

      {/* Seção 2 — 5 cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard
          icon={<DollarSign className="h-4 w-4" />}
          label="💰 Lucro Líquido do Mês"
          value={formatCurrency(lucro)}
          valueClass={lucro >= 0 ? "text-success" : "text-destructive"}
        />
        <SummaryCard icon={<Image className="h-4 w-4" />} label="🖼️ Galerias" value={String(stats.galerias)} />
        <SummaryCard icon={<Users className="h-4 w-4" />} label="👥 Clientes" value={String(stats.clientes)} />
        <SummaryCard icon={<Clock className="h-4 w-4" />} label="⏰ Pedidos Pendentes" value={String(pedidosPendentes)} />
        <SummaryCard icon={<CheckCircle2 className="h-4 w-4" />} label="✅ Pedidos Pagos" value={String(pedidosPagosMes)} />
      </div>

      {/* Seção 3 — Galerias Recentes */}
      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="font-display text-lg">Galerias Recentes</CardTitle></CardHeader>
        <CardContent>
          {recentGalerias.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead><TableHead>Cliente</TableHead><TableHead>Status</TableHead><TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentGalerias.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>{g.titulo}</TableCell>
                      <TableCell>{g.clientes?.nome}</TableCell>
                      <TableCell><StatusBadge status={g.status} /></TableCell>
                      <TableCell>{formatCurrency(Number(g.valor_total))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhuma galeria criada ainda</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, value, valueClass = "" }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}<span className="text-xs">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
