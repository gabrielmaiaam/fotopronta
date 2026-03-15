import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Check, CheckCircle2, Download, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function GaleriaPublica() {
  const { link } = useParams();
  const [galeria, setGaleria] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

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
      // Pre-select already approved photos
      const approved = new Set((f || []).filter((p: any) => p.aprovada).map((p: any) => p.id));
      setSelected(approved);
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
    // Set all to not approved first, then approve selected
    await supabase
      .from("fotos")
      .update({ aprovada: false })
      .eq("galeria_id", galeria.id);
    if (selected.size > 0) {
      await supabase
        .from("fotos")
        .update({ aprovada: true })
        .in("id", Array.from(selected));
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

      {/* Selection bar (only in preview mode) */}
      {!isReleased && fotos.length > 0 && (
        <div className="sticky top-[53px] z-10 bg-card/95 backdrop-blur border-b border-border px-4 py-2">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-semibold">{selected.size}</span> foto{selected.size !== 1 ? "s" : ""} selecionada{selected.size !== 1 ? "s" : ""}
            </p>
            <Button
              size="sm"
              onClick={handleConfirmSelection}
              disabled={saving || selected.size === 0}
              className="gap-1.5"
            >
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
              const showWatermark = !isReleased;
              const displayUrl = showWatermark && foto.url_com_marca_dagua
                ? foto.url_com_marca_dagua
                : foto.url;

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
                    src={displayUrl}
                    alt={`Foto ${i + 1}`}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />

                  {/* Watermark overlay text (preview mode) */}
                  {showWatermark && !foto.url_com_marca_dagua && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-foreground/15 text-base sm:text-lg font-bold rotate-[-30deg] select-none">
                        PRÉVIA
                      </span>
                    </div>
                  )}

                  {/* Selection indicator */}
                  {!isReleased && (
                    <div
                      className={`absolute top-2 left-2 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background/70 border-muted-foreground/40 backdrop-blur-sm"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                  )}

                  {/* Download button (released mode) */}
                  {isReleased && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(foto.url, i);
                      }}
                      className="absolute bottom-2 right-2 bg-primary text-primary-foreground rounded-full p-2 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-lg active:scale-95"
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

        {/* Mobile download all button */}
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
