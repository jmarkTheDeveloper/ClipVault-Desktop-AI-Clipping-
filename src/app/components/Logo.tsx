import React from "react";

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="ClipVault AI Studio Logo"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "block",
        borderRadius: Math.max(4, Math.round(size * 0.22)),
        objectFit: "contain",
      }}
    />
  );
}
