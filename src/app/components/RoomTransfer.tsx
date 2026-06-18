import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, CheckCircle, SkipForward, ChevronRight, Clock, Users } from "lucide-react";
import { roomsService } from "../../services/rooms.service";
import { queueService } from "../../services/queue.service";
import { socketService } from "../../services/socket";
import { Patient, PatientStatus } from "../../types";

const STATUS_STYLES: Record<PatientStatus, string> = {
  "In Consultation": "bg-blue-100 text-blue-700",
  "In Queue": "bg-teal-100 text-teal-700",
  "Waiting": "bg-yellow-100 text-yellow-700",
  "Completed": "bg-green-100 text-green-700",
  "Skipped": "bg-gray-100 text-gray-500",
};

const PRIORITY_BADGE: Record<string, string> = {
  Normal: "bg-gray-100 text-gray-500",
  Senior: "bg-orange-100 text-orange-600",
  "Senior Citizen": "bg-orange-100 text-orange-600",
  Emergency: "bg-red-100 text-red-600",
};

export function RoomTransfer() {
  const [activeRoom, setActiveRoom] = useState("Room 2");
  const [transferModal, setTransferModal] = useState<{ patient: Patient; fromRoom: string } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
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
    return `${diffMin > 0 ? diffMin : 0} min`;
  };

  // Queries
  const { data: roomsResponse } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomsService.getRooms(),
  });

  const { data: liveQueueResponse } = useQuery({
    queryKey: ["liveQueue"],
    queryFn: () => queueService.getLiveQueue(),
  });

  const rooms = roomsResponse || [];
  const liveQueue = liveQueueResponse || [];

  // Group patients by room name to match original key structure
  const patients: Record<string, Patient[]> = {};
  rooms.forEach(r => {
    patients[r.name] = liveQueue.filter(p => p.room === r.name);
  });

  // Socket setup
  useEffect(() => {
    socketService.connect();
    
    const handleQueueUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["liveQueue"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    };

    socketService.on("queue:updated", handleQueueUpdate);
    socketService.on("rooms:updated", handleQueueUpdate);

    // Standardized new events
    socketService.on("queue-updated", handleQueueUpdate);
    socketService.on("patient-added", handleQueueUpdate);
    socketService.on("patient-updated", handleQueueUpdate);
    socketService.on("patient-promoted", handleQueueUpdate);
    socketService.on("patient-completed", handleQueueUpdate);
    socketService.on("patient-cancelled", handleQueueUpdate);
    socketService.on("patient-transferred", handleQueueUpdate);
    socketService.on("wait-time-updated", handleQueueUpdate);
    socketService.on("doctor-status-updated", handleQueueUpdate);

    return () => {
      socketService.off("queue:updated", handleQueueUpdate);
      socketService.off("rooms:updated", handleQueueUpdate);

      socketService.off("queue-updated", handleQueueUpdate);
      socketService.off("patient-added", handleQueueUpdate);
      socketService.off("patient-updated", handleQueueUpdate);
      socketService.off("patient-promoted", handleQueueUpdate);
      socketService.off("patient-completed", handleQueueUpdate);
      socketService.off("patient-cancelled", handleQueueUpdate);
      socketService.off("patient-transferred", handleQueueUpdate);
      socketService.off("wait-time-updated", handleQueueUpdate);
      socketService.off("doctor-status-updated", handleQueueUpdate);
    };
  }, [queryClient]);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  const currentList = (patients[activeRoom] || [])
    .filter(p => ["Waiting", "In Queue", "In Consultation"].includes(p.status))
    .sort((a, b) => {
      if (a.status === "In Consultation" && b.status !== "In Consultation") return -1;
      if (b.status === "In Consultation" && a.status !== "In Consultation") return 1;
      return a.position - b.position;
    });

  const updateStatus = async (token: string, newStatus: PatientStatus) => {
    try {
      await queueService.updateStatus(token, newStatus);
      queryClient.invalidateQueries({ queryKey: ["liveQueue"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      socketService.emit("queue:updated", {});
      showFeedback(
        newStatus === "Completed" ? "Patient completed · Next patient called in" :
        newStatus === "Skipped"   ? "Patient skipped · Next patient called in" :
        newStatus === "Cancelled" ? "Patient appointment cancelled" :
        `Patient marked as ${newStatus}`
      );
    } catch (err: any) {
      showFeedback("Failed to update status: " + err.message);
    }
  };

  const handleTransfer = async (toRoomName: string) => {
    if (!transferModal) return;
    const { patient } = transferModal;
    const targetRoom = rooms.find(r => r.name === toRoomName);
    
    try {
      await queueService.transferPatient(patient.token, {
        room: toRoomName,
        doctorId: targetRoom?.doctorId || "",
      });
      queryClient.invalidateQueries({ queryKey: ["liveQueue"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      socketService.emit("queue:updated", {});
      setTransferModal(null);
      showFeedback(`Patient transferred to ${toRoomName}`);
    } catch (err: any) {
      showFeedback("Failed to transfer patient: " + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Toast feedback */}
      {actionFeedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          {actionFeedback}
        </div>
      )}

      {/* Room Tabs */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Select Room</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {rooms.map(room => {
            const activePatients = (patients[room.name] || []).filter(p =>
              ["Waiting", "In Queue", "In Consultation"].includes(p.status)
            );
            const count = activePatients.length;
            const inConsult = activePatients.filter(p => p.status === "In Consultation").length;
            return (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room.name)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeRoom === room.name
                    ? "border-primary bg-secondary"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <p className={`text-sm font-semibold ${activeRoom === room.name ? "text-primary" : "text-foreground"}`}>{room.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{count} patients · {inConsult} consulting</p>
              </button>
            );
          })}
          {rooms.length === 0 && (
            <p className="text-sm text-muted-foreground text-center col-span-4 py-4">No rooms configured.</p>
          )}
        </div>
      </div>

      {/* Queue Management Panel */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{activeRoom} Queue</h3>
            <p className="text-xs text-muted-foreground">{currentList.length} patients · Manage room queue</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>

        {currentList.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No patients in this room</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {currentList.map((patient, idx) => {
              const priorityVal = patient.type || patient.priority || "Normal";
              const doctorName = patient.doctorName || (patient as any).doctor || "–";
              const waitVal = patient.waitTime || (patient as any).wait || "–";
              return (
                <div
                  key={patient.token}
                  className={`p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors ${
                    patient.status === "In Consultation" ? "bg-blue-50/40" : ""
                  }`}
                >
                  {/* Position */}
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-sm font-bold text-muted-foreground flex-shrink-0">
                    {idx + 1}
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-primary">{patient.token}</span>
                      <span className="text-sm font-semibold text-foreground">{patient.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[priorityVal] || "bg-gray-100 text-gray-500"}`}>
                        {priorityVal}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{doctorName}</span>
                      {!["Completed", "Cancelled", "Transferred"].includes(patient.status) && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Waited: {getActualWaitTime(patient.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium hidden sm:inline-flex ${STATUS_STYLES[patient.status] || "bg-gray-100 text-gray-500"}`}>
                    {patient.status}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(patient.status === "Waiting" || patient.status === "In Queue") && (
                      <button
                        onClick={() => updateStatus(patient.token, "In Consultation")}
                        className="text-xs px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-semibold"
                      >
                        Consult
                      </button>
                    )}
                    {patient.status === "In Consultation" && (
                      <button
                        onClick={() => updateStatus(patient.token, "Completed")}
                        className="text-xs px-2.5 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-semibold"
                      >
                        Done
                      </button>
                    )}
                    {(patient.status === "Waiting" || patient.status === "In Queue" || patient.status === "In Consultation") && (
                      <button
                        onClick={() => updateStatus(patient.token, "Skipped")}
                        className="text-xs px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-semibold flex items-center gap-1"
                      >
                        <SkipForward className="w-3 h-3" />
                        Skip
                      </button>
                    )}
                    {(patient.status === "Waiting" || patient.status === "In Queue" || patient.status === "In Consultation") && (
                      <button
                        onClick={() => updateStatus(patient.token, "Cancelled")}
                        className="text-xs px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-semibold flex items-center gap-1"
                      >
                        Cancel
                      </button>
                    )}
                    {(patient.status === "Waiting" || patient.status === "In Queue" || patient.status === "In Consultation") && (
                      <button
                        onClick={() => setTransferModal({ patient, fromRoom: activeRoom })}
                        className="text-xs px-2.5 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-semibold flex items-center gap-1"
                        title="Transfer to another room"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        Transfer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-bold text-foreground mb-1">Transfer Patient</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Move <strong>{transferModal.patient.name}</strong> ({transferModal.patient.token}) to another room
            </p>
            <div className="space-y-2">
              {rooms
                .filter(r => r.name !== activeRoom)
                .map(room => {
                  const patientCount = patients[room.name]?.length || 0;
                  return (
                    <button
                      key={room.id}
                      onClick={() => handleTransfer(room.name)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary transition-all"
                    >
                      <div className="text-left">
                        <p className="font-semibold text-foreground text-sm">{room.name}</p>
                        <p className="text-xs text-muted-foreground">{patientCount} patients in queue</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  );
                })}
            </div>
            <button
              onClick={() => setTransferModal(null)}
              className="w-full mt-4 py-3 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

