import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Upload, Trash2, Unlock, Link2, QrCode, Info, Check } from "lucide-react";
import { toast } from "sonner";

const POSITIONS = [
  { value: "sup_esq", label: "Sup. Esq." },
  { value: "sup_dir", label: "Sup. Dir." },
  { value: "centro", label: "Centro" },
  { value: "inf_esq", label: "Inf. Esq." },
  { value: "inf_dir", label: "Inf. Dir." },
  { value: "repetir", label: "Repetir" },
];

export default function GaleriaDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [galeria, setGaleria] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // Watermark state from profile
  const [marcaUrl, setMarcaUrl] = useState("");
  const [opacidade, setOpacidade] = useState(24);
  const [tamanho, setTamanho] = useState(15);
  const [posicao, setPosicao] = useState("repetir");
  const [chavePix, setChavePix] = useState("");

  // Text watermark
  const [marcaTipo, setMarcaTipo] = useState("imagem");
  const [marcaTexto, setMarcaTexto] = useState("");
  const [marcaTextoCor, setMarcaTextoCor] = useState("#FFFFFF");
  const [marcaTextoTamanho, setMarcaTextoTamanho] = useState(24);

  // Footer price
  const [precoAvulso, setPrecoAvulso] = useState("");

  useEffect(() => {
    if (user && id) loadData();
  }, [user, id]);

  const loadData = async () => {
    const [{ data: g }, { data: f }, { data: p }] = await Promise.all([
      supabase.from("galerias").select("*, clientes(nome)").eq("id", id!).single(),
      supabase.from("fotos").select("*").eq("galeria_id", id!).order("created_at", { ascending: true }),
      supabase.from("profiles").select("*").eq("user_id", user!.id).single(),
    ]);

    setGaleria(g);
    setFotos(f || []);
    if (g) setPrecoAvulso(g.preco_avulso != null ? String(g.preco_avulso) : "");
    if (p) {
      setMarcaUrl(p.marca_dagua_url || "");
      setOpacidade(p.marca_dagua_opacidade);
      setTamanho(p.marca_dagua_tamanho);
      setPosicao(p.marca_dagua_posicao);
      setChavePix(p.chave_pix || "");
      setMarcaTipo((p as any).marca_dagua_tipo || "imagem");
      setMarcaTexto((p as any).marca_dagua_texto || "");
      setMarcaTextoCor((p as any).marca_dagua_texto_cor || "#FFFFFF");
      setMarcaTextoTamanho((p as any).marca_dagua_texto_tamanho || 24);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user || !id) return;
    setUploading(true);
    for (const file of Array.from(e.target.files)) {
      const filePath = `${user.id}/${id}/${crypto.randomUUID()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("fotos").upload(filePath, file);
      if (uploadError) { toast.error(`Erro ao enviar ${file.name}`); continue; }
      const { data: { publicUrl } } = supabase.storage.from("fotos").getPublicUrl(filePath);
      await supabase.from("fotos").insert({ galeria_id: id, url: publicUrl });
    }
    toast.success("Fotos enviadas!");
    setUploading(false);
    loadData();
  };

  const handleDeleteFoto = async (fotoId: string) => {
    await supabase.from("fotos").delete().eq("id", fotoId);
    toast.success("Foto removida!");
    loadData();
  };

  const handleLiberar = async () => {
    const link = crypto.randomUUID().slice(0, 8);
    await supabase.from("galerias").update({ status: "liberada", link_publico: galeria?.link_publico || link }).eq("id", id!);
    toast.success("Galeria liberada para o cliente!");
    loadData();
  };

  const handleCopyLink = () => {
    if (!galeria?.link_publico) {
      toast.error("Libere a galeria primeiro para gerar o link.");
      return;
    }
    const url = `${window.location.origin}/galeria/${galeria.link_publico}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handleCopyPix = () => {
    if (!chavePix) { toast.error("Configure sua chave PIX em Configurações."); return; }
    navigator.clipboard.writeText(chavePix);
    toast.success("Chave PIX copiada!");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (dt.files.length > 0) {
      const fakeEvent = { target: { files: dt.files } } as any;
      handleUpload(fakeEvent);
    }
  }, [user, id]);

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user) return;
    const file = e.target.files[0];
    const filePath = `${user.id}/marca-dagua.${file.name.split(".").pop()}`;
    await supabase.storage.from("marca-dagua").upload(filePath, file, { upsert: true });
    const { data: { publicUrl } } = supabase.storage.from("marca-dagua").getPublicUrl(filePath);
    setMarcaUrl(publicUrl);
    await supabase.from("profiles").update({ marca_dagua_url: publicUrl }).eq("user_id", user.id);
    toast.success("Marca d'água carregada!");
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

  const savePrecoAvulso = async () => {
    const val = precoAvulso ? parseFloat(precoAvulso.replace(",", ".")) : null;
    const { error } = await supabase.from("galerias").update({ preco_avulso: val }).eq("id", id!);
    if (error) { toast.error(error.message); return; }
    toast.success("Preço avulso salvo!");
  };

  // Watermark preview helpers
  const getPositionStyle = (pos: string) => ({
    ...(pos === "sup_esq" && { alignItems: "flex-start" as const, justifyContent: "flex-start" as const, padding: "8%" }),
    ...(pos === "sup_dir" && { alignItems: "flex-start" as const, justifyContent: "flex-end" as const, padding: "8%" }),
    ...(pos === "centro" && {}),
    ...(pos === "inf_esq" && { alignItems: "flex-end" as const, justifyContent: "flex-start" as const, padding: "8%" }),
    ...(pos === "inf_dir" && { alignItems: "flex-end" as const, justifyContent: "flex-end" as const, padding: "8%" }),
  });

  const renderWatermarkPreview = () => {
    if (marcaTipo === "texto" && marcaTexto) {
      if (posicao === "repetir") {
        return (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0" style={{
              display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center",
              gap: `${marcaTextoTamanho}px`, opacity: opacidade / 100,
              transform: "rotate(-30deg) scale(1.5)",
            }}>
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} style={{ color: marcaTextoCor, fontSize: `${marcaTextoTamanho * 0.6}px`, fontWeight: "bold", whiteSpace: "nowrap" }}>
                  {marcaTexto}
                </span>
              ))}
            </div>
          </div>
        );
      }
      return (
        <span style={{
          color: marcaTextoCor, fontSize: `${marcaTextoTamanho * 0.6}px`,
          fontWeight: "bold", opacity: opacidade / 100, whiteSpace: "nowrap",
        }}>
          {marcaTexto}
        </span>
      );
    }
    if (marcaTipo === "imagem" && marcaUrl) {
      if (posicao === "repetir") {
        return (
          <div className="absolute inset-0" style={{
            backgroundImage: `url(${marcaUrl})`, backgroundSize: `${tamanho}%`,
            backgroundRepeat: "repeat", opacity: opacidade / 100,
            transform: "rotate(-30deg) scale(1.5)",
          }} />
        );
      }
      return <img src={marcaUrl} alt="Marca d'água" style={{ width: `${tamanho}%`, opacity: opacidade / 100 }} />;
    }
    return null;
  };

  const hasWatermark = (marcaTipo === "texto" && marcaTexto) || (marcaTipo === "imagem" && marcaUrl);

  if (!galeria) return <div className="text-muted-foreground p-8">Carregando...</div>;

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/galerias")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-display font-bold truncate">{galeria.titulo}</h1>
              <StatusBadge status={galeria.status} />
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {galeria.clientes?.nome} • {formatCurrency(Number(galeria.valor_total))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> Link
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyPix} className="gap-1.5">
            <QrCode className="h-3.5 w-3.5" /> PIX
          </Button>
          {galeria.status === "previa" && (
            <Button size="sm" onClick={handleLiberar} className="gap-1.5">
              <Unlock className="h-3.5 w-3.5" /> Liberar Galeria
            </Button>
          )}
        </div>
      </div>

      {/* TWO COLUMNS */}
      <div className="grid md:grid-cols-[35%_1fr] gap-4">
        {/* LEFT — Watermark */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="font-display text-base">Marca d'água</CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" /> A marca d'água é aplicada automaticamente
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {/* Mode indicator */}
            <p className="text-xs text-muted-foreground">
              Modo: <span className="text-foreground font-medium">{marcaTipo === "imagem" ? "Imagem" : "Texto"}</span>
              <span className="ml-1">(altere em Configurações)</span>
            </p>

            {marcaTipo === "imagem" ? (
              <>
                {/* Upload */}
                {marcaUrl ? (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <img src={marcaUrl} alt="Marca d'água" className="w-8 h-8 object-contain" />
                    <span className="text-xs flex-1 truncate">marca-dagua</span>
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild className="h-7 text-xs"><span>Trocar</span></Button>
                      <input type="file" accept="image/*" className="hidden" onChange={handleWatermarkUpload} />
                    </label>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMarcaUrl("")}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className="border border-dashed border-border rounded-lg p-4 text-center hover:border-primary transition-colors">
                      <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">Upload da logo</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleWatermarkUpload} />
                  </label>
                )}
              </>
            ) : (
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Texto:</p>
                <p className="text-sm font-medium" style={{ color: marcaTextoCor }}>{marcaTexto || "—"}</p>
              </div>
            )}

            {/* Opacity */}
            <div className="space-y-1">
              <Label className="text-xs">Opacidade: {opacidade}%</Label>
              <Slider value={[opacidade]} onValueChange={([v]) => setOpacidade(v)} min={0} max={100} step={1} />
            </div>

            {/* Size (only for image mode) */}
            {marcaTipo === "imagem" && (
              <div className="space-y-1">
                <Label className="text-xs">Tamanho: {tamanho}%</Label>
                <Slider value={[tamanho]} onValueChange={([v]) => setTamanho(v)} min={5} max={50} step={1} />
              </div>
            )}

            {/* Position */}
            <div className="space-y-1">
              <Label className="text-xs">Posição</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {POSITIONS.map((p) => (
                  <Button
                    key={p.value}
                    size="sm"
                    variant={posicao === p.value ? "default" : "outline"}
                    onClick={() => setPosicao(p.value)}
                    className="text-[10px] h-7 px-1"
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button size="sm" onClick={saveMarcaDagua} className="w-full">Salvar marca d'água</Button>

            {/* Preview */}
            <div className="relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              <div className="text-4xl">📸</div>
              {hasWatermark && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={getPositionStyle(posicao)}
                >
                  {renderWatermarkPreview()}
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Preview — após pagamento a marca d'água some automaticamente.
            </p>
          </CardContent>
        </Card>

        {/* RIGHT — Photos */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="font-display text-base">Fotos da galeria</CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" /> A marca d'água é aplicada automaticamente
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {/* Compact upload area */}
            <div
              className="border border-dashed border-border rounded-lg p-4 text-center hover:border-primary transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground mb-2">Arraste fotos aqui ou clique para selecionar</p>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" disabled={uploading} asChild className="h-7 text-xs">
                  <span>{uploading ? "Enviando..." : "Selecionar Fotos"}</span>
                </Button>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
              </label>
            </div>

            {/* Photo count */}
            <p className="text-xs text-muted-foreground font-medium">
              Fotos e Vídeos ({fotos.length})
            </p>

            {/* Photos grid */}
            {fotos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {fotos.map((foto) => (
                  <div key={foto.id} className="relative group rounded-md overflow-hidden border border-border bg-muted">
                    <img src={foto.url} alt="" className="w-full aspect-square object-cover" />
                    <button
                      onClick={() => handleDeleteFoto(foto.id)}
                      className="absolute top-1 right-1 bg-destructive/80 text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma foto enviada ainda</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FOOTER — Venda por foto avulsa */}
      <Card className="border-border bg-card">
        <CardContent className="px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-sm font-display font-semibold">Venda por foto avulsa</Label>
              <p className="text-xs text-muted-foreground">Deixe vazio para vender apenas o pacote completo</p>
              <div className="flex items-center gap-2 max-w-xs">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  value={precoAvulso}
                  onChange={(e) => setPrecoAvulso(e.target.value)}
                  placeholder="0,00"
                  className="bg-input border-border h-8 text-sm"
                />
              </div>
            </div>
            <Button size="sm" onClick={savePrecoAvulso}>Salvar configurações</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
