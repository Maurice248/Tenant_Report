"use client";

import { useState, useEffect, FormEvent } from "react";
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
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

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

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorStatus(null);
    setSuccessStatus(null);

    // Administrative Bypass Credential Check
    const targetEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "togahealthai@gmail.com";
    const targetPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "Meta123.com";

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
    } catch (error: any) {
      console.error("Local Session Error:", error?.message);
      setErrorStatus("An error occurred during local authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F8FAFC",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Decorative background components */}
      <div style={{
        position: "absolute",
        borderRadius: "50%",
        filter: "blur(80px)",
        zIndex: 1,
        opacity: 0.15,
        width: "400px",
        height: "400px",
        backgroundColor: "#3B82F6",
        top: "-100px",
        right: "-100px"
      }}></div>
      <div style={{
        position: "absolute",
        borderRadius: "50%",
        filter: "blur(80px)",
        zIndex: 1,
        opacity: 0.15,
        width: "300px",
        height: "300px",
        backgroundColor: "#06B6D4",
        bottom: "-50px",
        left: "-50px"
      }}></div>

      <div style={{
        width: "100%",
        maxWidth: "440px",
        backgroundColor: "#FFFFFF",
        borderRadius: "20px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.08)",
        position: "relative",
        zIndex: 10,
        overflow: "hidden"
      }}>
        <div style={{
          padding: "40px 40px 24px 40px",
          textAlign: "center",
          background: "linear-gradient(to bottom, #EFF6FF, transparent)"
        }}>
          <div style={{
            width: "64px",
            height: "64px",
            backgroundColor: "#FFFFFF",
            color: "#2563EB",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
            border: "1px solid #E2E8F0"
          }}>
            <Stethoscope size={28} />
          </div>
          <h1 style={{
            fontSize: "28px",
            fontWeight: 800,
            color: "#0F172A",
            marginBottom: "12px",
            letterSpacing: "-0.025em",
            lineHeight: 1.2
          }}>Togahh AI</h1>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span style={{
              display: "inline-block",
              padding: "4px 12px",
              backgroundColor: "#EFF6FF",
              border: "1px solid #DBEAFE",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#2563EB",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>Clinical Platform v2.4</span>
          </div>
        </div>

        <div style={{ padding: "0 40px 32px 40px" }}>
          <h2 style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#0F172A",
            textAlign: "center",
            marginBottom: "8px"
          }}>Administrator Login</h2>
          <p style={{
            fontSize: "14px",
            color: "#64748B",
            textAlign: "center",
            marginBottom: "28px",
            lineHeight: "1.5"
          }}>
            Sign in to access your advertising and content dashboards.
          </p>

          <form onSubmit={handleAuth} style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px"
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              <label style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748B",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                paddingLeft: "4px"
              }}>Corporate Email</label>
              <div style={{
                position: "relative",
                display: "flex",
                alignItems: "center"
              }}>
                <div style={{
                  position: "absolute",
                  left: "14px",
                  color: "#94A3B8",
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  placeholder="name@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px 12px 44px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "10px",
                    fontSize: "14px",
                    color: "#0F172A",
                    outline: "none",
                    transition: "all 0.15s ease",
                    boxSizing: "border-box",
                    height: "46px"
                  }}
                  className="focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              <label style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748B",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                paddingLeft: "4px"
              }}>Security Credentials</label>
              <div style={{
                position: "relative",
                display: "flex",
                alignItems: "center"
              }}>
                <div style={{
                  position: "absolute",
                  left: "14px",
                  color: "#94A3B8",
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 40px 12px 44px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "10px",
                    fontSize: "14px",
                    color: "#0F172A",
                    outline: "none",
                    transition: "all 0.15s ease",
                    boxSizing: "border-box",
                    height: "46px"
                  }}
                  className="focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  required
                />
                <button
                  type="button"
                  style={{
                    position: "absolute",
                    right: "12px",
                    backgroundColor: "transparent",
                    border: "none",
                    color: "#94A3B8",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px",
                    borderRadius: "6px",
                    transition: "all 0.15s ease"
                  }}
                  className="hover:text-blue-600 hover:bg-blue-50"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              style={{
                width: "100%",
                padding: "14px",
                backgroundColor: "#2563EB",
                color: "#FFFFFF",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -2px rgba(37, 99, 235, 0.2)",
                marginTop: "8px",
                height: "48px"
              }}
              className="hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-md" 
              disabled={loading}
            >
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <div className="w-4.5 h-4.5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> Processing...
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <ShieldCheck size={18} />
                  Secure Access
                  <ArrowRight size={16} />
                </div>
              )}
            </button>
          </form>

          {/* Status Messages */}
          {errorStatus && (
            <div style={{
              marginTop: "20px",
              padding: "12px 16px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "13px",
              fontWeight: 500,
              backgroundColor: "#FEF2F2",
              color: "#DC2626",
              border: "1px solid #FEE2E2"
            }} className="animate-shake">
              <AlertCircle size={16} />
              <span>{errorStatus}</span>
            </div>
          )}
          
          {successStatus && (
            <div style={{
              marginTop: "20px",
              padding: "12px 16px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "13px",
              fontWeight: 500,
              backgroundColor: "#ECFDF5",
              color: "#059669",
              border: "1px solid #D1FAE5"
            }}>
              <CheckCircle2 size={16} />
              <span>{successStatus}</span>
            </div>
          )}
        </div>

        <div style={{
          padding: "0 40px 40px 40px",
          textAlign: "center"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "20px"
          }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#E2E8F0" }}></div>
            <span style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>Personnel Access Only</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#E2E8F0" }}></div>
          </div>
          <p style={{
            fontSize: "13px",
            color: "#64748B",
            margin: 0
          }}>
            Restricted to authorized administrator accounts only.
          </p>
        </div>
      </div>
      
      <div style={{
        marginTop: "32px",
        textAlign: "center",
        fontSize: "12px",
        color: "#94A3B8",
        opacity: 0.8,
        position: "relative",
        zIndex: 10
      }}>
        <p>© 2026 Togahh AI Marketing Systems. Restricted Administrative Access.</p>
      </div>
    </div>
  );
}


