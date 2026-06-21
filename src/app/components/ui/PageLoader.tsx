import { Loader2, Activity } from "lucide-react";

interface PageLoaderProps {
  message?: string;
  fullPage?: boolean;
}

export function PageLoader({ message = "Loading data...", fullPage = false }: PageLoaderProps) {
  const containerClass = fullPage
    ? "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-4"
    : "flex flex-col items-center justify-center min-h-[350px] w-full gap-4 p-6 bg-card rounded-2xl border border-border shadow-sm";

  return (
    <div className={containerClass} data-testid="page-loader">
      <div className="relative flex items-center justify-center">
        {/* Pulsing glow background */}
        <div className="absolute w-12 h-12 bg-primary/10 rounded-full animate-ping" />
        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center shadow-sm">
          <Activity className="w-5 h-5 text-primary animate-pulse" />
        </div>
        <Loader2 className="absolute w-16 h-16 text-primary animate-spin opacity-40" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground tracking-wide">{message}</p>
        <p className="text-xs text-muted-foreground">Please wait a moment</p>
      </div>
    </div>
  );
}
