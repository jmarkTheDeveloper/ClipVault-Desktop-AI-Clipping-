
import React from 'react';
import { G } from '../utils/types';
// ─── SHARED UI ────────────────────────────────────────────────────────────────
export function GlassCard({ children, className = "", glow = false, onClick }: { children: React.ReactNode; className?: string; glow?: boolean; onClick?: React.MouseEventHandler<HTMLDivElement> }) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl backdrop-blur-xl ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)",
        border: `1px solid ${glow ? "rgba(0,230,118,0.35)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: glow
          ? "0 0 32px rgba(0,230,118,0.12), inset 0 1px 0 rgba(255,255,255,0.08)"
          : "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
      />
      {children}
    </div>
  );
}

export function GreenBtn({ children, onClick, className = "", size = "md", disabled = false }: {
  children: React.ReactNode; onClick?: () => void; className?: string;
  size?: "sm" | "md" | "lg"; disabled?: boolean;
}) {
  const pad = size === "lg" ? "px-7 py-3 text-sm" : size === "sm" ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative font-bold rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer ${pad} ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
      style={{
        background: "linear-gradient(135deg, #00e676 0%, #00b859 100%)",
        color: "#000",
        boxShadow: disabled ? "none" : "0 0 20px rgba(0,230,118,0.35), 0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      <span className="absolute inset-x-0 top-0 h-1/2 rounded-t-xl pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)" }} />
      <span className="relative flex items-center gap-1.5">{children}</span>
    </button>
  );
}

export function PropGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#2a2a2a" }}>{label}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function PropRow({ label, value, unit, onChange }: { label: string; value: string | number; unit: string; onChange?: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-8 flex-shrink-0" style={{ color: "#404040" }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="flex-1 rounded-lg px-2 py-1.5 text-xs text-white text-right outline-none transition-all font-mono"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(0,230,118,0.35)")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.06)")}
      />
      <span className="text-xs w-5 flex-shrink-0" style={{ color: "#303030" }}>{unit}</span>
    </div>
  );
}

export function SliderRow({ label, value, min = -100, max = 100, onChange }: {
  label: string; value: number; min?: number; max?: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs" style={{ color: "#5a5a5a" }}>{label}</span>
        <span className="text-white text-xs font-mono w-8 text-right">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer" style={{ accentColor: G }} />
    </div>
  );
}


