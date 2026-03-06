import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DollarSign, TrendingUp, Clock, Percent, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Pagamentos() {
  const { user } = useAuth();
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("todos");

  useEffect(() => {
    if (user) loadPagamentos();
  }, [user]);

  const loadPagamentos = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pagamentos")
      .select("*, clientes(nome), pedidos(servico)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPagamentos(data || []);
  };

  const filtered = pagamentos.filter(p =>
    statusFilter === "todos" || p.status === statusFilter
  );

  const receitaMes = pagamentos.filter(p => p.status === "pago").reduce((s, p) => s + Number(p.valor_pago), 0);
  const totalRecebido = receitaMes;
  const pendente = pagamentos.filter(p => p.status === "pendente").reduce((s, p) => s + Number(p.valor_total) - Number(p.valor_pago), 0);
  const conversao = pagamentos.length > 0
    ? Math.round((pagamentos.filter(p => p.status === "pago").length / pagamentos.length) * 100)
    : 0;

  const handlePay = async (pag: any, etapa: "primeira" | "segunda") => {
    const metade = Number(pag.valor_total) / 2;
    const newPago = etapa === "primeira" ? metade : Number(pag.valor_total);
    const newStatus = etapa === "primeira" ? "parcial" : "pago";

    await supabase.from("pagamentos").update({
      valor_pago: newPago,
      status: newStatus,
    }).eq("id", pag.id);

    toast.success(etapa === "primeira" ? "1ª etapa registrada!" : "Pagamento completo!");
    loadPagamentos();
  };

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Pagamentos</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><DollarSign className="h-4 w-4" /><span className="text-xs">Receita do Mês</span></div>
          <p className="text-2xl font-bold">{formatCurrency(receitaMes)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-success mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs">Total Recebido</span></div>
          <p className="text-2xl font-bold text-success">{formatCurrency(totalRecebido)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive mb-1"><Clock className="h-4 w-4" /><span className="text-xs">Pendente</span></div>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(pendente)}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Percent className="h-4 w-4" /><span className="text-xs">Conversão</span></div>
          <p className="text-2xl font-bold">{conversao}%</p>
        </CardContent></Card>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[180px] bg-input border-border"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="pago">Pago</SelectItem>
          <SelectItem value="pendente">Pendente</SelectItem>
          <SelectItem value="parcial">Parcial</SelectItem>
        </SelectContent>
      </Select>

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
                    <p className="text-xs text-muted-foreground">
                      Pago: {formatCurrency(Number(p.valor_pago))}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                  {p.status === "pendente" && (
                    <Button size="sm" onClick={() => handlePay(p, "primeira")}>
                      50% Inicial
                    </Button>
                  )}
                  {p.status === "parcial" && (
                    <Button size="sm" onClick={() => handlePay(p, "segunda")}>
                      50% Final
                    </Button>
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
            <p className="text-sm text-muted-foreground">Os pagamentos aparecerão aqui quando forem gerados</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
