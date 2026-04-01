import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Check, CheckCircle2, Download, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { WatermarkLayer } from "@/components/WatermarkEditor";

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

const getPositionStyle = (pos: string): React.CSSProperties => ({
  ...(pos === "sup_esq" && { alignItems: "flex-start", justifyContent: "flex-start", padding: "8%" }),
  ...(pos === "sup_dir" && { alignItems: "flex-start", justifyContent: "flex-end", padding: "8%" }),
  ...(pos === "centro" && {}),
  ...(pos === "inf_esq" && { alignItems: "flex-end", justifyContent: "flex-start", padding: "8%" }),
  ...(pos === "inf_dir" && { alignItems: "flex-end", justifyContent: "flex-end", padding: "8%" }),
});

function WatermarkOverlay({ layer, index }: { layer: WatermarkLayer; index: number }) {
  if (layer.tipo === "texto" && layer.texto) {
    if (layer.posicao === "repetir") {
      return (
        <div key={index} className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0" style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center",
            gap: `${(layer.tamanho || 24) * 1.2}px`,
            opacity: (layer.opacidade ?? 50) / 100,
            transform: "rotate(-30deg) scale(1.5)",
          }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} style={{
                color: layer.cor || "#FFFFFF",
                fontSize: `${Math.max(10, (layer.tamanho || 24) * 0.5)}px`,
                fontWeight: "bold",
                whiteSpace: "nowrap",
              }}>
                {layer.texto}
              </span>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div key={index} className="absolute inset-0 flex items-center justify-center pointer-events-none" style={getPositionStyle(layer.posicao)}>
        <span style={{
          color: layer.cor || "#FFFFFF",
          fontSize: `${Math.max(10, (layer.tamanho || 24) * 0.5)}px`,
          fontWeight: "bold",
          opacity: (layer.opacidade ?? 50) / 100,
          whiteSpace: "nowrap",
        }}>
          {layer.texto}
        </span>
      </div>
    );
  }

  if (layer.tipo === "logo" && layer.url) {
    if (layer.posicao === "repetir") {
      return (
        <div key={index} className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `url(${layer.url})`,
          backgroundSize: `${layer.tamanho || 15}%`,
          backgroundRepeat: "repeat",
          opacity: (layer.opacidade ?? 30) / 100,
          transform: "rotate(-30deg) scale(1.5)",
        }} />
      );
    }
    return (
      <div key={index} className="absolute inset-0 flex items-center justify-center pointer-events-none" style={getPositionStyle(layer.posicao)}>
        <img src={layer.url} alt="" style={{ width: `${layer.tamanho || 15}%`, opacity: (layer.opacidade ?? 30) / 100 }} />
      </div>
    );
  }

  return null;
}

export default function GaleriaPublica() {
  const { link } = useParams();
  const [galeria, setGaleria] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [camadas, setCamadas] = useState<WatermarkLayer[]>([]);

  useEffect(() => {
    if (link) loadGaleria();
  }, [link]);

  const loadGaleria = async () => {
    const { data: g } = await supabase
      .from("galerias")
      .select("*, clientes(nome)")
      .eq("link_publico", link!)
      .single();

    if (g) {
      setGaleria(g);
      const { data: f } = await supabase
        .from("fotos")
        .select("*")
        .eq("galeria_id", g.id)
        .order("created_at", { ascending: true });
      setFotos(f || []);
      const approved = new Set((f || []).filter((p: any) => p.aprovada).map((p: any) => p.id));
      setSelected(approved);

      // Load watermark config from owner's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", g.user_id)
        .single();
      if (profile) {
        setCamadas(migrateLegacyWatermark(profile));
      }
    }
    setLoading(false);
  };

  const isReleased = galeria?.status === "liberada";

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmSelection = async () => {
    if (!galeria || selected.size === 0) {
      toast.error("Selecione ao menos uma foto.");
      return;
    }
    setSaving(true);
    await supabase.from("fotos").update({ aprovada: false }).eq("galeria_id", galeria.id);
    if (selected.size > 0) {
      await supabase.from("fotos").update({ aprovada: true }).in("id", Array.from(selected));
    }
    toast.success("Seleção confirmada com sucesso!");
    setSaving(false);
  };

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `foto-${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Erro ao baixar a foto.");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Camera className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-muted-foreground">Carregando galeria...</p>
        </div>
      </div>
    );

  if (!galeria)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <Image className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">Galeria não encontrada</p>
          <p className="text-sm text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );

  const showWatermark = !isReleased && camadas.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Camera className="h-5 w-5 text-primary shrink-0" />
            <span className="font-display font-bold text-primary text-sm">Foto Pronta</span>
            <span className="text-muted-foreground text-xs">•</span>
            <h1 className="font-display font-bold text-sm truncate">{galeria.titulo}</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {galeria.clientes?.nome} • {galeria.pacote || "Personalizado"}
          </p>
        </div>
      </header>

      {/* Released banner */}
      {isReleased && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-medium text-primary">
              Suas fotos estão prontas! Faça o download abaixo.
            </p>
          </div>
        </div>
      )}

      {/* Selection bar */}
      {!isReleased && fotos.length > 0 && (
        <div className="sticky top-[53px] z-10 bg-card/95 backdrop-blur border-b border-border px-4 py-2">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-semibold">{selected.size}</span> foto{selected.size !== 1 ? "s" : ""} selecionada{selected.size !== 1 ? "s" : ""}
            </p>
            <Button size="sm" onClick={handleConfirmSelection} disabled={saving || selected.size === 0} className="gap-1.5">
              <Check className="h-3.5 w-3.5" />
              {saving ? "Salvando..." : "Confirmar seleção"}
            </Button>
          </div>
        </div>
      )}

      {/* Photos grid */}
      <main className="max-w-5xl mx-auto px-3 py-4 sm:px-4 sm:py-6">
        {fotos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {fotos.map((foto, i) => {
              const isSelected = selected.has(foto.id);

              return (
                <div
                  key={foto.id}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer group ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                  onClick={() => !isReleased && toggleSelect(foto.id)}
                >
                  <img
                    src={foto.url}
                    alt={`Foto ${i + 1}`}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />

                  {/* Multi-layer watermark overlay */}
                  {showWatermark && camadas.map((layer, li) => (
                    <WatermarkOverlay key={li} layer={layer} index={li} />
                  ))}

                  {/* Fallback if no layers configured */}
                  {!isReleased && camadas.length === 0 && !foto.url_com_marca_dagua && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-foreground/15 text-base sm:text-lg font-bold rotate-[-30deg] select-none">
                        PRÉVIA
                      </span>
                    </div>
                  )}

                  {/* Selection indicator */}
                  {!isReleased && (
                    <div className={`absolute top-2 left-2 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-background/70 border-muted-foreground/40 backdrop-blur-sm"
                    }`}>
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                  )}

                  {/* Download button */}
                  {isReleased && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(foto.url, i); }}
                      className="absolute bottom-2 right-2 bg-primary text-primary-foreground rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg active:scale-95"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Image className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma foto disponível ainda</p>
          </div>
        )}

        {isReleased && fotos.length > 0 && (
          <div className="mt-6 sm:hidden">
            <p className="text-xs text-center text-muted-foreground mb-2">
              Toque em uma foto para ver o botão de download
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Galeria criada com <span className="text-primary font-semibold">Foto Pronta</span>
        </p>
      </footer>
    </div>
  );
}
