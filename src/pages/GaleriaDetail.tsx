import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Upload, Trash2, Unlock } from "lucide-react";
import { toast } from "sonner";

export default function GaleriaDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [galeria, setGaleria] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user && id) loadData();
  }, [user, id]);

  const loadData = async () => {
    const { data: g } = await supabase
      .from("galerias")
      .select("*, clientes(nome)")
      .eq("id", id!)
      .single();
    setGaleria(g);

    const { data: f } = await supabase
      .from("fotos")
      .select("*")
      .eq("galeria_id", id!)
      .order("created_at", { ascending: true });
    setFotos(f || []);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user || !id) return;
    setUploading(true);

    for (const file of Array.from(e.target.files)) {
      const filePath = `${user.id}/${id}/${crypto.randomUUID()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("fotos")
        .upload(filePath, file);

      if (uploadError) { toast.error(`Erro ao enviar ${file.name}`); continue; }

      const { data: { publicUrl } } = supabase.storage.from("fotos").getPublicUrl(filePath);

      await supabase.from("fotos").insert({
        galeria_id: id,
        url: publicUrl,
      });
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
    await supabase.from("galerias").update({ status: "liberada" }).eq("id", id!);
    toast.success("Galeria liberada para o cliente!");
    loadData();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*";
    const dt = e.dataTransfer;
    if (dt.files.length > 0) {
      const fakeEvent = { target: { files: dt.files } } as any;
      handleUpload(fakeEvent);
    }
  }, [user, id]);

  if (!galeria) return <div className="text-muted-foreground">Carregando...</div>;

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/galerias")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">{galeria.titulo}</h1>
          <p className="text-sm text-muted-foreground">
            Cliente: {galeria.clientes?.nome} • Pacote: {galeria.pacote || "—"} • {formatCurrency(Number(galeria.valor_total))}
          </p>
        </div>
        <StatusBadge status={galeria.status} />
      </div>

      {galeria.status === "previa" && (
        <Button onClick={handleLiberar} className="gap-2">
          <Unlock className="h-4 w-4" /> Liberar Galeria
        </Button>
      )}

      {/* Upload area */}
      <Card
        className="border-border bg-card border-dashed"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <CardContent className="p-8 text-center">
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">
            Arraste fotos aqui ou clique para selecionar
          </p>
          <label className="cursor-pointer">
            <Button variant="outline" disabled={uploading} asChild>
              <span>{uploading ? "Enviando..." : "Selecionar Fotos"}</span>
            </Button>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        </CardContent>
      </Card>

      {/* Photos grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {fotos.map((foto) => (
          <div key={foto.id} className="relative group rounded-lg overflow-hidden border border-border bg-card">
            <img
              src={foto.url}
              alt=""
              className="w-full aspect-square object-cover"
            />
            <button
              onClick={() => handleDeleteFoto(foto.id)}
              className="absolute top-2 right-2 bg-destructive/80 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {fotos.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhuma foto enviada ainda</p>
      )}
    </div>
  );
}
