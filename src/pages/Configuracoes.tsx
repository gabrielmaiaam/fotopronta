import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Download, Upload, Trash2, Info, Image, Type } from "lucide-react";
import { toast } from "sonner";
import { generatePixPayload } from "@/lib/pix";

const POSITIONS = [
  { value: "sup_esq", label: "Sup. Esq." },
  { value: "sup_dir", label: "Sup. Dir." },
  { value: "centro", label: "Centro" },
  { value: "inf_esq", label: "Inf. Esq." },
  { value: "inf_dir", label: "Inf. Dir." },
  { value: "repetir", label: "Repetir" },
];

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

export default function Configuracoes() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [nomeRecebedor, setNomeRecebedor] = useState("");
  const [cidade, setCidade] = useState("");
  const [marcaUrl, setMarcaUrl] = useState("");
  const [opacidade, setOpacidade] = useState(24);
  const [tamanho, setTamanho] = useState(15);
  const [posicao, setPosicao] = useState("repetir");

  // Text watermark state
  const [marcaTipo, setMarcaTipo] = useState("imagem");
  const [marcaTexto, setMarcaTexto] = useState("");
  const [marcaTextoCor, setMarcaTextoCor] = useState("#FFFFFF");
  const [marcaTextoTamanho, setMarcaTextoTamanho] = useState(24);

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
      setMarcaUrl(data.marca_dagua_url || "");
      setOpacidade(data.marca_dagua_opacidade);
      setTamanho(data.marca_dagua_tamanho);
      setPosicao(data.marca_dagua_posicao);
      setMarcaTipo((data as any).marca_dagua_tipo || "imagem");
      setMarcaTexto((data as any).marca_dagua_texto || "");
      setMarcaTextoCor((data as any).marca_dagua_texto_cor || "#FFFFFF");
      setMarcaTextoTamanho((data as any).marca_dagua_texto_tamanho || 24);
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
      marca_dagua_url: marcaUrl,
      marca_dagua_opacidade: opacidade,
      marca_dagua_tamanho: tamanho,
      marca_dagua_posicao: posicao,
      marca_dagua_tipo: marcaTipo,
      marca_dagua_texto: marcaTexto,
      marca_dagua_texto_cor: marcaTextoCor,
      marca_dagua_texto_tamanho: marcaTextoTamanho,
    } as any).eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marca d'água salva!");
  };

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user) return;
    const file = e.target.files[0];
    const filePath = `${user.id}/marca-dagua.${file.name.split(".").pop()}`;
    await supabase.storage.from("marca-dagua").upload(filePath, file, { upsert: true });
    const { data: { publicUrl } } = supabase.storage.from("marca-dagua").getPublicUrl(filePath);
    setMarcaUrl(publicUrl);
    toast.success("Imagem carregada!");
  };

  const pixType = detectPixType(chavePix);
  const pixPayload = chavePix && nomeRecebedor && cidade
    ? generatePixPayload(chavePix, nomeRecebedor, cidade)
    : "";

  // Shared position style helper
  const getPositionStyle = (pos: string) => ({
    ...(pos === "sup_esq" && { alignItems: "flex-start" as const, justifyContent: "flex-start" as const, padding: "8%" }),
    ...(pos === "sup_dir" && { alignItems: "flex-start" as const, justifyContent: "flex-end" as const, padding: "8%" }),
    ...(pos === "centro" && {}),
    ...(pos === "inf_esq" && { alignItems: "flex-end" as const, justifyContent: "flex-start" as const, padding: "8%" }),
    ...(pos === "inf_dir" && { alignItems: "flex-end" as const, justifyContent: "flex-end" as const, padding: "8%" }),
  });

  // Render watermark preview element
  const renderWatermarkPreview = () => {
    if (marcaTipo === "texto" && marcaTexto) {
      if (posicao === "repetir") {
        return (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0" style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: `${marcaTextoTamanho * 2}px`,
              opacity: opacidade / 100,
              transform: "rotate(-30deg) scale(1.5)",
            }}>
              {Array.from({ length: 30 }).map((_, i) => (
                <span key={i} style={{ color: marcaTextoCor, fontSize: `${marcaTextoTamanho}px`, fontWeight: "bold", whiteSpace: "nowrap" }}>
                  {marcaTexto}
                </span>
              ))}
            </div>
          </div>
        );
      }
      return (
        <span style={{
          color: marcaTextoCor,
          fontSize: `${marcaTextoTamanho}px`,
          fontWeight: "bold",
          opacity: opacidade / 100,
          whiteSpace: "nowrap",
        }}>
          {marcaTexto}
        </span>
      );
    }

    if (marcaTipo === "imagem" && marcaUrl) {
      if (posicao === "repetir") {
        return (
          <div className="absolute inset-0" style={{
            backgroundImage: `url(${marcaUrl})`,
            backgroundSize: `${tamanho}%`,
            backgroundRepeat: "repeat",
            opacity: opacidade / 100,
            transform: "rotate(-30deg) scale(1.5)",
          }} />
        );
      }
      return <img src={marcaUrl} alt="Marca d'água" style={{ width: `${tamanho}%`, opacity: opacidade / 100 }} />;
    }

    return null;
  };

  const hasWatermark = (marcaTipo === "texto" && marcaTexto) || (marcaTipo === "imagem" && marcaUrl);

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
              <CardHeader><CardTitle className="font-display text-lg">⬛ Configurações PIX</CardTitle></CardHeader>
              <CardContent className="space-y-4">
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
              <CardHeader><CardTitle className="font-display text-lg">Preview do QR Code</CardTitle></CardHeader>
              <CardContent className="text-center space-y-4">
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
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="font-display text-lg">Marca d'água</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Mode selector */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={marcaTipo === "imagem" ? "default" : "outline"}
                    onClick={() => setMarcaTipo("imagem")}
                    className="gap-1.5 flex-1"
                  >
                    <Image className="h-4 w-4" /> Imagem
                  </Button>
                  <Button
                    size="sm"
                    variant={marcaTipo === "texto" ? "default" : "outline"}
                    onClick={() => setMarcaTipo("texto")}
                    className="gap-1.5 flex-1"
                  >
                    <Type className="h-4 w-4" /> Texto
                  </Button>
                </div>

                {marcaTipo === "imagem" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Imagem da marca d'água</Label>
                      {marcaUrl ? (
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <img src={marcaUrl} alt="Marca d'água" className="w-10 h-10 object-contain" />
                          <span className="text-sm flex-1 truncate">marca-dagua</span>
                          <label className="cursor-pointer">
                            <Button variant="outline" size="sm" asChild><span>Substituir</span></Button>
                            <input type="file" accept="image/*" className="hidden" onChange={handleWatermarkUpload} />
                          </label>
                          <Button variant="ghost" size="icon" onClick={() => setMarcaUrl("")}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                            <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={handleWatermarkUpload} />
                        </label>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Tamanho: {tamanho}% da largura</Label>
                      <Slider value={[tamanho]} onValueChange={([v]) => setTamanho(v)} min={5} max={50} step={1} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Texto da marca d'água</Label>
                      <Input
                        value={marcaTexto}
                        onChange={(e) => setMarcaTexto(e.target.value)}
                        placeholder="Ex: PRÉVIA, Foto Pronta"
                        className="bg-input border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Cor do texto</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={marcaTextoCor}
                          onChange={(e) => setMarcaTextoCor(e.target.value)}
                          className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
                        />
                        <Input
                          value={marcaTextoCor}
                          onChange={(e) => setMarcaTextoCor(e.target.value)}
                          className="bg-input border-border flex-1"
                          maxLength={7}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Tamanho da fonte: {marcaTextoTamanho}px</Label>
                      <Slider value={[marcaTextoTamanho]} onValueChange={([v]) => setMarcaTextoTamanho(v)} min={12} max={72} step={1} />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Opacidade: {opacidade}%</Label>
                  <Slider value={[opacidade]} onValueChange={([v]) => setOpacidade(v)} min={0} max={100} step={1} />
                </div>

                <div className="space-y-2">
                  <Label>Posição</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {POSITIONS.map((p) => (
                      <Button
                        key={p.value}
                        size="sm"
                        variant={posicao === p.value ? "default" : "outline"}
                        onClick={() => setPosicao(p.value)}
                        className="text-xs"
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button onClick={saveMarcaDagua}>Salvar configurações de marca d'água</Button>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>As configurações são aplicadas automaticamente no upload das fotos. Fotos já enviadas não são alteradas.</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="font-display text-lg">Preview em tempo real</CardTitle></CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  <div className="text-6xl">📸</div>
                  {hasWatermark && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={getPositionStyle(posicao)}
                    >
                      {renderWatermarkPreview()}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Assim o cliente vê a foto antes de pagar. Após o pagamento, a marca d'água some automaticamente.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
