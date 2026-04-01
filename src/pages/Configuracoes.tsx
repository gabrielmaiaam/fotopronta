import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Download, Info } from "lucide-react";
import { toast } from "sonner";
import { generatePixPayload } from "@/lib/pix";
import WatermarkEditor, { type WatermarkLayer } from "@/components/WatermarkEditor";

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
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [nomeRecebedor, setNomeRecebedor] = useState("");
  const [cidade, setCidade] = useState("");
  const [camadas, setCamadas] = useState<WatermarkLayer[]>([]);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
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
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ nome }).eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil salvo!");
  };

  const savePix = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      chave_pix: chavePix,
      nome_recebedor: nomeRecebedor,
      cidade,
    }).eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("PIX salvo!");
  };

  const saveMarcaDagua = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      marca_dagua_camadas: camadas as any,
    } as any).eq("user_id", user.id);
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
                <Input value={user?.email || ""} disabled className="bg-input border-border opacity-60" />
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
          {user && (
            <>
              <WatermarkEditor
                camadas={camadas}
                onChange={setCamadas}
                userId={user.id}
              />
              <div className="flex items-center gap-3 mt-4">
                <Button onClick={saveMarcaDagua}>Salvar configurações de marca d'água</Button>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-4 w-4 shrink-0" />
                  As configurações são aplicadas automaticamente no upload das fotos. Fotos já enviadas não são alteradas.
                </p>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
