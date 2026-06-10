import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'skipped';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    waiting: { label: "Waiting", className: "bg-[#e5efe5] text-[#2c5234] border-[#d1e5d1]" },
    called: { label: "Called", className: "bg-accent/20 text-[#5c5c11] border-accent/30" },
    in_consultation: { label: "In Consultation", className: "bg-[#e5eaff] text-[#2a3c8c] border-[#d1daff]" },
    completed: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
    skipped: { label: "Skipped", className: "bg-[#f2f2f2] text-[#555555] border-[#e2e2e2]" },
  };

  const { label, className: colors } = config[status] || config.waiting;

  return (
    <Badge variant="outline" className={cn("rounded-full font-medium shadow-none", colors, className)}>
      {label}
    </Badge>
  );
}
