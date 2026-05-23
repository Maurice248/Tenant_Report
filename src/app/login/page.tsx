"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Stethoscope, 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import "../globals.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState(null);
  const [successStatus, setSuccessStatus] = useState(null);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (errorStatus || successStatus) {
      const timer = setTimeout(() => {
        setErrorStatus(null);
        setSuccessStatus(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorStatus, successStatus]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorStatus(null);
    setSuccessStatus(null);

    // Hardcoded Administrative Credential Check
    const targetEmail = "togahealthai@gmail.com";
    const targetPass = "Meta123.com";

    if (email.trim() !== targetEmail || password !== targetPass) {
      console.error("Local check failed:", { 
        emailMatch: email.trim() === targetEmail, 
        passMatch: password === targetPass 
      });
      setErrorStatus("Invalid administrator credentials. Access restricted.");
      setLoading(false);
      return;
    }

    try {
      // Local Session Implementation (Bypassing Supabase Auth)
      localStorage.setItem("toga_auth_session", "true");
      localStorage.setItem("toga_user_email", email.trim());
      
      setSuccessStatus("Authentication successful. Redirecting...");
      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (error) {
      console.error("Local Session Error:", error.message);
      setErrorStatus("An error occurred during local authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 relative overflow-hidden font-sans">
      {/* Decorative background components */}
      <div className="absolute rounded-full filter blur-[80px] z-1 opacity-40 w-[400px] h-[400px] bg-blue-600 -top-[100px] -right-[100px]"></div>
      <div className="absolute rounded-full filter blur-[80px] z-1 opacity-40 w-[300px] h-[300px] bg-cyan-600 -bottom-[50px] -left-[50px]"></div>

      <div className="w-full max-w-[460px] bg-white/95 backdrop-blur-[10px] rounded-[24px] shadow-xl border border-slate-200 relative z-10 overflow-hidden">
        <div className="p-10 pb-6 text-center bg-gradient-to-b from-blue-50/50 to-transparent">
          <div className="w-16 h-16 bg-white text-blue-600 rounded-[18px] flex items-center justify-center mx-auto mb-5 shadow-md border border-slate-100">
            <Stethoscope size={28} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Togahh AI</h1>
          <div className="flex justify-center">
            <span className="inline-block px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-blue-600 uppercase tracking-wider">Clinical Platform v2.4</span>
          </div>
        </div>

        <div className="px-10 pb-8">
          <h2 className="text-xl font-bold text-slate-900 text-center mb-2">Administrator Login</h2>
          <p className="text-sm text-slate-500 text-center mb-8 leading-relaxed">
            Sign in to access your advertising and content dashboards.
          </p>

          <form onSubmit={handleAuth} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Corporate Email</label>
              <div className="relative">
                <Mail className="absolute left-[14px] top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                <input
                  type="email"
                  placeholder="name@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-3.5 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Security Credentials</label>
              <div className="relative">
                <Lock className="absolute left-[14px] top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3.5 pl-11 pr-10 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-slate-400 cursor-pointer flex items-center justify-center p-1 rounded-md transition-all hover:text-blue-600 hover:bg-blue-50"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="w-full p-4 bg-blue-600 text-white rounded-xl text-sm font-bold cursor-pointer transition-all hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-md" disabled={loading}>
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4.5 h-4.5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> Processing...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck size={18} />
                  Secure Access
                  <ArrowRight size={16} className="ml-1" />
                </div>
              )}
            </button>
          </form>

          {/* Status Messages */}
          {errorStatus && (
            <div className="mt-6 p-3 px-4 rounded-xl flex items-center gap-3 text-sm font-medium bg-red-50 text-red-600 border border-red-100 animate-shake">
              <AlertCircle size={16} />
              <span>{errorStatus}</span>
            </div>
          )}
          
          {successStatus && (
            <div className="mt-6 p-3 px-4 rounded-xl flex items-center gap-3 text-sm font-medium bg-green-50 text-green-600 border border-green-100">
              <CheckCircle2 size={16} />
              <span>{successStatus}</span>
            </div>
          )}
        </div>

        <div className="px-10 pb-10 text-center">
          <div className="flex items-center gap-4 mb-6 after:content-[''] after:flex-1 after:h-[1px] after:bg-slate-100 before:content-[''] before:flex-1 before:h-[1px] before:bg-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Personnel Access Only</span>
          </div>
          <p className="text-sm text-slate-500">
            Restricted to authorized administrator accounts only.
          </p>
        </div>
      </div>
      
      <div className="mt-8 text-center text-xs text-slate-400 opacity-80 relative z-10">
        <p>© 2026 Togahh AI Marketing Systems. Restricted Administrative Access.</p>
      </div>
    </div>
  );
}


