import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Clipboard,
  Sparkles,
  Lock,
  X,
} from "lucide-react";

interface LicenseActivationModalProps {
  isOpen: boolean;
  /** Called ONLY after the engine has verified and activated a signed license. */
  onActivated: (licenseData: { key_preview: string; user_email: string }) => void;
  /** False when /api/license/status could not be reached (engine not running). */
  engineReachable?: boolean;
  /** Re-checks the engine license status. */
  onRetry?: () => void;
  checkoutUrl?: string;
  onClose?: () => void;
  canDismiss?: boolean;
}

function previewKey(key: string): string {
  const clean = (key || "").trim();
  if (clean.length < 10) return "ACTIVE";
  return `${clean.slice(0, 4)}-****-****-${clean.slice(-4)}`;
}

export function LicenseActivationModal({
  isOpen,
  onActivated,
  engineReachable = true,
  onRetry,
  checkoutUrl = "https://clipvault.lemonsqueezy.com",
  onClose,
  canDismiss = false,
}: LicenseActivationModalProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const MAX_ATTEMPTS = 5;

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (onClose || canDismiss)) {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, canDismiss]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setLicenseKey(text.trim());
      setErrorMsg(null);
    } catch {
      // Clipboard permission denied: the user can still type/paste manually.
    }
  };

  const triggerEmergencyShutdown = () => {
    try {
      (window as any).electronAPI?.quitApp?.();
      (window as any).electronAPI?.confirmExit?.();
    } catch {}
    fetch("http://127.0.0.1:8000/api/shutdown", { method: "POST" }).catch(() => {});
    setTimeout(() => {
      window.close();
    }, 600);
  };

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLocked) return;

    const cleanKey = (licenseKey || "").trim();
    if (!cleanKey) {
      setErrorMsg("Please enter the license key from your purchase receipt.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_key: cleanKey })
      });

      const data = await res.json().catch(() => null);

      if (data && (data.success || data.licensed)) {
        setSuccessMsg(data.message || "License verified and activated successfully!");
        setFailedAttempts(0);
        setTimeout(() => {
          onActivated({
            key_preview: previewKey(cleanKey),
            user_email: data.user_email || "Licensed User"
          });
        }, 400);
        return;
      }

      // Check server-reported lock or increment attempt counter
      const currentFailures = (data && typeof data.failed_attempts === "number")
        ? data.failed_attempts
        : failedAttempts + 1;

      setFailedAttempts(currentFailures);

      if (data?.locked || currentFailures >= MAX_ATTEMPTS) {
        setIsLocked(true);
        setErrorMsg("SECURITY LOCKOUT ACTIVATED: 5 failed attempts exceeded. Shutting down application...");
        setTimeout(triggerEmergencyShutdown, 1500);
        return;
      }

      const remaining = typeof data?.attempts_remaining === "number"
        ? data.attempts_remaining
        : Math.max(0, MAX_ATTEMPTS - currentFailures);

      setErrorMsg(
        `Invalid license key. Warning: ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before application security shutdown.`
      );
    } catch {
      setErrorMsg(
        "Could not reach the local license service. ClipVault cannot verify your license while the engine is not running — please start ClipVault and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Full screen anti-tamper security lockout view
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 select-none">
        <div className="relative w-full max-w-md bg-[#160b0b] border border-red-500/40 rounded-2xl p-8 shadow-[0_0_60px_rgba(239,68,68,0.4)] flex flex-col items-center text-center space-y-4 ring-1 ring-red-500/30 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-red-400 tracking-tight uppercase">
              Security Lockout Activated
            </h2>
            <p className="text-xs text-red-200/90 leading-relaxed font-semibold">
              5 consecutive invalid license activation attempts detected. Anti-tamper brute force protection has been triggered.
            </p>
            <p className="text-[11px] text-red-400/90 font-mono font-bold pt-2 animate-pulse">
              Terminating ClipVault Studio process immediately...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget && (onClose || canDismiss)) {
          handleDismiss(e);
        }
      }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#0e0e12] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col items-center text-center space-y-5 ring-1 ring-white/5 animate-in fade-in zoom-in-95 duration-200 cursor-default"
      >
        
        {/* Close Button */}
        {(onClose || canDismiss) && (
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-50 p-2 rounded-xl text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/10 transition-all cursor-pointer shadow-sm group"
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4 pointer-events-none group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* Industry Standard Typography Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#00e676]/10 border border-[#00e676]/20 text-[10px] font-mono font-bold tracking-widest text-[#00e676] uppercase">
            Workstation Activation
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Activate ClipVault Studio
          </h2>
          <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
            Enter your purchase license key to activate ClipVault Studio on this workstation.
          </p>
        </div>

        {/* Failed Attempts Security Warning Indicator */}
        {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
          <div className="w-full px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center justify-between font-mono">
            <span className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              Security Alert:
            </span>
            <span className="font-extrabold text-red-200">
              Attempt {failedAttempts} of {MAX_ATTEMPTS}
            </span>
          </div>
        )}

        {/* Engine unreachable — licensing cannot be verified at all */}
        {!engineReachable && (
          <div className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-100 flex items-start gap-2.5 text-left animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-300">Could not verify your licence:</span>
              <p className="text-[11px] text-zinc-300 leading-snug">
                The ClipVault engine is not reachable on this PC, so your license cannot be checked.
                ClipVault stays locked until the engine is running and the license verifies.
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-1 px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-[11px] font-bold text-zinc-100 transition-all cursor-pointer"
                >
                  Check again
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-200 flex items-start gap-2.5 text-left animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-red-300">Activation Notice:</span>
              <p className="text-[11px] text-zinc-300 leading-snug">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-200 flex items-center gap-2.5 text-left animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-emerald-300">{successMsg}</span>
          </div>
        )}

        {/* License Input Form */}
        <form onSubmit={handleActivate} className="w-full space-y-4">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-zinc-500 pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => {
                setLicenseKey(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="CV1.…  (paste your license key)"
              disabled={isLoading || Boolean(successMsg) || isLocked}
              spellCheck={false}
              autoComplete="off"
              className="w-full bg-white/[0.04] border border-white/[0.12] focus:border-[#00e676] focus:ring-1 focus:ring-[#00e676]/40 rounded-xl pl-10 pr-20 py-3 text-xs sm:text-sm text-white font-mono placeholder-zinc-500 outline-none transition-all disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handlePaste}
              disabled={isLoading || Boolean(successMsg) || isLocked}
              className="absolute right-2 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-[11px] font-bold text-zinc-200 transition-all cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50"
            >
              <Clipboard className="w-3 h-3 text-[#00e676]" />
              <span>Paste</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || Boolean(successMsg) || isLocked}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#00e676] to-[#00DF6D] hover:brightness-110 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,230,118,0.25)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 text-black animate-spin" />
                <span>Verifying Workstation License...</span>
              </>
            ) : successMsg ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>Unlocked! Opening Studio...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                <span>Activate License</span>
              </>
            )}
          </button>
        </form>

        {/* Workstation Verification Notice */}
        <div className="w-full p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] text-[11px] text-zinc-300 text-left flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#00e676] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-white block">Official Workstation License</span>
            <p className="text-zinc-400 text-[10.5px] leading-relaxed">
              Your license is verified securely and remembered automatically on this computer. You will not need to re-enter your key on future launches.
            </p>
          </div>
        </div>

        {/* Strict Anti-Sharing Legal & Security Warning */}
        <div className="w-full p-3.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/30 text-[11px] text-left flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-300 block">Important: Non-Transferable License</span>
            <p className="text-zinc-300 text-[10.5px] leading-snug">
              Do not share your license key with anyone. Licenses are single-user and strictly tied to your account. Sharing or unauthorized redistribution will result in immediate permanent revocation without refund. ClipVault is not responsible for any loss of access or damages resulting from shared license keys.
            </p>
          </div>
        </div>

        {/* Store Link */}
        <div className="pt-1 flex flex-col items-center space-y-1.5 text-xs text-zinc-500">
          <p>Need a license key?</p>
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00e676] hover:text-[#00c853] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Purchase ClipVault License</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {(onClose || canDismiss) && (
            <button
              type="button"
              onClick={handleDismiss}
              className="mt-2 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Continue with Free Tier (2 clips / week)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
