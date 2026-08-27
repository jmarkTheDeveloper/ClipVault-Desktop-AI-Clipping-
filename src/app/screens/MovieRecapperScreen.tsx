
import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Film, Link2, Mic, Music2, Loader2, Check, ChevronDown, ChevronUp, Cpu, CheckCircle2 } from "lucide-react";

interface Props { onBack: () => void; }

const DEFAULT_ENGINE = { id: "higgsfield", name: "Higgsfield AI", provider: "Higgsfield", desc: "Best for Cinematic Camera Motion & Video" };

const AI_ENGINES = [
  { id: "claude_fable", name: "Claude Fable", provider: "Anthropic", desc: "Best for Viral Hooks & Scriptwriting" },
  { id: "higgsfield", name: "Higgsfield AI", provider: "Higgsfield", desc: "Best for Cinematic Camera Motion & Video" },
  { id: "seedance", name: "SeeDance AI", provider: "ByteDance", desc: "Best for Music Beat Sync & Dance Clips" },
  { id: "openai_sora", name: "OpenAI Sora / GPT-4o", provider: "OpenAI", desc: "General Video & Subtitle Model" },
];

// ── Data ──────────────────────────────────────────────────────────────────────
const NARRATOR_VOICES = [
  { id: "en-US-GuyNeural",         label: "Guy",         desc: "Deep, gravely storytelling voice — matches TikTok recap channels" },
  { id: "en-US-ChristopherNeural", label: "Christopher", desc: "Deep, smooth cinematic voice" },
  { id: "en-US-AndrewNeural",      label: "Andrew",      desc: "Warm, friendly male voice" },
  { id: "en-US-AvaNeural",         label: "Ava",         desc: "Expressive, professional female voice" },
  { id: "en-GB-SoniaNeural",       label: "Sonia",       desc: "British female narrator — authoritative" },
];

const VOICE_PITCHES = [
  { id: "+15Hz",  label: "High Pitch (+15 Hz)", desc: "Energetic / fast narrators" },
  { id: "-20Hz",  label: "Cinematic (-20 Hz)",  desc: "Deep, rich voice — horror/suspense" },
  { id: "-40Hz",  label: "Ultra Deep (-40 Hz)", desc: "Very deep, dramatic voice" },
  { id: "+0Hz",   label: "Natural (+0 Hz)",     desc: "Standard pitch" },
];

const SPEAKING_SPEEDS = [
  { id: "+20%",  label: "Fast (+20%)",      desc: "Energetic TikTok speed" },
  { id: "+10%",  label: "Slightly Fast",   desc: "+10%" },
  { id: "+0%",   label: "Natural",         desc: "Standard speed" },
  { id: "-5%",   label: "Slow / Dramatic", desc: "-5% — thoughtful pacing" },
];

const LAYOUTS = [
  { id: "vertical_crop",    label: "Vertical Crop (9:16)",        desc: "Fills the entire vertical screen" },
  { id: "landscape_fit",    label: "Landscape Fit (9:16)",        desc: "Original width with black bars" },
  { id: "native_widescreen",label: "Native Widescreen (16:9)",    desc: "Best for Facebook / YouTube long-form" },
  { id: "landscape_blur",   label: "Blurred Background Fit (9:16)", desc: "Full width with blurred background" },
];

const SUB_LAYOUTS = [
  { id: "standard",    label: "Standard",                   desc: "No extra overlay" },
  { id: "gameplay",    label: "Satisfying / Gameplay Split", desc: "Adds a satisfying background to the bottom half" },
];

