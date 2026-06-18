import { Activity, ArrowRight, CheckCircle, Clock, Users, Shield, Zap, ChevronRight, HelpCircle, Phone, Info, Accessibility } from "lucide-react";

interface LandingPageProps {
  onReceptionist: () => void;
  onPatient: () => void;
}

const MOCK_STATS = [
  { val: "500+", label: "Clinics Registered" },
  { val: "2M+", label: "Patients Served" },
  { val: "99.9%", label: "System Uptime" },
];

const MOCK_QUEUE = [
  { token: "T-016", status: "Waiting" },
  { token: "T-017", status: "In Queue" },
  { token: "T-018", status: "In Queue" },
  { token: "T-019", status: "Waiting" },
];

const MOCK_DOCTORS = [
  { name: "Dr. Sharma", room: "Room 1", patientsWaiting: 2 },
  { name: "Dr. Patel", room: "Room 3", patientsWaiting: 4 },
];

export function LandingPage({ onReceptionist, onPatient }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-semibold text-foreground tracking-tight">QueueCare</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Features</a>
              <a href="#benefits" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Benefits</a>
              <a href="#accessibility" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Accessibility</a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">About</a>
            </nav>
            <button
              onClick={onReceptionist}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Staff Login
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-secondary text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-6">
                <Zap className="w-3.5 h-3.5" />
                Smart Queue Management Platform
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
                Know Your Turn.{" "}
                <span className="text-primary">Skip The</span>{" "}
                Uncertainty.
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                A state-of-the-art queue management solution tailored for healthcare providers. Keep your patients updated in real time, minimize crowding in lobbies, and empower clinic receptionist operations with intelligent wait-time estimates.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onPatient}
                  className="flex items-center justify-center gap-2 bg-accent text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-teal-700 transition-all shadow-md hover:shadow-lg"
                >
                  Track My Queue
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onReceptionist}
                  className="flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3.5 rounded-xl font-medium hover:bg-muted transition-colors"
                >
                  Receptionist Portal
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-8 mt-10 border-t border-border pt-8">
                {MOCK_STATS.map(({ val, label }) => (
                  <div key={label}>
                    <p className="text-2xl font-bold text-foreground">{val}</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Illustration */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-3xl p-8 relative overflow-hidden border border-blue-100 shadow-sm">
                <div className="absolute top-4 right-4 w-16 h-16 bg-primary/10 rounded-full" />
                <div className="absolute bottom-4 left-4 w-24 h-24 bg-accent/10 rounded-full" />

                {/* Queue Display Board (Mockup) */}
                <div className="bg-white rounded-2xl p-5 shadow-lg mb-4 border border-blue-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Now Serving</span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] text-green-600 font-semibold uppercase">Live Monitor</span>
                    </span>
                  </div>
                  <div className="text-5xl font-extrabold text-primary text-center py-2 tracking-tight">
                    T-015
                  </div>
                  <p className="text-center text-sm font-medium text-foreground">
                    Room 2 · Dr. Verma
                  </p>
                </div>

                {/* Patient tokens (Mockup) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {MOCK_QUEUE.map(({ token, status }) => {
                    const statusColors: Record<string, string> = {
                      "In Queue": "bg-blue-100 text-blue-700",
                      "Waiting": "bg-gray-100 text-gray-600",
                    };
                    return (
                      <div key={token} className="bg-white rounded-xl p-3 shadow-sm text-center border border-gray-100">
                        <div className="text-base font-bold text-foreground">#{token}</div>
                        <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5 inline-block ${statusColors[status] || "bg-gray-100 text-gray-600"}`}>
                          {status}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Doctor availability (Mockup) */}
                <div className="bg-white rounded-2xl p-4 shadow-lg mt-4 border border-gray-100">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Doctors On Duty</p>
                  <div className="space-y-3">
                    {MOCK_DOCTORS.map(doc => (
                      <div key={doc.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {doc.name.split(" ").slice(-1)[0]?.[0] || doc.name[0]}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{doc.name}</p>
                            <p className="text-[10px] text-muted-foreground">{doc.room}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                          {doc.patientsWaiting} waiting
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portals Section */}
      <section id="portals" className="py-16 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3 tracking-tight">Choose Your Portal</h2>
            <p className="text-muted-foreground">Access the system based on your current role</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Receptionist Card */}
            <div className="bg-white rounded-3xl p-8 border border-border shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Receptionist Portal</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Add patients, manage consultation status, handle room transfers, and configure clinic timings or priorities.
              </p>
              <ul className="space-y-2 mb-8">
                {["Add/register patients in queue", "Room-wise patient transfers", "Inline doctor/room management", "Clinic rules and settings"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onReceptionist}
                className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Login as Receptionist
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Patient Card */}
            <div className="bg-white rounded-3xl p-8 border border-border shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Clock className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Patient Portal</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Track your active token number, check real-time patients ahead, and get custom analytics-backed waiting estimates.
              </p>
              <ul className="space-y-2 mb-8">
                {["Real-time queue tracking", "Estimated wait durations", "Hindi/English voice read-aloud", "High-contrast accessibility mode"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onPatient}
                className="w-full bg-accent text-white py-3.5 rounded-xl font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
              >
                Track My Queue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">System Core Features</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Experience a healthcare platform designed to streamline administrative workflows and elevate patient satisfaction.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Users, title: "Smart Queue Management", desc: "Automate token generations and position scheduling seamlessly. Ensures structured patient flow matching staff limits." },
              { icon: Activity, title: "Real-Time Patient Tracking", desc: "Dynamic updates push queue progression instantaneously. Patients can monitor queue status from any browser." },
              { icon: Accessibility, title: "Accessibility Support", desc: "Fully integrated high-contrast typography sizes, screen reader accessibility, and text-to-speech voice announcements." },
              { icon: Zap, title: "Intelligent Room Transfers", desc: "Allows instant patient migration between doctors and consultation spaces with automatic priority-order sorting." },
              { icon: Shield, title: "Priority Queue Handling", desc: "Apply specific configuration rules to prioritize emergencies and senior citizens, ensuring high-risk patients are seen first." },
              { icon: Clock, title: "Wait-Time Analytics", desc: "Calculates intelligent hybrid wait times using doctor-specific histories, global clinic records, and configurations." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl border border-border hover:border-primary/20 hover:shadow-sm transition-all bg-white">
                <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-muted/50 border-t border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Key Operational Benefits</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Deploying QueueCare transforms how clinic staff and incoming patients navigate consultation waiting.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Reduced Waiting Time", desc: "Optimized scheduling constraints and predictive duration models prevent bottlenecking." },
              { title: "Better Patient Experience", desc: "Patients wait comfortably off-site, arriving only when their token is next on the digital board." },
              { title: "Easy Reception Management", desc: "Minimize physical congestion. Receptionists manage queues from a simple, unified dashboard." },
              { title: "Real-Time Notifications", desc: "Instant status broadcasts propagate instantly via WebSockets, ensuring seamless team communication." }
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-foreground text-base mb-2">{title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
                <span className="w-8 h-1.5 bg-accent rounded-full mt-4 block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accessibility Section */}
      <section id="accessibility" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-12 translate-x-12">
              <Accessibility className="w-96 h-96" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <span className="bg-accent text-white px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase inline-block mb-4">Inclusion First</span>
              <h2 className="text-3xl font-black mb-4 tracking-tight">Simplified Accessibility Mode</h2>
              <p className="text-blue-100 text-base leading-relaxed mb-6">
                Healthcare is for everyone. QueueCare features a fully compliant accessibility suite designed specifically for elderly patients and individuals with visual, auditory, or cognitive requirements.
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Read Aloud Support</h4>
                    <p className="text-xs text-blue-200 mt-1">Multi-lingual voice notifications read out tokens, rooms, and estimated waits aloud.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">High-Contrast Layout</h4>
                    <p className="text-xs text-blue-200 mt-1">Large font displays, stark color contrast settings, and reduced animations for visual comfort.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / About Section */}
      <footer id="about" className="bg-foreground text-white border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">QueueCare</span>
              </div>
              <p className="text-white/60 text-sm max-w-sm leading-relaxed">
                QueueCare Healthcare Queue System is built with modern web technologies, providing clinics with structured client flow solutions. Focused on visual excellence, performance, and accessibility.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-bold text-white text-sm tracking-wider uppercase">Contact Information</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-accent" />
                  <span>+1 (800) 555-QCARE</span>
                </li>
                <li className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-accent" />
                  <span>support@queuecare.health</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-white text-sm tracking-wider uppercase">System Information</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-accent" />
                  <span>Version 1.2.0 (Stable)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent" />
                  <span>GDPR & HIPAA Compliant</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
            <p>© 2026 QueueCare. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Compliance Settings</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
