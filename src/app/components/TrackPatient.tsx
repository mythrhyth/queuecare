import { useState, useEffect } from "react";
import { Search, Phone, User, Calendar, Clock, Activity, FileText, ArrowRight, RefreshCw, Layers } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { patientsService } from "../../services/patients.service";
import { socketService } from "../../services/socket";
import { Patient } from "../../types";

const STATUS_STYLES: Record<string, string> = {
  "In Consultation": "bg-blue-100 text-blue-700 border border-blue-200",
  "In Queue": "bg-teal-100 text-teal-700 border border-teal-200",
  "Waiting": "bg-yellow-100 text-yellow-700 border border-yellow-200",
  "Completed": "bg-green-100 text-green-700 border border-green-200",
  "Transferred": "bg-purple-100 text-purple-700 border border-purple-200",
  "Cancelled": "bg-red-100 text-red-700 border border-red-200",
  "Skipped": "bg-gray-100 text-gray-500 border border-gray-200",
};

const TYPE_STYLES: Record<string, string> = {
  "Normal": "bg-gray-100 text-gray-600",
  "Senior Citizen": "bg-orange-100 text-orange-700",
  "Senior": "bg-orange-100 text-orange-700",
  "Emergency": "bg-red-100 text-red-700",
};

export function TrackPatient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Query matching patients across all dates
  const { data: patientsData, isLoading, refetch } = useQuery({
    queryKey: ["trackPatients", submittedQuery],
    queryFn: () => patientsService.getPatients({
      search: submittedQuery.trim() || undefined,
      date: "all",
    }),
    enabled: submittedQuery.trim().length > 0,
  });

  const patients = patientsData || [];

  // Reset selected patient if search results change
  useEffect(() => {
    if (patients.length > 0) {
      // Find if selected patient is still in results, otherwise default to first
      const exists = patients.some(p => p.id === selectedPatientId);
      if (!exists) {
        setSelectedPatientId(patients[0].id);
      }
    } else {
      setSelectedPatientId(null);
    }
  }, [patients, selectedPatientId]);

  // Socket updates
  useEffect(() => {
    socketService.connect();
    const handleQueueUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["trackPatients"] });
    };
    socketService.on("queue:updated", handleQueueUpdate);
    return () => {
      socketService.off("queue:updated", handleQueueUpdate);
    };
  }, [queryClient]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchQuery);
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || null;

  // Filter history of the selected patient (matches by phone or name)
  const historyRecords = selectedPatient
    ? patients
        .filter(p => p.phone === selectedPatient.phone || p.name.toLowerCase() === selectedPatient.name.toLowerCase())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Track Patient</h2>
              <p className="text-sm text-muted-foreground">Lookup details, live queue position, and history for a patient</p>
            </div>
          </div>
          {submittedQuery && (
            <button
              onClick={() => refetch()}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
              title="Refresh tracking data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Input Form */}
      <form onSubmit={handleSearchSubmit} className="bg-white rounded-2xl p-5 border border-border shadow-sm space-y-4">
        <p className="text-sm font-medium text-foreground">Search by Token Number, Patient Name, or Phone Number</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Enter token (e.g. T-001), name or phone number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            Search
          </button>
        </div>
      </form>

      {/* Lookup Content */}
      {submittedQuery && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Matches List (If multiple found) */}
          {patients.length > 1 && (
            <div className="bg-white rounded-2xl border border-border shadow-sm p-4 h-fit max-h-[600px] overflow-y-auto space-y-3 lg:col-span-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">Matching Patients ({patients.length})</p>
              <div className="space-y-2">
                {patients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      selectedPatientId === p.id
                        ? "border-primary bg-secondary/40 text-primary"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Token: {p.token} · Phone: {p.phone}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_STYLES[p.status] || "bg-gray-100 text-gray-500"}`}>
                      {p.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Details Card */}
          {selectedPatient ? (
            <div className={`space-y-6 ${patients.length > 1 ? "lg:col-span-2" : "lg:col-span-3"}`}>
              {/* Profile Overview */}
              <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50/50 to-teal-50/50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-2xl">
                      {selectedPatient.name[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{selectedPatient.name}</h3>
                      <p className="text-sm font-mono text-primary font-bold mt-0.5">Token: {selectedPatient.token}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm px-3.5 py-1 rounded-full font-semibold border ${STATUS_STYLES[selectedPatient.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                      {selectedPatient.status}
                    </span>
                    <span className={`text-sm px-3.5 py-1 rounded-full font-semibold ${TYPE_STYLES[selectedPatient.type || selectedPatient.priority || "Normal"] || TYPE_STYLES.Normal}`}>
                      {selectedPatient.type || selectedPatient.priority || "Normal"}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Detailed Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { icon: Phone, label: "Phone Number", value: selectedPatient.phone },
                      { icon: User, label: "Assigned Doctor", value: `${selectedPatient.doctorName} · ${selectedPatient.specialty || "General"}` },
                      { icon: Activity, label: "Room", value: selectedPatient.room || "Room Assigned" },
                      { icon: Clock, label: "Queue Position", value: ["Waiting", "In Queue", "In Consultation"].includes(selectedPatient.status) && selectedPatient.totalAhead !== undefined ? `${selectedPatient.totalAhead + 1} (Ahead: ${selectedPatient.totalAhead})` : "–" },
                      { icon: Calendar, label: "Registration Date", value: new Date(selectedPatient.date).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) },
                      { icon: Clock, label: "Registration Time", value: selectedPatient.registeredAt },
                      { icon: Clock, label: "Estimated Wait / Status Details", value: selectedPatient.status === "In Consultation" ? "Currently consulting" : selectedPatient.waitTime },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 mt-0.5">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedPatient.notes && (
                    <div className="mt-5 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-blue-700 font-bold uppercase tracking-wide">Clinical Notes</p>
                        <p className="text-sm text-blue-900 mt-1">{selectedPatient.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* History Timeline */}
              <div className="bg-white rounded-3xl p-6 border border-border shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <h4 className="font-bold text-foreground">Visit & Consultation History</h4>
                </div>
                <div className="relative border-l border-border ml-3 pl-6 space-y-5 py-2">
                  {historyRecords.map((item, idx) => {
                    const statusStyles: Record<string, string> = {
                      "Completed": "bg-green-500",
                      "Cancelled": "bg-red-500",
                      "Transferred": "bg-purple-500",
                      "Waiting": "bg-yellow-500",
                      "In Consultation": "bg-blue-500",
                    };
                    const dateDisplay = new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                    return (
                      <div key={item.id} className="relative">
                        {/* Dot */}
                        <div className={`absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${statusStyles[item.status] || "bg-gray-400"}`} />
                        <div>
                          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span>{item.status} Visit</span>
                            <span className="text-xs text-muted-foreground font-normal">({dateDisplay} · {item.registeredAt})</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Token <span className="font-mono font-bold text-primary">{item.token}</span> · Doctor: {item.doctorName} ({item.room})
                          </p>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground/75 mt-1 bg-muted/30 p-2 rounded-lg italic">
                              Notes: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {historyRecords.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">No historical records found.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-3 py-16 text-center bg-white rounded-2xl border border-border shadow-sm">
              <p className="text-sm text-muted-foreground">Select a patient to track</p>
            </div>
          )}
        </div>
      )}

      {/* Initial Empty State */}
      {!submittedQuery && (
        <div className="bg-white rounded-2xl border border-border shadow-sm py-20 text-center space-y-3">
          <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <h3 className="font-semibold text-foreground">Track Patient Status</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">Enter a token number, name, or phone number above to inspect active positions and past medical queue history.</p>
        </div>
      )}

      {/* Search Empty State */}
      {submittedQuery && patients.length === 0 && !isLoading && (
        <div className="bg-white rounded-2xl border border-border shadow-sm py-20 text-center space-y-3">
          <Search className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <h3 className="font-semibold text-foreground">No Patients Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">We couldn't find any patient matching "{submittedQuery}" in our database.</p>
        </div>
      )}
    </div>
  );
}
