import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Image, DollarSign, Clock, Users } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Period = "today" | "7days" | "30days" | "month";

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("30days");
  const [stats, setStats] = useState({ galerias: 0, receita: 0, pendentes: 0, clientes: 0 });
  const [recentGalerias, setRecentGalerias] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    const [galeriasRes, clientesRes, pagamentosRes, recentRes] = await Promise.all([
      supabase.from("galerias").select("id"),
      supabase.from("clientes").select("id"),
      supabase.from("pagamentos").select("*"),
      supabase.from("galerias").select("*, clientes(nome)")
        .order("created_at", { ascending: false }).limit(5),
    ]);

    const pagamentos = pagamentosRes.data || [];
    const receita = pagamentos.filter(p => p.status === "pago").reduce((s, p) => s + Number(p.valor_pago), 0);
    const pendentes = pagamentos.filter(p => p.status === "pendente").length;

    setStats({
      galerias: galeriasRes.data?.length || 0,
      receita,
      pendentes,
      clientes: clientesRes.data?.length || 0,
    });

    setRecentGalerias(recentRes.data || []);
    setChartData([]);
  };

  const periodLabels: Record<Period, string> = {
    today: "Hoje",
    "7days": "7 dias",
    "30days": "30 dias",
    month: "Este mês",
  };

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Dashboard</h1>

      {/* Revenue Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display">Receita</CardTitle>
            <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
          </div>
          <div className="flex gap-1">
            {(Object.keys(periodLabels) as Period[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "default" : "ghost"}
                onClick={() => setPeriod(p)}
                className="text-xs"
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary mb-4">{formatCurrency(stats.receita)}</p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Nenhuma venda neste período — Libere galerias para começar a faturar 🔑
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Image className="h-4 w-4" />
              <span className="text-xs">Galerias</span>
            </div>
            <p className="text-2xl font-bold">{stats.galerias}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-success mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Receita Total</span>
            </div>
            <p className="text-2xl font-bold text-success">{formatCurrency(stats.receita)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.pendentes}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Clientes</span>
            </div>
            <p className="text-2xl font-bold">{stats.clientes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Galleries */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Galerias Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentGalerias.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
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
            <p className="text-center text-muted-foreground py-8">
              Nenhuma galeria criada ainda
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
