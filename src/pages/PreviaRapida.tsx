import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, ImagePlus, Trash2, Download, Send } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

interface ProcessedPhoto {
  name: string;
  blob: Blob;
  previewUrl: string;
  uploadedUrl?: string;
}

const POSITIONS = [
  { value: "sup_esq", label: "Sup. Esq." },
  { value: "sup_dir", label: "Sup. Dir." },
  { value: "centro", label: "Centro" },
  { value: "inf_esq", label: "Inf. Esq." },
  { value: "inf_dir", label: "Inf. Dir." },
  { value: "repetir", label: "Repetir" },
];

export default function PreviaRapida() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [opacidade, setOpacidade] = useState(30);
  const [tamanho, setTamanho] = useState(25);
  const [posicao, setPosicao] = useState("repetir");
  const [whatsapp, setWhatsapp] = useState("");
  const [photos, setPhotos] = useState<ProcessedPhoto[]>([]);
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Load logo from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("marca_dagua_camadas, marca_dagua_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const camadas = data.marca_dagua_camadas as any[];
        if (camadas && camadas.length > 0) {
          const logoLayer = camadas.find((c: any) => c.tipo === "logo" && c.url);
          if (logoLayer) {
            setLogoUrl(logoLayer.url);
            setOpacidade(logoLayer.opacidade ?? 30);
            setTamanho(logoLayer.tamanho ?? 25);
            setPosicao(logoLayer.posicao ?? "repetir");
            return;
          }
        }
        if (data.marca_dagua_url) {
          setLogoUrl(data.marca_dagua_url);
        }
      });
  }, [user]);

  const applyWatermark = useCallback(
    async (file: File): Promise<ProcessedPhoto> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);

          if (!logoUrl) {
            canvas.toBlob(
              (blob) => {
                if (blob) resolve({ name: file.name, blob, previewUrl: URL.createObjectURL(blob) });
                else reject(new Error("Failed to create blob"));
              },
              "image/jpeg",
              0.92
            );
            return;
          }

          const logo = new Image();
          logo.crossOrigin = "anonymous";
          logo.onload = () => {
            ctx.globalAlpha = opacidade / 100;
            const logoW = (canvas.width * tamanho) / 100;
            const logoH = (logo.height / logo.width) * logoW;
            const pad = canvas.width * 0.05;

            if (posicao === "repetir") {
              const gapX = logoW * 0.5;
              const gapY = logoH * 0.5;
              ctx.save();
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate((-30 * Math.PI) / 180);
              const diag = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
              for (let y = -diag; y < diag; y += logoH + gapY) {
                for (let x = -diag; x < diag; x += logoW + gapX) {
                  ctx.drawImage(logo, x, y, logoW, logoH);
                }
              }
              ctx.restore();
            } else {
              let x = 0, y = 0;
              switch (posicao) {
                case "sup_esq": x = pad; y = pad; break;
                case "sup_dir": x = canvas.width - logoW - pad; y = pad; break;
                case "centro": x = (canvas.width - logoW) / 2; y = (canvas.height - logoH) / 2; break;
                case "inf_esq": x = pad; y = canvas.height - logoH - pad; break;
                case "inf_dir": x = canvas.width - logoW - pad; y = canvas.height - logoH - pad; break;
              }
              ctx.drawImage(logo, x, y, logoW, logoH);
            }

            ctx.globalAlpha = 1;
            canvas.toBlob(
              (blob) => {
                if (blob) resolve({ name: file.name, blob, previewUrl: URL.createObjectURL(blob) });
                else reject(new Error("Failed to create blob"));
              },
              "image/jpeg",
              0.92
            );
          };
          logo.onerror = () => {
            // If logo fails to load, return original
            canvas.toBlob(
              (blob) => {
                if (blob) resolve({ name: file.name, blob, previewUrl: URL.createObjectURL(blob) });
                else reject(new Error("Failed to create blob"));
              },
              "image/jpeg",
              0.92
            );
          };
          logo.src = logoUrl;
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = URL.createObjectURL(file);
      });
    },
    [logoUrl, opacidade, tamanho, posicao]
  );

  const handleFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    setProcessing(true);
    try {
      const results = await Promise.all(imageFiles.map((f) => applyWatermark(f)));
      setPhotos((prev) => [...prev, ...results]);
      toast.success(`${results.length} foto(s) processada(s)!`);
    } catch {
      toast.error("Erro ao processar fotos");
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const clearAll = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
  };

  const downloadAll = async () => {
    if (photos.length === 0) return;
    if (photos.length === 1) {
      const a = document.createElement("a");
      a.href = photos[0].previewUrl;
      a.download = `previa-${photos[0].name}`;
      a.click();
      return;
    }
    const zip = new JSZip();
    photos.forEach((p) => zip.file(`previa-${p.name}`, p.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = "previas.zip";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const sendAll = async () => {
    if (!user || photos.length === 0) return;
    const cleanNumber = whatsapp.replace(/\D/g, "");
    if (cleanNumber.length < 10) {
      toast.error("Informe um número de WhatsApp válido");
      return;
    }

    setSending(true);
    try {
      const links: string[] = [];
      for (const photo of photos) {
        if (photo.uploadedUrl) {
          links.push(photo.uploadedUrl);
          continue;
        }
        const ext = photo.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("previa-rapida").upload(filePath, photo.blob, { upsert: true });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("previa-rapida").getPublicUrl(filePath);
        photo.uploadedUrl = publicUrl;
        links.push(publicUrl);
      }

      const linksText = links.map((l) => `📷 ${l}`).join("\n");
      const msg = `Olá! 🔷\n\nSegue a prévia das suas fotos:\n\n${linksText}\n\nO que achou? 🔷`;
      const fullNumber = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;
      window.open(`https://wa.me/${fullNumber}?text=${encodeURIComponent(msg)}`, "_blank");
      toast.success("Redirecionando para WhatsApp...");
    } catch {
      toast.error("Erro ao enviar fotos");
    } finally {
      setSending(false);
    }
  };

  const formatWhatsapp = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Prévia Rápida</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Envie fotos e gere prévias com marca d'água instantaneamente, sem precisar cadastrar cliente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[35%_1fr] gap-6">
        {/* Left column - Watermark config */}
        <Card className="border-border bg-card">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Marca d'água
            </div>

            {/* Logo preview */}
            <div className="border border-dashed border-border rounded-lg p-6 flex items-center justify-center bg-muted/30 min-h-[120px]">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-20 object-contain" />
              ) : (
                <p className="text-xs text-muted-foreground text-center">Nenhuma logomarca configurada</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {logoUrl ? "Logomarca carregada automaticamente" : "Configure sua logomarca em Configurações"}
            </p>

            <div className="space-y-1">
              <Label className="text-xs">Opacidade: {opacidade}%</Label>
              <Slider value={[opacidade]} onValueChange={([v]) => setOpacidade(v)} min={0} max={100} step={1} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tamanho: {tamanho}%</Label>
              <Slider value={[tamanho]} onValueChange={([v]) => setTamanho(v)} min={5} max={100} step={1} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Posição</Label>
              <Select value={posicao} onValueChange={setPosicao}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Right column - Upload & photos */}
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors min-h-[200px] flex flex-col items-center justify-center gap-3 ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <ImagePlus className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Arraste suas fotos aqui</p>
              <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {/* Actions bar */}
          {photos.length > 0 && (
            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Send className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">WhatsApp do cliente:</span>
                    <Input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className="bg-input border-border h-8 text-sm max-w-[180px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">
                    {photos.length} foto(s) processada(s)
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={clearAll} className="gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" /> Limpar
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadAll} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" /> Baixar todas
                    </Button>
                    <Button size="sm" onClick={sendAll} disabled={sending || !whatsapp} className="gap-1.5">
                      <Send className="h-3.5 w-3.5" /> {sending ? "Enviando..." : "Enviar todas"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photo grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border border-border bg-card">
                  <img src={photo.previewUrl} alt={photo.name} className="w-full aspect-square object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-2 py-1">
                    <p className="text-[10px] text-muted-foreground truncate">{photo.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {processing && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground animate-pulse">Processando fotos...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
