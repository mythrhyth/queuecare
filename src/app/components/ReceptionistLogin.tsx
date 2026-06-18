import { useState } from "react";
import { Activity, Eye, EyeOff, Lock, Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface ReceptionistLoginProps {
  onLogin: () => void;
  onBack: () => void;
}

export function ReceptionistLogin({ onLogin, onBack }: ReceptionistLoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("receptionist@clinic.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      onLogin();
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex flex-col font-['Inter',sans-serif]">
      {/* Back button */}
      <div className="p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl shadow-lg mb-4">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
            <p className="text-muted-foreground mt-1 text-sm">Sign in to your QueueCare account</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-3xl border border-border shadow-xl p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                    placeholder="receptionist@clinic.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <button type="button" className="text-sm text-primary hover:underline">Forgot password?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" className="rounded border-border w-4 h-4 accent-primary" defaultChecked />
                <label htmlFor="remember" className="text-sm text-muted-foreground">Remember me for 30 days</label>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : "Sign In"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-center text-muted-foreground">
                Protected by enterprise-grade encryption. Your data stays secure.
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Need access?{" "}
            <a href="#" className="text-primary hover:underline font-medium">Contact your administrator</a>
          </p>
        </div>
      </div>
    </div>
  );
}
