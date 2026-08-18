import React from 'react';
import { SlidersHorizontal, FlipHorizontal, Bold, Italic, Music, Zap, Palette, Gauge } from 'lucide-react';
import { PropGroup, PropRow, SliderRow } from '../../../components/SharedUI';
import { useEditor } from '../hooks/EditorContext';
import { MEDIA_LIBRARY, GOOGLE_FONTS, fmt, G } from '../../../utils/types';
import type { VideoClip, TextClip, AudioClip } from '../../../utils/types';

export function PropertiesPanel() {
  const {
    activeRightTab,
    setActiveRightTab,
    selectedId,
    selectedType,
    currentState,
    updateVideoClip,
    updateTextClip,
    updateAudioClip,
  } = useEditor();

  const RIGHT_TABS = selectedType === 'video' ? ['Basic', 'Adjust', 'Speed', 'Color'] : ['Basic'];
  const panelBorder = 'rgba(255,255,255,0.08)';

  React.useEffect(() => {
    if (selectedType && selectedType !== 'video' && activeRightTab !== 'basic') {
      setActiveRightTab('basic');
    }
  }, [selectedType, activeRightTab, setActiveRightTab]);

  const selectedClip =
    currentState?.clips?.find((c: any) => c.id === selectedId) ||
    currentState?.audioClips?.find((c: any) => c.id === selectedId) ||
    currentState?.textClips?.find((c: any) => c.id === selectedId);

  return (
    <div
      className="w-[290px] flex-shrink-0 flex flex-col overflow-hidden z-10 select-none"
      style={{ background: "rgba(8,8,8,0.97)", borderLeft: `1px solid ${panelBorder}` }}
    >
      {/* Tab Bar - Always clickable */}
      <div
        className="flex overflow-x-auto scrollbar-hide flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        {RIGHT_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveRightTab(tab.toLowerCase())}
            className={`flex-1 px-3 py-3 text-[11px] font-bold border-b-2 transition-all duration-200 cursor-pointer hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95 ${
              activeRightTab === tab.toLowerCase()
                ? "text-[#00e676] border-[#00e676]"
                : "text-gray-400 border-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Panel Content */}
      {selectedId == null || !selectedClip ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#00e676]/10 border border-[#00e676]/20"
          >
            {activeRightTab === "basic" && <SlidersHorizontal className="w-5 h-5 text-[#00e676]" />}
            {activeRightTab === "adjust" && <Zap className="w-5 h-5 text-[#00e676]" />}
            {activeRightTab === "speed" && <Gauge className="w-5 h-5 text-[#00e676]" />}
            {activeRightTab === "color" && <Palette className="w-5 h-5 text-[#00e676]" />}
          </div>
          <div>
            <h4 className="text-xs font-bold text-white capitalize mb-1">{activeRightTab} Tab</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {activeRightTab === "basic" && "Controls position, scale, rotation, volume, and 9:16 vertical cropping."}
              {activeRightTab === "adjust" && "Controls brightness, contrast, exposure, sharpness, and vignette."}
              {activeRightTab === "speed" && "Controls slow-motion and speed-up playback rates (0.25x to 8x)."}
              {activeRightTab === "color" && "Color grading tab: controls saturation, warmth, and color temperature."}
            </p>
          </div>
          <p className="text-[10px] text-[#00e676] font-semibold bg-[#00e676]/10 px-3 py-1.5 rounded-full border border-[#00e676]/20">
            Select a clip on timeline to edit
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-5">
          {/* VIDEO CLIP PROPERTIES */}
          {selectedType === "video" && (() => {
            const vc = selectedClip as VideoClip;
            return (
              <>
                {activeRightTab === "basic" && (
                  <>
                    <PropGroup label="Transform">
                      <PropRow label="X" value={vc.x} unit="px" onChange={(v: string) => updateVideoClip(vc.id, { x: Number(v) })} />
                      <PropRow label="Y" value={vc.y} unit="px" onChange={(v: string) => updateVideoClip(vc.id, { y: Number(v) })} />
                      <PropRow label="ScaleX" value={vc.scaleX} unit="x" onChange={(v: string) => updateVideoClip(vc.id, { scaleX: Number(v) })} />
                      <PropRow label="ScaleY" value={vc.scaleY} unit="x" onChange={(v: string) => updateVideoClip(vc.id, { scaleY: Number(v) })} />
                      <PropRow label="Rot" value={vc.rotation} unit="deg" onChange={(v: string) => updateVideoClip(vc.id, { rotation: Number(v) })} />
                      <button
                        onClick={() => updateVideoClip(vc.id, { scaleX: 1.8, scaleY: 1.8, x: 0, y: 0 })}
                        className="w-full mt-2 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/20 hover:bg-[#00e676]/20"
                      >
                        9:16 Auto-Reframe (Vertical Short)
                      </button>
                    </PropGroup>
                    <PropGroup label="Opacity & Blend">
                      <SliderRow label="Opacity" value={vc.opacity} min={0} max={100} onChange={(v: number) => updateVideoClip(vc.id, { opacity: v })} />
                      <select
                        value={vc.blendMode}
                        onChange={e => updateVideoClip(vc.id, { blendMode: e.target.value })}
                        className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none mt-1"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        {["normal", "multiply", "screen", "overlay", "soft-light", "hard-light", "color-dodge", "darken", "lighten"].map(m => (
                          <option key={m} value={m} style={{ background: "#111" }}>
                            {m.charAt(0).toUpperCase() + m.slice(1).replace("-", " ")}
                          </option>
                        ))}
                      </select>
                    </PropGroup>
                    <PropGroup label="Flip">
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateVideoClip(vc.id, { flipH: !vc.flipH })}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs transition-all"
                          style={{
                            background: vc.flipH ? "rgba(0,230,118,0.1)" : "rgba(255,255,255,0.03)",
                            color: vc.flipH ? G : "#5a5a5a",
                            border: `1px solid ${vc.flipH ? "rgba(0,230,118,0.3)" : "rgba(255,255,255,0.06)"}`,
                          }}
                        >
                          <FlipHorizontal className="w-3.5 h-3.5" /> H-Flip
                        </button>
                        <button
                          onClick={() => updateVideoClip(vc.id, { flipV: !vc.flipV })}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs transition-all"
                          style={{
                            background: vc.flipV ? "rgba(0,230,118,0.1)" : "rgba(255,255,255,0.03)",
                            color: vc.flipV ? G : "#5a5a5a",
                            border: `1px solid ${vc.flipV ? "rgba(0,230,118,0.3)" : "rgba(255,255,255,0.06)"}`,
                          }}
                        >
                          <FlipHorizontal className="w-3.5 h-3.5 rotate-90" /> V-Flip
                        </button>
                      </div>
                    </PropGroup>
                    <PropGroup label="Volume">
                      <SliderRow
                        label="Volume"
                        value={(vc as any).volume ?? 100}
                        min={0}
                        max={200}
                        onChange={(v: number) => updateVideoClip(vc.id, { volume: v } as any)}
                      />
                    </PropGroup>
                  </>
                )}

                {activeRightTab === "adjust" && (
                  <>
                    <PropGroup label="Lighting Adjustments">
                      <SliderRow label="Brightness" value={vc.brightness || 0} min={-100} max={100} onChange={(v: number) => updateVideoClip(vc.id, { brightness: v })} />
                      <SliderRow label="Contrast" value={vc.contrast || 0} min={-100} max={100} onChange={(v: number) => updateVideoClip(vc.id, { contrast: v })} />
                      <SliderRow label="Exposure" value={vc.exposure || 0} min={-100} max={100} onChange={(v: number) => updateVideoClip(vc.id, { exposure: v })} />
                    </PropGroup>
                    <PropGroup label="Sharpen & Vignette">
                      <SliderRow label="Sharpness" value={vc.sharpness || 0} min={0} max={100} onChange={(v: number) => updateVideoClip(vc.id, { sharpness: v })} />
                      <SliderRow label="Vignette" value={vc.vignette || 0} min={0} max={100} onChange={(v: number) => updateVideoClip(vc.id, { vignette: v })} />
                    </PropGroup>
                  </>
                )}

                {activeRightTab === "speed" && (
                  <div className="space-y-5">
                    <PropGroup label="Playback Speed">
                      <div className="grid grid-cols-4 gap-1.5 mb-3">
                        {[0.25, 0.5, 1, 1.5, 2, 3, 4, 8].map(s => {
                          const origDur = MEDIA_LIBRARY.find((m: any) => m.id === vc.mediaId)?.duration || vc.duration || 10;
                          return (
                            <button
                              key={s}
                              onClick={() => updateVideoClip(vc.id, { speed: s, duration: origDur / s })}
                              className="py-2 rounded-lg text-[10px] font-semibold border transition-all"
                              style={
                                Math.abs(vc.speed - s) < 0.01
                                  ? { background: "rgba(0,230,118,0.1)", borderColor: "rgba(0,230,118,0.4)", color: G }
                                  : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)", color: "#888" }
                              }
                            >
                              {s}x
                            </button>
                          );
                        })}
                      </div>
                      <SliderRow
                        label="Custom Speed"
                        value={Math.round((vc.speed || 1) * 100)}
                        min={10}
                        max={500}
                        onChange={(v: number) => {
                          const speed = v / 100;
                          const origDur = MEDIA_LIBRARY.find((m: any) => m.id === vc.mediaId)?.duration || vc.duration || 10;
                          updateVideoClip(vc.id, { speed, duration: origDur / speed });
                        }}
                      />
                    </PropGroup>
                  </div>
                )}

                {activeRightTab === "color" && (
                  <div className="space-y-4">
                    <PropGroup label="Color Grading & Temperature">
                      <SliderRow label="Saturation" value={vc.saturation || 0} min={-100} max={100} onChange={(v: number) => updateVideoClip(vc.id, { saturation: v })} />
                      <SliderRow label="Temperature (Warmth)" value={vc.temperature || 0} min={-100} max={100} onChange={(v: number) => updateVideoClip(vc.id, { temperature: v })} />
                      <SliderRow label="Tint" value={vc.tint || 0} min={-100} max={100} onChange={(v: number) => updateVideoClip(vc.id, { tint: v })} />
                    </PropGroup>
                  </div>
                )}
              </>
            );
          })()}

          {/* TEXT CLIP PROPERTIES */}
          {selectedType === "text" && (() => {
            const tc = selectedClip as TextClip;
            return (
              <>
                <PropGroup label="Content">
                  <textarea
                    value={tc.text}
                    onChange={e => updateTextClip(tc.id, { text: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none resize-none transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  />
                </PropGroup>
                <PropGroup label="Font & Style">
                  <select
                    className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none mb-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    value={tc.fontFamily || "Inter"}
                    onChange={e => updateTextClip(tc.id, { fontFamily: e.target.value })}
                  >
                    {GOOGLE_FONTS.map(f => (
                      <option key={f} value={f} style={{ color: "#000" }}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <PropRow label="Size" value={tc.fontSize} unit="px" onChange={(v: string) => updateTextClip(tc.id, { fontSize: Number(v) })} />
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs w-8 flex-shrink-0 text-gray-400">Color</span>
                    <input
                      type="color"
                      value={tc.color}
                      onChange={e => updateTextClip(tc.id, { color: e.target.value })}
                      className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-xs font-mono text-gray-300">{tc.color}</span>
                  </div>
                </PropGroup>
              </>
            );
          })()}

          {/* AUDIO CLIP PROPERTIES */}
          {selectedType === "audio" && (() => {
            const ac = selectedClip as AudioClip;
            return (
              <>
                <PropGroup label="Track Info">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#00e676]/5 border border-[#00e676]/15">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#00e676]/10">
                      <Music className="w-4 h-4 text-[#00e676]" />
                    </div>
                    <div>
                      <p className="text-white text-xs font-semibold">{ac.name}</p>
                      <p className="text-[10px] text-gray-400">{ac.artist} · {fmt(ac.duration)}</p>
                    </div>
                  </div>
                </PropGroup>
                <PropGroup label="Volume">
                  <SliderRow label="Volume" value={ac.volume} min={0} max={200} onChange={(v: number) => updateAudioClip(ac.id, { volume: v })} />
                </PropGroup>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
