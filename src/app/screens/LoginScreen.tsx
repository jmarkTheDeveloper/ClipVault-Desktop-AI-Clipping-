import React, { useState } from "react";
import { Check, Play, Film } from "lucide-react";
import { Logo } from "../components/Logo";

const G = "#00e676";

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const strength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 600);
  }

  return (
    <div className="min-h-screen flex w-full h-full overflow-hidden select-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Left: Brand Panel ── */}
      <div className="hidden lg:flex flex-col w-[55%] relative overflow-hidden" style={{ background: "#050505" }}>

        <img
          src="https://images.unsplash.com/photo-1536240478700-b869ad10e2cc?w=1400&h=1000&fit=crop&auto=format"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.18 }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(5,5,5,0.6) 0%, rgba(5,5,5,0.2) 40%, rgba(5,5,5,0.8) 100%)" }} />
        <div className="absolute inset-y-0 right-0 w-32" style={{ background: "linear-gradient(to right, transparent, #090909)" }} />
        <div className="absolute pointer-events-none" style={{ width: 500, height: 500, bottom: -100, left: -80, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,230,118,0.08) 0%, transparent 65%)" }} />
        <div className="absolute pointer-events-none" style={{ width: 300, height: 300, top: 80, right: 60, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,230,118,0.05) 0%, transparent 65%)" }} />

        <div className="relative z-10 flex flex-col h-full px-14 py-12">
          <style>{`
            @keyframes waveBar {
              from { transform: scaleY(0.3) translateZ(0); opacity: 0.4; }
              to   { transform: scaleY(1) translateZ(0);   opacity: 1; }
            }
            @keyframes floatA {
              0%, 100% { transform: rotate(-5deg) translateY(0px) translateZ(0); }
              50%       { transform: rotate(-5deg) translateY(-10px) translateZ(0); }
            }
            @keyframes floatB {
              0%, 100% { transform: rotate(3deg) translateY(0px) translateZ(0); }
              50%       { transform: rotate(3deg) translateY(-14px) translateZ(0); }
            }
            @keyframes floatC {
              0%, 100% { transform: rotate(-2deg) translateY(0px) translateZ(0); }
              50%       { transform: rotate(-2deg) translateY(-8px) translateZ(0); }
            }
            .login-social-btn:hover {
              border-color: rgba(255,255,255,0.18) !important;
              background: #1c1c1c !important;
              transform: translateY(-1px);
            }
            .login-feature-item {
              transition: all 0.2s ease;
              padding: 8px 10px;
              border-radius: 10px;
              margin-left: -10px;
            }
            .login-feature-item:hover { background: rgba(0,230,118,0.04); }
            .login-feature-item:hover .login-feature-check {
              background: rgba(0,230,118,0.25) !important;
              border-color: rgba(0,230,118,0.6) !important;
            }
            .login-feature-item:hover p { color: rgba(255,255,255,0.9) !important; }
          `}</style>

          {/* TOP: logo + wordmark + headline */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-3 mb-5">
              <Logo size={38} />
              <span className="font-black leading-none" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, letterSpacing: "-0.03em", color: "#fff" }}>
                Clip<span style={{ color: G }}>Vault</span>
              </span>
            </div>
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: "rgba(0,230,118,0.55)" }}>
              Professional Video Editing
            </span>
            <h1 className="mt-2 mb-3 leading-none tracking-tight"
              style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(48px, 6vw, 80px)", fontWeight: 900, letterSpacing: "-0.04em" }}>
              <span style={{ color: "#ffffff" }}>Edit without</span><br />
              <span style={{ color: G }}>limits.</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, lineHeight: 1.7, maxWidth: 340 }}>
              Multi-track timeline, color grading, AI tools — everything a creator needs.
            </p>
          </div>

          {/* MIDDLE: floating video cards */}
          <div className="relative flex-1 min-h-0 my-6">

            {/* Card A */}
            <div className="absolute overflow-hidden rounded-2xl shadow-2xl"
              style={{ width: 195, height: 114, top: "10%", left: "0%", border: "1px solid rgba(255,255,255,0.09)", animationName: "floatA", animationDuration: "5s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }}>
              <img src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=240&fit=crop&auto=format" alt="" className="w-full h-full object-cover" style={{ opacity: 0.65 }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent 55%)" }} />
              <span className="absolute bottom-2 left-3 text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>travel_drone.mp4</span>
            </div>

            {/* Card B — hero */}
            <div className="absolute overflow-hidden rounded-2xl shadow-2xl"
              style={{ width: 240, height: 142, top: "28%", left: "18%", border: "1.5px solid rgba(0,230,118,0.35)", boxShadow: "0 0 32px rgba(0,230,118,0.12), 0 20px 48px rgba(0,0,0,0.7)", animationName: "floatB", animationDuration: "6s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }}>
              <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=480&h=288&fit=crop&auto=format" alt="" className="w-full h-full object-cover" style={{ opacity: 0.85 }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent 55%)" }} />
              <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.65)", border: `1px solid ${G}` }}>
                <Play className="fill-current ml-0.5" style={{ color: G, width: 12, height: 12 }} />
              </div>
              <span className="absolute bottom-2 left-3 text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.6)" }}>beach_sunset.mp4</span>
            </div>

            {/* Card C */}
            <div className="absolute overflow-hidden rounded-2xl shadow-xl"
              style={{ width: 175, height: 104, top: "6%", left: "50%", border: "1px solid rgba(255,255,255,0.07)", animationName: "floatC", animationDuration: "4.5s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", animationDelay: "0.8s" }}>
              <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=360&h=216&fit=crop&auto=format" alt="" className="w-full h-full object-cover" style={{ opacity: 0.55, filter: "saturate(0.75)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent 55%)" }} />
              <span className="absolute bottom-2 left-3 text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>gym_clip.mp4</span>
            </div>

            {/* Status badge */}
            <div className="absolute flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{ bottom: "8%", left: "6%", background: "rgba(8,8,8,0.88)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: G }} />
              <span className="text-xs font-semibold text-white">4:32 · 3 clips</span>
            </div>
          </div>

          {/* BOTTOM: waveform + features */}
          <div className="flex-shrink-0">
            <div className="flex items-end gap-[3px] mb-5" style={{ height: 36 }}>
              {[35,60,45,80,55,90,40,70,50,85,30,65,75,45,88,52,38,72,60,42].map((h, i) => (
                <div key={i} className="rounded-full flex-shrink-0"
                  style={{ width: 3, background: i % 5 === 0 ? G : `rgba(0,230,118,${0.18 + (i % 4) * 0.1})`, animationName: "waveBar", animationDuration: `${0.8 + (i % 7) * 0.15}s`, animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", animationDirection: "alternate", animationDelay: `${i * 0.06}s`, height: `${h}%` }} />
              ))}
            </div>
            <div className="space-y-0.5">
              {[
                ["Multi-track Timeline", "Layer video, audio, and text with precision"],
                ["Color Grading", "Professional filters and manual color controls"],
                ["8K Export", "Render in up to 8K at 60fps with one click"],
              ].map(([title, desc]) => (
                <div key={title} className="login-feature-item flex items-start gap-3 cursor-default">
                  <div className="login-feature-check w-4 h-4 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 transition-all duration-200"
                    style={{ background: "rgba(0,230,118,0.12)", border: "1px solid rgba(0,230,118,0.28)" }}>
                    <Check className="w-2.5 h-2.5" style={{ color: G }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white transition-colors duration-200">{title}</p>
                    <p className="text-xs transition-colors duration-200" style={{ color: "rgba(255,255,255,0.28)" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Form Panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12" style={{ background: "#090909" }}>
        <div className="w-full" style={{ maxWidth: 400 }}>

          {/* Mobile wordmark */}
          <div className="mb-10 lg:hidden flex items-center gap-3">
            <Logo size={42} />
            <h1 className="text-white font-black" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, letterSpacing: "-0.04em", lineHeight: 1 }}>
              Clip<span style={{ color: G }}>Vault</span>
            </h1>
          </div>

          <h2 className="text-white font-bold mb-1" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, letterSpacing: "-0.02em" }}>
            {tab === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm mb-8" style={{ color: "#444" }}>
            {tab === "login" ? "Sign in to continue editing." : "Start creating for free today."}
          </p>

          {/* Tab toggle */}
          <div className="flex p-1 mb-6 rounded-xl" style={{ background: "#141414" }}>
            {(["login", "signup"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer"
                style={tab === t ? { background: "#242424", color: "#fff" } : { color: "#3a3a3a" }}>
                {t === "login" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {/* Social buttons */}
          <div className="space-y-2.5 mb-6">
            <button
              onClick={onLogin}
              className="login-social-btn w-full flex items-center gap-3 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer"
              style={{ background: "#141414", border: "1px solid #252525", color: "#bbb" }}
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button
              onClick={onLogin}
              className="login-social-btn w-full flex items-center gap-3 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer"
              style={{ background: "#141414", border: "1px solid #252525", color: "#bbb" }}
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#5865F2">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.053a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Continue with Discord
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: "#1a1a1a" }} />
            <span className="text-xs" style={{ color: "#2e2e2e" }}>or continue with email</span>
            <div className="flex-1 h-px" style={{ background: "#1a1a1a" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === "signup" && (
              <input type="text" placeholder="Full name"
                className="w-full px-4 py-3 text-sm rounded-xl text-white outline-none transition-all"
                style={{ background: "#141414", border: "1px solid #222" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(0,230,118,0.45)")}
                onBlur={(e) => (e.target.style.borderColor = "#222")} />
            )}
            <input type="email" placeholder="Email address" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-xl text-white outline-none transition-all"
              style={{ background: "#141414", border: "1px solid #222" }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(0,230,118,0.45)")}
              onBlur={(e) => (e.target.style.borderColor = "#222")} />
            <div className="relative">
              <input type={showPw ? "text" : "password"} placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-16 text-sm rounded-xl text-white outline-none transition-all"
                style={{ background: "#141414", border: "1px solid #222" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(0,230,118,0.45)")}
                onBlur={(e) => (e.target.style.borderColor = "#222")} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold hover:text-white transition-colors cursor-pointer"
                style={{ color: "#3a3a3a" }}>
                {showPw ? "Hide" : "Show"}
              </button>
            </div>

            {tab === "signup" && password.length > 0 && (
              <div className="flex gap-1.5 pt-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 h-0.5 rounded-full transition-all duration-300"
                    style={{ background: i < strength ? (strength <= 1 ? "#f04444" : strength <= 2 ? "#f59e0b" : G) : "#1e1e1e" }} />
                ))}
              </div>
            )}

            {tab === "login" && (
              <div className="flex justify-end pt-1">
                <button type="button" onClick={onLogin} className="text-xs hover:underline transition-all cursor-pointer" style={{ color: "#3a3a3a" }}>
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit"
              className="w-full py-3.5 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2 mt-1 cursor-pointer"
              style={{ background: G, opacity: loading ? 0.75 : 1, transition: "all 0.18s ease" }}
              onMouseEnter={(e) => { if (!loading) { (e.currentTarget.style.boxShadow = "0 0 24px rgba(0,230,118,0.35)"); (e.currentTarget.style.transform = "translateY(-1px)"); }}}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
              {loading
                ? <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                : tab === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-xs text-center mt-6" style={{ color: "#2e2e2e" }}>
            By continuing you agree to our{" "}
            <span className="underline cursor-pointer" style={{ color: "#3a3a3a" }}>Terms</span>{" "}and{" "}
            <span className="underline cursor-pointer" style={{ color: "#3a3a3a" }}>Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
