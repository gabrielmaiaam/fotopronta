import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Download, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generatePixPayload } from "@/lib/pix";
import WatermarkEditor, { type WatermarkLayer } from "@/components/WatermarkEditor";
import PacotesManager from "@/components/PacotesManager";
import * as XLSX from "xlsx";
import { format } from "date-fns";

type SheetSpec = { name: string; rows: Record<string, any>[] };

function downloadXlsx(sheets: SheetSpec[], filename: string) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

function fmtDate(v: any) {
  if (!v) return "";
  try { return format(new Date(v), "dd/MM/yyyy"); } catch { return ""; }
}
function fmtMonthYear(v: any) {
  if (!v) return "";
  try { return format(new Date(v), "MM/yyyy"); } catch { return ""; }
}
function backupFilename(suffix?: string) {
  const d = format(new Date(), "dd-MM-yyyy");
  return `FotoPronta_Backup${suffix ? "_" + suffix : ""}_${d}.xlsx`;
}

async function fetchClientesSheet(): Promise<SheetSpec> {
  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("id, nome, whatsapp, email, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const { data: galerias } = await supabase.from("galerias").select("cliente_id");
  const counts = new Map<string, number>();
  (galerias || []).forEach((g: any) => {
    if (g.cliente_id) counts.set(g.cliente_id, (counts.get(g.cliente_id) || 0) + 1);
  });
  return {
    name: "Clientes",
    rows: (clientes || []).map((c: any) => ({
      Nome: c.nome,
      WhatsApp: c.whatsapp || "",
      Email: c.email || "",
      Galerias: counts.get(c.id) || 0,
      "Data de cadastro": fmtDate(c.created_at),
    })),
  };
}

async function fetchGaleriasSheet(): Promise<SheetSpec> {
  const { data, error } = await supabase
    .from("galerias")
    .select("titulo, status, valor_total, created_at, clientes(nome)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return {
    name: "Galerias",
    rows: (data || []).map((g: any) => ({
      Título: g.titulo,
      Cliente: g.clientes?.nome || "",
      Status: g.status,
      Valor: Number(g.valor_total) || 0,
      "Data de criação": fmtDate(g.created_at),
    })),
  };
}

async function fetchPedidosSheet(): Promise<SheetSpec> {
  const { data, error } = await supabase
    .from("pedidos")
    .select("servico, data_entrega, status, origem_cliente, created_at, clientes(nome)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return {
    name: "Pedidos",
    rows: (data || []).map((p: any) => ({
      Cliente: p.clientes?.nome || "",
      Serviço: p.servico,
      Entrega: fmtDate(p.data_entrega),
      Status: p.status,
      Origem: p.origem_cliente || "",
      "Data": fmtDate(p.created_at),
    })),
  };
}

async function fetchFinanceiroSheet(): Promise<SheetSpec> {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("valor_total, valor_pago, status, created_at, clientes(nome)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return {
    name: "Financeiro",
    rows: (data || []).map((p: any) => ({
      Cliente: p.clientes?.nome || "",
      "Valor Total": Number(p.valor_total) || 0,
      "Valor Pago": Number(p.valor_pago) || 0,
      Status: p.status,
      Data: fmtDate(p.created_at),
    })),
  };
}

async function fetchDespesasSheet(): Promise<SheetSpec> {
  const { data, error } = await supabase
    .from("despesas")
    .select("nome, valor, categoria, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return {
    name: "Despesas",
    rows: (data || []).map((d: any) => ({
      Nome: d.nome,
      Valor: Number(d.valor) || 0,
      Tipo: d.categoria,
      "Mês/Ano": fmtMonthYear(d.created_at),
    })),
  };
}

function detectPixType(key: string): string {
  if (!key) return "";
  if (key.includes("@")) return "E-mail";
  if (/^\d{11}$/.test(key.replace(/\D/g, ""))) {
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(key) || /^\d{11}$/.test(key)) return "CPF";
    return "Telefone";
  }
  if (/^\d{14}$/.test(key.replace(/\D/g, ""))) return "CNPJ";
  if (key.length >= 32) return "Chave aleatória";
  if (/^\d{10,11}$/.test(key.replace(/\D/g, ""))) return "Telefone";
  return "Chave PIX";
}

