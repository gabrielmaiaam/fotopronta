import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type PacoteForm = {
  id?: string;
  _local?: string;
  nome: string;
  icone: string;
  quantidade_fotos: number;
  preco: number;
  beneficios: string[];
  ordem: number;
};

const DEFAULTS: Omit<PacoteForm, "ordem">[] = [
  { icone: "🔹", nome: "Pacote Básico",     quantidade_fotos: 1,  preco: 14.90, beneficios: ["1 cenário e 1 look à sua escolha"] },
  { icone: "✨", nome: "Pacote Essencial",  quantidade_fotos: 3,  preco: 34.90, beneficios: ["1 cenário e 1 look à sua escolha", "1 ajuste gratuito após entrega"] },
  { icone: "⭐", nome: "Pacote Clássico",   quantidade_fotos: 5,  preco: 49.90, beneficios: ["1 cenário e 1 look à sua escolha", "1 ajuste gratuito após entrega"] },
  { icone: "💎", nome: "Pacote Premium",    quantidade_fotos: 10, preco: 89.90, beneficios: ["Até 2 cenários e 2 looks à sua escolha", "1 ajuste gratuito após entrega"] },
];

const fmtBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export default function PacotesManager() {
  const { user } = useAuth();
  const [pacotes, setPacotes] = useState<PacoteForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PacoteForm | null>(null);

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pacotes" as any)
      .select("*")
      .order("ordem", { ascending: true });
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (!data || data.length === 0) {
      // seed defaults
      const rows = DEFAULTS.map((d, i) => ({ ...d, ordem: i, user_id: user!.id, beneficios: d.beneficios as any }));
      const { data: inserted, error: insErr } = await supabase
        .from("pacotes" as any).insert(rows).select();
      if (insErr) { toast.error(insErr.message); setLoading(false); return; }
      setPacotes(((inserted as any[]) || []).map(normalize));
    } else {
      setPacotes((data as any[]).map(normalize));
    }
    setLoading(false);
  };

  const normalize = (r: any): PacoteForm => ({
    id: r.id,
    nome: r.nome || "",
    icone: r.icone || "📦",
    quantidade_fotos: Number(r.quantidade_fotos) || 0,
    preco: Number(r.preco) || 0,
    beneficios: Array.isArray(r.beneficios) ? r.beneficios : [],
    ordem: Number(r.ordem) || 0,
  });

  const updateLocal = (idx: number, patch: Partial<PacoteForm>) => {
    setPacotes((arr) => arr.map((p, i) => i === idx ? { ...p, ...patch } : p));
  };

  const addBeneficio = (idx: number) => {
    const p = pacotes[idx];
    updateLocal(idx, { beneficios: [...p.beneficios, ""] });
  };
  const updateBeneficio = (idx: number, bIdx: number, value: string) => {
    const p = pacotes[idx];
    updateLocal(idx, { beneficios: p.beneficios.map((b, i) => i === bIdx ? value : b) });
  };
  const removeBeneficio = (idx: number, bIdx: number) => {
    const p = pacotes[idx];
    updateLocal(idx, { beneficios: p.beneficios.filter((_, i) => i !== bIdx) });
  };

  const addNovo = () => {
    setPacotes((arr) => [
      ...arr,
      { _local: crypto.randomUUID(), nome: "Novo Pacote", icone: "📦", quantidade_fotos: 1, preco: 0, beneficios: [], ordem: arr.length },
    ]);
  };

  const save = async (idx: number) => {
    if (!user) return;
    const p = pacotes[idx];
    if (!p.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const cleanBeneficios = p.beneficios.map(b => b.trim()).filter(Boolean);
    const payload: any = {
      user_id: user.id,
      nome: p.nome.trim(),
      icone: p.icone || "📦",
      quantidade_fotos: Number(p.quantidade_fotos) || 0,
      preco: Number(p.preco) || 0,
      beneficios: cleanBeneficios,
      ordem: p.ordem,
    };
    const key = p.id || p._local!;
    setSavingId(key);
    if (p.id) {
      const { error } = await supabase.from("pacotes" as any).update(payload).eq("id", p.id);
      if (error) { toast.error(error.message); setSavingId(null); return; }
    } else {
      const { data, error } = await supabase.from("pacotes" as any).insert(payload).select().single();
      if (error) { toast.error(error.message); setSavingId(null); return; }
      updateLocal(idx, { id: (data as any).id, _local: undefined, beneficios: cleanBeneficios });
    }
    setSavingId(null);
    toast.success("Pacote salvo!");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.id) {
      const { error } = await supabase.from("pacotes" as any).delete().eq("id", deleteTarget.id);
      if (error) { toast.error(error.message); return; }
    }
    setPacotes((arr) => arr.filter(p => (p.id || p._local) !== (deleteTarget.id || deleteTarget._local)));
    setDeleteTarget(null);
    toast.success("Pacote excluído!");
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" /> Carregando pacotes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pacotes aparecem automaticamente no dropdown ao criar Galerias e Pedidos.
        </p>
        <Button onClick={addNovo} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo Pacote
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {pacotes.map((p, idx) => {
          const unit = p.quantidade_fotos > 0 ? p.preco / p.quantidade_fotos : 0;
          const key = p.id || p._local!;
          return (
            <Card key={key} className="border-border bg-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={p.icone}
                    onChange={(e) => updateLocal(idx, { icone: e.target.value })}
                    className="bg-input border-border w-16 text-center text-xl"
                    maxLength={4}
                  />
                  <Input
                    value={p.nome}
                    onChange={(e) => updateLocal(idx, { nome: e.target.value })}
                    className="bg-input border-border flex-1 font-semibold"
                    placeholder="Nome do pacote"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Quantidade de fotos</Label>
                    <Input
                      type="number" min={0}
                      value={p.quantidade_fotos}
                      onChange={(e) => updateLocal(idx, { quantidade_fotos: parseInt(e.target.value) || 0 })}
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Preço total (R$)</Label>
                    <Input
                      type="number" step="0.01" min={0}
                      value={p.preco}
                      onChange={(e) => updateLocal(idx, { preco: parseFloat(e.target.value) || 0 })}
                      className="bg-input border-border"
                    />
                  </div>
                </div>

                <div className="bg-muted/40 border border-border rounded-md px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Valor unitário por foto: </span>
                  <span className="font-semibold text-primary">
                    {p.quantidade_fotos > 0 ? fmtBRL(unit) : "—"}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Benefícios (opcional)</Label>
                    <Button variant="ghost" size="sm" onClick={() => addBeneficio(idx)} className="h-7">
                      <Plus className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {p.beneficios.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum benefício cadastrado</p>
                  ) : (
                    <div className="space-y-2">
                      {p.beneficios.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2">
                          <Input
                            value={b}
                            onChange={(e) => updateBeneficio(idx, bIdx, e.target.value)}
                            className="bg-input border-border text-sm"
                            placeholder="Ex: 1 cenário e 1 look à sua escolha"
                          />
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => removeBeneficio(idx, bIdx)}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setDeleteTarget(p)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                  <Button onClick={() => save(idx)} disabled={savingId === key}>
                    {savingId === key ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                    Salvar alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {pacotes.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum pacote cadastrado. Clique em "Novo Pacote" para começar.
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pacote?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.icone} {deleteTarget?.nome} será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
