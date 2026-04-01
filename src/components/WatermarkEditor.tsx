import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Type, Image, Trash2, Upload, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { toast } from "sonner";

export interface WatermarkLayer {
  tipo: "texto" | "logo";
  texto?: string;
  url?: string;
  cor?: string;
  tamanho: number;
  opacidade: number;
  posicao: string;
}

const POSITIONS = [
  { value: "sup_esq", label: "Sup. Esq." },
  { value: "sup_dir", label: "Sup. Dir." },
  { value: "centro", label: "Centro" },
  { value: "inf_esq", label: "Inf. Esq." },
  { value: "inf_dir", label: "Inf. Dir." },
  { value: "repetir", label: "Repetir" },
];

interface WatermarkEditorProps {
  camadas: WatermarkLayer[];
  onChange: (camadas: WatermarkLayer[]) => void;
  userId: string;
  compact?: boolean;
}

export default function WatermarkEditor({ camadas, onChange, userId, compact = false }: WatermarkEditorProps) {
  const [openLayers, setOpenLayers] = useState<Set<number>>(new Set([0]));

  const toggleOpen = (index: number) => {
    setOpenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addTexto = () => {
    const newLayer: WatermarkLayer = {
      tipo: "texto",
      texto: "PRÉVIA",
      cor: "#FFFFFF",
      tamanho: 24,
      opacidade: 50,
      posicao: "centro",
    };
    const updated = [...camadas, newLayer];
    onChange(updated);
    setOpenLayers((prev) => new Set(prev).add(updated.length - 1));
  };

  const addLogo = () => {
    const newLayer: WatermarkLayer = {
      tipo: "logo",
      url: "",
      tamanho: 15,
      opacidade: 30,
      posicao: "centro",
    };
    const updated = [...camadas, newLayer];
    onChange(updated);
    setOpenLayers((prev) => new Set(prev).add(updated.length - 1));
  };

  const removeAll = () => {
    onChange([]);
    setOpenLayers(new Set());
  };

  const removeLayer = (index: number) => {
    onChange(camadas.filter((_, i) => i !== index));
    setOpenLayers((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => {
        if (v < index) next.add(v);
        else if (v > index) next.add(v - 1);
      });
      return next;
    });
  };

  const updateLayer = (index: number, updates: Partial<WatermarkLayer>) => {
    onChange(camadas.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };

  const handleLogoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const filePath = `${userId}/marca-dagua-${index}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("marca-dagua").upload(filePath, file, { upsert: true });
    if (error) { toast.error("Erro ao enviar imagem"); return; }
    const { data: { publicUrl } } = supabase.storage.from("marca-dagua").getPublicUrl(filePath);
    updateLayer(index, { url: publicUrl });
    toast.success("Logo carregado!");
  };

  // Preview helpers
  const getPositionStyle = (pos: string): React.CSSProperties => ({
    ...(pos === "sup_esq" && { alignItems: "flex-start", justifyContent: "flex-start", padding: "8%" }),
    ...(pos === "sup_dir" && { alignItems: "flex-start", justifyContent: "flex-end", padding: "8%" }),
    ...(pos === "centro" && {}),
    ...(pos === "inf_esq" && { alignItems: "flex-end", justifyContent: "flex-start", padding: "8%" }),
    ...(pos === "inf_dir" && { alignItems: "flex-end", justifyContent: "flex-end", padding: "8%" }),
  });

  const renderLayerPreview = (layer: WatermarkLayer, index: number) => {
    if (layer.tipo === "texto" && layer.texto) {
      if (layer.posicao === "repetir") {
        return (
          <div key={index} className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0" style={{
              display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center",
              gap: `${(layer.tamanho || 24) * 1.5}px`, opacity: (layer.opacidade ?? 50) / 100,
              transform: "rotate(-30deg) scale(1.5)",
            }}>
              {Array.from({ length: 25 }).map((_, i) => (
                <span key={i} style={{
                  color: layer.cor || "#FFFFFF",
                  fontSize: `${(layer.tamanho || 24) * (compact ? 0.5 : 0.7)}px`,
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
            fontSize: `${(layer.tamanho || 24) * (compact ? 0.5 : 0.7)}px`,
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
          <img src={layer.url} alt="Logo" style={{ width: `${layer.tamanho || 15}%`, opacity: (layer.opacidade ?? 30) / 100 }} />
        </div>
      );
    }

    return null;
  };

  return (
    <div className={compact ? "space-y-3" : "grid md:grid-cols-2 gap-6"}>
      {/* Editor */}
      <Card className="border-border bg-card">
        <CardHeader className={compact ? "pb-2 px-4 pt-4" : undefined}>
          <CardTitle className={`font-display ${compact ? "text-base" : "text-lg"}`}>Marca d'água</CardTitle>
        </CardHeader>
        <CardContent className={`space-y-3 ${compact ? "px-4 pb-4" : ""}`}>
          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={addTexto} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /><Type className="h-3.5 w-3.5" /> Adicionar Texto
            </Button>
            <Button size="sm" variant="outline" onClick={addLogo} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /><Image className="h-3.5 w-3.5" /> Adicionar Logo
            </Button>
            {camadas.length > 0 && (
              <Button size="sm" variant="ghost" onClick={removeAll} className="gap-1.5 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Excluir todos
              </Button>
            )}
          </div>

          {/* Layer list */}
          {camadas.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhuma camada adicionada. Clique em "Adicionar Texto" ou "Adicionar Logo".
            </p>
          )}

          <div className="space-y-2">
            {camadas.map((layer, index) => {
              const isOpen = openLayers.has(index);
              return (
                <Collapsible key={index} open={isOpen} onOpenChange={() => toggleOpen(index)}>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {layer.tipo === "texto" ? (
                            <Type className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-xs font-medium truncate">
                            {layer.tipo === "texto"
                              ? `Texto: ${layer.texto || "(vazio)"}`
                              : `Logo${layer.url ? "" : " (sem imagem)"}`}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => { e.stopPropagation(); removeLayer(index); }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 py-3 space-y-3">
                        {layer.tipo === "texto" ? (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">Texto</Label>
                              <Input
                                value={layer.texto || ""}
                                onChange={(e) => updateLayer(index, { texto: e.target.value })}
                                placeholder="Ex: PRÉVIA"
                                className="bg-input border-border h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Cor do texto</Label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={layer.cor || "#FFFFFF"}
                                  onChange={(e) => updateLayer(index, { cor: e.target.value })}
                                  className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                                />
                                <Input
                                  value={layer.cor || "#FFFFFF"}
                                  onChange={(e) => updateLayer(index, { cor: e.target.value })}
                                  className="bg-input border-border h-8 text-sm flex-1"
                                  maxLength={7}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Tamanho da fonte: {layer.tamanho}px</Label>
                              <Slider value={[layer.tamanho]} onValueChange={([v]) => updateLayer(index, { tamanho: v })} min={12} max={72} step={1} />
                            </div>
                          </>
                        ) : (
                          <>
                            {layer.url ? (
                              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <img src={layer.url} alt="Logo" className="w-8 h-8 object-contain" />
                                <span className="text-xs flex-1 truncate">logo</span>
                                <label className="cursor-pointer">
                                  <Button variant="outline" size="sm" asChild className="h-7 text-xs"><span>Trocar</span></Button>
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(index, e)} />
                                </label>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateLayer(index, { url: "" })}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <label className="cursor-pointer block">
                                <div className="border border-dashed border-border rounded-lg p-3 text-center hover:border-primary transition-colors">
                                  <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                                  <p className="text-xs text-muted-foreground">Upload da logo</p>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(index, e)} />
                              </label>
                            )}
                            <div className="space-y-1">
                              <Label className="text-xs">Tamanho: {layer.tamanho}%</Label>
                              <Slider value={[layer.tamanho]} onValueChange={([v]) => updateLayer(index, { tamanho: v })} min={5} max={50} step={1} />
                            </div>
                          </>
                        )}

                        {/* Shared: Opacity & Position */}
                        <div className="space-y-1">
                          <Label className="text-xs">Opacidade: {layer.opacidade}%</Label>
                          <Slider value={[layer.opacidade]} onValueChange={([v]) => updateLayer(index, { opacidade: v })} min={0} max={100} step={1} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Posição</Label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {POSITIONS.map((p) => (
                              <Button
                                key={p.value}
                                size="sm"
                                variant={layer.posicao === p.value ? "default" : "outline"}
                                onClick={() => updateLayer(index, { posicao: p.value })}
                                className="text-[10px] h-7 px-1"
                              >
                                {p.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-border bg-card">
        <CardHeader className={compact ? "pb-2 px-4 pt-4" : undefined}>
          <CardTitle className={`font-display ${compact ? "text-base" : "text-lg"}`}>Preview em tempo real</CardTitle>
        </CardHeader>
        <CardContent className={`text-center space-y-4 ${compact ? "px-4 pb-4" : ""}`}>
          <div className="relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            <div className={compact ? "text-4xl" : "text-6xl"}>📸</div>
            {camadas.map((layer, i) => renderLayerPreview(layer, i))}
          </div>
          <p className="text-xs text-muted-foreground">
            Assim o cliente vê a foto antes de pagar. Após o pagamento, a marca d'água some automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
