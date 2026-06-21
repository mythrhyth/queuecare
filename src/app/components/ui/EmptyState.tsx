import { LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-border shadow-sm w-full gap-4 ${className}`}
      data-testid="empty-state"
    >
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/60 shadow-inner">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className="font-semibold text-foreground text-base tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-normal">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
