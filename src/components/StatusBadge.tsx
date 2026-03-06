import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  previa: "bg-primary/20 text-primary border-primary/30",
  liberada: "bg-info/20 text-info border-info/30",
  finalizada: "bg-success/20 text-success border-success/30",
  aguardando: "bg-muted text-muted-foreground border-border",
  em_andamento: "bg-info/20 text-info border-info/30",
  finalizado: "bg-success/20 text-success border-success/30",
  pendente: "bg-destructive/20 text-destructive border-destructive/30",
  parcial: "bg-warning/20 text-warning border-warning/30",
  pago: "bg-success/20 text-success border-success/30",
};

const statusLabels: Record<string, string> = {
  previa: "Prévia",
  liberada: "Liberada",
  finalizada: "Finalizada",
  aguardando: "Aguardando",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  pendente: "Pendente",
  parcial: "Parcial",
  pago: "Pago",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("text-xs", statusStyles[status] || "")}>
      {statusLabels[status] || status}
    </Badge>
  );
}
