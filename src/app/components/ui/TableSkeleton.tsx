import { Skeleton } from "./skeleton";

interface TableSkeletonProps {
  headers?: string[];
  columnCount?: number;
  rowCount?: number;
}

export function TableSkeleton({
  headers,
  columnCount = 5,
  rowCount = 5,
}: TableSkeletonProps) {
  const cols = headers || Array.from({ length: columnCount }, (_, i) => `Col ${i + 1}`);
  const rows = Array.from({ length: rowCount }, (_, i) => i);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border shadow-sm bg-white" data-testid="table-skeleton">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {cols.map((header, idx) => (
                <th
                  key={idx}
                  className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((rowIdx) => (
              <tr key={rowIdx} className="hover:bg-muted/10 transition-colors">
                {cols.map((_, colIdx) => (
                  <td key={colIdx} className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {/* Optional circular prefix for first column (token/avatar placeholder) */}
                      {colIdx === 1 && (
                        <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                      )}
                      <Skeleton
                        className={`h-4 rounded ${
                          colIdx === 0
                            ? "w-16 font-mono"
                            : colIdx === 1
                            ? "w-28"
                            : colIdx === cols.length - 1
                            ? "w-12"
                            : "w-24"
                        }`}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
