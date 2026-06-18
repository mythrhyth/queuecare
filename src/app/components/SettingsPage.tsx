import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Save, Clock, Hash, Bell, Users, DoorOpen, Check } from "lucide-react";
import { settingsService } from "../../services/settings.service";
import { socketService } from "../../services/socket";
import { Doctor, Room } from "../../types";

type Section = "clinic" | "doctors" | "rooms" | "notifications";

const sections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "clinic", label: "Configure Clinic", icon: Clock },
  { id: "doctors", label: "Manage Doctor", icon: Users },
  { id: "rooms", label: "Manage Room", icon: DoorOpen },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("clinic");
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  // Queries
  const { data: initialClinicConfig } = useQuery({
    queryKey: ["settingsClinicConfig"],
    queryFn: () => settingsService.getClinicConfig(),
  });

  const { data: initialNotificationSettings } = useQuery({
    queryKey: ["settingsNotificationSettings"],
    queryFn: () => settingsService.getNotificationSettings(),
  });

  const { data: initialDoctorsData } = useQuery({
    queryKey: ["settingsDoctors"],
    queryFn: () => settingsService.getDoctors(),
  });

  const { data: initialRoomsData } = useQuery({
    queryKey: ["settingsRooms"],
    queryFn: () => settingsService.getRooms(),
  });

  const [clinicConfig, setClinicConfig] = useState({
    avgConsultTime: "15",
    tokenMethod: "sequential",
    maxQueue: "50",
    prioritySenior: true,
    priorityEmergency: true,
  });

  const [notifications, setNotifications] = useState({
    browser: true,
    sms: false,
    queueAlerts: true,
  });

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState("");
  const [newDoctorSpecialty, setNewDoctorSpecialty] = useState("");
  const [newDoctorRoom, setNewDoctorRoom] = useState("");

  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDoctorName, setNewRoomDoctorName] = useState("");
  const [newRoomCapacity, setNewRoomCapacity] = useState("20");

  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [editDoctorName, setEditDoctorName] = useState("");
  const [editDoctorSpecialty, setEditDoctorSpecialty] = useState("");
  const [editDoctorRoom, setEditDoctorRoom] = useState("");
  const [editDoctorAvailable, setEditDoctorAvailable] = useState(true);

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [editRoomDoctorName, setEditRoomDoctorName] = useState("");
  const [editRoomCapacity, setEditRoomCapacity] = useState("20");
  const [editRoomStatus, setEditRoomStatus] = useState("Available");

  const startEditDoctor = (doc: Doctor) => {
    setEditingDoctorId(doc.id);
    setEditDoctorName(doc.name);
    setEditDoctorSpecialty(doc.specialty);
    setEditDoctorRoom(doc.room || "");
    setEditDoctorAvailable(doc.available);
  };

  const handleSaveDoctor = async (id: string) => {
    if (!editDoctorName.trim() || !editDoctorSpecialty.trim() || !editDoctorRoom.trim()) {
      alert("Name, specialty, and room are required.");
      return;
    }
    const updated = doctors.map(d =>
      d.id === id
        ? {
            ...d,
            name: editDoctorName.trim(),
            specialty: editDoctorSpecialty.trim(),
            room: editDoctorRoom.trim(),
            available: editDoctorAvailable,
          }
        : d
    );
    setDoctors(updated);
    try {
      await settingsService.updateDoctors(updated);
      queryClient.invalidateQueries({ queryKey: ["settingsDoctors"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      socketService.emit("doctors:updated", {});
      setEditingDoctorId(null);
    } catch (err: any) {
      alert("Failed to update doctor: " + err.message);
    }
  };

  const startEditRoom = (room: Room) => {
    setEditingRoomId(room.id);
    setEditRoomName(room.name);
    setEditRoomDoctorName(room.doctorName || room.doctor || "");
    setEditRoomCapacity(String(room.capacity || 20));
    setEditRoomStatus(room.status || "Available");
  };

  const handleSaveRoom = async (id: string) => {
    if (!editRoomName.trim() || !editRoomDoctorName.trim()) {
      alert("Name and doctor name are required.");
      return;
    }
    const updated = rooms.map(r =>
      r.id === id
        ? {
            ...r,
            name: editRoomName.trim(),
            doctor: editRoomDoctorName.trim(),
            doctorName: editRoomDoctorName.trim(),
            capacity: parseInt(editRoomCapacity) || 20,
            status: editRoomStatus,
          }
        : r
    );
    setRooms(updated);
    try {
      await settingsService.updateRooms(updated);
      queryClient.invalidateQueries({ queryKey: ["settingsRooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      socketService.emit("rooms:updated", {});
      setEditingRoomId(null);
    } catch (err: any) {
      alert("Failed to update room: " + err.message);
    }
  };

  // Sync state with queries
  useEffect(() => {
    if (initialClinicConfig) {
      setClinicConfig({
        avgConsultTime: initialClinicConfig.avgConsultTime || "15",
        tokenMethod: initialClinicConfig.tokenMethod || "sequential",
        maxQueue: initialClinicConfig.maxQueue || "50",
        prioritySenior: initialClinicConfig.prioritySenior ?? true,
        priorityEmergency: initialClinicConfig.priorityEmergency ?? true,
      });
    }
  }, [initialClinicConfig]);

  useEffect(() => {
    if (initialNotificationSettings) {
      setNotifications({
        browser: initialNotificationSettings.browser ?? true,
        sms: initialNotificationSettings.sms ?? false,
        queueAlerts: initialNotificationSettings.queueAlerts ?? true,
      });
    }
  }, [initialNotificationSettings]);

  useEffect(() => {
    if (initialDoctorsData) {
      setDoctors(initialDoctorsData);
    }
  }, [initialDoctorsData]);

  useEffect(() => {
    if (initialRoomsData) {
      setRooms(initialRoomsData);
    }
  }, [initialRoomsData]);

  // Socket setup
  useEffect(() => {
    socketService.connect();
    
    const handleSettingsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["settingsClinicConfig"] });
      queryClient.invalidateQueries({ queryKey: ["settingsNotificationSettings"] });
    };

    const handleDoctorsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["settingsDoctors"] });
    };

    const handleRoomsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["settingsRooms"] });
    };

    socketService.on("settings:updated", handleSettingsUpdate);
    socketService.on("doctors:updated", handleDoctorsUpdate);
    socketService.on("rooms:updated", handleRoomsUpdate);

    return () => {
      socketService.off("settings:updated", handleSettingsUpdate);
      socketService.off("doctors:updated", handleDoctorsUpdate);
      socketService.off("rooms:updated", handleRoomsUpdate);
    };
  }, [queryClient]);

  const handleClinicSave = async () => {
    try {
      await settingsService.updateClinicConfig(clinicConfig);
      queryClient.invalidateQueries({ queryKey: ["settingsClinicConfig"] });
      socketService.emit("settings:updated", {});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert("Failed to save clinic config: " + err.message);
    }
  };

  const handleNotificationSave = async () => {
    try {
      await settingsService.updateNotificationSettings(notifications);
      queryClient.invalidateQueries({ queryKey: ["settingsNotificationSettings"] });
      socketService.emit("settings:updated", {});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert("Failed to save notification settings: " + err.message);
    }
  };

  const toggleDoctorAvailability = async (id: string) => {
    const updated = doctors.map(d => d.id === id ? { ...d, available: !d.available } : d);
    setDoctors(updated);
    try {
      await settingsService.updateDoctors(updated);
      queryClient.invalidateQueries({ queryKey: ["settingsDoctors"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      socketService.emit("doctors:updated", {});
    } catch (err: any) {
      alert("Failed to update availability: " + err.message);
    }
  };

  const removeDoctor = async (id: string) => {
    const updated = doctors.filter(d => d.id !== id);
    setDoctors(updated);
    try {
      await settingsService.updateDoctors(updated);
      queryClient.invalidateQueries({ queryKey: ["settingsDoctors"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      socketService.emit("doctors:updated", {});
    } catch (err: any) {
      alert("Failed to delete doctor: " + err.message);
    }
  };

  const removeRoom = async (id: string) => {
    const updated = rooms.filter(r => r.id !== id);
    setRooms(updated);
    try {
      await settingsService.updateRooms(updated);
      queryClient.invalidateQueries({ queryKey: ["settingsRooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      socketService.emit("rooms:updated", {});
    } catch (err: any) {
      alert("Failed to delete room: " + err.message);
    }
  };

  const addDoctor = async () => {
    const name = prompt("Enter doctor's name:");
    if (!name) return;
    const specialty = prompt("Enter specialty:");
    if (!specialty) return;
    const room = prompt("Enter room name (e.g. Room 5):");
    if (!room) return;

    const newDoctor = {
      id: Date.now().toString(),
      name,
      specialty,
      room,
      available: true,
    };
    const updated = [...doctors, newDoctor];
    try {
      await settingsService.updateDoctors(updated);
      queryClient.invalidateQueries({ queryKey: ["settingsDoctors"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      socketService.emit("doctors:updated", {});
    } catch (err: any) {
      alert("Failed to add doctor: " + err.message);
    }
  };

  const addRoom = async () => {
    const name = prompt("Enter room name (e.g. Room 5):");
    if (!name) return;
    const docName = prompt("Enter assigned doctor name:");
    if (!docName) return;
    const capacityVal = prompt("Enter capacity:", "20");
    if (!capacityVal) return;

    const newRoom = {
      id: Date.now().toString(),
      name,
      doctor: docName,
      capacity: parseInt(capacityVal) || 20,
      occupancy: 0,
      doctorId: "",
      doctorName: docName,
      status: "Available",
      queue: [],
    };
    const updated = [...rooms, newRoom];
    try {
      await settingsService.updateRooms(updated);
      queryClient.invalidateQueries({ queryKey: ["settingsRooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      socketService.emit("rooms:updated", {});
    } catch (err: any) {
      alert("Failed to add room: " + err.message);
    }
  };

  const handleInlineAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctorName || !newDoctorSpecialty || !newDoctorRoom) return;

    const newDoctor = {
      id: Date.now().toString(),
      name: newDoctorName,
      specialty: newDoctorSpecialty,
      room: newDoctorRoom,
      available: true,
    };
    const updated = [...doctors, newDoctor];
    try {
      await settingsService.updateDoctors(updated);
      queryClient.invalidateQueries({ queryKey: ["settingsDoctors"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      socketService.emit("doctors:updated", {});
      
      // Reset form states
      setNewDoctorName("");
      setNewDoctorSpecialty("");
      setNewDoctorRoom("");
      setShowAddDoctorForm(false);
    } catch (err: any) {
      alert("Failed to add doctor: " + err.message);
    }
  };

  const handleInlineAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName || !newRoomDoctorName) return;

    const newRoom = {
      id: Date.now().toString(),
      name: newRoomName,
      doctor: newRoomDoctorName,
      capacity: parseInt(newRoomCapacity) || 20,
      occupancy: 0,
      doctorId: "",
      doctorName: newRoomDoctorName,
      status: "Available",
      queue: [],
    };
    const updated = [...rooms, newRoom];
    try {
      await settingsService.updateRooms(updated);
      queryClient.invalidateQueries({ queryKey: ["settingsRooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      socketService.emit("rooms:updated", {});

      // Reset form states
      setNewRoomName("");
      setNewRoomDoctorName("");
      setNewRoomCapacity("20");
      setShowAddRoomForm(false);
    } catch (err: any) {
      alert("Failed to add room: " + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-4 gap-5">
          {/* Section nav */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-3">
              <nav className="space-y-1">
                {sections.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeSection === id
                        ? "bg-secondary text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden md:block text-left">{label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="md:col-span-3 space-y-5">
            {/* Clinic Config */}
            {activeSection === "clinic" && (
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
                <div>
                  <h3 className="font-semibold text-foreground mb-0.5">Configure Clinic</h3>
                  <p className="text-sm text-muted-foreground">Configure queue rules and consultation settings</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Average Consultation Time (minutes)</label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="number"
                        value={clinicConfig.avgConsultTime}
                        onChange={e => setClinicConfig(c => ({ ...c, avgConsultTime: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Token Generation Method</label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select
                        value={clinicConfig.tokenMethod}
                        onChange={e => setClinicConfig(c => ({ ...c, tokenMethod: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm appearance-none"
                      >
                        <option value="sequential">Sequential (T-001, T-002...)</option>
                        <option value="random">Random 4-digit</option>
                        <option value="alphabetic">Alphabetic Prefix</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Maximum Queue Limit</label>
                    <input
                      type="number"
                      value={clinicConfig.maxQueue}
                      onChange={e => setClinicConfig(c => ({ ...c, maxQueue: e.target.value }))}
                      className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Queue Priority Rules</p>
                    {[
                      { key: "prioritySenior" as const, label: "Senior Citizen Priority", desc: "Senior citizens (60+) get priority positioning" },
                      { key: "priorityEmergency" as const, label: "Emergency Priority", desc: "Emergency cases bypass regular queue" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setClinicConfig(c => ({ ...c, [key]: !c[key] }))}
                          className={`w-11 h-6 rounded-full transition-colors relative ${clinicConfig[key] ? "bg-primary" : "bg-switch-background"}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${clinicConfig[key] ? "left-5.5" : "left-0.5"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleClinicSave}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? "Saved!" : "Save Changes"}
                </button>
              </div>
            )}

            {/* Doctors */}
            {activeSection === "doctors" && (
              <div className="space-y-5">
                {showAddDoctorForm && (
                  <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <h4 className="font-semibold text-foreground">Add New Doctor</h4>
                      <button 
                        onClick={() => setShowAddDoctorForm(false)} 
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                    <form onSubmit={handleInlineAddDoctor} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                        <input
                          type="text"
                          value={newDoctorName}
                          onChange={e => setNewDoctorName(e.target.value)}
                          placeholder="e.g. Dr. Jane Smith"
                          required
                          className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">Specialty *</label>
                          <input
                            type="text"
                            value={newDoctorSpecialty}
                            onChange={e => setNewDoctorSpecialty(e.target.value)}
                            placeholder="e.g. Pediatrics"
                            required
                            className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">Assigned Room *</label>
                          <input
                            type="text"
                            value={newDoctorRoom}
                            onChange={e => setNewDoctorRoom(e.target.value)}
                            placeholder="e.g. Room 5"
                            required
                            className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddDoctorForm(false)}
                          className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Add Doctor
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-border flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">Manage Doctor</h3>
                      <p className="text-sm text-muted-foreground">{doctors.length} doctors registered</p>
                    </div>
                    {!showAddDoctorForm && (
                      <button
                        onClick={() => setShowAddDoctorForm(true)}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Doctor
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-border">
                    {doctors.map(doc => {
                      const isEditing = editingDoctorId === doc.id;
                      if (isEditing) {
                        return (
                          <div key={doc.id} className="p-4 bg-muted/30 border-b border-border">
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveDoctor(doc.id); }} className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Doctor Name *</label>
                                  <input
                                    type="text"
                                    value={editDoctorName}
                                    onChange={e => setEditDoctorName(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Specialty *</label>
                                  <input
                                    type="text"
                                    value={editDoctorSpecialty}
                                    onChange={e => setEditDoctorSpecialty(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Room Name *</label>
                                  <input
                                    type="text"
                                    value={editDoctorRoom}
                                    onChange={e => setEditDoctorRoom(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    required
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-muted-foreground">Available</span>
                                  <button
                                    type="button"
                                    onClick={() => setEditDoctorAvailable(!editDoctorAvailable)}
                                    className={`w-10 h-5.5 rounded-full transition-colors relative flex-shrink-0 ${editDoctorAvailable ? "bg-primary" : "bg-switch-background"}`}
                                    style={{ height: "22px", width: "40px" }}
                                  >
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${editDoctorAvailable ? "left-5" : "left-0.5"}`} />
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingDoctorId(null)}
                                    className="px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border text-xs rounded-lg font-medium text-foreground transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    className="bg-primary text-white px-3 py-1.5 text-xs rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1"
                                  >
                                    <Save className="w-3 h-3" />
                                    Save
                                  </button>
                                </div>
                              </div>
                            </form>
                          </div>
                        );
                      }
                      return (
                        <div key={doc.id} className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {doc.name.split(" ").slice(-1)[0]?.[0] || doc.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">{doc.specialty} · {doc.room}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${doc.available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {doc.available ? "Available" : "Off Duty"}
                            </span>
                            <button
                              onClick={() => toggleDoctorAvailability(doc.id)}
                              className={`w-10 h-5.5 rounded-full transition-colors relative flex-shrink-0 ${doc.available ? "bg-primary" : "bg-switch-background"}`}
                              style={{ height: "22px", width: "40px" }}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${doc.available ? "left-5" : "left-0.5"}`} />
                            </button>
                            <button
                              onClick={() => startEditDoctor(doc)}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeDoctor(doc.id)}
                              className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Rooms */}
            {activeSection === "rooms" && (
              <div className="space-y-5">
                {showAddRoomForm && (
                  <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <h4 className="font-semibold text-foreground">Add New Room</h4>
                      <button 
                        onClick={() => setShowAddRoomForm(false)} 
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                    <form onSubmit={handleInlineAddRoom} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Room Name *</label>
                        <input
                          type="text"
                          value={newRoomName}
                          onChange={e => setNewRoomName(e.target.value)}
                          placeholder="e.g. Room 5"
                          required
                          className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">Assigned Doctor *</label>
                          <input
                            type="text"
                            value={newRoomDoctorName}
                            onChange={e => setNewRoomDoctorName(e.target.value)}
                            placeholder="e.g. Dr. Jane Smith"
                            required
                            className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">Capacity *</label>
                          <input
                            type="number"
                            value={newRoomCapacity}
                            onChange={e => setNewRoomCapacity(e.target.value)}
                            placeholder="20"
                            required
                            className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddRoomForm(false)}
                          className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Add Room
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-border flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">Manage Room</h3>
                      <p className="text-sm text-muted-foreground">{rooms.length} rooms configured</p>
                    </div>
                    {!showAddRoomForm && (
                      <button
                        onClick={() => setShowAddRoomForm(true)}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Room
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-border">
                    {rooms.map(room => {
                      const isEditing = editingRoomId === room.id;
                      if (isEditing) {
                        return (
                          <div key={room.id} className="p-4 bg-muted/30 border-b border-border">
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveRoom(room.id); }} className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Room Name *</label>
                                  <input
                                    type="text"
                                    value={editRoomName}
                                    onChange={e => setEditRoomName(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Assigned Doctor *</label>
                                  <input
                                    type="text"
                                    value={editRoomDoctorName}
                                    onChange={e => setEditRoomDoctorName(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Max Capacity *</label>
                                  <input
                                    type="number"
                                    value={editRoomCapacity}
                                    onChange={e => setEditRoomCapacity(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                                  <select
                                    value={editRoomStatus}
                                    onChange={e => setEditRoomStatus(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                  >
                                    <option value="Available">Available</option>
                                    <option value="Full">Full</option>
                                    <option value="Out of Service">Out of Service</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingRoomId(null)}
                                  className="px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border text-xs rounded-lg font-medium text-foreground transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="bg-primary text-white px-3 py-1.5 text-xs rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1"
                                >
                                  <Save className="w-3 h-3" />
                                  Save
                                </button>
                              </div>
                            </form>
                          </div>
                        );
                      }
                      return (
                        <div key={room.id} className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <DoorOpen className="w-5 h-5 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{room.name}</p>
                            <p className="text-xs text-muted-foreground">{room.doctorName || room.doctor || "–"} · Max {room.capacity} patients · Status: <span className="font-semibold">{room.status || "Available"}</span></p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditRoom(room)}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeRoom(room.id)}
                              className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeSection === "notifications" && (
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-0.5">Notification Management</h3>
                  <p className="text-sm text-muted-foreground">Configure how alerts are delivered</p>
                </div>
                {[
                  { key: "browser" as const, label: "Browser Notifications", desc: "Desktop/browser push notifications for queue events" },
                  { key: "sms" as const, label: "SMS Notifications", desc: "Text message alerts to patient phone numbers" },
                  { key: "queueAlerts" as const, label: "Queue Alerts", desc: "Alert when queue reaches capacity or doctors are delayed" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications(n => ({ ...n, [key]: !n[key] }))}
                      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${notifications[key] ? "bg-primary" : "bg-switch-background"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${notifications[key] ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleNotificationSave}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? "Saved!" : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