const CAPTION_STYLES = [
  { id: "none",           label: "None",               color: "#555" },
  { id: "tiktok_recap",   label: "Social Recap",       color: "#ffffff" },
  { id: "clean_white",    label: "Clean White",         color: "#e0e0e0" },
  { id: "capcut_white",   label: "Viral White",         color: "#f5f5f5" },
  { id: "capcut_yellow",  label: "Viral Yellow",        color: "#ffd600" },
  { id: "bright_yellow",  label: "Bright Yellow",       color: "#ffee00" },
  { id: "neon_cyan",      label: "Neon Cyan",           color: "#00e5ff" },
  { id: "hot_pink",       label: "Hot Pink",            color: "#f50057" },
  { id: "lime_green",     label: "Lime Green",          color: "#76ff03" },
  { id: "orange_fire",    label: "Orange Fire",         color: "#ff6d00" },
  { id: "electric_blue",  label: "Electric Blue",       color: "#2979ff" },
  { id: "purple_pop",     label: "Purple Pop",          color: "#d500f9" },
  { id: "capcut_banner",  label: "Viral Banner",        color: "#bdbdbd" },
  { id: "tiktok_banner",  label: "Social Banner",       color: "#ff1744" },
  { id: "cinematic_sub",  label: "Cinematic Subtitles", color: "#eeeeee" },
  { id: "sigma_pink",     label: "Sigma Pink",          color: "#e91e8c" },
];

const DURATION_MODES = [
  { id: "auto",   label: "Auto-Detect Highlights",  desc: "AI picks the best scenes" },
  { id: "full",   label: "Entire Video",             desc: "Process the full video as one recap" },
  { id: "custom", label: "Customize Range",          desc: "Manually set start & end timestamps" },
];

const COPYRIGHT_OPTIONS = [
  { id: "standard", label: "Standard",                 desc: "No extra bypass — includes 12% original audio" },
  { id: "maximum",  label: "Maximum Copyright Bypass", desc: "1.06× speed + horizontal mirror (Recommended for FB/TikTok)" },
];

const ACCENT = "#a855f7"; // purple for movie mode

