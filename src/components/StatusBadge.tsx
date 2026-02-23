import { cn } from "@/lib/utils";

type Status = "pendente" | "enviado" | "contratado" | "recusado";

const statusStyles: Record<Status, string> = {
  pendente: "bg-warning/15 text-warning border-warning/30",
  enviado: "bg-primary/15 text-primary border-primary/30",
  contratado: "bg-success/15 text-success border-success/30",
  recusado: "bg-destructive/15 text-destructive border-destructive/30",
};

const statusLabels: Record<Status, string> = {
  pendente: "Pendente",
  enviado: "Enviado",
  contratado: "Contratado",
  recusado: "Recusado",
};

const StatusBadge = ({ status }: { status: Status }) => {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", statusStyles[status])}>
      {statusLabels[status]}
    </span>
  );
};

export default StatusBadge;
export type { Status };
