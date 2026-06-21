import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "Failed to load data from the server. Please check your connection and try again.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center bg-red-50/50 rounded-2xl border border-red-100 shadow-sm w-full gap-4 ${className}`}
      data-testid="error-state"
    >
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-sm">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className="font-semibold text-red-800 text-base tracking-tight">{title}</h3>
        <p className="text-sm text-red-700/80 leading-normal">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Request
        </button>
      )}
    </div>
  );
}
