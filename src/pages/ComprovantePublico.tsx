import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Camera, Loader2, Clock, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ComprovantePublico() {
  const { link } = useParams<{ link: string }>();
  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<any>(null);
  const [pacote, setPacote] = useState<any>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    (async () => {
      if (!link) return;
      const { data } = await supabase
        .from("pedidos")
        .select("*, clientes(nome)")
        .eq("link_comprovante", link)
        .maybeSingle();
      setPedido(data);
      if (data?.pacote && data?.user_id) {
        const { data: pac } = await supabase
          .from("pacotes" as any)
          .select("nome, preco, quantidade_fotos, icone")
          .eq("nome", data.pacote)
          .eq("user_id", data.user_id)
          .maybeSingle();
        setPacote(pac);
      }
      setLoading(false);
    })();
  }, [link]);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(i);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Comprovante não encontrado</h1>
          <p className="text-muted-foreground mt-2">Este link de comprovante não existe ou expirou.</p>
        </div>
      </div>
    );
  }

  const cronometro = (() => {
    if (pedido.status !== "em_andamento" || !pedido.data_entrega) return "—";
    const mins = differenceInMinutes(new Date(pedido.data_entrega), new Date());
    if (mins <= 0) return "Prazo encerrado";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m restantes`;
  })();

  return (
    <div className="min-h-screen bg-background px-4 py-8 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-6">
        <Camera className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold text-foreground">Foto Pronta</span>
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Comprovante do Pedido</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe o andamento do seu ensaio digital</p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Cliente</span>
            <span className="font-medium text-foreground">{pedido.clientes?.nome || "—"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Serviço</span>
            <span className="font-medium text-foreground text-right">{pedido.servico}</span>
          </div>
          {pedido.pacote && !pacote && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Pacote</span>
              <span className="font-medium text-foreground">{pedido.pacote}</span>
            </div>
          )}
          {pacote && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1.5">
              <p className="text-xs text-muted-foreground">Pacote adquirido</p>
              <p className="font-bold text-foreground">{(pacote as any).icone} {(pacote as any).nome}</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-semibold text-primary">R$ {Number((pacote as any).preco).toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fotos incluídas</span>
                <span className="font-medium text-foreground">{(pacote as any).quantidade_fotos} {Number((pacote as any).quantidade_fotos) === 1 ? "foto" : "fotos"}</span>
              </div>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Status</span>
            <StatusBadge status={pedido.status} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Criado em</span>
            <span className="font-medium text-foreground">
              {format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
          {pedido.data_entrega && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Prazo</span>
              <span className="font-medium text-foreground">
                {format(new Date(pedido.data_entrega), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm flex items-center gap-1"><Clock className="h-3 w-3" /> Cronômetro</span>
            <span className="font-mono text-sm text-foreground">{cronometro}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          Em caso de dúvidas, entre em contato com a Foto Pronta pelo WhatsApp.
        </p>
      </div>
    </div>
  );
}