// ── Component ─────────────────────────────────────────────────────────────────
export function MovieRecapperScreen({ onBack }: Props) {
  const [ytUrl, setYtUrl]               = useState("");
  const [voice, setVoice]               = useState("en-US-GuyNeural");
  const [pitch, setPitch]               = useState("+0Hz");
  const [speed, setSpeed]               = useState("+0%");

  // AI Engine & BYOK (Bring Your Own Key) State
  const [selectedEngine, setSelectedEngine] = useState("higgsfield");
  const [byokMode, setByokMode] = useState<"developer" | "custom">("developer");
  const [showKeySettings, setShowKeySettings] = useState(false);

  // BYOK Multi-Key State
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem("clipvault_anthropic_key") || "");
  const [higgsfieldKey, setHiggsfieldKey] = useState(() => localStorage.getItem("clipvault_higgsfield_key") || "");
  const [seeDanceKey, setSeeDanceKey] = useState(() => localStorage.getItem("clipvault_seedance_key") || "");
  const [openAiKey, setOpenAiKey] = useState(() => localStorage.getItem("clipvault_openai_key") || "");

  useEffect(() => {
    try {
      localStorage.setItem("clipvault_anthropic_key", anthropicKey);
      localStorage.setItem("clipvault_higgsfield_key", higgsfieldKey);
      localStorage.setItem("clipvault_seedance_key", seeDanceKey);
      localStorage.setItem("clipvault_openai_key", openAiKey);
    } catch(e) {}
  }, [anthropicKey, higgsfieldKey, seeDanceKey, openAiKey]);
  const [addMusic, setAddMusic]         = useState(true);
  const [layout, setLayout]             = useState("landscape_fit");
  const [subLayout, setSubLayout]       = useState("standard");
  const [quality, setQuality]           = useState("720p");
  const [captionStyle, setCaptionStyle] = useState("none");
  const [durationMode, setDurationMode] = useState("auto");
  const [numClips, setNumClips]         = useState(2);
  const [targetSec, setTargetSec]       = useState(30);
  const [topic, setTopic]               = useState("");
  const [copyright, setCopyright]       = useState("standard");
  const [startTs, setStartTs]           = useState("");
  const [endTs, setEndTs]               = useState("");
  const [running, setRunning]           = useState(false);
  const [progress, setProgress]         = useState(0);
  const [done, setDone]                 = useState(false);
  const [resultMsg, setResultMsg]       = useState("");
  const intervalRef                     = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const SOURCE_CHANNELS = [
    { label: "Fandango Movieclips",  url: "https://www.youtube.com/@movieclips" },
    { label: "Binge Society",        url: "https://www.youtube.com/@BingeSociety" },
    { label: "Screen Bites",         url: "https://www.youtube.com/@ScreenBites" },
  ];

  const runRecapper = async () => {
    if (!ytUrl.trim()) return alert("Please enter a YouTube URL first.");
    setRunning(true); setProgress(0); setDone(false); setResultMsg("Initializing Movie Recapper...");

    try {
      const payload = {
        url: ytUrl,
        mode: "movie_recapper", 
        tts_voice: voice,
        tts_pitch: pitch,
        tts_rate: speed,
        add_bg_music: addMusic,
        layout: layout,
        sub_layout: subLayout,
        quality: quality,
        caption_style: captionStyle,
        duration_mode: durationMode,
        num_clips: numClips,
        target_duration: targetSec,
        topic: topic || undefined,
        copyright_bypass: copyright,
        start_ts: durationMode === "custom" ? startTs : undefined,
        end_ts: durationMode === "custom" ? endTs : undefined,
      };

      const res = await fetch("http://localhost:8000/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer dev-token"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to start recapper task");

      const data = await res.json();
      const taskId = data.task_id;

      intervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`http://localhost:8000/api/status/${taskId}`, {
            headers: { "Authorization": "Bearer dev-token" }
          });
          const statusData = await statusRes.json();

          if (statusData.message) setResultMsg(statusData.message);

          if (statusData.status === "completed") {
            clearInterval(intervalRef.current);
            setProgress(100);
            setDone(true);
            setRunning(false);
            setResultMsg("Done! Movie Recap Generated.");
          } else if (statusData.status === "failed") {
            clearInterval(intervalRef.current);
            setRunning(false);
            setResultMsg(`Error: ${statusData.error}`);
          } else {
            setProgress(p => Math.min(95, p + Math.random() * 5));
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000);

    } catch (error: any) {
      setRunning(false);
      setResultMsg(`Error: ${error.message}`);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col font-['Inter',sans-serif] overflow-hidden" style={{ background: "#050505" }}>
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(168,85,247,0.07) 0%, transparent 70%)" }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 h-16 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors hover:text-white cursor-pointer" style={{ color: "#5a5a5a" }}>
            <ArrowLeft className="w-4 h-4" />Back
          </button>
          <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.07)" }} />
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)" }}>
              <Film className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-bold">AI Movie Recapper</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.1)", color: ACCENT, border: "1px solid rgba(168,85,247,0.2)" }}>🍿 AI Narrated</span>
          </div>
        </div>

        {/* AI ENGINE & BYOK KEY SELECTOR BADGE */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowKeySettings(!showKeySettings)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-[#a855f7]/30 text-xs text-white transition-all cursor-pointer shadow-md"
          >
            <Cpu className="w-3.5 h-3.5 text-[#a855f7]" />
            <span className="font-bold">Engine:</span>
            <span className="text-[#a855f7] font-semibold">
              {(AI_ENGINES.find(e => e.id === selectedEngine) ?? DEFAULT_ENGINE).name} ({byokMode === "developer" ? "Demo Key" : "BYOK Key"})
            </span>
          </button>
        </div>
      </header>

      {/* ── BYOK KEY & ENGINE SETTINGS DROPDOWN ── */}
      {showKeySettings && (
        <div className="absolute top-16 right-6 z-50 w-[420px] p-5 rounded-2xl bg-[#0d0d0d] border border-white/15 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-bold text-xs flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#a855f7]" /> AI Video Engine & BYOK Settings
            </h4>
            <button onClick={() => setShowKeySettings(false)} className="text-xs text-gray-400 hover:text-white">✕</button>
          </div>

          {/* AI Engine Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active AI Model Engine</label>
            <div className="grid grid-cols-2 gap-2">
              {AI_ENGINES.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEngine(e.id)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    selectedEngine === e.id
                      ? "bg-[#a855f7]/10 border-[#a855f7] text-[#a855f7]"
                      : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <p className="font-bold text-xs">{e.name}</p>
                  <p className="text-[9px] opacity-70 truncate">{e.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Key Mode Selection */}
          <div className="flex rounded-xl p-1 bg-black/60 border border-white/10 text-xs font-bold">
            <button
              onClick={() => setByokMode("developer")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                byokMode === "developer" ? "bg-[#a855f7] text-white shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              Developer Key (Demo)
            </button>
            <button
              onClick={() => setByokMode("custom")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                byokMode === "custom" ? "bg-[#a855f7] text-white shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              Custom Key (BYOK)
            </button>
          </div>

          {byokMode === "developer" ? (
            <div className="p-3 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/20 text-xs text-[#a855f7] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Developer Master API Key Active (`sk-clipvault-demo-key`). Ready out of the box!</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 scrollbar-hide">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 font-bold">🧠 Anthropic API Key (Claude Fable)</span>
                  <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-[#a855f7] hover:underline">Get Key ↗</a>
                </div>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full rounded-xl px-3 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#a855f7]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 font-bold">🎥 Higgsfield AI Key</span>
                  <a href="https://higgsfield.ai" target="_blank" rel="noreferrer" className="text-[#a855f7] hover:underline">Get Key ↗</a>
                </div>
                <input
                  type="password"
                  value={higgsfieldKey}
                  onChange={(e) => setHiggsfieldKey(e.target.value)}
                  placeholder="hg-live-..."
                  className="w-full rounded-xl px-3 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#a855f7]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 font-bold">⚡ SeeDance AI Key (ByteDance)</span>
                  <a href="https://seedance.ai" target="_blank" rel="noreferrer" className="text-[#a855f7] hover:underline">Get Key ↗</a>
                </div>
                <input
                  type="password"
                  value={seeDanceKey}
                  onChange={(e) => setSeeDanceKey(e.target.value)}
                  placeholder="sd-prod-..."
                  className="w-full rounded-xl px-3 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#a855f7]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 font-bold">🤖 OpenAI Sora / GPT-4o Key</span>
                  <a href="https://platform.openai.com" target="_blank" rel="noreferrer" className="text-[#a855f7] hover:underline">Get Key ↗</a>
                </div>
                <input
                  type="password"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full rounded-xl px-3 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#a855f7]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* ── Left Form ── */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-10 py-8 space-y-8 max-w-3xl">

          {/* Source hint */}
          <div className="rounded-xl p-4" style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.15)" }}>
            <p className="text-xs font-bold mb-2" style={{ color: ACCENT }}>💡 Need Movie Clips?</p>
            <div className="flex flex-wrap gap-2">
              {SOURCE_CHANNELS.map(c => (
                <a key={c.label} href={c.url} target="_blank" rel="noreferrer" className="text-[10px] px-2.5 py-1 rounded-lg transition-colors hover:text-white" style={{ background: "rgba(255,255,255,0.05)", color: "#777", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {c.label} ↗
                </a>
              ))}
            </div>
          </div>

          {/* YouTube URL */}
          <Section title="YouTube Source" accent={ACCENT}>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(168,85,247,0.2)` }}>
              <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
              <input value={ytUrl} onChange={e => setYtUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder-[#444]" />
            </div>
          </Section>

          {/* AI Voice */}
          <Section title="AI Narrator Voice" accent={ACCENT}>
            <div className="space-y-2">
              {NARRATOR_VOICES.map((v, i) => (
                <button key={v.id} onClick={() => setVoice(v.id)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all"
                  style={{ background: voice === v.id ? "rgba(255,255,255,0.04)" : "transparent", border: `1px solid ${voice === v.id ? ACCENT : "rgba(255,255,255,0.06)"}` }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: voice === v.id ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.04)" }}>
                    <Mic className="w-3.5 h-3.5" style={{ color: voice === v.id ? ACCENT : "#555" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">{i + 1}. {v.label}</p>
                    <p className="text-[10px] truncate" style={{ color: "#555" }}>{v.desc}</p>
                  </div>
                  {voice === v.id && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ACCENT }} />}
                </button>
              ))}
            </div>
          </Section>

          {/* Pitch + Speed */}
          <div className="grid grid-cols-2 gap-6">
            <Section title="Voice Pitch" accent={ACCENT}>
              <div className="space-y-2">
                {VOICE_PITCHES.map((p, i) => (
                  <SmallOptionRow key={p.id} index={i+1} selected={pitch === p.id} label={p.label} desc={p.desc} onClick={() => setPitch(p.id)} accent={ACCENT} />
                ))}
              </div>
            </Section>
            <Section title="Speaking Speed" accent={ACCENT}>
              <div className="space-y-2">
                {SPEAKING_SPEEDS.map((s, i) => (
                  <SmallOptionRow key={s.id} index={i+1} selected={speed === s.id} label={s.label} desc={s.desc} onClick={() => setSpeed(s.id)} accent={ACCENT} />
                ))}
              </div>
            </Section>
          </div>

          {/* Music toggle */}
          <Section title="Background Music" accent={ACCENT}>
            <Toggle label="Add dramatic background ambient music" checked={addMusic} onChange={setAddMusic} accent={ACCENT} />
          </Section>

          {/* Layout */}
          <Section title="Video Layout" accent={ACCENT}>
            <div className="space-y-2 mb-3">
              {LAYOUTS.map((l, i) => (
                <OptionRow key={l.id} index={i+1} selected={layout === l.id} label={l.label} desc={l.desc} onClick={() => setLayout(l.id)} accent={ACCENT} />
              ))}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#444" }}>Sub-Layout</p>
            <div className="space-y-2">
              {SUB_LAYOUTS.map((s, i) => (
                <OptionRow key={s.id} index={i+1} selected={subLayout === s.id} label={s.label} desc={s.desc} onClick={() => setSubLayout(s.id)} accent={ACCENT} />
              ))}
            </div>
          </Section>

          {/* Quality */}
          <Section title="Download Quality" accent={ACCENT}>
            <div className="grid grid-cols-2 gap-3">
              {[{ id: "720p", label: "720p — Speed", desc: "5–10× faster (Recommended)" }, { id: "1080p", label: "1080p — HD", desc: "Slower but premium" }].map(q => (
                <OptionCard key={q.id} selected={quality === q.id} onClick={() => setQuality(q.id)} accent={ACCENT}>
                  <span className="text-white text-xs font-semibold">{q.label}</span>
                  <span className="text-[10px] mt-0.5" style={{ color: "#555" }}>{q.desc}</span>
                </OptionCard>
              ))}
            </div>
          </Section>

          {/* Captions */}
          <Section title="Caption Style" accent={ACCENT}>
            <div className="grid grid-cols-4 gap-2">
              {CAPTION_STYLES.map((cs, i) => (
                <button key={cs.id} onClick={() => setCaptionStyle(cs.id)}
                  className="relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-center transition-all"
                  style={{ background: captionStyle === cs.id ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.025)", border: `1px solid ${captionStyle === cs.id ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.06)"}` }}>
                  <span className="text-xs font-bold" style={{ color: cs.color, textShadow: `0 0 8px ${cs.color}40` }}>{i + 1}</span>
                  <span className="text-[9px] leading-tight" style={{ color: captionStyle === cs.id ? "#ddd" : "#555" }}>{cs.label}</span>
                  {captionStyle === cs.id && <Check className="absolute top-1.5 right-1.5 w-2.5 h-2.5" style={{ color: ACCENT }} />}
                </button>
              ))}
            </div>
          </Section>

          {/* Duration */}
          <Section title="Clip Duration" accent={ACCENT}>
            <div className="space-y-2 mb-4">
              {DURATION_MODES.map((d, i) => (
                <OptionRow key={d.id} index={i+1} selected={durationMode === d.id} label={d.label} desc={d.desc} onClick={() => setDurationMode(d.id)} accent={ACCENT} />
              ))}
            </div>
            {durationMode === "auto" && (
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Number of clips">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setNumClips(n => Math.max(1, n - 1))} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" style={{ border: "1px solid rgba(255,255,255,0.08)" }}><ChevronDown className="w-3.5 h-3.5 text-white" /></button>
                    <span className="text-white font-bold text-base min-w-[2ch] text-center">{numClips}</span>
                    <button onClick={() => setNumClips(n => Math.min(20, n + 1))} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" style={{ border: "1px solid rgba(255,255,255,0.08)" }}><ChevronUp className="w-3.5 h-3.5 text-white" /></button>
                  </div>
                </FormField>
                <FormField label="Target duration (sec)">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTargetSec(n => Math.max(10, n - 5))} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" style={{ border: "1px solid rgba(255,255,255,0.08)" }}><ChevronDown className="w-3.5 h-3.5 text-white" /></button>
                    <span className="text-white font-bold text-base min-w-[3ch] text-center">{targetSec}</span>
                    <button onClick={() => setTargetSec(n => Math.min(300, n + 5))} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" style={{ border: "1px solid rgba(255,255,255,0.08)" }}><ChevronUp className="w-3.5 h-3.5 text-white" /></button>
                  </div>
                </FormField>
                <FormField label="Topic keyword (optional)">
                  <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. fight scene" className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </FormField>
              </div>
            )}
            {durationMode === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Start Timestamp"><input value={startTs} onChange={e => setStartTs(e.target.value)} placeholder="0:00" className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} /></FormField>
                <FormField label="End Timestamp"><input value={endTs} onChange={e => setEndTs(e.target.value)} placeholder="1:30" className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} /></FormField>
              </div>
            )}
          </Section>

          {/* Copyright */}
          <Section title="Copyright Bypass" accent={ACCENT}>
            <div className="space-y-2">
              {COPYRIGHT_OPTIONS.map((c, i) => (
                <OptionRow key={c.id} index={i+1} selected={copyright === c.id} label={c.label} desc={c.desc} onClick={() => setCopyright(c.id)} accent={ACCENT} />
              ))}
            </div>
          </Section>
        </div>

        {/* ── Right Panel ── */}
        <aside className="w-80 flex-shrink-0 flex flex-col p-6 gap-3" style={{ background: "rgba(8,8,8,0.97)", borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
          <h3 className="text-white font-bold text-sm mb-1">Settings Summary</h3>
          <SummaryItem label="Voice" value={NARRATOR_VOICES.find(v => v.id === voice)?.label ?? voice} />
          <SummaryItem label="Pitch" value={pitch} />
          <SummaryItem label="Speed" value={speed} />
          <SummaryItem label="Music" value={addMusic ? "Enabled" : "Off"} />
          <SummaryItem label="Layout" value={LAYOUTS.find(l => l.id === layout)?.label ?? layout} />
          <SummaryItem label="Quality" value={quality} />
          <SummaryItem label="Captions" value={CAPTION_STYLES.find(c => c.id === captionStyle)?.label ?? captionStyle} />
          <SummaryItem label="Mode" value={DURATION_MODES.find(d => d.id === durationMode)?.label ?? durationMode} />
          {durationMode === "auto" && <><SummaryItem label="Clips" value={String(numClips)} /><SummaryItem label="Target Dur." value={`${targetSec}s`} /></>}
          <SummaryItem label="Copyright" value={copyright === "maximum" ? "Max Bypass" : "Standard"} />

          <div className="flex-1" />

          {running && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.15)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: ACCENT }}>{done ? "Complete!" : "Processing..."}</span>
                <span className="text-xs font-mono" style={{ color: "#888" }}>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${ACCENT}, #7c3aed)` }} />
              </div>
              {done && resultMsg && <p className="text-[10px]" style={{ color: "#777" }}>{resultMsg}</p>}
            </div>
          )}

          <button onClick={runRecapper} disabled={running && !done}
            className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{ background: running && !done ? "rgba(168,85,247,0.3)" : "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff", cursor: running && !done ? "not-allowed" : "pointer", boxShadow: "0 0 30px rgba(168,85,247,0.2)" }}>
            {running && !done ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
            {running && !done ? "Processing..." : done ? "Run Again" : "Run Movie Recapper"}
          </button>
        </aside>

        {/* ── 9:16 Phone Device Preview ── */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-8 bg-[#050505] min-w-[380px]">
          {/* Phone Device Frame */}
          <div className="relative w-[320px] h-[600px] rounded-[48px] bg-[#121212] p-3 border-[4px] border-[#252525] shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col">
            {/* Speaker Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#080808] rounded-full z-30 flex items-center justify-center">
              <div className="w-10 h-1 bg-[#1a1a1a] rounded-full" />
            </div>

            {/* Screen Content */}
            <div className="relative w-full h-full rounded-[38px] overflow-hidden bg-black flex flex-col">
              <video
                src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                autoPlay
                loop
                muted
                controls
                className="w-full h-full object-cover"
              />

              {/* Dynamic Caption Overlay */}
              <div className="absolute bottom-16 left-4 right-4 text-center pointer-events-none z-20">
                <span className="px-3 py-1.5 rounded-xl font-bold text-xs bg-black/80 text-purple-400 border border-purple-500/40 shadow-lg inline-block">
                  🍿 AI Movie Recap Scene #1
                </span>
              </div>
            </div>
          </div>

          {/* Quick Generated Scene Chips */}
          <div className="flex items-center gap-2 mt-4">
            <button className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#a855f7] text-white shadow-md cursor-pointer">
              🎬 Scene #1
            </button>
            <button className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 cursor-pointer">
              🎬 Scene #2
            </button>
            <button className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 cursor-pointer">
              🎬 Scene #3
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────
function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: accent }}>{title}</h3>
      {children}
    </div>
  );
}

