import { useState, useEffect } from "react";
import { LandingPage } from "./components/LandingPage";
import { ReceptionistLogin } from "./components/ReceptionistLogin";
import { ReceptionistLayout } from "./components/ReceptionistLayout";
import { Dashboard } from "./components/Dashboard";
import { AddPatient } from "./components/AddPatient";
import { RoomTransfer } from "./components/RoomTransfer";
import { PatientRecords } from "./components/PatientRecords";
import { SettingsPage } from "./components/SettingsPage";
import { PatientPortal } from "./components/PatientPortal";
import { TrackPatient } from "./components/TrackPatient";
import { useAuth } from "../context/AuthContext";

type Screen =
  | "landing"
  | "receptionist-login"
  | "receptionist-dashboard"
  | "patient-portal";

type ReceptionistPage = "dashboard" | "add-patient" | "room-transfer" | "patient-records" | "settings" | "track-patient";

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [receptionistPage, setReceptionistPage] = useState<ReceptionistPage>("dashboard");
  const { token, loading, logout } = useAuth();

  useEffect(() => {
    if (token && screen === "landing") {
      setScreen("receptionist-dashboard");
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-['Inter',sans-serif]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-muted-foreground font-medium">Loading QueueCare...</p>
        </div>
      </div>
    );
  }

  const goToLanding = () => setScreen("landing");

  if (screen === "landing") {
    return (
      <LandingPage
        onReceptionist={() => setScreen(token ? "receptionist-dashboard" : "receptionist-login")}
        onPatient={() => setScreen("patient-portal")}
      />
    );
  }

  if (screen === "receptionist-login") {
    return (
      <ReceptionistLogin
        onLogin={() => {
          setReceptionistPage("dashboard");
          setScreen("receptionist-dashboard");
        }}
        onBack={goToLanding}
      />
    );
  }

  if (screen === "receptionist-dashboard") {
    if (!token) {
      return (
        <ReceptionistLogin
          onLogin={() => {
            setReceptionistPage("dashboard");
            setScreen("receptionist-dashboard");
          }}
          onBack={goToLanding}
        />
      );
    }

    const pageContent = {
      dashboard: <Dashboard />,
      "add-patient": <AddPatient />,
      "room-transfer": <RoomTransfer />,
      "patient-records": <PatientRecords />,
      settings: <SettingsPage />,
      "track-patient": <TrackPatient />,
    }[receptionistPage];

    return (
      <ReceptionistLayout
        currentPage={receptionistPage}
        onNavigate={setReceptionistPage}
        onLogout={() => {
          logout();
          goToLanding();
        }}
      >
        {pageContent}
      </ReceptionistLayout>
    );
  }

  if (screen === "patient-portal") {
    return <PatientPortal onBack={goToLanding} />;
  }

  return null;
}

