import { Activity, BarChart3, UserPlus, ArrowLeftRight, Settings, LogOut, Bell, User, Menu, X, ClipboardList, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { socketService } from "../../services/socket";

type ReceptionistPage = "dashboard" | "add-patient" | "room-transfer" | "patient-records" | "settings" | "track-patient";

interface ReceptionistLayoutProps {
  currentPage: ReceptionistPage;
  onNavigate: (page: ReceptionistPage) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const navItems = [
  { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
  { id: "add-patient" as const, label: "Add Patient", icon: UserPlus },
  { id: "room-transfer" as const, label: "Queue Transfer", icon: ArrowLeftRight },
  { id: "track-patient" as const, label: "Track Patient", icon: Search },
  { id: "patient-records" as const, label: "Records", icon: ClipboardList },
  { id: "settings" as const, label: "Settings", icon: Settings },
];

export function ReceptionistLayout({ currentPage, onNavigate, onLogout, children }: ReceptionistLayoutProps) {
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(socketService.getStatus());

  useEffect(() => {
    return socketService.onStatusChange((status) => {
      setSocketConnected(status);
    });
  }, []);

  const currentNav = navItems.find(n => n.id === currentPage);

  return (
    <div className="min-h-screen bg-background flex font-['Inter',sans-serif]">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-border flex flex-col transition-transform lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-border">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-foreground tracking-tight">QueueCare</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onNavigate(id); setMobileNavOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                currentPage === id
                  ? "bg-secondary text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Nav */}
        <header className="bg-white border-b border-border px-4 sm:px-6 h-16 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="font-semibold text-foreground text-sm sm:text-base">{currentNav?.label}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">City General Clinic</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Socket status indicator */}
            <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-xs select-none">
              <span className={`w-2 h-2 rounded-full ${socketConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              <span className="text-muted-foreground font-medium hidden xs:block">{socketConnected ? "Connected" : "Disconnected"}</span>
            </div>

            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground leading-none">{user?.name || "Receptionist"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Staff"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
