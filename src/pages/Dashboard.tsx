import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import {
  Image, DollarSign, Clock, Users, CalendarDays, CalendarRange, CalendarCheck,
  Target, TrendingDown, Wallet, Percent, Sparkles, RefreshCw, ShieldCheck, AlertTriangle
} from "lucide-react";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from "date-fns";

const formatCurrency = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;

export default function Dashboard() {
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [metaInvest, setMetaInvest] = useState<any[]>([]);
  const [retiradas, setRetiradas] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ galerias: 0, clientes: 0 });
  const [recentGalerias, setRecentGalerias] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [g, c, p, pd, dp, mi, rt, pf, recent] = await Promise.all([
      supabase.from("galerias").select("id"),
      supabase.from("clientes").select("id"),
      supabase.from("pagamentos").select("*"),
      supabase.from("pedidos").select("id, status"),
      supabase.from("despesas").select("*"),
      supabase.from("meta_ads_investimentos").select("*"),
      supabase.from("retiradas").select("*"),
      supabase.from("profiles").select("*").limit(1).single(),
      supabase.from("galerias").select("*, clientes(nome)").order("created_at", { ascending: false }).limit(5),
    ]);
    setPagamentos(p.data || []);
    setPedidos(pd.data || []);
    setDespesas(dp.data || []);
    setMetaInvest(mi.data || []);
    setRetiradas(rt.data || []);
    setProfile(pf.data || null);
    setStats({ galerias: g.data?.length || 0, clientes: c.data?.length || 0 });
    setRecentGalerias(recent.data || []);
  };

  const now = new Date();
  const todayStart = startOfDay(now), todayEnd = endOfDay(now);
  const weekStart = startOfDay(subDays(now, 6));
  const monthStart = startOfMonth(now), monthEnd = endOfMonth(now);

  const sumPagos = (start: Date, end: Date) =>
    pagamentos
      .filter(p => p.status === "pago")
      .filter(p => { const d = new Date(p.updated_at || p.created_at); return d >= start && d <= end; })
      .reduce((s, p) => s + Number(p.valor_pago), 0);

  const fatHoje = sumPagos(todayStart, todayEnd);
  const fatSemana = sumPagos(weekStart, todayEnd);
  const fatMes = sumPagos(monthStart, monthEnd);

  const taxa = Number(profile?.meta_ads_taxa_imposto ?? 14);
  const metaAdsMes = metaInvest
    .filter(i => { const d = new Date(i.data + "T00:00:00"); return d >= monthStart && d <= monthEnd; })
    .reduce((s, i) => s + Number(i.valor_investido), 0);
  const metaAdsTotalMes = metaAdsMes * (1 + taxa / 100);
  const despesasFixas = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const despesasMes = despesasFixas + metaAdsTotalMes;
  const lucroLiquido = fatMes - despesasMes;

  const pedidosPagos = pagamentos.filter(p => p.status === "pago").length;
  const ticketMedio = pedidosPagos > 0 ? pagamentos.filter(p => p.status === "pago").reduce((s, p) => s + Number(p.valor_pago), 0) / pedidosPagos : 0;
  const totalRetiradoMes = retiradas
    .filter(r => { const d = new Date(r.data + "T00:00:00"); return d >= monthStart && d <= monthEnd; })
    .reduce((s, r) => s + Number(r.valor), 0);
  const margem = fatMes > 0 ? (lucroLiquido / fatMes) * 100 : 0;

  const pctProLabore = Number(profile?.distribuicao_pro_labore ?? 50);
  const pctReinvest = Number(profile?.distribuicao_reinvest ?? 30);
  const pctReserva = Number(profile?.distribuicao_reserva ?? 20);

  const semDados = pagamentos.length === 0 && despesas.length === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Dashboard</h1>

      {/* Linha 1 - Faturamento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<CalendarDays className="h-4 w-4" />} label="📅 Faturamento Hoje" value={formatCurrency(fatHoje)} />
        <SummaryCard icon={<CalendarRange className="h-4 w-4" />} label="📈 Faturamento da Semana" value={formatCurrency(fatSemana)} />
        <SummaryCard icon={<CalendarCheck className="h-4 w-4" />} label="📊 Faturamento do Mês" value={formatCurrency(fatMes)} />
        <SummaryCard icon={<DollarSign className="h-4 w-4" />} label="💰 Lucro Líquido do Mês" value={formatCurrency(lucroLiquido)} valueClass={lucroLiquido >= 0 ? "text-success" : "text-destructive"} />
      </div>

      {/* Linha 2 - Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<Target className="h-4 w-4" />} label="🎯 Ticket Médio" value={formatCurrency(ticketMedio)} />
        <SummaryCard icon={<TrendingDown className="h-4 w-4" />} label="📉 Total Despesas do Mês" value={formatCurrency(despesasMes)} valueClass="text-destructive" />
        <SummaryCard icon={<Wallet className="h-4 w-4" />} label="💸 Total Retirado" value={formatCurrency(totalRetiradoMes)} />
        <SummaryCard icon={<Percent className="h-4 w-4" />} label="% Margem de Lucro" value={`${margem.toFixed(1)}%`} valueClass={margem >= 0 ? "text-success" : "text-destructive"} />
      </div>

      {/* Recomendações Inteligentes */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Recomendações Inteligentes
          </CardTitle>
          <p className="text-sm text-muted-foreground">Distribuição ideal do lucro líquido mensal</p>
        </CardHeader>
        <CardContent>
          {semDados ? (
            <p className="text-sm text-muted-foreground">Registre vendas e despesas para ver recomendações personalizadas.</p>
          ) : lucroLiquido <= 0 ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-medium">⚠️ O lucro deste mês não cobre as despesas.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-3">
              <RecCard color="success" icon={<DollarSign className="h-4 w-4" />} title={`💰 Pró-labore (${pctProLabore}%)`} desc="Você pode retirar" valor={lucroLiquido * pctProLabore / 100} />
              <RecCard color="info" icon={<RefreshCw className="h-4 w-4" />} title={`🔄 Reinvestir (${pctReinvest}%)`} desc="Recomendamos reinvestir em anúncios" valor={lucroLiquido * pctReinvest / 100} />
              <RecCard color="warning" icon={<ShieldCheck className="h-4 w-4" />} title={`🛡️ Reserva (${pctReserva}%)`} desc="Guarde como reserva de emergência" valor={lucroLiquido * pctReserva / 100} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo extra */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<Image className="h-4 w-4" />} label="Galerias" value={String(stats.galerias)} />
        <SummaryCard icon={<Users className="h-4 w-4" />} label="Clientes" value={String(stats.clientes)} />
        <SummaryCard icon={<Clock className="h-4 w-4" />} label="Pedidos pendentes" value={String(pedidos.filter(p => p.status !== "pronto").length)} />
        <SummaryCard icon={<DollarSign className="h-4 w-4" />} label="Pedidos pagos" value={String(pedidosPagos)} />
      </div>

      {/* Recent Galleries */}
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

function RecCard({ color, icon, title, desc, valor }: { color: "success" | "info" | "warning"; icon: React.ReactNode; title: string; desc: string; valor: number }) {
  const colorClass = color === "success" ? "text-success border-success/30" : color === "info" ? "text-info border-info/30" : "text-warning border-warning/30";
  return (
    <div className={`p-4 rounded-md border ${colorClass} bg-background/40`}>
      <div className="flex items-center gap-2 text-sm font-medium">{icon}{title}</div>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      <p className={`text-xl font-bold mt-2 ${colorClass.split(" ")[0]}`}>{formatCurrency(valor)}</p>
    </div>
  );
}
