import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { Camera, Gift, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const leadSchema = z.object({
  nome: z.string().trim().min(1, "Informe seu nome").max(100),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
});

type Indicacao = {
  id: string;
  user_id: string;
  recompensa_tipo: string;
  recompensa_valor: number;
};

export default function IndicacaoPublica() {
  const { codigo } = useParams<{ codigo: string }>();
  const [loading, setLoading] = useState(true);
  const [indicacao, setIndicacao] = useState<Indicacao | null>(null);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      if (!codigo) return;
      const { data } = await supabase
        .from("indicacoes")
        .select("id,user_id,recompensa_tipo,recompensa_valor")
        .eq("codigo", codigo)
        .maybeSingle();
      setIndicacao(data as Indicacao | null);
      setLoading(false);
    })();
  }, [codigo]);

  const recompensaTexto = indicacao
    ? indicacao.recompensa_tipo === "percentual"
      ? `${Number(indicacao.recompensa_valor)}% de desconto`
      : `R$ ${Number(indicacao.recompensa_valor).toFixed(2)} de desconto`
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicacao) return;
    const parsed = leadSchema.safeParse({ nome, whatsapp });
    if (!parsed.success) {
      toast({ title: "Verifique os dados", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("indicacao_leads").insert({
      indicacao_id: indicacao.id,
      user_id: indicacao.user_id,
      nome: parsed.data.nome,
      whatsapp: parsed.data.whatsapp || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!indicacao) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Link inválido</h1>
          <p className="text-muted-foreground mt-2">Este link de indicação não existe ou expirou.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-8">
        <Camera className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold text-foreground">Foto Pronta</span>
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl">
        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Tudo certo!</h1>
            <p className="text-muted-foreground">
              Recebemos seus dados. Em breve a Foto Pronta entrará em contato com você para o seu ensaio digital.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🎁</div>
              <h1 className="text-2xl font-bold text-foreground">Você foi indicado!</h1>
              <p className="text-muted-foreground mt-2">
                Um amigo indicou a Foto Pronta para você. Preencha seus dados para solicitar seu ensaio digital!
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 rounded-lg px-4 py-3 mb-6 text-sm text-center">
              🎁 Seu amigo ganha {recompensaTexto} na próxima sessão!
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Seu nome *</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} required />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
                <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={20} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Quero solicitar meu ensaio!"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Ao enviar, você receberá seus dados para contato.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
