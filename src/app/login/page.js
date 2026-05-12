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
import "../login.css";

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
    <div className="login-container">
      {/* Decorative background components */}
      <div className="bg-decor bg-decor-1"></div>
      <div className="bg-decor bg-decor-2"></div>

      <div className="auth-card animate-slide-up">
        <div className="auth-header">
          <div className="auth-logo">
            <Stethoscope size={28} />
          </div>
          <h1 className="auth-title tracking-tight">Togahh AI</h1>
          <div className="auth-badge-container">
            <span className="auth-badge">Clinical Platform v2.4</span>
          </div>
        </div>

        <div className="auth-content">
          <h2 className="content-title">Administrator Login</h2>
          <p className="auth-subtitle">
            Sign in to access your advertising and content dashboards.
          </p>

          <form onSubmit={handleAuth} className="auth-form">
            <div className="input-group">
              <label className="input-label">Corporate Email</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  placeholder="name@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Security Credentials</label>
              <div className="input-wrapper relative">
                <Lock className="input-icon" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input pr-10"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner-small"></div> Processing...
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
            <div className="status-msg error animate-shake">
              <AlertCircle size={16} />
              <span>{errorStatus}</span>
            </div>
          )}
          
          {successStatus && (
            <div className="status-msg success animate-fade-in">
              <CheckCircle2 size={16} />
              <span>{successStatus}</span>
            </div>
          )}
        </div>

        <div className="auth-footer">
          <div className="footer-divider">
            <span>Personnel Access Only</span>
          </div>
          <p className="footer-text">
            Restricted to authorized administrator accounts only.
          </p>
        </div>
      </div>
      
      <div className="login-legal">
        <p>© 2026 Togahh AI Marketing Systems. Restricted Administrative Access.</p>
      </div>
    </div>
  );
}