function OptionCard({ selected, onClick, accent, children }: { selected: boolean; onClick: () => void; accent: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="relative flex flex-col text-left gap-1 p-3.5 rounded-xl transition-all"
      style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${selected ? accent : "rgba(255,255,255,0.07)"}`, boxShadow: selected ? `0 0 16px ${accent}20` : "none" }}>
      {selected && <Check className="absolute top-2.5 right-2.5 w-3 h-3" style={{ color: accent }} />}
      {children}
    </button>
  );
}

function OptionRow({ index, selected, label, desc, onClick, accent }: { index: number; selected: boolean; label: string; desc: string; onClick: () => void; accent: string }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all"
      style={{ background: selected ? "rgba(255,255,255,0.03)" : "transparent", border: `1px solid ${selected ? accent : "rgba(255,255,255,0.06)"}` }}>
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: selected ? accent : "rgba(255,255,255,0.06)", color: selected ? "#fff" : "#555" }}>{index}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white">{label}</p>
        <p className="text-[10px] truncate" style={{ color: "#555" }}>{desc}</p>
      </div>
      {selected && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent }} />}
    </button>
  );
}

function SmallOptionRow({ index, selected, label, desc, onClick, accent }: { index: number; selected: boolean; label: string; desc: string; onClick: () => void; accent: string }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all"
      style={{ border: `1px solid ${selected ? accent : "rgba(255,255,255,0.06)"}` }}>
      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: selected ? accent : "rgba(255,255,255,0.06)", color: selected ? "#fff" : "#555" }}>{index}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-white leading-tight">{label}</p>
        <p className="text-[9px] truncate" style={{ color: "#555" }}>{desc}</p>
      </div>
    </button>
  );
}

function Toggle({ label, checked, onChange, accent }: { label: string; checked: boolean; onChange: (v: boolean) => void; accent: string }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-xs text-white">{label}</span>
      <button onClick={() => onChange(!checked)} className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
        style={{ background: checked ? accent : "rgba(255,255,255,0.1)" }}>
        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: checked ? "translateX(20px)" : "none" }} />
      </button>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#555" }}>{label}</label>
      {children}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px]" style={{ color: "#555" }}>{label}</span>
      <span className="text-[11px] font-semibold text-white text-right max-w-[55%] truncate">{value}</span>
    </div>
  );
}
