import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity, Search, Clock, MapPin, User, Volume2, VolumeX,
  Settings, X, Globe, Accessibility, AlertCircle, CheckCircle, RefreshCw,
} from "lucide-react";
import { queueService } from "../../services/queue.service";
import { socketService } from "../../services/socket";

interface QueueStatus {
  token: string;
  doctor: string;
  room: string;
  totalAhead: number;
  waitTime: string;
  waitTimeExplanation?: string;
  status: "Waiting" | "In Queue" | "In Consultation" | "Completed" | "Cancelled" | "Transferred" | "Skipped";
  currentServing: number;
  update: string;
}

const STATUS_CONFIG = {
  Waiting:          { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" },
  "In Queue":       { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200" },
  "In Consultation":{ bg: "bg-teal-100",   text: "text-teal-700",   border: "border-teal-200" },
  Completed:        { bg: "bg-green-100",  text: "text-green-700",  border: "border-green-200" },
  Cancelled:        { bg: "bg-red-100",    text: "text-red-700",    border: "border-red-200" },
  Transferred:      { bg: "bg-purple-100", text: "text-purple-700",  border: "border-purple-200" },
  Skipped:          { bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-200" },
};

const STRINGS = {
  en: {
    title: "QueueCare",
    enterToken: "Enter your token number",
    placeholder: "e.g. T-018",
    track: "Track Queue",
    tokenLabel: "Your Token",
    doctor: "Doctor",
    room: "Room",
    waitTime: "Est. Wait",
    ahead: "patients ahead",
    next: "You're next!",
    voiceOff: "Enable Voice Notification",
    voiceOn: "Voice Notification On",
    voiceDesc: "Your turn will be announced aloud",
    notFound: "Token not found. Please check your number.",
    trackAnother: "Track another token",
    update: "Live Update",
    serving: "Now Serving",
    language: "Language",
    accessibility: "Accessibility Mode",
    accessDesc: "Enables large text, high contrast & voice assistance",
    settings: "Settings",
  },
  hi: {
    title: "क्यूकेयर",
    enterToken: "अपना टोकन नंबर दर्ज करें",
    placeholder: "जैसे T-018",
    track: "कतार देखें",
    tokenLabel: "आपका टोकन",
    doctor: "डॉक्टर",
    room: "कमरा",
    waitTime: "अनुमानित प्रतीक्षा",
    ahead: "मरीज़ आगे हैं",
    next: "आप अगले हैं!",
    voiceOff: "आवाज़ सूचना चालू करें",
    voiceOn: "आवाज़ सूचना चालू है",
    voiceDesc: "आपकी बारी आने पर घोषणा होगी",
    notFound: "टोकन नहीं मिला। कृपया नंबर जाँचें।",
    trackAnother: "दूसरा टोकन ट्रैक करें",
    update: "लाइव अपडेट",
    serving: "अभी सेवा हो रही है",
    language: "भाषा",
    accessibility: "एक्सेसिबिलिटी मोड",
    accessDesc: "बड़ा टेक्स्ट, हाई कंट्रास्ट और आवाज़ सहायता चालू करता है",
    settings: "सेटिंग्स",
  },
};

function translateStatus(status: string, lang: "en" | "hi") {
  if (lang === "en") return status;
  const map: Record<string, string> = {
    Waiting: "प्रतीक्षा में",
    "In Queue": "कतार में",
    "In Consultation": "परामर्श जारी है",
    Completed: "पूर्ण",
    Cancelled: "रद्द",
    Transferred: "स्थानांतरित",
    Skipped: "छोड़ दिया गया"
  };
  return map[status] || status;
}

function translateDoctor(doctor: string, lang: "en" | "hi") {
  if (lang === "en") return doctor;
  return doctor.replace(/Dr\./gi, "डॉ.").replace(/Doctor/gi, "डॉक्टर");
}

function translateRoom(room: string, lang: "en" | "hi") {
  if (lang === "en") return room;
  return room.replace(/Room\s*(\d+)/i, "कक्ष संख्या $1").replace(/Room/i, "कक्ष");
}

function translateExplanation(exp: string | undefined, lang: "en" | "hi") {
  if (!exp) return "";
  if (lang === "en") return exp;

  if (exp.includes("It's your turn!")) {
    return "आपकी बारी आ गई है! कृपया कक्ष में जाएँ।";
  }

  let translated = exp;
  translated = translated.replace("Based on:", "के आधार पर:");
  translated = translated.replace(/- (\d+) patients? ahead/g, "- $1 मरीज आगे");
  translated = translated.replace("- Doctor's estimated duration", "- डॉक्टर की अनुमानित अवधि");
  translated = translated.replace("- Configured average consultation time", "- निर्धारित औसत परामर्श समय");
  translated = translated.replace(/- Doctor-specific average \((\d+) consultations\)/g, "- डॉक्टर-विशिष्ट औसत ($1 परामर्श)");
  translated = translated.replace(/- Global clinic average \((\d+) consultations\)/g, "- वैश्विक क्लिनिक औसत ($1 परामर्श)");
  translated = translated.replace("min", "मिनट");
  return translated;
}

function translateUpdateMessage(msg: string | undefined, lang: "en" | "hi", doctor: string, room: string) {
  if (!msg) return "";
  if (lang === "en") return msg;

  const docNameHi = translateDoctor(doctor, lang);
  const roomHi = translateRoom(room, lang);

  if (msg.includes("is currently seeing patients")) {
    return `${docNameHi} अभी ${roomHi} में मरीजों को देख रहे हैं।`;
  }
  if (msg.includes("It's your turn!")) {
    return "आपकी बारी आ गई है! कृपया परामर्श कक्ष में जाएँ।";
  }
  if (msg.includes("Your consultation is complete")) {
    return "आपका परामर्श पूरा हो गया है। धन्यवाद!";
  }
  if (msg.includes("You are next in line")) {
    return "आप कतार में अगले हैं। कृपया तैयार रहें।";
  }
  return msg;
}

interface PatientPortalProps {
  onBack: () => void;
}

export function PatientPortal({ onBack }: PatientPortalProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [accessibilityOn, setAccessibilityOn] = useState(false);
  const [socketConnected, setSocketConnected] = useState(socketService.getStatus());
  const queryClient = useQueryClient();

  useEffect(() => {
    return socketService.onStatusChange((status) => {
      setSocketConnected(status);
    });
  }, []);

  useEffect(() => {
    document.title = lang === "hi" ? "क्यूकेयर - स्वास्थ्य सेवा कतार प्रणाली" : "QueueCare - Healthcare Queue System";
  }, [lang]);

  const t = STRINGS[lang];

  const { data: queueDataResponse, isError, refetch } = useQuery({
    queryKey: ["patientQueueStatus", activeToken],
    queryFn: () => queueService.getQueueStatus(activeToken!),
    enabled: !!activeToken,
    retry: false,
  });

  const queueData = queueDataResponse || null;

  useEffect(() => {
    if (activeToken) {
      if (isError) {
        setNotFound(true);
      } else if (queueDataResponse) {
        setNotFound(false);
      }
    }
  }, [isError, queueDataResponse, activeToken]);

  useEffect(() => {
    if (!activeToken) return;

    socketService.connect();

    const handleQueueUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["patientQueueStatus", activeToken] });
    };

    socketService.on("queue:updated", handleQueueUpdate);
    socketService.on("patient:status-changed", handleQueueUpdate);
    socketService.on("patient:transferred", handleQueueUpdate);
    
    // New standardized events
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
      socketService.off("patient:status-changed", handleQueueUpdate);
      socketService.off("patient:transferred", handleQueueUpdate);
      
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
  }, [activeToken, queryClient]);

  const announcedRef = useRef<string | null>(null);

  useEffect(() => {
    if (queueData && queueData.status === "In Consultation" && !notFound) {
      if (announcedRef.current !== queueData.token) {
        announcedRef.current = queueData.token;
        if ("speechSynthesis" in window) {
          if (accessibilityOn || voiceEnabled) {
            const docHi = translateDoctor(queueData.doctor, lang);
            const roomHi = translateRoom(queueData.room, lang);
            const speakText = lang === "hi"
              ? `ध्यान दें। टोकन नंबर ${queueData.token}। कृपया ${roomHi} में जाएँ। ${docHi} तैयार हैं।`
              : `Attention. Token number ${queueData.token}. Please proceed to ${queueData.room}. Doctor ${queueData.doctor} is ready.`;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(speakText);
            utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
            window.speechSynthesis.speak(utterance);
          }
        }
      }
    } else if (queueData) {
      if (announcedRef.current === queueData.token && queueData.status !== "In Consultation") {
        announcedRef.current = null;
      }
    }
  }, [queueData, accessibilityOn, voiceEnabled, lang, notFound]);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim();
    if (cleanToken) {
      setActiveToken(cleanToken);
      setNotFound(false);
    }
  };

  const handleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (next && queueData && "speechSynthesis" in window) {
      const docHi = translateDoctor(queueData.doctor, lang);
      const roomHi = translateRoom(queueData.room, lang);
      const waitHi = queueData.waitTime.replace("min", "मिनट");
      const msg = lang === "hi"
        ? `टोकन नंबर ${queueData.token}। ${docHi}। ${roomHi}। अनुमानित प्रतीक्षा समय ${waitHi} है।`
        : `Token number ${queueData.token}. Doctor ${queueData.doctor}. ${queueData.room}. Estimated wait is ${queueData.waitTime}.`;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
      window.speechSynthesis.speak(utterance);
    } else {
      window.speechSynthesis?.cancel();
    }
  };

  const textBase = accessibilityOn ? "text-base" : "text-sm";
  const cardPad  = accessibilityOn ? "p-6" : "p-5";
  const hcBg     = accessibilityOn ? "bg-gray-950" : "bg-background";
  const hcCard   = accessibilityOn ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-border text-foreground";
  const hcText   = accessibilityOn ? "text-white" : "text-foreground";
  const hcMuted  = accessibilityOn ? "text-gray-300" : "text-muted-foreground";
  const hcInput  = accessibilityOn ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400" : "bg-muted border-border text-foreground";
  const hcHeader = accessibilityOn ? "bg-gray-900 border-gray-700" : "bg-white border-border";

  const statusConf = queueData ? STATUS_CONFIG[queueData.status] : null;

  return (
    <div className={`min-h-screen font-['Inter',sans-serif] ${hcBg}`}>
      <header className={`${hcHeader} border-b px-4 py-4 flex items-center justify-between sticky top-0 z-30`}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className={`p-1.5 ${hcMuted} hover:${hcText} transition-colors`}>
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className={`font-semibold ${hcText}`}>{t.title}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 ${accessibilityOn ? "bg-gray-800" : "bg-muted/60"} px-2.5 py-1 rounded-full text-xs select-none`}>
            <span className={`w-2 h-2 rounded-full ${socketConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span className={`${hcMuted} font-medium`}>
              {socketConnected 
                ? (lang === "hi" ? "लाइव" : "Live") 
                : (lang === "hi" ? "ऑफलाइन" : "Offline")}
            </span>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className={`p-2 ${hcMuted} hover:${hcText} hover:bg-muted rounded-xl transition-colors`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {queueData && queueData.status === "In Consultation" && !notFound && (
        <div className="bg-red-600 text-white font-black text-center py-4 px-6 animate-pulse flex items-center justify-center gap-3 border-b-4 border-red-800 shadow-xl z-20 relative">
          <Volume2 className="w-6 h-6 animate-bounce flex-shrink-0" />
          <span className="text-sm sm:text-base tracking-wider uppercase">
            {lang === "hi"
              ? `आपकी बारी आ गई है! कृपया ${translateRoom(queueData.room, lang)} में जाएँ। ${translateDoctor(queueData.doctor, lang)} तैयार हैं।`
              : `YOUR TURN! Please proceed to ${queueData.room}. Doctor ${queueData.doctor} is ready.`}
          </span>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setSettingsOpen(false)} />
          <div className={`w-72 h-full overflow-y-auto shadow-2xl ${accessibilityOn ? "bg-gray-900 text-white" : "bg-white"}`}>
            <div className={`p-5 border-b ${accessibilityOn ? "border-gray-700" : "border-border"} flex items-center justify-between`}>
              <h2 className={`font-semibold ${hcText} ${accessibilityOn ? "text-lg" : "text-base"}`}>{t.settings}</h2>
              <button onClick={() => setSettingsOpen(false)} className={`p-1.5 ${hcMuted} hover:${hcText} transition-colors`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Globe className={`w-4 h-4 ${hcMuted}`} />
                  <p className={`font-semibold ${hcText} ${accessibilityOn ? "text-base" : "text-sm"}`}>{t.language}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { code: "en" as const, label: "English" },
                    { code: "hi" as const, label: "हिन्दी" },
                  ].map(({ code, label }) => (
                    <button
                      key={code}
                      onClick={() => setLang(code)}
                      className={`py-3 rounded-xl font-medium transition-all ${
                        lang === code
                          ? "bg-accent text-white"
                          : accessibilityOn
                          ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                          : "bg-muted text-foreground hover:bg-secondary"
                      } ${accessibilityOn ? "text-base" : "text-sm"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Accessibility className={`w-4 h-4 ${hcMuted}`} />
                  <p className={`font-semibold ${hcText} ${accessibilityOn ? "text-base" : "text-sm"}`}>{t.accessibility}</p>
                </div>
                <p className={`${accessibilityOn ? "text-sm text-gray-400" : "text-xs text-muted-foreground"} mb-3 leading-relaxed`}>
                  {t.accessDesc}
                </p>
                <button
                  onClick={() => setAccessibilityOn(v => !v)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    accessibilityOn
                      ? "bg-accent/20 border-accent text-accent"
                      : accessibilityOn
                      ? "bg-gray-800 border-gray-600 text-gray-200"
                      : "bg-muted border-border text-foreground"
                  }`}
                >
                  <span className={`font-medium ${accessibilityOn ? "text-base text-accent" : "text-sm"}`}>
                    {accessibilityOn 
                      ? (lang === "hi" ? "सक्षम" : "Enabled") 
                      : (lang === "hi" ? "अक्षम" : "Disabled")}
                  </span>
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${accessibilityOn ? "bg-accent" : "bg-switch-background"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${accessibilityOn ? "left-6" : "left-0.5"}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-sm mx-auto px-4 py-6 space-y-4">
        {!(accessibilityOn && activeToken && !notFound) && (
          <div className={`${hcCard} rounded-3xl border shadow-sm ${cardPad}`}>
            <p className={`font-semibold ${hcText} ${accessibilityOn ? "text-xl" : "text-base"} mb-4`}>{t.enterToken}</p>
            <form onSubmit={handleTrack} className="flex gap-2">
              <div className="relative flex-1">
                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${hcMuted}`} />
                <input
                  type="text"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  placeholder={t.placeholder}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all ${hcInput} ${accessibilityOn ? "text-base py-4" : "text-sm"}`}
                />
              </div>
              <button
                type="submit"
                className={`bg-accent text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors whitespace-nowrap ${accessibilityOn ? "px-5 py-4 text-base" : "px-4 py-3 text-sm"}`}
              >
                {t.track}
              </button>
            </form>

            {notFound && (
              <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className={textBase}>{t.notFound}</span>
              </div>
            )}
          </div>
        )}

        {queueData && statusConf && !notFound && (
          accessibilityOn ? (
            <div className="bg-black text-white p-6 rounded-3xl border-4 border-white space-y-6">
              {/* Back Button */}
              <button
                onClick={() => {
                  setActiveToken(null);
                  setTokenInput("");
                }}
                className="w-full py-5 rounded-2xl border-4 border-white text-center text-2xl font-black bg-gray-900 text-white hover:bg-gray-800 transition-all active:scale-[0.98]"
              >
                {lang === "hi" ? "← वापस जाएँ" : "← Back"}
              </button>

              {/* Patient Token */}
              <div className="text-center py-2 border-b border-gray-800">
                <span className="text-2xl font-black uppercase tracking-wider text-gray-400 block mb-1">
                  {lang === "hi" ? "आपका टोकन" : "Your Token"}
                </span>
                <span className="text-8xl font-black text-white tracking-widest block">{queueData.token}</span>
              </div>

              {/* Status */}
              <div className="text-center border-b border-gray-800 pb-4">
                <span className="text-2xl font-black uppercase tracking-wider text-gray-400 block mb-1">
                  {lang === "hi" ? "स्थिति" : "Status"}
                </span>
                <span className="text-4xl font-black text-green-400">
                  {translateStatus(queueData.status, lang)}
                </span>
              </div>

              {/* Doctor */}
              <div className="text-center border-b border-gray-800 pb-4">
                <span className="text-2xl font-black uppercase tracking-wider text-gray-400 block mb-1">
                  {lang === "hi" ? "डॉक्टर" : "Doctor"}
                </span>
                <span className="text-4xl font-black text-white">
                  {translateDoctor(queueData.doctor, lang)}
                </span>
              </div>

              {/* Room */}
              <div className="text-center border-b border-gray-800 pb-4">
                <span className="text-2xl font-black uppercase tracking-wider text-gray-400 block mb-1">
                  {lang === "hi" ? "कक्ष" : "Room"}
                </span>
                <span className="text-4xl font-black text-white">
                  {translateRoom(queueData.room, lang)}
                </span>
              </div>

              {/* Queue Position */}
              <div className="bg-gray-900 border-4 border-gray-800 rounded-3xl p-6 text-center">
                <span className="text-xl font-black text-gray-400 block mb-2">
                  {lang === "hi" ? "कतार स्थिति" : "Queue Position"}
                </span>
                <span className="text-7xl font-black block">
                  {queueData.totalAhead === 0 
                    ? (lang === "hi" ? "आप अगले हैं!" : "You're next!")
                    : queueData.totalAhead}
                </span>
                {queueData.totalAhead > 0 && (
                  <p className="text-lg text-gray-400 font-bold mt-2">
                    {lang === "hi" ? "मरीज़ आगे हैं" : "patients ahead"}
                  </p>
                )}
              </div>

              {/* Estimated Wait */}
              <div className="bg-gray-900 border-4 border-gray-800 rounded-3xl p-6 text-center">
                <span className="text-xl font-black text-gray-400 block mb-2">
                  {lang === "hi" ? "अनुमानित प्रतीक्षा समय" : "Estimated Wait Time"}
                </span>
                <span className="text-7xl font-black block mb-2 text-yellow-400">
                  {lang === "hi" ? queueData.waitTime.replace("min", "मिनट") : queueData.waitTime}
                </span>
                {queueData.waitTimeExplanation && (
                  <p className="text-base text-gray-200 font-bold whitespace-pre-line text-left border-t border-gray-800 pt-4 mt-4 leading-relaxed">
                    {translateExplanation(queueData.waitTimeExplanation, lang)}
                  </p>
                )}
              </div>

              {/* Read Aloud Toggle */}
              <button
                onClick={handleVoice}
                className={`w-full py-6 rounded-2xl border-4 text-center text-2xl font-black flex items-center justify-center gap-3 transition-colors ${
                  voiceEnabled ? "bg-white text-black border-white" : "bg-black text-white border-white hover:bg-gray-900"
                }`}
              >
                <Volume2 className="w-8 h-8" />
                {voiceEnabled 
                  ? (lang === "hi" ? "आवाज़ सूचना: चालू" : "Voice Alert: ON")
                  : (lang === "hi" ? "आवाज़ सूचना: बंद" : "Voice Alert: OFF")}
              </button>
            </div>
          ) : (
            <>
              <div className={`${hcCard} rounded-3xl border shadow-lg overflow-hidden`}>
                <div className={`${accessibilityOn ? "bg-gray-800" : statusConf.bg} px-5 py-4 flex items-center justify-between`}>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${accessibilityOn ? "bg-accent/20 text-accent" : `${statusConf.bg} ${statusConf.text} border ${statusConf.border}`}`}>
                    {translateStatus(queueData.status, lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className={`p-1.5 ${hcMuted} hover:${hcText} transition-colors`}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className={cardPad + " space-y-5"}>
                  <div className="text-center">
                    <p className={`${accessibilityOn ? "text-sm text-gray-400" : "text-xs text-muted-foreground"} uppercase tracking-widest mb-1`}>{t.tokenLabel}</p>
                    <p className={`font-bold ${hcText} ${accessibilityOn ? "text-7xl" : "text-6xl"}`}>{queueData.token}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: User, label: t.doctor, value: translateDoctor(queueData.doctor, lang) },
                      { icon: MapPin, label: t.room, value: translateRoom(queueData.room, lang) },
                      { icon: Clock, label: t.waitTime, value: lang === "hi" ? queueData.waitTime.replace("min", "मिनट") : queueData.waitTime },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className={`rounded-2xl p-3 text-center ${accessibilityOn ? "bg-gray-800" : "bg-muted"}`}>
                        <Icon className={`w-4 h-4 ${hcMuted} mx-auto mb-1.5`} />
                        <p className={`${accessibilityOn ? "text-xs text-gray-400" : "text-xs text-muted-foreground"}`}>{label}</p>
                        <p className={`font-semibold mt-0.5 leading-tight ${hcText} ${accessibilityOn ? "text-base" : "text-sm"}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className={`rounded-2xl p-4 text-center ${accessibilityOn ? "bg-gray-800" : "bg-muted"}`}>
                    <p className={`${accessibilityOn ? "text-4xl" : "text-3xl"} font-bold ${hcText}`}>{queueData.totalAhead}</p>
                    <p className={`${accessibilityOn ? "text-sm text-gray-400" : "text-xs text-muted-foreground"} mt-1`}>
                      {queueData.totalAhead === 0 ? t.next : t.ahead}
                    </p>
                  </div>

                  {queueData.waitTimeExplanation && (
                    <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border ${accessibilityOn ? "bg-teal-950/40 border-teal-905 text-teal-200" : "bg-teal-50 border-teal-100 text-teal-800"}`}>
                      <Clock className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">
                          {lang === "hi" ? "अनुमानित प्रतीक्षा विवरण" : "Estimated Wait Details"}
                        </p>
                        <p className="mt-1 text-xs font-medium whitespace-pre-line leading-relaxed">
                          {translateExplanation(queueData.waitTimeExplanation, lang)}
                        </p>
                      </div>
                    </div>
                  )}

                  {queueData.update && (
                    <div className={`flex items-start gap-2 p-3 rounded-xl ${accessibilityOn ? "bg-blue-900/40 border border-blue-700" : "bg-blue-50"}`}>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                      <div>
                        <p className={`font-semibold ${accessibilityOn ? "text-xs text-blue-300 uppercase tracking-wide" : "text-xs text-blue-600 uppercase tracking-wide"}`}>{t.update}</p>
                        <p className={`mt-0.5 ${accessibilityOn ? "text-sm text-blue-200" : "text-sm text-blue-700"}`}>
                          {translateUpdateMessage(queueData.update, lang, queueData.doctor, queueData.room)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleVoice}
                className={`w-full flex items-center justify-between rounded-2xl border transition-all ${cardPad} ${
                  voiceEnabled
                    ? accessibilityOn ? "bg-accent/20 border-accent" : "bg-accent/10 border-accent"
                    : accessibilityOn ? "bg-gray-900 border-gray-700 hover:border-accent/60" : "bg-white border-border hover:border-accent/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${voiceEnabled ? "bg-accent" : accessibilityOn ? "bg-gray-800" : "bg-muted"}`}>
                    {voiceEnabled
                      ? <Volume2 className="w-5 h-5 text-white" />
                      : <VolumeX className={`w-5 h-5 ${hcMuted}`} />
                    }
                  </div>
                  <div className="text-left">
                    <p className={`font-semibold ${hcText} ${accessibilityOn ? "text-base" : "text-sm"}`}>
                      {voiceEnabled ? t.voiceOn : t.voiceOff}
                    </p>
                    <p className={`${accessibilityOn ? "text-sm text-gray-400" : "text-xs text-muted-foreground"}`}>{t.voiceDesc}</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${voiceEnabled ? "bg-accent" : "bg-switch-background"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${voiceEnabled ? "left-6" : "left-0.5"}`} />
                </div>
              </button>
            </>
          )
        )}

        {!activeToken && !notFound && (
          <div className={`${hcCard} rounded-3xl border ${cardPad} text-center`}>
            <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-accent" />
            </div>
            <p className={`font-semibold ${hcText} mb-2 ${accessibilityOn ? "text-xl" : "text-base"}`}>
              {lang === "hi" ? "टोकन नंबर दर्ज करें" : "Enter your token number"}
            </p>
            <p className={`${accessibilityOn ? "text-sm text-gray-400" : "text-sm text-muted-foreground"}`}>
              {lang === "hi"
                ? "अपनी पंजीकरण पर्ची पर टोकन नंबर देखें।"
                : "Find your token number on your registration slip."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
