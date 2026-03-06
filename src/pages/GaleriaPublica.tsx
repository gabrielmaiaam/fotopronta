import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Camera } from "lucide-react";

export default function GaleriaPublica() {
  const { link } = useParams();
  const [galeria, setGaleria] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        .eq("galeria_id", g.id);
      setFotos(f || []);
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!galeria) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Galeria não encontrada</p></div>;

  // Check if payment is complete for this gallery
  const isPaid = false; // Will be determined by payment status in real usage

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Camera className="h-6 w-6 text-primary" />
          <span className="text-lg font-display font-bold text-primary">Foto Pronta</span>
        </div>
        <h1 className="text-xl font-display font-bold">{galeria.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          {galeria.clientes?.nome} • {galeria.pacote || "Personalizado"}
        </p>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {fotos.map((foto) => (
            <div key={foto.id} className="relative rounded-lg overflow-hidden border border-border">
              <img
                src={!isPaid && foto.url_com_marca_dagua ? foto.url_com_marca_dagua : foto.url}
                alt=""
                className="w-full aspect-square object-cover"
              />
              {!isPaid && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-foreground/20 text-lg font-bold rotate-[-30deg]">PRÉVIA</span>
                </div>
              )}
            </div>
          ))}
        </div>
        {fotos.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Nenhuma foto disponível ainda</p>
        )}
      </main>
    </div>
  );
}
