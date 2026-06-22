import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { Users, Clock, CheckCircle, UserCheck, Activity, Search, TrendingUp, TrendingDown } from "lucide-react";
import { analyticsService } from "../../services/analytics.service";
import { queueService } from "../../services/queue.service";
import { socketService } from "../../services/socket";

// UI Components
import { CardSkeleton } from "./ui/CardSkeleton";
import { TableSkeleton } from "./ui/TableSkeleton";
import { EmptyState } from "./ui/EmptyState";
import { ErrorState } from "./ui/ErrorState";
import { Skeleton } from "./ui/skeleton";

const STATUS_STYLES: Record<string, string> = {
  "In Consultation": "bg-blue-100 text-blue-700",
  "In Queue": "bg-teal-100 text-teal-700",
  "Waiting": "bg-yellow-100 text-yellow-700",
  "Completed": "bg-green-100 text-green-700",
  "Skipped": "bg-gray-100 text-gray-500",
};

export function Dashboard() {
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const queryClient = useQueryClient();
  const [timeTick, setTimeTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getActualWaitTime = (createdAtStr?: string) => {
    if (!createdAtStr) return "0 min";
    const start = new Date(createdAtStr);
    const diffMs = Date.now() - start.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    return `Waited: ${diffMin > 0 ? diffMin : 0} min`;
  };

  // Queries
  const { data: kpiData, isLoading: isLoadingKpi, isError: isErrorKpi, refetch: refetchKpi } = useQuery({
    queryKey: ["analyticsKpis"],
    queryFn: () => analyticsService.getKpis(),
  });

  const { data: peakHoursResponse, isLoading: isLoadingPeakHours, isError: isErrorPeakHours, refetch: refetchPeakHours } = useQuery({
    queryKey: ["analyticsPeakHours"],
    queryFn: () => analyticsService.getPeakHours(),
  });

  const { data: doctorLoadResponse, isLoading: isLoadingDoctorLoad, isError: isErrorDoctorLoad, refetch: refetchDoctorLoad } = useQuery({
    queryKey: ["analyticsDoctorLoad"],
    queryFn: () => analyticsService.getDoctorLoad(),
  });

  const { data: volumeTrendResponse, isLoading: isLoadingVolumeTrend, isError: isErrorVolumeTrend, refetch: refetchVolumeTrend } = useQuery({
    queryKey: ["analyticsVolumeTrend"],
    queryFn: () => analyticsService.getVolumeTrend(),
  });

  const { data: roomUtilizationResponse, isLoading: isLoadingRoomUtilization, isError: isErrorRoomUtilization, refetch: refetchRoomUtilization } = useQuery({
    queryKey: ["analyticsRoomUtilization"],
    queryFn: () => analyticsService.getRoomUtilization(),
  });

  const { data: liveQueueResponse, isLoading: isLoadingLiveQueue, isError: isErrorLiveQueue, refetch: refetchLiveQueue } = useQuery({
    queryKey: ["liveQueue"],
    queryFn: () => queueService.getLiveQueue(),
  });

  const handleRetryAll = useCallback(() => {
    refetchKpi();
    refetchPeakHours();
    refetchDoctorLoad();
    refetchVolumeTrend();
    refetchRoomUtilization();
    refetchLiveQueue();
  }, [refetchKpi, refetchPeakHours, refetchDoctorLoad, refetchVolumeTrend, refetchRoomUtilization, refetchLiveQueue]);

  // Socket setup
  useEffect(() => {
    socketService.connect();

    const handleFullUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["liveQueue"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsKpis"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsPeakHours"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsDoctorLoad"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsVolumeTrend"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsRoomUtilization"] });
    };

    // Bind listeners
    socketService.on("queue:updated", handleFullUpdate);
    socketService.on("analytics:updated", handleFullUpdate);
    socketService.on("rooms:updated", handleFullUpdate);
    socketService.on("doctors:updated", handleFullUpdate);

    // Standardized new events
    socketService.on("queue-updated", handleFullUpdate);
    socketService.on("patient-added", handleFullUpdate);
    socketService.on("patient-updated", handleFullUpdate);
    socketService.on("patient-promoted", handleFullUpdate);
    socketService.on("patient-completed", handleFullUpdate);
    socketService.on("patient-cancelled", handleFullUpdate);
    socketService.on("patient-transferred", handleFullUpdate);
    socketService.on("wait-time-updated", handleFullUpdate);
    socketService.on("doctor-status-updated", handleFullUpdate);

    return () => {
      socketService.off("queue:updated", handleFullUpdate);
      socketService.off("analytics:updated", handleFullUpdate);
      socketService.off("rooms:updated", handleFullUpdate);
      socketService.off("doctors:updated", handleFullUpdate);

      socketService.off("queue-updated", handleFullUpdate);
      socketService.off("patient-added", handleFullUpdate);
      socketService.off("patient-updated", handleFullUpdate);
      socketService.off("patient-promoted", handleFullUpdate);
      socketService.off("patient-completed", handleFullUpdate);
      socketService.off("patient-cancelled", handleFullUpdate);
      socketService.off("patient-transferred", handleFullUpdate);
      socketService.off("wait-time-updated", handleFullUpdate);
      socketService.off("doctor-status-updated", handleFullUpdate);
    };
  }, [queryClient]);

  // Fallbacks to empty arrays if loading/undefined
  const peakHoursData = peakHoursResponse || [];

  const doctorLoadData = doctorLoadResponse || [];

  const volumeTrendData = volumeTrendResponse || [];

  const roomColors = ["#1565c0", "#0d9488", "#7c3aed", "#ea580c"];
  const roomData = roomUtilizationResponse?.map((r, i) => ({
    name: r.name,
    value: r.value,
    color: r.color || roomColors[i % roomColors.length]
  })) || [];

  const liveQueue = liveQueueResponse || [];

  const kpiIcons: Record<string, any> = {
    "Patients Waiting": { icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    "In Consultation": { icon: UserCheck, color: "text-teal-600", bg: "bg-teal-50" },
    "Completed Today": { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    "Active Doctors": { icon: Activity, color: "text-purple-600", bg: "bg-purple-50" },
    "Avg Wait Time": { icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
  };

  const kpis = kpiData?.map(item => {
    const meta = kpiIcons[item.label] || { icon: Activity, color: "text-gray-600", bg: "bg-gray-50" };
    return {
      label: item.label,
      value: item.value,
      trend: item.trend,
      up: item.up,
      ...meta
    };
  }) || [];

  const isLoading = isLoadingKpi || isLoadingPeakHours || isLoadingDoctorLoad || isLoadingVolumeTrend || isLoadingRoomUtilization || isLoadingLiveQueue;
  const isError = isErrorKpi || isErrorPeakHours || isErrorDoctorLoad || isErrorVolumeTrend || isErrorRoomUtilization || isErrorLiveQueue;

  if (isError) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState onRetry={handleRetryAll} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        {/* KPI Cards Skeletons */}
        <CardSkeleton variant="kpi" count={5} />

        {/* Charts Row 1 Skeletons */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-1/3 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
            <Skeleton className="h-[180px] w-full rounded-xl" />
          </div>
          <div className="bg-white rounded-2xl p-5 border border-border shadow-sm space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-1/2 rounded" />
              <Skeleton className="h-4 w-1/3 rounded" />
            </div>
            <div className="flex items-center justify-center py-2">
              <Skeleton className="h-28 w-28 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
            </div>
          </div>
        </div>

        {/* Charts Row 2 Skeletons */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-border shadow-sm space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-1/3 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
            </div>
            <Skeleton className="h-[180px] w-full rounded-xl" />
          </div>
          <div className="bg-white rounded-2xl p-5 border border-border shadow-sm space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-1/3 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
            </div>
            <Skeleton className="h-[180px] w-full rounded-xl" />
          </div>
        </div>

        {/* Live Queue Table Skeleton */}
        <TableSkeleton headers={["Token", "Patient", "Doctor", "Room", "Status", "Wait Time"]} rowCount={5} />
      </div>
    );
  }

  const filtered = liveQueue.filter(row => {
    const patientName = (row as any).patient || row.name || "";
    const token = row.token || "";
    const matchSearch = patientName.toLowerCase().includes(searchQ.toLowerCase()) || token.toLowerCase().includes(searchQ.toLowerCase());
    const matchStatus = statusFilter === "All" || row.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg, trend, up }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <span className={`text-xs flex items-center gap-0.5 ${up ? "text-green-600" : "text-orange-500"}`}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Peak Wait Hours */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Peak Wait Hours</h3>
              <p className="text-xs text-muted-foreground">Average wait time by hour · Today</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={peakHoursData}>
              <defs>
                <linearGradient id="waitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1565c0" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1565c0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} unit=" min" />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                formatter={(v) => [`${v} min`, "Wait Time"]}
              />
              <Area type="monotone" dataKey="wait" stroke="#1565c0" strokeWidth={2} fill="url(#waitGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Room Utilization */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Room Utilization</h3>
            <p className="text-xs text-muted-foreground">Current occupancy %</p>
          </div>
          <div className="flex items-center justify-center mb-4">
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={roomData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                  {roomData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                  formatter={(v) => [`${v}%`, "Utilization"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {roomData.map(r => (
              <div key={r.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                  <span className="text-xs text-muted-foreground">{r.name}</span>
                </div>
                <span className="text-xs font-semibold text-foreground">{r.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Queue Load by Doctor */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Queue Load by Doctor</h3>
            <p className="text-xs text-muted-foreground">Total vs completed patients</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={doctorLoadData} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false}
                tickFormatter={v => v.split(" ").slice(-1)[0] || v} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "11px" }} />
              <Bar key="bar-patients" dataKey="patients" fill="#1565c0" name="Total" radius={[4, 4, 0, 0]} />
              <Bar key="bar-completed" dataKey="completed" fill="#0d9488" name="Completed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Volume */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Patient Volume Trend</h3>
            <p className="text-xs text-muted-foreground">This week's daily patient count</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={volumeTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "11px" }} />
              <Line type="monotone" dataKey="patients" stroke="#0d9488" strokeWidth={2.5} dot={{ fill: "#0d9488", strokeWidth: 0, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Queue Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">Live Queue Monitoring</h3>
            <p className="text-xs text-muted-foreground">{liveQueue.length} patients · Updates in real-time</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search patient or token..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full sm:w-52"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm bg-muted rounded-xl border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 pr-8"
            >
              {["All", "Waiting", "In Queue", "In Consultation", "Completed", "Skipped"].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Token", "Patient", "Doctor", "Room", "Status", "Wait Time"].map(col => (
                  <th key={col} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(row => {
                const patientName = (row as any).patient || row.name || "–";
                const doctorName = row.doctorName || (row as any).doctor || "–";
                const waitTime = row.waitTime || (row as any).wait || "–";
                return (
                  <tr key={row.token} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-sm font-semibold text-primary">{row.token}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-secondary rounded-full flex items-center justify-center text-primary text-xs font-bold">
                          {patientName[0]}
                        </div>
                        <span className="text-sm font-medium text-foreground">{patientName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-foreground">{doctorName}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{row.room}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[row.status] || "bg-gray-100 text-gray-600"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {!["Completed", "Cancelled", "Transferred"].includes(row.status)
                        ? getActualWaitTime(row.createdAt)
                        : "–"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8">
                    <EmptyState
                      icon={Search}
                      title="No Patients Found"
                      description={
                        searchQ
                          ? `We couldn't find any patient matching "${searchQ}" with status "${statusFilter}".`
                          : `There are currently no patients with status "${statusFilter}" in the queue.`
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