function migrateLegacyWatermark(profile: any): WatermarkLayer[] {
  if (profile.marca_dagua_camadas && (profile.marca_dagua_camadas as any[]).length > 0) {
    return profile.marca_dagua_camadas as WatermarkLayer[];
  }
  const layers: WatermarkLayer[] = [];
  const tipo = profile.marca_dagua_tipo || "imagem";
  if (tipo === "texto" && profile.marca_dagua_texto) {
    layers.push({
      tipo: "texto",
      texto: profile.marca_dagua_texto,
      cor: profile.marca_dagua_texto_cor || "#FFFFFF",
      tamanho: profile.marca_dagua_texto_tamanho || 24,
      opacidade: profile.marca_dagua_opacidade || 24,
      posicao: profile.marca_dagua_posicao || "repetir",
    });
  } else if (tipo === "imagem" && profile.marca_dagua_url) {
    layers.push({
      tipo: "logo",
      url: profile.marca_dagua_url,
      tamanho: profile.marca_dagua_tamanho || 15,
      opacidade: profile.marca_dagua_opacidade || 24,
      posicao: profile.marca_dagua_posicao || "repetir",
    });
  }
  return layers;
}

export default function Configuracoes() {
  const [profile, setProfile] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [nomeRecebedor, setNomeRecebedor] = useState("");
  const [cidade, setCidade] = useState("");
  const [camadas, setCamadas] = useState<WatermarkLayer[]>([]);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingClientes, setExportingClientes] = useState(false);
  const [exportingPedidos, setExportingPedidos] = useState(false);
  const [exportingFinanceiro, setExportingFinanceiro] = useState(false);

  const runExport = async (
    setLoading: (v: boolean) => void,
    build: () => Promise<{ sheets: SheetSpec[]; filename: string }>,
  ) => {
    setLoading(true);
    try {
      const { sheets, filename } = await build();
      downloadXlsx(sheets, filename);
      toast.success("Backup gerado com sucesso!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar backup");
    } finally {
      setLoading(false);
    }
  };

  const exportAll = () => runExport(setExportingAll, async () => {
    const [clientes, galerias, pedidos, financeiro, despesas] = await Promise.all([
      fetchClientesSheet(), fetchGaleriasSheet(), fetchPedidosSheet(),
      fetchFinanceiroSheet(), fetchDespesasSheet(),
    ]);
    return { sheets: [clientes, galerias, pedidos, financeiro, despesas], filename: backupFilename() };
  });
  const exportClientes = () => runExport(setExportingClientes, async () => ({
    sheets: [await fetchClientesSheet()], filename: backupFilename("Clientes"),
  }));
  const exportPedidos = () => runExport(setExportingPedidos, async () => ({
    sheets: [await fetchPedidosSheet()], filename: backupFilename("Pedidos"),
  }));
  const exportFinanceiro = () => runExport(setExportingFinanceiro, async () => ({
    sheets: [await fetchFinanceiroSheet()], filename: backupFilename("Financeiro"),
  }));

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").limit(1).single();
    if (data) {
      setProfile(data);
      setNome(data.nome);
      setChavePix(data.chave_pix || "");
      setNomeRecebedor(data.nome_recebedor || "");
      setCidade(data.cidade || "");
      setCamadas(migrateLegacyWatermark(data));
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ nome }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil salvo!");
  };

  const savePix = async () => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({
      chave_pix: chavePix,
      nome_recebedor: nomeRecebedor,
      cidade,
    }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success("PIX salvo!");
  };

  const saveMarcaDagua = async () => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({
      marca_dagua_camadas: camadas as any,
    } as any).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marca d'água salva!");
  };

  const pixType = detectPixType(chavePix);
  const pixPayload = chavePix && nomeRecebedor && cidade
    ? generatePixPayload(chavePix, nomeRecebedor, cidade)
    : "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Configurações</h1>

      <Tabs defaultValue="perfil">
        <TabsList className="bg-muted">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="pix">PIX & QR Code</TabsTrigger>
          <TabsTrigger value="marca">Marca d'água</TabsTrigger>
          <TabsTrigger value="pacotes">Pacotes & Preços</TabsTrigger>
          <TabsTrigger value="backup">Backup & Exportação</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <Card className="border-border bg-card max-w-lg">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email || ""} disabled className="bg-input border-border opacity-60" />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Input value={profile?.plano || "Free"} disabled className="bg-input border-border opacity-60" />
              </div>
              <Button onClick={saveProfile}>Salvar perfil</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pix">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border bg-card">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-display text-lg font-semibold">⬛ Configurações PIX</h3>
                <div className="space-y-2">
                  <Label>Chave PIX</Label>
                  <Input value={chavePix} onChange={(e) => setChavePix(e.target.value)} placeholder="Email, CPF, telefone ou chave aleatória" className="bg-input border-border" />
                  {pixType && <p className="text-xs text-primary">Tipo detectado: {pixType}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Nome do recebedor</Label>
                  <Input value={nomeRecebedor} onChange={(e) => setNomeRecebedor(e.target.value)} placeholder="Nome que aparece no app do banco" className="bg-input border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={cidade} onChange={(e) => setCidade(e.target.value)} className="bg-input border-border" />
                </div>
                <Button onClick={savePix}>Salvar configurações PIX</Button>
                {!pixPayload && chavePix && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" /> Preencha nome do recebedor e cidade para gerar o QR Code válido.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-6 text-center space-y-4">
                <h3 className="font-display text-lg font-semibold">Preview do QR Code</h3>
                <div className="w-48 h-48 mx-auto bg-muted rounded-lg flex items-center justify-center">
                  {pixPayload ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(pixPayload)}`}
                      alt="QR Code PIX"
                      className="rounded"
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm px-4">
                      {chavePix ? "Preencha todos os campos" : "Configure sua chave PIX"}
                    </p>
                  )}
                </div>
                {pixType && <p className="text-sm text-muted-foreground">Chave {pixType}</p>}
                {pixPayload && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(pixPayload)}`}
                      download="qrcode-pix.png"
                    >
                      <Download className="h-4 w-4 mr-1" /> Baixar QR Code
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="marca">
              <WatermarkEditor
                camadas={camadas}
                onChange={setCamadas}
                userId="uploads"
              />
              <div className="flex items-center gap-3 mt-4">
                <Button onClick={saveMarcaDagua}>Salvar configurações de marca d'água</Button>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-4 w-4 shrink-0" />
                  As configurações são aplicadas automaticamente no upload das fotos. Fotos já enviadas não são alteradas.
                </p>
              </div>
        </TabsContent>

        <TabsContent value="backup">
          <Card className="border-border bg-card max-w-2xl">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-display text-lg font-semibold">Backup completo</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Gera um arquivo Excel (.xlsx) com todas as tabelas do sistema: clientes, galerias, pedidos, financeiro e despesas.
                </p>
              </div>
              <Button onClick={exportAll} disabled={exportingAll} size="lg" className="w-full sm:w-auto">
                {exportingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {exportingAll ? "Gerando..." : "⬇️ Exportar tudo em Excel"}
              </Button>

              <div className="border-t border-border pt-6">
                <h3 className="font-display text-lg font-semibold mb-1">Exportações individuais</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Baixe apenas a tabela que você precisa.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={exportClientes} disabled={exportingClientes}>
                    {exportingClientes ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    {exportingClientes ? "Gerando..." : "⬇️ Exportar só Clientes"}
                  </Button>
                  <Button variant="outline" onClick={exportPedidos} disabled={exportingPedidos}>
                    {exportingPedidos ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    {exportingPedidos ? "Gerando..." : "⬇️ Exportar só Pedidos"}
                  </Button>
                  <Button variant="outline" onClick={exportFinanceiro} disabled={exportingFinanceiro}>
                    {exportingFinanceiro ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    {exportingFinanceiro ? "Gerando..." : "⬇️ Exportar só Financeiro"}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground flex items-start gap-1 pt-2 border-t border-border">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Os arquivos são gerados no seu navegador e baixados automaticamente. Nome do arquivo: FotoPronta_Backup_DD-MM-AAAA.xlsx
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
