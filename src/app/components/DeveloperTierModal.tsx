import React, { useState, useEffect } from "react";
import {
  Code2,
  Check,
  X,
  Lock,
  Sparkles,
  Zap,
  Sliders,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Info,
  Terminal,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { LEMON_PRO_CHECKOUT_URL, LEMON_MAX_CHECKOUT_URL } from "./CreatorProUpgradeModal";

const G = "#34eb3d";

export type SimulatedTier = "free" | "pro" | "max" | null;

interface DeveloperTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSimulatedTier?: SimulatedTier;
  onSelectSimulatedTier: (tier: SimulatedTier) => void;
  appEdition?: "consumer" | "developer";
  onSwitchAppEdition?: (edition: "consumer" | "developer") => void;
  onResetCredits?: () => void;
  onExhaustCredits?: () => void;
}

export function DeveloperTierModal({
  isOpen,
  onClose,
  currentSimulatedTier = null,
  onSelectSimulatedTier,
  appEdition = "developer",
  onSwitchAppEdition,
  onResetCredits,
  onExhaustCredits,
}: DeveloperTierModalProps) {
  const [activeTab, setActiveTab] = useState<"matrix" | "simulator">("matrix");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(label);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  const tiers = [
    {
      id: "free",
      name: "Community Free",
      tagline: "Free forever for trial & casual clipping",
      price: "$0",
      cadence: "forever",
      badge: "Free Tier",
      badgeColor: "border-white/20 bg-white/5 text-zinc-300",
      accentBorder: "border-white/10",
      features: [
        { label: "1-Click Auto Clipper", value: "2 Clips / Week", state: "limited", highlight: true },
        { label: "Pro Manual Studio", value: "Locked (Pro Required)", state: "locked", highlight: false },
        { label: "Max Resolution", value: "720p & 1080p HD", state: "normal", highlight: false },
        { label: "4K & 8K Super-Resolution", value: "Locked", state: "locked", highlight: false },
        { label: "AI Virality Hook Scoring", value: "Enabled (0-100 pts)", state: "check", highlight: false },
        { label: "Face Tracking & Centering", value: "Enabled", state: "check", highlight: false },
        { label: "Animated Subtitle Presets", value: "All 6 Kinetic Styles", state: "check", highlight: false },
        { label: "Podcast & Auto Split-Screen", value: "Enabled", state: "check", highlight: false },
        { label: "Multi-Range Timeline Trimming", value: "Locked", state: "locked", highlight: false },
        { label: "Rolling Reset Window", value: "7 Days (Refreshes weekly)", state: "normal", highlight: false },
        { label: "Workstation Activations", value: "1 Local Machine", state: "normal", highlight: false },
        { label: "Checkout URL", value: "None (Free Instant Access)", state: "normal", highlight: false },
      ],
      checkoutUrl: null,
    },
    {
      id: "pro",
      name: "Creator Pro",
      tagline: "High-volume creators needing unlimited 1-click & studio trial",
      price: "$15",
      cadence: "per month",
      badge: "Most Popular",
      badgeColor: "border-[#34eb3d]/40 bg-[#34eb3d]/10 text-[#34eb3d]",
      accentBorder: "border-[#34eb3d]/30",
      features: [
        { label: "1-Click Auto Clipper", value: "Unlimited Autonomous Exports", state: "check", highlight: true },
        { label: "Pro Manual Studio", value: "3 Clips / Week", state: "limited", highlight: true },
        { label: "Max Resolution", value: "Up to 4K & 8K Super-Res", state: "check", highlight: true },
        { label: "4K & 8K Super-Resolution", value: "Fully Unlocked", state: "check", highlight: true },
        { label: "AI Virality Hook Scoring", value: "Enabled (0-100 pts)", state: "check", highlight: false },
        { label: "Face Tracking & Centering", value: "Enabled", state: "check", highlight: false },
        { label: "Animated Subtitle Presets", value: "All 6 Kinetic Styles", state: "check", highlight: false },
        { label: "Podcast & Auto Split-Screen", value: "Enabled", state: "check", highlight: false },
        { label: "Multi-Range Timeline Trimming", value: "Included in Studio (3/wk)", state: "check", highlight: false },
        { label: "Rolling Reset Window", value: "7 Days (3 studio clips reset)", state: "normal", highlight: false },
        { label: "Workstation Activations", value: "1 Active Workstation", state: "normal", highlight: false },
        { label: "Checkout URL", value: LEMON_PRO_CHECKOUT_URL, state: "link", highlight: false },
      ],
      checkoutUrl: LEMON_PRO_CHECKOUT_URL,
    },
    {
      id: "max",
      name: "Creator Max",
      tagline: "Power creators, agencies, & editors needing zero caps",
      price: "$25",
      cadence: "per month",
      badge: "Uncapped Master",
      badgeColor: "border-[#00e676]/50 bg-[#00e676]/15 text-[#00e676]",
      accentBorder: "border-[#00e676]/50 shadow-[0_0_30px_rgba(0,230,118,0.12)]",
      features: [
        { label: "1-Click Auto Clipper", value: "Unlimited Autonomous Exports", state: "check", highlight: true },
        { label: "Pro Manual Studio", value: "Unlimited (Zero Caps)", state: "check", highlight: true },
        { label: "Max Resolution", value: "Up to 4K & 8K Super-Res", state: "check", highlight: true },
        { label: "4K & 8K Super-Resolution", value: "Fully Unlocked", state: "check", highlight: true },
        { label: "AI Virality Hook Scoring", value: "Enabled (0-100 pts)", state: "check", highlight: false },
        { label: "Face Tracking & Centering", value: "Enabled", state: "check", highlight: false },
        { label: "Animated Subtitle Presets", value: "All 6 Kinetic Styles", state: "check", highlight: false },
        { label: "Podcast & Auto Split-Screen", value: "Enabled", state: "check", highlight: false },
        { label: "Multi-Range Timeline Trimming", value: "Unlimited Timeline Trims", state: "check", highlight: false },
        { label: "Rolling Reset Window", value: "No Quota Limits", state: "check", highlight: false },
        { label: "Workstation Activations", value: "Up to 3 Workstations", state: "check", highlight: true },
        { label: "Checkout URL", value: LEMON_MAX_CHECKOUT_URL, state: "link", highlight: false },
      ],
      checkoutUrl: LEMON_MAX_CHECKOUT_URL,
    },
  ];

  return (
    <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center pt-14 pb-4 px-3 sm:px-5 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[calc(100vh-76px)] rounded-3xl bg-[#0a0c10] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.9),0_0_40px_rgba(52,235,61,0.15)] flex flex-col text-zinc-100 overflow-hidden">
        {/* Top ambient green line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#34eb3d] to-transparent pointer-events-none" />

        {/* Modal Header */}
        <header className="px-6 py-4.5 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0 bg-[#0e1117]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#34eb3d]/10 border border-[#34eb3d]/30 flex items-center justify-center text-[#34eb3d]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Developer Tier Matrix &amp; Simulator
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#34eb3d]/15 text-[#34eb3d] border border-[#34eb3d]/30 uppercase">
                  Founder Special
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Detailed cross-tier feature comparison and live workstation environment switcher.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("matrix")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === "matrix" ? "bg-[#34eb3d] text-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                Comparison Matrix
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("simulator")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === "simulator" ? "bg-[#34eb3d] text-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                Live Sandbox Switcher
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "matrix" ? (
            /* TAB 1: SIDE-BY-SIDE MATRIX */
            <div className="space-y-6">
              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tiers.map((tier) => {
                  const isSimulatedActive = currentSimulatedTier === tier.id;
                  return (
                    <div
                      key={tier.id}
                      className={`rounded-2xl p-5 bg-[#0f121a] border transition-all flex flex-col justify-between relative ${tier.accentBorder} ${
                        isSimulatedActive ? "ring-2 ring-[#34eb3d] shadow-[0_0_30px_rgba(52,235,61,0.2)]" : ""
                      }`}
                    >
                      {isSimulatedActive && (
                        <div className="absolute -top-3 left-4 px-2 py-0.5 rounded-full bg-[#34eb3d] text-black font-extrabold text-[10px] uppercase tracking-wide">
                          Active Sandbox Simulation
                        </div>
                      )}

                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${tier.badgeColor}`}>
                            {tier.badge}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono">ID: {tier.id}</span>
                        </div>

                        <div>
                          <h3 className="text-lg font-black text-white">{tier.name}</h3>
                          <p className="text-xs text-zinc-400 leading-snug mt-0.5">{tier.tagline}</p>
                        </div>

                        <div className="flex items-baseline gap-1 py-1 border-y border-white/[0.06]">
                          <span className="text-3xl font-black text-white">{tier.price}</span>
                          <span className="text-xs text-zinc-400 font-medium">/ {tier.cadence}</span>
                        </div>

                        {/* Feature Points */}
                        <div className="space-y-2 pt-1 text-xs">
                          {tier.features.map((feat) => (
                            <div key={feat.label} className="flex items-start justify-between gap-2">
                              <span className="text-zinc-400 text-[11px]">{feat.label}:</span>
                              <span
                                className={`text-[11px] font-semibold text-right ${
                                  feat.state === "locked"
                                    ? "text-amber-400 font-normal"
                                    : feat.highlight
                                    ? "text-[#34eb3d] font-bold"
                                    : "text-zinc-200"
                                }`}
                              >
                                {feat.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Checkout Link Action */}
                      <div className="pt-4 mt-4 border-t border-white/[0.08] space-y-2">
                        {tier.checkoutUrl ? (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const electronAPI = (window as any).electronAPI;
                                if (electronAPI && electronAPI.openExternal) {
                                  electronAPI.openExternal(tier.checkoutUrl);
                                } else {
                                  window.open(tier.checkoutUrl, "_blank", "noopener,noreferrer");
                                }
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                            >
                              <span>Test Lemon Squeezy Link</span>
                              <ExternalLink className="w-3 h-3 text-[#34eb3d]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(tier.checkoutUrl!, `${tier.id}-url`)}
                              className="w-full text-center text-[10.5px] text-zinc-500 hover:text-zinc-300 font-mono transition-colors cursor-pointer"
                            >
                              {copiedKey === `${tier.id}-url` ? "Copied Checkout URL!" : "Copy Raw Checkout URL"}
                            </button>
                          </div>
                        ) : (
                          <div className="py-2 text-center text-[11px] text-zinc-500 font-mono">
                            No payment required
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onSelectSimulatedTier(tier.id as any);
                          }}
                          className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSimulatedActive
                              ? "bg-[#34eb3d] text-black font-extrabold"
                              : "bg-[#34eb3d]/15 text-[#34eb3d] hover:bg-[#34eb3d]/25 border border-[#34eb3d]/30"
                          }`}
                        >
                          {isSimulatedActive ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Currently Simulating</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Simulate This Tier</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Founder Architecture Notes */}
              <div className="rounded-2xl p-4.5 bg-white/[0.02] border border-white/[0.08] space-y-2 text-xs">
                <div className="flex items-center gap-2 text-zinc-200 font-bold">
                  <Info className="w-4 h-4 text-[#34eb3d]" />
                  <span>Founder Architecture &amp; Enforcement Summary</span>
                </div>
                <p className="text-zinc-400 text-[11.5px] leading-relaxed">
                  Both Community Free and Creator Pro enforce rolling 7-day windows computed dynamically from the first clip render timestamp. Free users are restricted to 720p/1080p and cannot enter Pro Manual Studio. Creator Pro subscribers receive unlimited autonomous 1-click generation, full 4K/8K resolution access, and 3 manual studio clips per week. Creator Max removes all quota checks entirely.
                </p>
              </div>
            </div>
          ) : (
            /* TAB 2: LIVE SANDBOX SWITCHER */
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Product Edition Switcher */}
              <div className="rounded-2xl p-6 bg-[#0f121a] border border-white/10 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#34eb3d]" />
                      <span>Application Edition Profile</span>
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      appEdition === "consumer"
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        : "bg-[#34eb3d]/15 text-[#34eb3d] border border-[#34eb3d]/30"
                    }`}>
                      {appEdition === "consumer" ? "Consumer Product Active" : "Developer Studio Active"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Select your product profile. The Consumer Product provides a 100% clean customer interface without developer buttons or simulation banners.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSwitchAppEdition) onSwitchAppEdition("consumer");
                      onSelectSimulatedTier(null);
                      onClose();
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      appEdition === "consumer"
                        ? "bg-[#34eb3d]/20 border-[#34eb3d] text-white shadow-[0_0_20px_rgba(52,235,61,0.25)]"
                        : "bg-white/[0.03] border-white/10 text-zinc-300 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <div className="font-bold text-xs">Consumer Product View</div>
                    <div className="text-[10.5px] text-zinc-400 mt-1">
                      Pure customer UI. Hides Dev Tiers button and simulation banners.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onSwitchAppEdition) onSwitchAppEdition("developer");
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      appEdition === "developer"
                        ? "bg-[#34eb3d]/20 border-[#34eb3d] text-white shadow-[0_0_20px_rgba(52,235,61,0.25)]"
                        : "bg-white/[0.03] border-white/10 text-zinc-300 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <div className="font-bold text-xs">Developer Studio</div>
                    <div className="text-[10.5px] text-zinc-400 mt-1">
                      Internal development studio with tier simulator and dev controls.
                    </div>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl p-6 bg-[#0f121a] border border-white/10 space-y-5">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#34eb3d]" />
                    <span>Instant Workspace Tier Simulation</span>
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Select a tier below to immediately switch how the app renders. All cards, export gates, quotas, and upgrade buttons will instantly adapt to match the chosen tier.
                  </p>
                </div>

                {/* Tier Switch Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "free", label: "Community Free", sub: "2 Clips/Wk · 1080p Max" },
                    { id: "pro", label: "Creator Pro ($15)", sub: "Unlimited 1-Click · 3 Studio" },
                    { id: "max", label: "Creator Max ($25)", sub: "100% Uncapped All Features" },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => onSelectSimulatedTier(btn.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        currentSimulatedTier === btn.id
                          ? "bg-[#34eb3d]/20 border-[#34eb3d] text-white shadow-[0_0_20px_rgba(52,235,61,0.25)]"
                          : "bg-white/[0.03] border-white/10 text-zinc-300 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <div className="font-bold text-xs">{btn.label}</div>
                      <div className="text-[10.5px] text-zinc-400 mt-0.5">{btn.sub}</div>
                      {currentSimulatedTier === btn.id && (
                        <div className="mt-2 text-[10px] font-mono text-[#34eb3d] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Active Simulation</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Reset to Production State */}
                <div className="pt-2 border-t border-white/[0.08] flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectSimulatedTier(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-white/10"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Reset Simulation (Clear Tier)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectSimulatedTier(null);
                      if (onSwitchAppEdition) onSwitchAppEdition("consumer");
                      onClose();
                    }}
                    className="py-2.5 px-4 rounded-xl bg-[#34eb3d]/15 hover:bg-[#34eb3d]/25 text-[#34eb3d] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#34eb3d]/30"
                  >
                    <span>Exit Dev Mode &amp; Go to Consumer UI</span>
                  </button>
                </div>
              </div>

              {/* Quota Exhaustion & Reset Testing */}
              <div className="rounded-2xl p-6 bg-[#0f121a] border border-white/10 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#34eb3d]" />
                    <span>Quota &amp; Credit Reset Simulator</span>
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Test how the app handles credit exhaustion (0 clips left) or reset both Free and Pro studio quotas back to full capacity.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onExhaustCredits}
                    className="py-3 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Simulate 0 Credits (Trigger Lockout)</span>
                  </button>

                  <button
                    type="button"
                    onClick={onResetCredits}
                    className="py-3 px-4 rounded-xl bg-[#34eb3d]/15 hover:bg-[#34eb3d]/25 border border-[#34eb3d]/40 text-[#34eb3d] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Restore Full Quota (2 Free / 3 Studio)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <footer className="px-6 py-3.5 border-t border-white/[0.08] flex items-center justify-between text-xs bg-[#0e1117]/80 flex-shrink-0">
          <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
            <span>Simulation Mode:</span>
            <span className={currentSimulatedTier ? "text-[#34eb3d] font-bold uppercase" : "text-zinc-500 uppercase"}>
              {currentSimulatedTier ? `SIMULATED ${currentSimulatedTier}` : "PRODUCTION ENGINE"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
