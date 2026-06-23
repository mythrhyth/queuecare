import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, CheckCircle, RotateCcw, Clock, MapPin, User, Printer, Users } from "lucide-react";
import { doctorsService } from "../../services/doctors.service";
import { patientsService } from "../../services/patients.service";
import { socketService } from "../../services/socket";
import { jsPDF } from "jspdf";

// UI Components
import { CardSkeleton } from "./ui/CardSkeleton";
import { EmptyState } from "./ui/EmptyState";
import { ErrorState } from "./ui/ErrorState";

interface SuccessToken {
  token: string;
  doctor: string;
  room: string;
  wait: string;
  priority: string;
}

export function AddPatient() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    phone: "+91",
    doctorId: "",
    priority: "Normal",
  });
  const [submitted, setSubmitted] = useState<SuccessToken | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Load doctors list
  const { data: doctorsData, isLoading: isLoadingDoctors, isError: isErrorDoctors, refetch: refetchDoctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorsService.getDoctors(),
  });

  // Socket updates for doctor list/availability changes
  useEffect(() => {
    socketService.connect();
    const handleDoctorsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    };
    socketService.on("doctors:updated", handleDoctorsUpdate);
    socketService.on("doctor-status-updated", handleDoctorsUpdate);

    return () => {
      socketService.off("doctors:updated", handleDoctorsUpdate);
      socketService.off("doctor-status-updated", handleDoctorsUpdate);
    };
  }, [queryClient]);

  const doctors = doctorsData || [];

  const selectedDoctor = doctors.find(d => d.id === form.doctorId);

  // Mutation for registering a patient
  const registerMutation = useMutation({
    mutationFn: (payload: { name: string; phone: string; doctorId: string; priority: string }) =>
      patientsService.registerPatient(payload),
    onSuccess: (newPatient) => {
      // Invalidate queries to fetch fresh live queue / statistics
      queryClient.invalidateQueries({ queryKey: ["liveQueue"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsKpis"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      
      // Emit socket notification
      socketService.emit("queue:updated", {});
      
      // Set the success screen
      setSubmitted({
        token: newPatient.token,
        doctor: newPatient.doctorName || selectedDoctor?.name || "Dr. Assigned",
        room: newPatient.room || selectedDoctor?.room || "Room Assigned",
        wait: newPatient.waitTime || selectedDoctor?.currentWait || "15 min",
        priority: newPatient.priority || newPatient.type || form.priority,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.doctorId) return;

    // Validate phone number (must be +91 followed by exactly 10 digits starting with 6-9)
    const cleanedPhone = form.phone.replace(/\s+/g, "");
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      setPhoneError("Please enter a valid 10-digit Indian mobile number starting with 6-9");
      return;
    }

    setPhoneError(null);
    registerMutation.mutate(form);
  };

  const handleReset = () => {
    setForm({ name: "", phone: "+91", doctorId: "", priority: "Normal" });
    setSubmitted(null);
    setPhoneError(null);
  };

  const handleDownloadPDF = () => {
    if (!submitted) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 105],
    });

    // Brand Header
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235); // primary color
    doc.setFontSize(14);
    doc.text("QUEUECARE HEALTHCARE", 40, 12, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.text("Smart Patient Queue System", 40, 16, { align: "center" });

    // Separator
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(6, 20, 74, 20);

    // Token Section
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(9);
    doc.text("YOUR TOKEN NUMBER", 40, 26, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(38);
    doc.text(submitted.token, 40, 40, { align: "center" });

    // Priority badge
    let badgeColor = "#2563eb";
    if (submitted.priority.includes("Emergency")) {
      badgeColor = "#dc2626";
    } else if (submitted.priority.includes("Senior")) {
      badgeColor = "#ea580c";
    }

    doc.setFont("helvetica", "bold");
    doc.setTextColor(badgeColor);
    doc.setFontSize(9);
    doc.text(submitted.priority.toUpperCase(), 40, 47, { align: "center" });

    // Separator line
    doc.setDrawColor(229, 231, 235);
    doc.line(15, 52, 65, 52);

    // Info details
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(9);
    
    const startY = 60;
    const lineHeight = 6;

    doc.setFont("helvetica", "bold");
    doc.text("Doctor:", 10, startY);
    doc.setFont("helvetica", "normal");
    const cleanDoctor = submitted.doctor.replace(/\n/g, " ");
    doc.text(cleanDoctor, 28, startY);

    doc.setFont("helvetica", "bold");
    doc.text("Room:", 10, startY + lineHeight);
    doc.setFont("helvetica", "normal");
    doc.text(submitted.room, 28, startY + lineHeight);

    doc.setFont("helvetica", "bold");
    doc.text("Est. Wait:", 10, startY + (lineHeight * 2));
    doc.setFont("helvetica", "normal");
    doc.text(submitted.wait, 28, startY + (lineHeight * 2));

    doc.setFont("helvetica", "bold");
    doc.text("Printed At:", 10, startY + (lineHeight * 3));
    doc.setFont("helvetica", "normal");
    const timestamp = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }) + " (" + new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + ")";
    doc.text(timestamp, 28, startY + (lineHeight * 3));

    // Footer line
    doc.setDrawColor(229, 231, 235);
    doc.line(6, startY + (lineHeight * 3) + 6, 74, startY + (lineHeight * 3) + 6);

    // Footer Text
    doc.setFont("helvetica", "italic");
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7.5);
    const footerY = startY + (lineHeight * 3) + 11;
    doc.text("Please wait for your token to be announced on the screens.", 40, footerY, { align: "center" });
    doc.text("Get well soon!", 40, footerY + 4, { align: "center" });

    doc.save(`Token_${submitted.token}.pdf`);
  };

  const PRIORITY_COLORS: Record<string, string> = {
    Normal: "border-blue-200 bg-blue-50 text-blue-700",
    "Senior Citizen": "border-orange-200 bg-orange-50 text-orange-700",
    "Senior": "border-orange-200 bg-orange-50 text-orange-700",
    Emergency: "border-red-200 bg-red-50 text-red-700",
  };

  if (submitted) {
    return (
      <div className="p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          {/* Success state */}
          <div className="bg-white rounded-3xl border border-green-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-teal-50 p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">Patient Added Successfully</h2>
              <p className="text-muted-foreground text-sm">Token has been generated and patient added to queue</p>
            </div>

            <div className="p-8">
              {/* Token Number */}
              <div className="text-center mb-8">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Token Number</p>
                <div className="text-7xl font-bold text-primary tracking-tight">{submitted.token}</div>
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium mt-3 border ${PRIORITY_COLORS[submitted.priority] || "border-blue-200 bg-blue-50 text-blue-700"}`}>
                  {submitted.priority}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { icon: User, label: "Doctor", value: submitted.doctor.replace("Dr. ", "Dr.\n") },
                  { icon: MapPin, label: "Room", value: submitted.room },
                  { icon: Clock, label: "Est. Wait", value: submitted.wait },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-muted rounded-2xl p-4 text-center">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm font-semibold text-foreground leading-tight">{value}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Another Patient
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-border text-foreground hover:bg-muted transition-colors font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Print Token
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Add Patient</h2>
              <p className="text-sm text-muted-foreground">Register a new patient and generate their token</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Patient Info */}
          <div className="bg-white rounded-2xl p-5 border border-border shadow-sm space-y-4">
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide text-muted-foreground">Patient Information</h3>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ramesh Kumar"
                required
                className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => {
                  let val = e.target.value;
                  if (!val.startsWith("+91")) {
                    val = "+91" + val.replace(/^\+?9?1?/, "");
                  }
                  const prefix = "+91";
                  const rest = val.slice(3);
                  const cleanedRest = rest.replace(/[^\d\s]/g, "");
                  setForm(f => ({ ...f, phone: prefix + cleanedRest }));
                  if (phoneError) setPhoneError(null);
                }}
                placeholder="+91 98765 43210"
                required
                className={`w-full px-4 py-3 bg-muted rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm ${
                  phoneError ? "border-red-500 focus:ring-red-500/30 focus:border-red-500" : "border-border"
                }`}
              />
              {phoneError && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">{phoneError}</p>
              )}
            </div>
          </div>

          {/* Doctor Selection */}
          <div className="bg-white rounded-2xl p-5 border border-border shadow-sm space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Select Doctor *</h3>
            <div className="space-y-2">
              {isLoadingDoctors ? (
                <CardSkeleton variant="doctor" count={2} />
              ) : isErrorDoctors ? (
                <ErrorState title="Failed to load doctors" onRetry={refetchDoctors} />
              ) : doctors.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No Doctors Registered"
                  description="We couldn't find any registered doctors. Please add a doctor in Settings first."
                />
              ) : (
                doctors.map(doc => (
                  <label
                    key={doc.id}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      form.doctorId === doc.id
                        ? "border-primary bg-secondary"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="doctor"
                        value={doc.id}
                        checked={form.doctorId === doc.id}
                        onChange={() => setForm(f => ({ ...f, doctorId: doc.id }))}
                        className="w-4 h-4 accent-primary"
                      />
                      <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {doc.name.split(" ").slice(-1)[0]?.[0] || doc.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.specialty} · {doc.room}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{doc.currentWait || doc.wait || "15 min"}</p>
                      <p className="text-xs text-muted-foreground">est. wait</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Priority */}
          <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Priority Type</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "Normal", color: "border-blue-300 bg-blue-50 text-blue-700", active: "border-blue-500 bg-blue-100 text-blue-800" },
                { value: "Senior Citizen", color: "border-orange-200 bg-orange-50 text-orange-700", active: "border-orange-400 bg-orange-100 text-orange-800" },
                { value: "Emergency", color: "border-red-200 bg-red-50 text-red-700", active: "border-red-500 bg-red-100 text-red-800" },
              ].map(({ value, color, active }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, priority: value }))}
                  className={`py-3 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    form.priority === value ? active : color
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={registerMutation.isPending || !form.doctorId || isLoadingDoctors}
              className="flex-1 bg-primary text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
            >
              {registerMutation.isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating Token...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add To Queue
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-border text-foreground hover:bg-muted transition-colors font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
