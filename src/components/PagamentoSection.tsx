import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const fmt = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;

export function PagamentoSection({
  pedido,
  defaultValor,
  onChanged,
}: {
  pedido: any;
  defaultValor: number;
  onChanged?: () => void;
}) {
  const [pag, setPag] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [valorTotal, setValorTotal] = useState<string>("");
  const [pctEntrada, setPctEntrada] = useState<number>(50);
  const [confirm, setConfirm] = useState<null | "entrada" | "saldo" | "total">(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pagamentos")
      .select("*")
      .eq("pedido_id", pedido.id)
      .maybeSingle();

    let row = data;
    if (!row) {
      const { data: ins, error } = await supabase
        .from("pagamentos")
        .insert({
          user_id: pedido.user_id,
          cliente_id: pedido.cliente_id,
          pedido_id: pedido.id,
          valor_total: defaultValor || 0,
          status: "pendente",
        })
        .select()
        .maybeSingle();
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      row = ins;
    }
    setPag(row);
    setValorTotal(Number(row.valor_total || 0).toFixed(2));
    setPctEntrada(Number((row as any).percentual_entrada ?? 50));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido.id]);

  if (loading || !pag) {
    return <p className="text-sm text-muted-foreground">Carregando pagamento…</p>;
  }

  const total = Number(valorTotal.replace(",", ".")) || 0;
  const modo = (pag as any).modo_pagamento || "entrada_saldo";
  const entradaPaga = !!(pag as any).entrada_paga_em;
  const saldoPago = !!(pag as any).saldo_pago_em || pag.status === "pago";
  const valorEntrada = total * (pctEntrada / 100);
  const valorSaldo = total - valorEntrada;

  const update = async (patch: any) => {
    const { error } = await supabase.from("pagamentos").update(patch).eq("id", pag.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    return true;
  };

  const persistTotal = async () => {
    if (Number(pag.valor_total) === total) return;
    if (await update({ valor_total: total })) {
      setPag({ ...pag, valor_total: total });
    }
  };

  const persistPct = async (p: number) => {
    if (await update({ percentual_entrada: p })) {
      setPag({ ...(pag as any), percentual_entrada: p });
    }
  };

  const toggleModo = async (antecipado: boolean) => {
    const novo = antecipado ? "total_antecipado" : "entrada_saldo";
    if (await update({ modo_pagamento: novo })) {
      setPag({ ...(pag as any), modo_pagamento: novo });
    }
  };

  const confirmEntrada = async () => {
    const ok = await update({
      valor_pago: valorEntrada,
      status: "parcial",
      entrada_paga_em: new Date().toISOString(),
      origem: "manual",
    });
    if (ok) {
      toast.success("Entrada confirmada!");
      await load();
      onChanged?.();
    }
    setConfirm(null);
  };

  const confirmSaldo = async () => {
    const ok = await update({
      valor_pago: total,
      status: "pago",
      saldo_pago_em: new Date().toISOString(),
      origem: "manual",
    });
    if (ok) {
      toast.success("Saldo confirmado! Pedido 100% pago.");
      await load();
      onChanged?.();
    }
    setConfirm(null);
  };

  const confirmTotal = async () => {
    const now = new Date().toISOString();
    const ok = await update({
      valor_pago: total,
      status: "pago",
      entrada_paga_em: now,
      saldo_pago_em: now,
      origem: "manual",
    });
    if (ok) {
      toast.success("Pagamento total confirmado!");
      await load();
      onChanged?.();
    }
    setConfirm(null);
  };

  const StatusBadgeMini = ({ ok }: { ok: boolean }) =>
    ok ? (
      <Badge className="bg-success/20 text-success border-success/30 border">Recebido</Badge>
    ) : (
      <Badge className="bg-destructive/20 text-destructive border-destructive/30 border">Pendente</Badge>
    );

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold">Pagamento</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="modo-toggle" className="text-xs">Pagamento total antecipado</Label>
          <Switch
            id="modo-toggle"
            checked={modo === "total_antecipado"}
            onCheckedChange={toggleModo}
            disabled={entradaPaga || saldoPago}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Valor total (R$)</Label>
          <Input
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            onBlur={persistTotal}
            className="bg-input border-border"
            disabled={saldoPago}
          />
        </div>
        {modo === "entrada_saldo" && (
          <div className="space-y-1">
            <Label className="text-xs">Entrada (%)</Label>
            <Input
              type="number"
              min={1}
              max={99}
              value={pctEntrada}
              onChange={(e) => setPctEntrada(Number(e.target.value))}
              onBlur={() => persistPct(pctEntrada)}
              className="bg-input border-border"
              disabled={entradaPaga}
            />
          </div>
        )}
      </div>

      {modo === "entrada_saldo" ? (
        <>
          {/* Etapa 1 */}
          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Etapa 1 — Entrada ({pctEntrada}%)</p>
                <p className="text-xs text-muted-foreground">{fmt(valorEntrada)}</p>
                {entradaPaga && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Recebida em {new Date((pag as any).entrada_paga_em).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
              <StatusBadgeMini ok={entradaPaga} />
            </div>
            {!entradaPaga && (
              <Button size="sm" className="w-full" onClick={() => setConfirm("entrada")}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar entrada de {fmt(valorEntrada)}
              </Button>
            )}
          </div>

          {/* Etapa 2 */}
          {entradaPaga && (
            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Etapa 2 — Saldo restante</p>
                  <p className="text-xs text-muted-foreground">{fmt(valorSaldo)}</p>
                  {saldoPago && (pag as any).saldo_pago_em && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Recebido em {new Date((pag as any).saldo_pago_em).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
                <StatusBadgeMini ok={saldoPago} />
              </div>
              {!saldoPago && (
                <Button size="sm" className="w-full" onClick={() => setConfirm("saldo")}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar saldo de {fmt(valorSaldo)}
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-md border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Pagamento total antecipado</p>
              <p className="text-xs text-muted-foreground">{fmt(total)}</p>
            </div>
            <StatusBadgeMini ok={saldoPago} />
          </div>
          {!saldoPago && (
            <Button size="sm" className="w-full" onClick={() => setConfirm("total")}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar pagamento total de {fmt(total)}
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar recebimento</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "entrada" && `Confirmar recebimento de ${fmt(valorEntrada)} de entrada?`}
              {confirm === "saldo" && `Confirmar recebimento de ${fmt(valorSaldo)} restantes?`}
              {confirm === "total" && `Confirmar recebimento de ${fmt(total)} (pagamento total)?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm === "entrada") confirmEntrada();
                else if (confirm === "saldo") confirmSaldo();
                else if (confirm === "total") confirmTotal();
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
