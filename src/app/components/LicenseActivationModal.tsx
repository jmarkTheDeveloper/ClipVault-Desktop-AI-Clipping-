import React, { useState } from "react";
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Clipboard,
  Sparkles,
  Lock
} from "lucide-react";

interface LicenseActivationModalProps {
  isOpen: boolean;
  onActivated: (licenseData: { key_preview: string; user_email: string }) => void;
  checkoutUrl?: string;
}

export function LicenseActivationModal({
  isOpen,
  onActivated,
  checkoutUrl = "https://clipvault.lemonsqueezy.com"
}: LicenseActivationModalProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setLicenseKey(text.trim());
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = licenseKey.trim();
    if (!cleanKey) {
      setErrorMsg("Please enter your ClipVault license key.");
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

      const data = await res.json();

      if (data.success && data.licensed) {
        setSuccessMsg(data.message || "License verified and activated successfully!");
        setTimeout(() => {
          onActivated({
            key_preview: cleanKey.length >= 10 ? `${cleanKey.slice(0, 4)}••••${cleanKey.slice(-4)}` : "ACTIVE",
            user_email: data.user_email || "Creator"
          });
        }, 1200);
      } else {
        setErrorMsg(data.error || "Invalid license key or activation limit reached.");
      }
    } catch (err: any) {
      setErrorMsg("Could not connect to the local license service. Please ensure the ClipVault engine is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-md bg-[#0e0e12] border border-amber-400/40 rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col items-center text-center space-y-5 ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glowing Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.25)]">
          <Key className="w-8 h-8" />
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-white tracking-wide">
            Activate ClipVault Studio
          </h2>
          <p className="text-xs text-gray-400 max-w-sm leading-relaxed font-medium">
            Please enter the license key provided in your purchase receipt to unlock the autonomous clipping studio on this PC.
          </p>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="w-full p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-start gap-2.5 text-left animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-red-300">Activation Failed:</span>
              <p className="text-[11px] text-gray-300 leading-snug">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="w-full p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2.5 text-left animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-emerald-300">{successMsg}</span>
          </div>
        )}

        {/* License Input Form */}
        <form onSubmit={handleActivate} className="w-full space-y-4">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-gray-500 pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="e.g. CV-XXXX-XXXX-XXXX-XXXX"
              disabled={isLoading || Boolean(successMsg)}
              className="w-full bg-white/[0.04] border border-white/[0.14] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-2xl pl-10 pr-20 py-3.5 text-xs sm:text-sm text-white font-mono placeholder-gray-500 outline-none transition-all disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handlePaste}
              disabled={isLoading || Boolean(successMsg)}
              className="absolute right-2.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-[11px] font-bold text-gray-200 transition-all cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50"
            >
              <Clipboard className="w-3 h-3 text-amber-400" />
              <span>Paste</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !licenseKey.trim() || Boolean(successMsg)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(245,158,11,0.3)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 text-black animate-spin" />
                <span>Verifying with Lemon Squeezy...</span>
              </>
            ) : successMsg ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>Unlocked! Launching Studio...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                <span>Activate License</span>
              </>
            )}
          </button>
        </form>

        {/* Security & Offline Guarantee */}
        <div className="w-full p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-gray-400 text-left flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Hardware-Bound Protection: Once verified, your license is permanently bound to this computer using Windows DPAPI encryption and runs 100% offline.
          </span>
        </div>

        {/* Buy Link */}
        <div className="pt-1 flex flex-col items-center space-y-1 text-xs text-gray-400">
          <p>Don&apos;t have a ClipVault license key yet?</p>
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Purchase ClipVault License</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
