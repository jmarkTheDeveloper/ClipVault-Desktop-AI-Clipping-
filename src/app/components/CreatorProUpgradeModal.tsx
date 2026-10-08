import React, { useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Lock,
  X,
  Zap,
  Key,
  ShieldCheck,
} from "lucide-react";

export const LEMON_PRO_CHECKOUT_URL =
  "https://clipvault.lemonsqueezy.com/checkout/buy/04a9b893-78ce-4dd6-9eb9-1708e831c2d9";
export const LEMON_MAX_CHECKOUT_URL =
  "https://clipvault.lemonsqueezy.com/checkout/buy/2dbb1ba7-c3e4-414b-99e9-a1a1a385ac49";

interface CreatorProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: "studio_locked" | "free_limit_reached" | "4k_locked" | "upgrade_menu";
  onOpenActivation?: () => void;
  resetsInDays?: number;
  resetsAt?: string;
}

export function CreatorProUpgradeModal({
  isOpen,
  onClose,
  reason = "upgrade_menu",
  onOpenActivation,
  resetsInDays = 7,
  resetsAt,
}: CreatorProUpgradeModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleOpenUrl = (url: string) => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.openExternal) {
        electronAPI.openExternal(url);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const getHeadline = () => {
    switch (reason) {
      case "studio_locked":
        return "Pro Timeline Editor Requires Creator Pro";
      case "free_limit_reached":
        return "Free Tier Weekly Limit Reached";
      case "4k_locked":
        return "4K & 8K Exports Require Creator Pro";
      default:
        return "Upgrade ClipVault Workspace";
    }
  };

  const getDescription = () => {
    switch (reason) {
      case "studio_locked":
        return "Pro Timeline Editor includes frame-accurate timeline editing, multi-range trimming, and custom aspect-ratio crop framing. It requires a Creator Pro ($11/mo) or Creator Max ($15/mo) subscription.";
      case "free_limit_reached":
        return `Community Free Tier includes 2 video clips per rolling 7-day week via the 1-Click Auto Clipper. Your 2 free credits will refresh in ${resetsInDays} ${resetsInDays === 1 ? "day" : "days"}${resetsAt ? ` (${resetsAt})` : ""}. Upgrade for unlimited autonomous clipping.`;
      case "4k_locked":
        return "Free Tier exports video up to 1080p Full HD. 4K and 8K Super-Resolution AI master exports are reserved for Creator Pro and Creator Max plans.";
      default:
        return "Choose the right plan for your content workflow. You are currently on the Community Free Tier (2 clips per week via 1-Click Auto Clipper).";
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center pt-14 pb-4 px-4 animate-in fade-in duration-200 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-2xl bg-[#0c0d12] border border-[#34eb3d]/40 shadow-[0_0_60px_rgba(52,235,61,0.18)] p-6 sm:p-8 text-zinc-100 overflow-hidden cursor-default"
      >
        {/* Top ambient highlight */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#34eb3d] to-transparent" />

        {/* Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 z-50 p-2 rounded-xl text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/10 transition-all cursor-pointer shadow-sm group"
          title="Close"
          aria-label="Close"
        >
          <X className="w-4 h-4 pointer-events-none group-hover:scale-110 transition-transform" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#34eb3d]/10 border border-[#34eb3d]/30 text-[#34eb3d] text-[11px] font-bold uppercase tracking-wider">
            <Lock className="w-3 h-3" />
            <span>Commercial Subscription</span>
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
          {getHeadline()}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6">
          {getDescription()}
        </p>

        {/* Subscription Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Plan 1: Creator Pro ($11/mo) */}
          <div className="rounded-2xl p-4 bg-[#12141c] border border-white/10 hover:border-[#34eb3d]/50 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#34eb3d] block font-mono">
                    Most Popular
                  </span>
                  <h3 className="text-base font-extrabold text-white">Creator Pro</h3>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-white">$11</span>
                  <span className="text-xs text-zinc-400"> / mo</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34eb3d] shrink-0" />
                  <span className="font-semibold text-white">Unlimited 1-Click Auto Clipper</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34eb3d] shrink-0" />
                  <span>4K &amp; 8K Master Resolution</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34eb3d] shrink-0" />
                  <span>3 Pro Editor Clips / Week</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34eb3d] shrink-0" />
                  <span>Full Subtitle &amp; Animation Presets</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenUrl(LEMON_PRO_CHECKOUT_URL)}
              className="w-full py-2.5 px-3 rounded-xl bg-[#34eb3d] hover:bg-[#2dca34] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(52,235,61,0.25)] transition-all cursor-pointer"
            >
              <span>Get Creator Pro ($11/mo)</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Plan 2: Creator Max ($15/mo) */}
          <div className="rounded-2xl p-4 bg-[#141a15] border border-[#34eb3d]/40 shadow-[0_0_30px_rgba(52,235,61,0.12)] flex flex-col justify-between space-y-4 relative">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#34eb3d] block font-mono">
                    Unlimited Editor
                  </span>
                  <h3 className="text-base font-extrabold text-white">Creator Max</h3>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-white">$15</span>
                  <span className="text-xs text-zinc-400"> / mo</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34eb3d] shrink-0" />
                  <span className="font-semibold text-white">Unlimited 1-Click Auto Clipper</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#34eb3d] shrink-0" />
                  <span className="font-bold text-[#34eb3d]">Unlimited Pro Timeline Editor</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34eb3d] shrink-0" />
                  <span>4K &amp; 8K Master Resolution</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34eb3d] shrink-0" />
                  <span>3 Workstation Activations</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenUrl(LEMON_MAX_CHECKOUT_URL)}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#34eb3d] to-[#00e676] hover:brightness-110 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_25px_rgba(52,235,61,0.35)] transition-all cursor-pointer"
            >
              <span>Get Creator Max ($15/mo)</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Footer Activation & Dismiss Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
          {onOpenActivation && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenActivation();
              }}
              className="text-zinc-400 hover:text-white flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-[#34eb3d]" />
              <span>Already have a license key? Enter key</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 font-semibold transition-colors cursor-pointer sm:ml-auto"
          >
            Continue with Free Tier (2 clips / week)
          </button>
        </div>
      </div>
    </div>
  );
}
