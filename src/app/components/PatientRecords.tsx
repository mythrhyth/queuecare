import { useState, useEffect } from "react";
import { Search, Filter, Phone, User, Calendar, Clock, Activity, ChevronDown, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { patientsService } from "../../services/patients.service";
import { socketService } from "../../services/socket";
import { Patient, PatientStatus, PatientType } from "../../types";

// UI Components
import { TableSkeleton } from "./ui/TableSkeleton";
import { EmptyState } from "./ui/EmptyState";
import { ErrorState } from "./ui/ErrorState";

const STATUS_STYLES: Record<string, string> = {
  "In Consultation": "bg-blue-100 text-blue-700 border border-blue-200",
  "In Queue": "bg-teal-100 text-teal-700 border border-teal-200",
  "Waiting": "bg-yellow-100 text-yellow-700 border border-yellow-200",
  "Completed": "bg-green-100 text-green-700 border border-green-200",
  "Transferred": "bg-purple-100 text-purple-700 border border-purple-200",
  "Cancelled": "bg-red-100 text-red-700 border border-red-200",
  "Skipped": "bg-gray-100 text-gray-500 border border-gray-200",
};

const TYPE_STYLES: Record<PatientType | "Normal" | "Senior" | "Emergency" | "Senior Citizen", string> = {
  "Normal": "bg-gray-100 text-gray-600",
  "Senior Citizen": "bg-orange-100 text-orange-700",
  "Senior": "bg-orange-100 text-orange-700",
  "Emergency": "bg-red-100 text-red-700",
};

export function PatientRecords() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [datePreset, setDatePreset] = useState("All");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const queryClient = useQueryClient();

  const getFromToDates = () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    if (datePreset === "Today") {
      return { fromDate: todayStr, toDate: todayStr };
    }
    if (datePreset === "Yesterday") {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      return { fromDate: yesterdayStr, toDate: yesterdayStr };
    }
    if (datePreset === "Last 7 Days") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
      return { fromDate: sevenDaysAgoStr, toDate: todayStr };
    }
    if (datePreset === "Custom Range") {
      return { fromDate: customFromDate || undefined, toDate: customToDate || undefined };
    }
    return {};
  };

  const { fromDate, toDate } = getFromToDates();

  // Fetch patients list
  const { data: recordsData, isLoading: isLoadingRecords, isError: isErrorRecords, refetch: refetchRecords } = useQuery({
    queryKey: ["patients", statusFilter, typeFilter, search, datePreset, fromDate, toDate],
    queryFn: () => patientsService.getPatients({
      status: statusFilter as any,
      type: typeFilter as any,
      search,
      date: datePreset === "All" ? "all" : undefined,
      fromDate,
      toDate
    }),
  });

  const records = recordsData || [];

  // Socket updates
  useEffect(() => {
    socketService.connect();
    const handleQueueUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    };

    socketService.on("queue:updated", handleQueueUpdate);
    socketService.on("queue-updated", handleQueueUpdate);
    socketService.on("patient-added", handleQueueUpdate);
    socketService.on("patient-updated", handleQueueUpdate);
    socketService.on("patient-promoted", handleQueueUpdate);
    socketService.on("patient-completed", handleQueueUpdate);
    socketService.on("patient-cancelled", handleQueueUpdate);
    socketService.on("patient-transferred", handleQueueUpdate);

    return () => {
      socketService.off("queue:updated", handleQueueUpdate);
      socketService.off("queue-updated", handleQueueUpdate);
      socketService.off("patient-added", handleQueueUpdate);
      socketService.off("patient-updated", handleQueueUpdate);
      socketService.off("patient-promoted", handleQueueUpdate);
      socketService.off("patient-completed", handleQueueUpdate);
      socketService.off("patient-cancelled", handleQueueUpdate);
      socketService.off("patient-transferred", handleQueueUpdate);
    };
  }, [queryClient]);

  const filtered = records;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Records</h2>
            <p className="text-sm text-muted-foreground">{records.length} records found · {records.filter(r => r.status === "Completed").length} completed</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, token or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Date Filter Dropdown */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value)}
              className="pl-8 pr-8 py-2.5 text-sm bg-white rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none font-medium"
            >
              {["All", "Today", "Yesterday", "Last 7 Days", "Custom Range"].map(preset => (
                <option key={preset} value={preset}>{preset}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="pl-8 pr-8 py-2.5 text-sm bg-white rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
            >
              {["All", "Waiting", "In Consultation", "Completed", "Cancelled", "Transferred"].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="pl-3 pr-8 py-2.5 text-sm bg-white rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
            >
              {["All", "Normal", "Senior Citizen", "Emergency"].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Custom Date Inputs */}
      {datePreset === "Custom Range" && (
        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</span>
            <input
              type="date"
              value={customFromDate}
              onChange={e => setCustomFromDate(e.target.value)}
              className="px-3 py-1.5 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</span>
            <input
              type="date"
              value={customToDate}
              onChange={e => setCustomToDate(e.target.value)}
              className="px-3 py-1.5 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      )}

      {/* Table */}
      {isErrorRecords ? (
        <ErrorState onRetry={() => refetchRecords()} />
      ) : isLoadingRecords ? (
        <TableSkeleton headers={["Token", "Patient", "Phone", "Doctor", "Type", "Status", "Date & Time", "Wait"]} rowCount={6} />
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["Token", "Patient", "Phone", "Doctor", "Type", "Status", "Date & Time", "Wait"].map(col => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(row => {
                  const doctorName = row.doctorName || (row as any).doctor || "–";
                  const priorityType = row.type || row.priority || "Normal";
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelected(row)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-bold text-primary">{row.token}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-secondary rounded-full flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                            {row.name[0]}
                          </div>
                          <span className="text-sm font-medium text-foreground whitespace-nowrap">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{row.phone}</td>
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{doctorName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${TYPE_STYLES[priorityType] || TYPE_STYLES.Normal}`}>
                          {priorityType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${STATUS_STYLES[row.status] || "bg-gray-100 text-gray-500"}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        <div>{new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                        <div className="text-xs text-muted-foreground/70">{row.registeredAt}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{row.waitTime}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8">
                      <EmptyState
                        icon={Search}
                        title="No Records Found"
                        description="We couldn't find any patient records matching your filters."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patient Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-blue-50 to-teal-50 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white font-bold text-lg">
                  {selected.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{selected.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{selected.token}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/60 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Status + Type badges */}
              <div className="flex items-center gap-2">
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_STYLES[selected.status] || "bg-gray-100 text-gray-500"}`}>{selected.status}</span>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${TYPE_STYLES[selected.type || selected.priority || "Normal"]}`}>{selected.type || selected.priority || "Normal"}</span>
              </div>

              {/* Details */}
              <div className="space-y-3">
                {[
                  { icon: Phone, label: "Phone Number", value: selected.phone },
                  { icon: User, label: "Assigned Doctor", value: `${selected.doctorName || (selected as any).doctor || "–"} ${selected.specialty ? `· ${selected.specialty}` : ""}` },
                  { icon: Activity, label: "Room", value: `${selected.room || "–"}` },
                  { icon: Calendar, label: "Date of Consultation", value: new Date(selected.date).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) },
                  { icon: Clock, label: "Registered At", value: selected.registeredAt },
                  { icon: Clock, label: "Wait Time", value: selected.waitTime },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 p-3 bg-muted rounded-xl">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
                {selected.notes && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-600 font-semibold mb-1">Clinical Notes</p>
                    <p className="text-sm text-blue-800">{selected.notes}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelected(null)}
                className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

