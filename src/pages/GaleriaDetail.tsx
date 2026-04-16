import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, Trash2, Unlock, Link2, QrCode, Info, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import WatermarkEditor, { type WatermarkLayer } from "@/components/WatermarkEditor";

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

export default function GaleriaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [galeria, setGaleria] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [isLiberarDialogOpen, setIsLiberarDialogOpen] = useState(false);
  const [isRevogarDialogOpen, setIsRevogarDialogOpen] = useState(false);

  const [camadas, setCamadas] = useState<WatermarkLayer[]>([]);
  const [chavePix, setChavePix] = useState("");
  const [precoAvulso, setPrecoAvulso] = useState("");

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    const [{ data: g }, { data: f }, { data: p }] = await Promise.all([
      supabase.from("galerias").select("*, clientes(nome)").eq("id", id!).single(),
      supabase.from("fotos").select("*").eq("galeria_id", id!).order("created_at", { ascending: true }),
      supabase.from("profiles").select("*").limit(1).single(),
    ]);

    setGaleria(g);
    setFotos(f || []);
    if (g) setPrecoAvulso(g.preco_avulso != null ? String(g.preco_avulso) : "");
    if (p) {
      setChavePix(p.chave_pix || "");
      setCamadas(migrateLegacyWatermark(p));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id) return;
    setUploading(true);
    for (const file of Array.from(e.target.files)) {
      const filePath = `uploads/${id}/${crypto.randomUUID()}.${file.name.split(".").pop()}`;
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
    setStatusActionLoading(true);
    const link = crypto.randomUUID().slice(0, 8);
    const { error } = await supabase
      .from("galerias")
      .update({ status: "liberada", link_publico: galeria?.link_publico || link })
      .eq("id", id!);
    setStatusActionLoading(false);
    if (error) { toast.error(error.message); return; }
    setIsLiberarDialogOpen(false);
    toast.success("Galeria liberada para o cliente!");
    loadData();
  };

  const handleRevogarAcesso = async () => {
    setStatusActionLoading(true);
    const { error } = await supabase.from("galerias").update({ status: "previa" }).eq("id", id!);
    setStatusActionLoading(false);
    if (error) { toast.error(error.message); return; }
    setIsRevogarDialogOpen(false);
    toast.success("Acesso revogado. O cliente voltou a ver apenas as prévias.");
    loadData();
  };

  const handleCopyLink = () => {
    if (!galeria?.link_publico) { toast.error("Libere a galeria primeiro para gerar o link."); return; }
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
  }, [id]);

  const saveMarcaDagua = async () => {
    if (!galeria) return;
    const { data: p } = await supabase.from("profiles").select("id").limit(1).single();
    if (!p) return;
    const { error } = await supabase.from("profiles").update({
      marca_dagua_camadas: camadas as any,
    } as any).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marca d'água salva!");
  };

  const savePrecoAvulso = async () => {
    const val = precoAvulso ? parseFloat(precoAvulso.replace(",", ".")) : null;
    const { error } = await supabase.from("galerias").update({ preco_avulso: val }).eq("id", id!);
    if (error) { toast.error(error.message); return; }
    toast.success("Preço avulso salvo!");
  };

  if (!galeria) return <div className="text-muted-foreground p-8">Carregando...</div>;

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <>
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
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Link
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyPix} className="gap-1.5">
              <QrCode className="h-3.5 w-3.5" /> PIX
            </Button>
            {galeria.status === "previa" ? (
              <Button size="sm" onClick={() => setIsLiberarDialogOpen(true)} className="gap-1.5">
                <Unlock className="h-3.5 w-3.5" /> Liberar Galeria
              </Button>
            ) : (
              <Button variant="destructive" size="sm" onClick={() => setIsRevogarDialogOpen(true)} className="gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Revogar Acesso
              </Button>
            )}
          </div>
        </div>

        {/* TWO COLUMNS */}
        <div className="grid md:grid-cols-[35%_1fr] gap-4">
          {/* LEFT — Watermark */}
          <div className="space-y-3">
            <WatermarkEditor
                camadas={camadas}
                onChange={setCamadas}
                userId="uploads"
                compact
              />
            <Button size="sm" onClick={saveMarcaDagua} className="w-full">Salvar marca d'água</Button>
            <p className="text-[10px] text-muted-foreground text-center flex items-center gap-1 justify-center">
              <Info className="h-3 w-3 shrink-0" /> A marca d'água é aplicada automaticamente
            </p>
          </div>

          {/* RIGHT — Photos */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="font-display text-base">Fotos da galeria</CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> A marca d'água é aplicada automaticamente
              </p>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {/* Upload area */}
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

              {fotos.some((f) => f.aprovada) && (
                <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 rounded-md px-2 py-1 w-fit">
                  <Check className="h-3 w-3" />
                  {fotos.filter((f) => f.aprovada).length} foto(s) selecionada(s) pelo cliente
                </div>
              )}

              {fotos.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                  {fotos.map((foto) => (
                    <div
                      key={foto.id}
                      className={`relative group rounded-md overflow-hidden bg-muted border-2 transition-all ${
                        foto.aprovada ? "border-primary ring-1 ring-primary/30" : "border-border"
                      }`}
                    >
                      <img src={foto.url} alt="" className="w-full aspect-square object-cover" />
                      {foto.aprovada && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
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

      <AlertDialog open={isLiberarDialogOpen} onOpenChange={setIsLiberarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liberar fotos para o cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja liberar as fotos para o cliente? Ele poderá ver e baixar as imagens sem marca d'água.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusActionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLiberar} disabled={statusActionLoading}>
              {statusActionLoading ? "Liberando..." : "Liberar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRevogarDialogOpen} onOpenChange={setIsRevogarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar acesso do cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? O cliente perderá acesso às fotos sem marca d'água e voltará a ver apenas as prévias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusActionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevogarAcesso}
              disabled={statusActionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {statusActionLoading ? "Revogando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
