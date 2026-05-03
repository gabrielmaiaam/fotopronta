import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Gift, Search, Copy, ExternalLink, Pencil, Trash2, CheckCircle2, Link2, Users, TrendingUp } from "lucide-react";

type Indicacao = {
  id: string;
  cliente_id: string;
  codigo: string;
  recompensa_tipo: string;
  recompensa_valor: number;
  status: string;
  created_at: string;
};

type Cliente = { id: string; nome: string };
type Lead = { id: string; indicacao_id: string; nome: string; created_at: string };

type Profile = {
  indicacao_ativo: boolean;
  indicacao_modo: string;
  indicacao_tipo: string;
  indicacao_valor: number;
};

const gerarCodigo = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

export default function Indicacoes() {
  const { user } = useAuth();
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profile, setProfile] = useState<Profile>({
    indicacao_ativo: true,
    indicacao_modo: "desconto",
    indicacao_tipo: "percentual",
    indicacao_valor: 10,
  });
  const [search, setSearch] = useState("");
  const [modalGerar, setModalGerar] = useState(false);
  const [clienteSel, setClienteSel] = useState<string>("");
  const [editing, setEditing] = useState<Indicacao | null>(null);
  const [editTipo, setEditTipo] = useState("percentual");
  const [editValor, setEditValor] = useState<string>("10");

  useEffect(() => {
    if (user) carregar();
  }, [user]);

  const carregar = async () => {
    const [{ data: ind }, { data: cli }, { data: lds }, { data: prof }] = await Promise.all([
      supabase.from("indicacoes").select("*").order("created_at", { ascending: false }),
      supabase.from("clientes").select("id,nome").order("nome"),
      supabase.from("indicacao_leads").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("indicacao_ativo,indicacao_modo,indicacao_tipo,indicacao_valor").eq("user_id", user!.id).maybeSingle(),
    ]);
    setIndicacoes((ind as Indicacao[]) || []);
    setClientes((cli as Cliente[]) || []);
    setLeads((lds as Lead[]) || []);
    if (prof) setProfile(prof as Profile);
  };

  const clientesById = useMemo(
    () => Object.fromEntries(clientes.map((c) => [c.id, c.nome])),
    [clientes]
  );
  const leadsByInd = useMemo(() => {
    const m: Record<string, Lead[]> = {};
    leads.forEach((l) => {
      m[l.indicacao_id] = m[l.indicacao_id] || [];
      m[l.indicacao_id].push(l);
    });
    return m;
  }, [leads]);

  const totalLinks = indicacoes.length;
  const totalLeads = leads.length;
  const totalConv = indicacoes.filter((i) => i.status === "convertido").length;
  const taxaConv = totalLeads > 0 ? Math.round((totalConv / totalLeads) * 100) : 0;

  const recompensaLabel = (tipo: string, valor: number) =>
    tipo === "percentual" ? `🟡 ${valor}%` : `🟡 R$ ${Number(valor).toFixed(2)}`;

  const filtradas = indicacoes.filter((i) => {
    const nome = clientesById[i.cliente_id] || "";
    const q = search.toLowerCase();
    return nome.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q);
  });

  const handleGerar = async () => {
    if (!clienteSel || !user) {
      toast.error("Selecione um cliente");
      return;
    }
    let codigo = gerarCodigo();
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase.from("indicacoes").select("id").eq("codigo", codigo).maybeSingle();
      if (!data) break;
      codigo = gerarCodigo();
    }
    const { error } = await supabase.from("indicacoes").insert({
      user_id: user.id,
      cliente_id: clienteSel,
      codigo,
      recompensa_tipo: profile.indicacao_tipo,
      recompensa_valor: profile.indicacao_valor,
    });
    if (error) return toast.error(error.message);
    toast.success("Link gerado!");
    setModalGerar(false);
    setClienteSel("");
    carregar();
  };

  const handleSalvarEdit = async () => {
    if (!editing) return;
    const valor = parseFloat(editValor);
    if (isNaN(valor) || valor < 0) return toast.error("Valor inválido");
    const { error } = await supabase
      .from("indicacoes")
      .update({ recompensa_tipo: editTipo, recompensa_valor: valor })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    setEditing(null);
    carregar();
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Excluir indicação?")) return;
    const { error } = await supabase.from("indicacoes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    carregar();
  };

  const handleConverter = async (id: string) => {
    const { error } = await supabase.from("indicacoes").update({ status: "convertido" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marcada como convertida");
    carregar();
  };

  const handleSalvarConfig = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        indicacao_ativo: profile.indicacao_ativo,
        indicacao_modo: profile.indicacao_modo,
        indicacao_tipo: profile.indicacao_tipo,
        indicacao_valor: profile.indicacao_valor,
      })
      .eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
  };

  const linkCompleto = (codigo: string) => `${window.location.origin}/indicacao/${codigo}`;

  const copiar = (codigo: string) => {
    navigator.clipboard.writeText(linkCompleto(codigo));
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Indicações</h1>
          <p className="text-muted-foreground text-sm">Gere links de indicação e acompanhe seus leads.</p>
        </div>
        <Button onClick={() => setModalGerar(true)}>
          <Plus className="h-4 w-4 mr-2" /> Gerar Link
        </Button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResumoCard icon={<Link2 className="h-5 w-5" />} label="Links gerados" value={totalLinks} />
        <ResumoCard icon={<Users className="h-5 w-5" />} label="Leads capturados" value={totalLeads} />
        <ResumoCard icon={<Gift className="h-5 w-5" />} label="Conversões" value={totalConv} />
        <ResumoCard icon={<TrendingUp className="h-5 w-5" />} label="Taxa de conversão" value={`${taxaConv}%`} />
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-semibold text-foreground">TODOS OS LINKS ({filtradas.length})</h2>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>

          {filtradas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma indicação ainda. Clique em Gerar Link para criar o primeiro.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtradas.map((ind) => {
                const lead = leadsByInd[ind.id]?.[0];
                return (
                  <div key={ind.id} className="border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{clientesById[ind.cliente_id] || "—"}</span>
                        <Badge variant={ind.status === "convertido" ? "default" : "secondary"}>
                          {ind.status === "convertido" ? "Convertido" : "Aguardando"}
                        </Badge>
                        <Badge variant="outline">{recompensaLabel(ind.recompensa_tipo, ind.recompensa_valor)}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(ind.created_at), "dd/MM/yyyy")}
                      </div>
                      <div className="text-xs text-primary truncate">{linkCompleto(ind.codigo)}</div>
                      <div className="text-xs text-muted-foreground">
                        {lead ? `Lead: ${lead.nome}` : "Nenhum lead ainda"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => copiar(ind.codigo)} title="Copiar">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => window.open(linkCompleto(ind.codigo), "_blank")} title="Abrir">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {ind.status !== "convertido" && lead && (
                        <Button size="icon" variant="ghost" onClick={() => handleConverter(ind.id)} title="Marcar convertido">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(ind);
                          setEditTipo(ind.recompensa_tipo);
                          setEditValor(String(ind.recompensa_valor));
                        }}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleExcluir(ind.id)} title="Excluir">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-semibold text-foreground">Configurações do Programa</h2>
          <div className="flex items-center justify-between">
            <Label>Programa ativo</Label>
            <Switch
              checked={profile.indicacao_ativo}
              onCheckedChange={(v) => setProfile({ ...profile, indicacao_ativo: v })}
            />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Modo de recompensa</Label>
              <Select value={profile.indicacao_modo} onValueChange={(v) => setProfile({ ...profile, indicacao_modo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="desconto">🟡 Desconto — Cliente ganha desconto</SelectItem>
                  <SelectItem value="comissao">🟡 Comissão — Estilo afiliado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de desconto</Label>
              <Select value={profile.indicacao_tipo} onValueChange={(v) => setProfile({ ...profile, indicacao_tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="valor_fixo">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor {profile.indicacao_tipo === "percentual" ? "(%)" : "(R$)"}</Label>
              <Input
                type="number"
                value={profile.indicacao_valor}
                onChange={(e) => setProfile({ ...profile, indicacao_valor: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <Button onClick={handleSalvarConfig}>Salvar configurações</Button>
        </CardContent>
      </Card>

      {/* Modal Gerar */}
      <Dialog open={modalGerar} onOpenChange={setModalGerar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Link de Indicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Selecione o cliente</Label>
              <Select value={clienteSel} onValueChange={setClienteSel}>
                <SelectTrigger><SelectValue placeholder="Escolha um cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/40 border border-border rounded-lg p-3 text-sm">
              Recompensa: {recompensaLabel(profile.indicacao_tipo, profile.indicacao_valor)} {profile.indicacao_modo === "desconto" ? "Desconto" : "Comissão"}
              <p className="text-xs text-muted-foreground mt-1">Você pode alterar nas configurações abaixo.</p>
            </div>
            <Button className="w-full" onClick={handleGerar}>Gerar Link</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Indicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={editTipo} onValueChange={setEditTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="valor_fixo">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor</Label>
              <Input type="number" value={editValor} onChange={(e) => setEditValor(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSalvarEdit}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResumoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}
