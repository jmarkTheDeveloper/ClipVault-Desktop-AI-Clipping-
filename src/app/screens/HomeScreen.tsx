import React, { useState, useRef, useEffect } from "react";
import {
  Home, Search, Bell, Plus, Play, Folder, Star,
  Clock, Trash2, Upload, Grid, List, Crown, ChevronDown, LayoutTemplate,
  Cloud, Users, Wand2, Monitor, RefreshCw, HardDrive, CheckCircle2,
  Copy, UserPlus, Calendar, Target, Edit3, X, Check, Activity, Video,
  CreditCard, ShieldCheck, Sparkles, Layers, Key, Bot, Disc, Radio, FileText, Loader2, StopCircle, AlertTriangle, RotateCcw, Settings, Cpu
} from "lucide-react";
import { GreenBtn } from '../components/SharedUI';
import { Logo } from '../components/Logo';
import { G, MEDIA_LIBRARY, saveLibraries } from '../utils/types';

const INITIAL_PROJECTS = [
  { id: 1, title: "Summer Vlog 2024", duration: "4:32", modified: "2h ago", thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=225&fit=crop&auto=format", ratio: "16:9", isFavorite: true },
  { id: 2, title: "Product Launch Reel", duration: "0:58", modified: "Yesterday", thumb: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=225&fit=crop&auto=format", ratio: "9:16", isFavorite: false },
];

const DEFAULT_CAMPAIGN = [
  {
    id: 1,
    title: "Default Test Campaign",
    platform: "TikTok (9:16)",
    status: "Active",
    dueDate: "2026-08-15",
    assignee: "Jamie Dela Cruz (Me)",
    videosCount: 1
  }
];

const INITIAL_TEAMS = [
  { id: 1, name: "Primary Team Workspace", code: "TEAM-8821" }
];

const NAV_ITEMS = [
  { id: "home", icon: Home, label: "Home" },
  { id: "templates", icon: LayoutTemplate, label: "Templates" },
  { id: "myspace", icon: Folder, label: "My Space" },
  { id: "cloud", icon: Cloud, label: "Cloud" },
  { id: "team", icon: Users, label: "Team" },
];

export function HomeScreen({ onOpenEditor, onOpenAiChat }: { onOpenEditor: () => void; onOpenAiChat?: () => void }) {
  const [activeNav, setActiveNav] = useState("home");
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [trash, setTrash] = useState<any[]>([]);

  // Move to Trash (Soft Delete)
  const handleMoveToTrash = (p: any) => {
    setProjects(prev => prev.filter(item => item.id !== p.id));
    setTrash(prev => [...prev, { ...p, deletedAt: new Date().toLocaleDateString() }]);
  };

  // Restore from Trash
  const handleRestoreFromTrash = (p: any) => {
    setTrash(prev => prev.filter(item => item.id !== p.id));
    setProjects(prev => [...prev, p]);
  };

  // Danger Zone Permanent Delete Modal State
  const [showDangerDeleteModal, setShowDangerDeleteModal] = useState(false);
  const [deletingProject, setDeletingProject] = useState<any | null>(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState("");

  const requiredDeletePhrase = deletingProject
    ? `I want to delete "${deletingProject.title}" and I understand this video cannot be recovered.`
    : "";

  const handleConfirmPermanentDelete = () => {
    if (!deletingProject || confirmDeleteInput.trim() !== requiredDeletePhrase.trim()) return;
    setTrash(prev => prev.filter(p => p.id !== deletingProject.id));
    setShowDangerDeleteModal(false);
    setDeletingProject(null);
    setConfirmDeleteInput("");
  };

  // User Account ID
  const currentUserAccountId = "CV-9824-JD";
  const [accountCopied, setAccountCopied] = useState(false);

  // Teams State (Up to 5 Free Teams)
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [activeTeamId, setActiveTeamId] = useState(1);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  // Paywall Subscription Modal State
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("account");

  // Global Settings State
  const [defaultRes, setDefaultRes] = useState(() => localStorage.getItem("clipvault_def_res") || "1080p");
  const [defaultFps, setDefaultFps] = useState(() => parseInt(localStorage.getItem("clipvault_def_fps") || "60", 10));

  const handleResChange = (e: any) => {
    setDefaultRes(e.target.value);
    localStorage.setItem("clipvault_def_res", e.target.value);
  };

  const handleFpsChange = (val: number) => {
    setDefaultFps(val);
    localStorage.setItem("clipvault_def_fps", val.toString());
  };

  // Team Members & Account ID Link State
  const [teamMembers, setTeamMembers] = useState<any[]>([
    { id: 1, name: "Jamie Dela Cruz", accountId: currentUserAccountId, role: "Owner", avatar: "JD", status: "Online" }
  ]);
  const [inputAccountId, setInputAccountId] = useState("");

  // Campaign State
  const [campaigns, setCampaigns] = useState(DEFAULT_CAMPAIGN);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);

  // Campaign Form State
  const [campTitle, setCampTitle] = useState("");
  const [campPlatform, setCampPlatform] = useState("TikTok (9:16)");
  const [campStatus, setCampStatus] = useState("Active");
  const [campDueDate, setCampDueDate] = useState("2026-08-15");
  const [campAssignee, setCampAssignee] = useState("Jamie Dela Cruz");

  // ─── 1. AI SCRIPT GENERATOR STUDIO (WITH BYOK MODE) ─────────────────────────
  const [showAiScriptModal, setShowAiScriptModal] = useState(false);
  const [aiTopic, setAiTopic] = useState("5 Secrets to Editing Viral TikTok Videos");
  const [aiPlatform, setAiPlatform] = useState("TikTok / Shorts (9:16)");
  const [aiTone, setAiTone] = useState("High-Energy Viral Hype");
  const [byokMode, setByokMode] = useState<"developer" | "custom">("developer");
  const [customApiKey, setCustomApiKey] = useState("");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<{ hook: string; body: string; cta: string } | null>({
    hook: "🚀 Stop scrolling! Here is the secret 3-step editing formula top creators use to get 1M+ views.",
    body: "Step 1: Cut out dead air and silent pauses. Step 2: Add high-contrast animated captions. Step 3: Align visual cuts to the music beat drops.",
    cta: "🔥 Hit follow for more studio-grade video editing hacks!"
  });

  const handleGenerateScript = () => {
    if (!aiTopic.trim()) return;
    setIsGeneratingScript(true);
    setTimeout(() => {
      setGeneratedScript({
        hook: `🔥 Attention! If you want to master ${aiTopic.trim()}, you need to hear this right now.`,
        body: `Here's what nobody tells you about ${aiTopic.trim()}: First, grab viewer attention in 2 seconds. Second, use dynamic jump cuts and fast text overlays. Third, deliver high-value insight with zero fluff.`,
        cta: `👉 Save this video and try this exact formula in your next post!`
      });
      setIsGeneratingScript(false);
    }, 1200);
  };

  // ─── 2. IMPORT MEDIA FILE INPUT REF ─────────────────────────────────────────
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportMediaFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      const newId = Date.now() + idx + Math.floor(Math.random() * 1000);
      (MEDIA_LIBRARY as any).push({
        id: newId,
        type: file.type.startsWith("image/") ? "image" : "video",
        name: file.name,
        thumb: url,
        duration: 60,
        url: url,
      });
    });
    saveLibraries();
    onOpenEditor();
  };

  // ─── 3. SCREEN RECORDER STUDIO ──────────────────────────────────────────────
  const [showScreenRecordModal, setShowScreenRecordModal] = useState(false);
  const [isRecordingScreen, setIsRecordingScreen] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [recordedStream, setRecordedStream] = useState<MediaStream | null>(null);
  const [screenPreviewUrl, setScreenPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let timer: any;
    if (isRecordingScreen) {
      timer = setInterval(() => setRecordTime((t) => t + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isRecordingScreen]);

  const handleStartScreenRecording = async () => {
    try {
      setRecordTime(0);
      recordedChunksRef.current = [];
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setRecordedStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setScreenPreviewUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecordingScreen(true);
    } catch (err) {
      // Fallback demo screen recording if display media is restricted
      setIsRecordingScreen(true);
      setScreenPreviewUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
    }
  };

  const handleStopScreenRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingScreen(false);
  };

  const handleImportScreenRecordToEditor = () => {
    const finalUrl = screenPreviewUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
    const newId = Date.now();
    (MEDIA_LIBRARY as any).push({
      id: newId,
      type: "video",
      name: `Screen Recording ${new Date().toLocaleTimeString()}`,
      thumb: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=225&fit=crop&auto=format",
      duration: recordTime || 45,
      url: finalUrl,
    });
    saveLibraries();
    setShowScreenRecordModal(false);
    onOpenEditor();
  };

  // Create Team Logic (Enforces 5 Team limit)
  const handleCreateTeam = () => {
    if (teams.length >= 5) {
      setShowCreateTeamModal(false);
      setShowPaywallModal(true);
      return;
    }
    if (!newTeamName.trim()) return;
    const newTeam = {
      id: Date.now(),
      name: newTeamName.trim(),
      code: `TEAM-${Math.floor(1000 + Math.random() * 9000)}`
    };
    setTeams(prev => [...prev, newTeam]);
    setActiveTeamId(newTeam.id);
    setNewTeamName("");
    setShowCreateTeamModal(false);
  };

  // Add Member by Account ID or Email
  const handleAddMemberByAccountId = () => {
    if (!inputAccountId.trim()) return;
    const cleanId = inputAccountId.trim().toUpperCase();
    const newMem = {
      id: Date.now(),
      name: `User ${cleanId.substring(0, 7)}`,
      accountId: cleanId,
      role: "Editor",
      avatar: cleanId.substring(3, 5) || "CV",
      status: "Active"
    };
    setTeamMembers(prev => [...prev, newMem]);
    setInputAccountId("");
  };

  // Save/Update Campaign
  const handleSaveCampaign = () => {
    if (!campTitle.trim()) return;
    if (editingCampaign) {
      setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? {
        ...c,
        title: campTitle.trim(),
        platform: campPlatform,
        status: campStatus,
        dueDate: campDueDate,
        assignee: campAssignee
      } : c));
    } else {
      const newCamp = {
        id: Date.now(),
        title: campTitle.trim(),
        platform: campPlatform,
        status: campStatus,
        dueDate: campDueDate,
        assignee: campAssignee,
        videosCount: 1
      };
      setCampaigns(prev => [...prev, newCamp]);
    }
    setShowCampaignModal(false);
    setEditingCampaign(null);
  };

  const openEditCampaign = (c: any) => {
    setEditingCampaign(c);
    setCampTitle(c.title);
    setCampPlatform(c.platform);
    setCampStatus(c.status);
    setCampDueDate(c.dueDate);
    setCampAssignee(c.assignee);
    setShowCampaignModal(true);
  };

  const copyMyAccountId = () => {
    navigator.clipboard.writeText(currentUserAccountId);
    setAccountCopied(true);
    setTimeout(() => setAccountCopied(false), 2000);
  };

  const activeTeam = teams.find(t => t.id === activeTeamId) || teams[0];

  return (
    <div className="h-screen flex font-['Inter',sans-serif] overflow-hidden select-none bg-[#050505]">
      {/* Hidden File Input for Import Media */}
      <input
        type="file"
        ref={mediaFileInputRef}
        accept="video/*,image/*,audio/*"
        multiple
        onChange={handleImportMediaFiles}
        className="hidden"
      />

      {/* Background Ambient Glow */}
      <div className="fixed pointer-events-none z-0" style={{ width: 600, height: 600, top: -200, right: -100, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,230,118,0.06) 0%, transparent 70%)" }} />

      {/* SIDEBAR */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col z-10 relative bg-[#070707] border-r border-[#00e676]/10 backdrop-blur-2xl">
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-[#00e676]/10">
          <Logo size={32} />
          <span className="text-white font-bold text-base tracking-tight">ClipVault</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeNav === id
                  ? "bg-[#00e676]/10 text-[#00e676] border-l-2 border-[#00e676] shadow-[0_0_15px_rgba(0,230,118,0.15)] scale-[1.02]"
                  : "text-gray-400 hover:text-white hover:bg-white/5 hover:scale-[1.02]"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}

          <div className="pt-4 mt-3 border-t border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-2 text-gray-500">Workspace</p>
            {[
              { id: "favorites", icon: Star, label: "Favorites" },
              { id: "recent", icon: Clock, label: "Recent" },
              { id: "trash", icon: Trash2, label: "Trash" }
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveNav(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  activeNav === id
                    ? "bg-[#00e676]/10 text-[#00e676] scale-[1.02]"
                    : "text-gray-400 hover:text-white hover:bg-white/5 hover:scale-[1.02]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </nav>

        {/* GO PRO CARD */}
        <div className="px-3 mb-4">
          <div className="rounded-2xl p-4 relative overflow-hidden bg-gradient-to-br from-[#00e676]/10 to-black/40 border border-[#00e676]/20 hover:border-[#00e676]/40 hover:scale-[1.02] transition-all duration-200 shadow-xl">
            <Crown className="w-5 h-5 mb-2 text-[#00e676]" />
            <p className="text-white text-xs font-bold mb-1">Go Pro</p>
            <p className="text-xs mb-3 text-gray-400">Unlimited Teams, 8K export & AI</p>
            <GreenBtn onClick={() => setShowPaywallModal(true)} size="sm" className="w-full">
              Upgrade Plan
            </GreenBtn>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col overflow-hidden z-10 relative">
        <header className="h-24 pt-12 flex items-center justify-between px-6 flex-shrink-0 border-b border-[#00e676]/10 bg-[#050505]/80 backdrop-blur-2xl">
          <div className="flex items-center gap-3 flex-1 max-w-md" style={{ WebkitAppRegion: "no-drag" } as any}>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects, campaigns, team..."
                className="w-full rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 bg-white/5 border border-white/10 outline-none focus:border-[#00e676]/40 focus:bg-white/10 transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-50">
            <button className="relative p-2 rounded-xl transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95 cursor-pointer border border-white/5" style={{ WebkitAppRegion: "no-drag", pointerEvents: "auto" } as any}>
              <Bell className="w-5 h-5 text-gray-300" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#00e676] shadow-[0_0_8px_#00e676]" />
            </button>
            <button 
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black bg-gradient-to-br from-[#00e676] to-[#00a854] cursor-pointer hover:scale-105 transition-all shadow-[0_0_12px_rgba(0,230,118,0.4)] relative"
              style={{ WebkitAppRegion: "no-drag", pointerEvents: "auto" } as any}
            >
              JD
            </button>
          </div>
        </header>

        {/* DYNAMIC ROUTE VIEW */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-8 py-6 space-y-8">

          {/* TEAM WORKSPACE & MULTI-TEAM MANAGER */}
          {activeNav === "team" && (
            <div className="space-y-8">
              {/* Top Banner with Team Switcher */}
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <select
                      value={activeTeamId}
                      onChange={e => setActiveTeamId(Number(e.target.value))}
                      className="bg-white/5 text-white font-bold text-xl rounded-xl px-3 py-1.5 border border-white/10 outline-none cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      {teams.map(t => (
                        <option key={t.id} value={t.id} style={{ background: "#111" }}>{t.name}</option>
                      ))}
                    </select>
                    <span className="text-xs px-3 py-1 rounded-full font-bold bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/20">
                      {teams.length} / 5 Free Teams Created
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">Link accounts by Account ID, share team workspaces, and run video campaigns.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (teams.length >= 5) {
                        setShowPaywallModal(true);
                      } else {
                        setShowCreateTeamModal(true);
                      }
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 cursor-pointer shadow-md"
                  >
                    + Create New Team
                  </button>

                  <GreenBtn onClick={() => { setEditingCampaign(null); setCampTitle(""); setShowCampaignModal(true); }}>
                    + New Campaign
                  </GreenBtn>
                </div>
              </div>

              {/* ACCOUNT ID LINKING & USER ID BADGE */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#00e676]/30 hover:scale-[1.01] transition-all duration-200 flex items-center justify-between shadow-xl">
                <div>
                  <p className="text-white text-xs font-bold mb-1">Your Personal Account ID</p>
                  <p className="text-xs text-gray-400">Share this ID with other users to let them add you to their teams.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-[#00e676] bg-[#00e676]/10 px-3 py-1.5 rounded-xl border border-[#00e676]/20 shadow-inner">
                    {currentUserAccountId}
                  </span>
                  <button
                    onClick={copyMyAccountId}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 cursor-pointer"
                  >
                    {accountCopied ? <Check className="w-3.5 h-3.5 text-[#00e676]" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                    {accountCopied ? "Copied ID!" : "Copy Account ID"}
                  </button>
                </div>
              </div>

              {/* CAMPAIGN MANAGER SECTION */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#00e676]" /> {activeTeam?.name || "Primary Team"} Campaigns
                  </h3>
                  <span className="text-xs text-gray-400">{campaigns.length} Active Campaigns</span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {campaigns.map((c) => (
                    <div
                      key={c.id}
                      className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-[#00e676]/40 hover:bg-white/[0.06] hover:scale-[1.02] hover:shadow-[0_12px_35px_rgba(0,230,118,0.15)] transition-all duration-200 flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-[#00e676]/10 text-[#00e676] border-[#00e676]/30">
                            {c.status}
                          </span>
                          <button
                            onClick={() => openEditCampaign(c)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all hover:scale-105 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <h4 className="text-white text-base font-bold mb-1.5">{c.title}</h4>
                        <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-4">
                          <Video className="w-3.5 h-3.5 text-[#00e676]" /> {c.platform}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5 text-gray-500" />
                          <span>{c.assignee}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          <span>{c.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* LINK TEAM ACCOUNTS BY ACCOUNT ID */}
              <div className="grid grid-cols-3 gap-6 pt-2">
                <div className="col-span-2 space-y-4">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#00e676]" /> Link Team Accounts (by Account ID)
                  </h3>

                  <div className="space-y-3">
                    {teamMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.05] transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-black bg-gradient-to-br from-[#00e676] to-[#00a854] flex-shrink-0">
                            {m.avatar}
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold flex items-center gap-2">
                              {m.name}
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/20">
                                {m.accountId}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500">{m.role}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#00e676] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Add Member Input by Account ID */}
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      value={inputAccountId}
                      onChange={(e) => setInputAccountId(e.target.value)}
                      placeholder="Enter user Account ID (e.g. CV-8812-SJ or CV-1092-AR)..."
                      className="flex-1 rounded-xl px-4 py-2.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#00e676]/40 focus:bg-white/10 transition-all duration-200"
                    />
                    <GreenBtn onClick={handleAddMemberByAccountId} size="sm">
                      + Link Account
                    </GreenBtn>
                  </div>
                </div>

                {/* Team Stream Activity Log */}
                <div className="space-y-4">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#00e676]" /> Linked Team Activity
                  </h3>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4 text-xs">
                    <div className="flex items-start gap-2.5 pb-3 border-b border-white/5">
                      <div className="w-2 h-2 rounded-full bg-[#00e676] mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-gray-200 font-semibold">Jamie Dela Cruz</p>
                        <p className="text-gray-400 mt-0.5">Created <span className="text-[#00e676] font-bold">{activeTeam?.name || "Primary Team"}</span></p>
                        <span className="text-[10px] text-gray-500 mt-1 block">Just now</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HOME VIEW (DEFAULT) */}
          {activeNav === "home" && (
            <>
              {/* CREATE NEW CARDS WITH HOVER SCALE & ELEVATION */}
              <section>
                <h2 className="text-white font-bold text-lg mb-4">Create New</h2>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "New Project", icon: Plus, desc: "Start from scratch", action: onOpenEditor },
                    { label: "AI Script", icon: Wand2, desc: "AI Video Chat Copilot", action: onOpenAiChat || onOpenEditor },
                  ].map(({ label, icon: Icon, desc, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="group flex flex-col items-start gap-3 p-4 rounded-2xl text-left bg-white/[0.03] border border-white/[0.08] hover:border-[#00e676]/40 hover:bg-white/[0.07] hover:scale-[1.03] hover:shadow-[0_12px_35px_rgba(0,230,118,0.15)] active:scale-[0.97] transition-all duration-200 ease-out cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00e676]/10 border border-[#00e676]/20 group-hover:scale-110 transition-transform duration-200">
                        <Icon className="w-5 h-5 text-[#00e676]" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{label}</p>
                        <p className="text-xs mt-0.5 text-gray-400">{desc}</p>
                      </div>
                    </button>
                  ))}
                  
                  {/* High-End Pro Banner */}
                  <div 
                    className="col-span-2 relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-[#00e676]/20 group cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
                    onClick={() => setShowPaywallModal(true)}
                  >
                    {/* Animated Background Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00e676]/10 via-transparent to-[#00a854]/10 z-0 group-hover:opacity-100 transition-opacity duration-500 opacity-60" />
                    <div className="absolute -top-24 -right-10 w-64 h-64 bg-[#00e676]/20 blur-[60px] rounded-full group-hover:scale-125 transition-transform duration-700" />
                    
                    {/* Grid Pattern Overlay */}
                    <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none origin-bottom" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "24px 24px", transform: "perspective(500px) rotateX(60deg) scale(2.5) translateY(-20px)" }} />
                    
                    {/* Decorative App UI Mockup (Abstracted) */}
                    <div className="absolute right-[-10px] bottom-[-20px] w-52 h-40 bg-[#0f0f0f]/90 backdrop-blur-xl rounded-tl-2xl border-t border-l border-white/10 shadow-[-15px_-15px_40px_rgba(0,230,118,0.08)] transform rotate-[-8deg] group-hover:rotate-[-4deg] group-hover:-translate-y-3 transition-all duration-500 z-0 flex flex-col p-3 overflow-hidden">
                      {/* Window Header */}
                      <div className="w-full flex items-center gap-1.5 mb-2.5">
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                      </div>
                      {/* Video Player Mock */}
                      <div className="w-full h-16 rounded-lg bg-black/60 border border-white/5 mb-2.5 relative overflow-hidden flex-shrink-0">
                         <div className="absolute inset-0 bg-gradient-to-tr from-[#00e676]/20 to-transparent opacity-50" />
                         <div className="absolute inset-0 flex items-center justify-center">
                           <Play className="w-4 h-4 text-white/40 fill-white/40" />
                         </div>
                         <div className="absolute bottom-1.5 left-2 w-16 h-1 rounded-full bg-white/20">
                           <div className="w-1/2 h-full bg-[#00e676] rounded-full shadow-[0_0_8px_#00e676]" />
                         </div>
                      </div>
                      {/* Timeline Mock */}
                      <div className="w-full flex gap-1.5 mb-1.5">
                         <div className="w-1/3 h-2.5 rounded bg-[#00e676]/50 border border-[#00e676]/20" />
                         <div className="w-1/2 h-2.5 rounded bg-[#00a854]/40 border border-[#00a854]/20" />
                      </div>
                      <div className="w-full flex gap-1.5">
                         <div className="w-1/4 h-2 rounded bg-blue-500/40 border border-blue-500/20" />
                         <div className="w-2/3 h-2 rounded bg-purple-500/40 border border-purple-500/20" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 p-5 h-full flex flex-col justify-between pointer-events-none">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Crown className="w-4 h-4 text-[#00e676]" />
                          <h3 className="text-white font-black text-lg tracking-tight">
                            ClipVault <span className="text-[#00e676]">PRO</span>
                          </h3>
                        </div>
                        <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed font-medium">
                          Unlock hardware-accelerated 8K rendering & limitless AI generation.
                        </p>
                      </div>

                      {/* Badges / CTA */}
                      <div className="flex items-center gap-2.5 mt-6">
                        <span className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-[10px] font-bold text-gray-300 flex items-center gap-1.5 backdrop-blur-md shadow-lg">
                          <Monitor className="w-3.5 h-3.5 text-[#00e676]" /> 8K Export
                        </span>
                        <button className="px-3 py-1.5 rounded-lg bg-[#00e676] text-[11px] font-bold text-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,230,118,0.4)] group-hover:bg-white transition-colors pointer-events-auto">
                          <Sparkles className="w-3.5 h-3.5" /> Upgrade
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* RECENT PROJECTS CARDS WITH THUMBNAIL ZOOM & HOVER GLOW */}
              <section>
                <h2 className="text-white font-bold text-lg mb-4">Recent Projects</h2>
                <div className="grid grid-cols-3 gap-4">
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      onClick={onOpenEditor}
                      className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-[#00e676]/40 hover:bg-white/[0.07] hover:scale-[1.03] hover:shadow-[0_12px_35px_rgba(0,230,118,0.15)] active:scale-[0.98] cursor-pointer transition-all duration-200 ease-out"
                    >
                      <div className="aspect-video rounded-xl overflow-hidden mb-3 bg-black relative">
                        <img src={p.thumb} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToTrash(p);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-gray-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md border border-white/10"
                          title="Move to Trash"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-white text-sm font-semibold truncate">{p.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{p.duration} · {p.modified}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeNav === "templates" && (
            <section className="space-y-6">
              <h2 className="text-white font-bold text-xl flex items-center gap-3">
                Video Templates
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/20">
                  In Development
                </span>
              </h2>
            </section>
          )}

          {activeNav === "myspace" && (
            <section className="space-y-6">
              <h2 className="text-white font-bold text-xl">My Space</h2>
              <div className="grid grid-cols-3 gap-4">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={onOpenEditor}
                    className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-[#00e676]/40 hover:bg-white/[0.07] hover:scale-[1.03] hover:shadow-[0_12px_35px_rgba(0,230,118,0.15)] active:scale-[0.98] cursor-pointer transition-all duration-200 ease-out"
                  >
                    <div className="aspect-video rounded-xl overflow-hidden mb-3 bg-black relative">
                      <img src={p.thumb} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToTrash(p);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-gray-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md border border-white/10"
                        title="Move to Trash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-white text-sm font-semibold truncate">{p.title}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeNav === "cloud" && (
            <section className="space-y-6">
              <h2 className="text-white font-bold text-xl flex items-center gap-3">
                Cloud Storage & Backup
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/20 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#00e676]" /> Coming Soon
                </span>
              </h2>
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-[#00e676]/30 hover:scale-[1.02] transition-all duration-200 shadow-xl max-w-md">
                <Cloud className="w-6 h-6 text-[#00e676] mb-3" />
                <p className="text-white text-sm font-bold">Cloud Sync is in development</p>
                <p className="text-xs text-gray-400 mt-1">Currently all your projects and media are saved safely on your local device.</p>
              </div>
            </section>
          )}

          {activeNav === "favorites" && (
            <section className="space-y-6">
              <h2 className="text-white font-bold text-xl">Favorite Projects</h2>
            </section>
          )}

          {activeNav === "recent" && (
            <section className="space-y-6">
              <h2 className="text-white font-bold text-xl">Recent Activity</h2>
            </section>
          )}

          {activeNav === "trash" && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-xl flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-red-400" /> Trash Bin
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Items in Trash can be restored or permanently deleted via the Danger Zone confirmation.</p>
                </div>
                {trash.length > 0 && (
                  <span className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400 font-bold border border-red-500/20">
                    {trash.length} {trash.length === 1 ? "Item" : "Items"} in Trash
                  </span>
                )}
              </div>

              {trash.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white/[0.02] border border-white/[0.08] text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-white font-bold text-sm">Trash Bin is Empty</h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">Projects moved to Trash will appear here until permanently erased.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {trash.map((p) => (
                    <div
                      key={p.id}
                      className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-red-500/40 transition-all duration-200"
                    >
                      <div className="aspect-video rounded-xl overflow-hidden mb-3 bg-black relative">
                        <img src={p.thumb} alt={p.title} className="w-full h-full object-cover opacity-60" />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-950/80 border border-red-500/30 text-[10px] font-bold text-red-300">
                          In Trash
                        </div>
                      </div>
                      <p className="text-white text-sm font-semibold truncate">{p.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{p.duration} · Deleted {p.deletedAt || "Recently"}</p>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                        <button
                          onClick={() => handleRestoreFromTrash(p)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#00e676]" /> Restore
                        </button>
                        <button
                          onClick={() => {
                            setDeletingProject(p);
                            setConfirmDeleteInput("");
                            setShowDangerDeleteModal(true);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-red-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Danger Zone
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* ─── 1. AI SCRIPT STUDIO MODAL (WITH BYOK MODE) ───────────────────────── */}
      {showAiScriptModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-[520px] max-h-[90vh] overflow-y-auto scrollbar-hide rounded-3xl p-7 bg-[#0d0d0d] border border-white/15 shadow-2xl space-y-5 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#00e676]/20 to-[#00a854]/20 border border-[#00e676]/30">
                  <Wand2 className="w-5 h-5 text-[#00e676]" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    AI Script Generator Studio <Sparkles className="w-4 h-4 text-amber-400" />
                  </h3>
                  <p className="text-xs text-gray-400">Generate viral video scripts with AI prompt intelligence.</p>
                </div>
              </div>
              <button onClick={() => setShowAiScriptModal(false)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* BYOK (BRING YOUR OWN KEY) TOGGLE BOX */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#00e676]" /> API Key Mode (BYOK)
                </label>
                <div className="flex rounded-xl p-1 bg-black/50 border border-white/10 text-[10px] font-bold">
                  <button
                    onClick={() => setByokMode("developer")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      byokMode === "developer"
                        ? "bg-[#00e676] text-black shadow-md"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Developer Key (Demo)
                  </button>
                  <button
                    onClick={() => setByokMode("custom")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      byokMode === "custom"
                        ? "bg-[#00e676] text-black shadow-md"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Custom API Key (BYOK)
                  </button>
                </div>
              </div>

              {byokMode === "developer" ? (
                <div className="p-2.5 rounded-xl bg-[#00e676]/10 border border-[#00e676]/20 flex items-center gap-2 text-xs text-[#00e676]">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Using ClipVault Developer API key (Built-in demo quota active).</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={e => setCustomApiKey(e.target.value)}
                    placeholder="Enter OpenAI / Gemini API Key (e.g. sk-proj-...)"
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#00e676]/40"
                  />
                  <p className="text-[10px] text-gray-500">Your key is stored locally in memory for this session and never sent to third-party servers.</p>
                </div>
              )}
            </div>

            {/* SCRIPT PROMPT FORM */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block font-semibold">Video Topic / Idea Prompt</label>
                <textarea
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  rows={2}
                  placeholder="e.g. 5 Secrets to Editing Viral TikTok Videos..."
                  className="w-full rounded-xl p-3 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#00e676]/40 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block font-semibold">Platform Ratio</label>
                  <select
                    value={aiPlatform}
                    onChange={e => setAiPlatform(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none"
                  >
                    <option value="TikTok / Shorts (9:16)" style={{ background: "#111" }}>TikTok / Shorts (9:16)</option>
                    <option value="YouTube Longform (16:9)" style={{ background: "#111" }}>YouTube Longform (16:9)</option>
                    <option value="Instagram Reels (9:16)" style={{ background: "#111" }}>Instagram Reels (9:16)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block font-semibold">Tone & Style</label>
                  <select
                    value={aiTone}
                    onChange={e => setAiTone(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none"
                  >
                    <option value="High-Energy Viral Hype" style={{ background: "#111" }}>High-Energy Viral Hype</option>
                    <option value="Educational Tech" style={{ background: "#111" }}>Educational Tech</option>
                    <option value="Storytelling Mystery" style={{ background: "#111" }}>Storytelling Mystery</option>
                    <option value="Cinematic Promo" style={{ background: "#111" }}>Cinematic Promo</option>
                  </select>
                </div>
              </div>

              <GreenBtn onClick={handleGenerateScript} size="md" className="w-full justify-center">
                {isGeneratingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {isGeneratingScript ? "AI Generating Script..." : "Generate AI Script"}
              </GreenBtn>
            </div>

            {/* GENERATED SCRIPT PREVIEW BOX */}
            {generatedScript && (
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-[#00e676]/20 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-[#00e676] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> AI Generated Script Output
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Ready to import</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-400 block">Hook (0-3s)</span>
                    <p className="text-gray-200 mt-0.5">{generatedScript.hook}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Body Script</span>
                    <p className="text-gray-300 mt-0.5">{generatedScript.body}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-400 block font-bold">Call to Action (CTA)</span>
                    <p className="text-gray-300 mt-0.5">{generatedScript.cta}</p>
                  </div>
                </div>

                <GreenBtn onClick={() => { setShowAiScriptModal(false); onOpenEditor(); }} size="sm" className="w-full justify-center mt-2">
                  <Play className="w-3.5 h-3.5 fill-current" /> Send Script to Video Editor
                </GreenBtn>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 3. SCREEN RECORDER STUDIO MODAL ───────────────────────────────────── */}
      {showScreenRecordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-[480px] rounded-3xl p-6 bg-[#0d0d0d] border border-white/15 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Monitor className="w-5 h-5 text-[#00e676]" /> Screen Recorder Studio
              </h3>
              <button onClick={() => { handleStopScreenRecording(); setShowScreenRecordModal(false); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* LIVE PREVIEW CANVAS / RECORDING DISPLAY */}
            <div className="aspect-video rounded-2xl bg-black border border-white/10 relative overflow-hidden flex flex-col items-center justify-center">
              {screenPreviewUrl ? (
                <video src={screenPreviewUrl} controls className="w-full h-full object-cover" />
              ) : (
                <video ref={videoPreviewRef} autoPlay muted className="w-full h-full object-cover" />
              )}

              {!isRecordingScreen && !screenPreviewUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-6 text-center space-y-2">
                  <Monitor className="w-10 h-10 text-[#00e676] animate-pulse" />
                  <p className="text-xs font-bold text-white">Record Display / Web Browser Screen</p>
                  <p className="text-[10px] text-gray-400">Capture video tutorials, app demos, and presentation walkthroughs.</p>
                </div>
              )}

              {isRecordingScreen && (
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-red-600/90 text-white text-xs font-bold flex items-center gap-2 animate-pulse shadow-lg">
                  <Radio className="w-3.5 h-3.5" /> REC {Math.floor(recordTime / 60)}:{(recordTime % 60).toString().padStart(2, "0")}
                </div>
              )}
            </div>

            {/* CONTROLS BAR */}
            <div className="flex items-center justify-between gap-3 pt-1">
              {!isRecordingScreen && !screenPreviewUrl && (
                <GreenBtn onClick={handleStartScreenRecording} size="md" className="w-full justify-center">
                  <Disc className="w-4 h-4 text-red-500 fill-red-500" /> Start Screen Recording
                </GreenBtn>
              )}

              {isRecordingScreen && (
                <button
                  onClick={handleStopScreenRecording}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-red-600 text-white hover:bg-red-500 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <StopCircle className="w-4 h-4 fill-white text-red-600" /> Stop Recording
                </button>
              )}

              {screenPreviewUrl && !isRecordingScreen && (
                <div className="flex items-center gap-2 w-full">
                  <button
                    onClick={handleStartScreenRecording}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                  >
                    Re-record
                  </button>
                  <GreenBtn onClick={handleImportScreenRecordToEditor} size="md" className="flex-1 justify-center">
                    <Play className="w-4 h-4 fill-current" /> Import to Video Editor
                  </GreenBtn>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE TEAM MODAL */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-[420px] rounded-3xl p-6 bg-[#0f0f0f] border border-white/10 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00e676]" /> Create New Team
              </h3>
              <button onClick={() => setShowCreateTeamModal(false)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Team Name</label>
              <input
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="e.g. Marketing Team, Video Creators..."
                className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#00e676]/40"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setShowCreateTeamModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300">
                Cancel
              </button>
              <GreenBtn onClick={handleCreateTeam} size="sm">
                Create Team
              </GreenBtn>
            </div>
          </div>
        </div>
      )}

      {/* PRO SUBSCRIPTION PAYWALL MODAL */}
      {showPaywallModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-3xl p-8 bg-[#0d0d0d] border border-white/10 shadow-2xl animate-fadeIn my-auto relative">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-white font-bold text-2xl">Upgrade your plan</h2>
                <p className="text-sm text-gray-400 mt-1">Choose the perfect plan for your video creation needs.</p>
              </div>
              <button onClick={() => setShowPaywallModal(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* PLAN 1: FREE */}
              <div className="rounded-2xl p-6 bg-white/[0.02] border border-white/5 flex flex-col">
                <h3 className="text-white font-bold text-lg mb-1">Starter</h3>
                <p className="text-xs text-gray-400 mb-4 h-8">Perfect for hobbyists and occasional editors.</p>
                <div className="mb-6">
                  <span className="text-white font-bold text-3xl">₱0</span><span className="text-sm text-gray-500"> / month</span>
                </div>
                <button className="w-full py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-white cursor-not-allowed mb-6 opacity-50">
                  Current Plan
                </button>
                <ul className="space-y-3 text-sm text-gray-300 flex-1">
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" /> Up to 1080p basic exports</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" /> 2 video exports / month</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" /> 1 Team Workspace</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" /> Standard AI text generation</li>
                </ul>
              </div>

              {/* PLAN 2: PLUS */}
              <div className="rounded-2xl p-6 bg-gradient-to-b from-[#00e676]/10 to-transparent border border-[#00e676]/30 flex flex-col relative shadow-[0_0_30px_rgba(0,230,118,0.1)] transform md:scale-105 z-10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#00e676] text-black text-[10px] font-bold rounded-full shadow-md uppercase tracking-wider">
                  Most Popular
                </div>
                <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">Plus <Crown className="w-4 h-4 text-[#00e676]" /></h3>
                <p className="text-xs text-gray-400 mb-4 h-8">Everything you need for viral content creation.</p>
                <div className="mb-6">
                  <span className="text-white font-bold text-3xl">₱599</span><span className="text-sm text-gray-500"> / month</span>
                </div>
                <button className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#00e676] hover:bg-white text-black transition-colors mb-6 shadow-[0_0_15px_rgba(0,230,118,0.3)] cursor-pointer">
                  Upgrade to Plus
                </button>
                <ul className="space-y-3 text-sm text-gray-200 flex-1">
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-[#00e676] shrink-0 mt-0.5" /> Up to 4K Hardware-Accelerated exports</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-[#00e676] shrink-0 mt-0.5" /> 6 video exports / month</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-[#00e676] shrink-0 mt-0.5" /> 5 Team Workspaces</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-[#00e676] shrink-0 mt-0.5" /> Limitless AI Jump Cuts & Auto-Edits</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-[#00e676] shrink-0 mt-0.5" /> No Watermarks on Exports</li>
                </ul>
              </div>

              {/* PLAN 3: PRO */}
              <div className="rounded-2xl p-6 bg-white/[0.02] border border-white/5 flex flex-col">
                <h3 className="text-white font-bold text-lg mb-1">Pro Agency</h3>
                <p className="text-xs text-gray-400 mb-4 h-8">For power users and professional editing teams.</p>
                <div className="mb-6">
                  <span className="text-white font-bold text-3xl">₱1,499</span><span className="text-sm text-gray-500"> / month</span>
                </div>
                <button className="w-full py-2.5 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors mb-6 cursor-pointer">
                  Upgrade to Pro
                </button>
                <ul className="space-y-3 text-sm text-gray-300 flex-1">
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /> Up to 8K Hardware-Accelerated exports</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /> Unlimited video exports</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /> Unlimited Team Workspaces</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /> Custom AI Models & Voice Cloning</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /> Priority Support & API Access</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 text-center text-xs text-gray-500 font-medium">
              Prices are in Philippine Peso (PHP). You can cancel your subscription at any time.
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-[460px] rounded-3xl p-6 bg-[#0f0f0f] border border-white/10 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-[#00e676]" /> {editingCampaign ? "Edit Campaign" : "New Campaign"}
              </h3>
              <button onClick={() => setShowCampaignModal(false)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Campaign Title</label>
                <input
                  value={campTitle}
                  onChange={e => setCampTitle(e.target.value)}
                  placeholder="e.g. Summer Promo Shorts..."
                  className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#00e676]/40"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Platform Ratio</label>
                <select
                  value={campPlatform}
                  onChange={e => setCampPlatform(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-white/5 border border-white/10 outline-none"
                >
                  <option value="TikTok (9:16)" style={{ background: "#111" }}>TikTok (9:16)</option>
                  <option value="YouTube Shorts (9:16)" style={{ background: "#111" }}>YouTube Shorts (9:16)</option>
                  <option value="Instagram Reels (9:16)" style={{ background: "#111" }}>Instagram Reels (9:16)</option>
                  <option value="YouTube Wide (16:9)" style={{ background: "#111" }}>YouTube Wide (16:9)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Campaign Status</label>
                <select
                  value={campStatus}
                  onChange={e => setCampStatus(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-white/5 border border-white/10 outline-none"
                >
                  <option value="Active" style={{ background: "#111" }}>Active</option>
                  <option value="Draft" style={{ background: "#111" }}>Draft</option>
                  <option value="Completed" style={{ background: "#111" }}>Completed</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setShowCampaignModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300">
                Cancel
              </button>
              <GreenBtn onClick={handleSaveCampaign} size="md">
                Save Campaign
              </GreenBtn>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ DANGER ZONE: PERMANENT PROJECT DELETION MODAL (HIGH-AESTHETIC ENTERPRISE STYLE) */}
      {showDangerDeleteModal && deletingProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn select-none">
          <div className="w-[520px] rounded-3xl p-7 bg-[#0d0d0f] border border-red-500/30 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/20 shadow-inner">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base tracking-tight">
                    Danger Zone: Permanent Deletion
                  </h3>
                  <p className="text-xs text-red-400/90 font-medium mt-0.5">This action is permanent and cannot be undone.</p>
                </div>
              </div>
              <button
                onClick={() => { setShowDangerDeleteModal(false); setDeletingProject(null); }}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Project Mini Card */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
              <img src={deletingProject.thumb} alt="" className="w-16 h-10 object-cover rounded-xl bg-black flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-bold truncate">{deletingProject.title}</p>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">{deletingProject.duration} · In Trash</p>
              </div>
            </div>

            {/* Deletion Warning & Full Required Statement Box */}
            <div className="space-y-3 text-xs">
              <p className="text-gray-300 leading-relaxed">
                You are about to permanently delete <strong className="text-white font-bold">"{deletingProject.title}"</strong>. All timeline tracks, media clips, and color grades will be erased.
              </p>

              <div className="p-3.5 rounded-2xl bg-red-500/[0.06] border border-red-500/20 space-y-2">
                <span className="text-[11px] font-bold text-red-400 block uppercase tracking-wider">To confirm deletion, type the exact statement below:</span>
                <div className="p-3 rounded-xl bg-black/70 border border-red-500/30 font-mono text-[11px] text-amber-300 select-all leading-relaxed break-words">
                  {requiredDeletePhrase}
                </div>
              </div>
            </div>

            {/* Typing Confirmation Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-400 block">Type statement to confirm:</label>
              <textarea
                rows={2}
                value={confirmDeleteInput}
                onChange={(e) => setConfirmDeleteInput(e.target.value)}
                placeholder="Type the exact statement above..."
                className="w-full rounded-xl px-3.5 py-2.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-red-500/50 transition-all font-mono placeholder-gray-600 resize-none leading-relaxed"
              />
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => { setShowDangerDeleteModal(false); setDeletingProject(null); }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 transition-all border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPermanentDelete}
                disabled={confirmDeleteInput.trim() !== requiredDeletePhrase.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-30 disabled:hover:bg-red-600 transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Permanently Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-5xl h-[700px] flex rounded-3xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden">
            {/* Settings Sidebar */}
            <div className="w-72 bg-[#0f0f0f] border-r border-white/5 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-8 px-2 mt-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black bg-gradient-to-br from-[#00e676] to-[#00a854]">
                  JD
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Jamie Dela Cruz</h3>
                  <p className="text-xs text-gray-500">Starter Plan</p>
                </div>
              </div>
              <nav className="flex-1 space-y-1">
                {[
                  { id: "account", label: "Account & Plan", icon: UserPlus },
                  { id: "preferences", label: "Preferences", icon: Settings },
                  { id: "export", label: "Export Defaults", icon: Video },
                  { id: "engine", label: "Advanced Engine", icon: Cpu }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSettingsTab(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeSettingsTab === id 
                        ? "bg-[#00e676]/10 text-[#00e676]" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Settings Content */}
            <div className="flex-1 flex flex-col relative">
              <div className="absolute top-6 right-6 z-10">
                <button onClick={() => setShowSettingsModal(false)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-12 flex-1 overflow-y-auto scrollbar-hide">
                {activeSettingsTab === "account" && (
                  <div className="space-y-6">
                    <h2 className="text-white font-bold text-2xl mb-6">Account & Plan</h2>
                    
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-bold mb-1">Current Plan: Starter (Free)</h4>
                        <p className="text-xs text-gray-400">You are on the free tier with 1080p export limits.</p>
                      </div>
                      <GreenBtn onClick={() => {setShowSettingsModal(false); setShowPaywallModal(true);}} size="md">
                        Upgrade to Pro
                      </GreenBtn>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-white font-bold text-sm border-b border-white/10 pb-2">Profile Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
                          <input type="text" defaultValue="Jamie Dela Cruz" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#00e676]/40" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Email Address</label>
                          <input type="email" defaultValue="jamie@clipvault.ai" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#00e676]/40" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "preferences" && (
                  <div className="space-y-6">
                    <h2 className="text-white font-bold text-2xl mb-6">Preferences</h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div>
                          <p className="text-white text-sm font-semibold mb-0.5">Dark Mode (Default)</p>
                          <p className="text-xs text-gray-500">Keep the editor UI in dark mode.</p>
                        </div>
                        <div className="w-10 h-5 rounded-full bg-[#00e676] relative cursor-pointer">
                          <div className="absolute right-1 top-0.5 w-4 h-4 bg-black rounded-full shadow" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div>
                          <p className="text-white text-sm font-semibold mb-0.5">Hardware Acceleration</p>
                          <p className="text-xs text-gray-500">Use GPU for playback rendering (Recommended).</p>
                        </div>
                        <div className="w-10 h-5 rounded-full bg-[#00e676] relative cursor-pointer">
                          <div className="absolute right-1 top-0.5 w-4 h-4 bg-black rounded-full shadow" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "export" && (
                  <div className="space-y-6">
                    <h2 className="text-white font-bold text-2xl mb-6">Export Defaults</h2>
                    <div className="space-y-5">
                      <div>
                        <label className="text-sm font-semibold text-white mb-2 block">Default Resolution</label>
                        <select 
                          value={defaultRes}
                          onChange={handleResChange}
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer hover:border-white/20"
                        >
                          <option value="720p">720p (HD)</option>
                          <option value="1080p">1080p (Full HD)</option>
                          <option value="1440p">1440p (2K QHD) - Requires Plus</option>
                          <option value="4k">4K (Ultra HD) - Requires Plus</option>
                          <option value="8k">8K (Extreme HD) - Requires Pro</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-white mb-2 block">Default Framerate</label>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleFpsChange(30)}
                            className={`flex-1 py-2 rounded-lg text-sm cursor-pointer transition-all ${
                              defaultFps === 30 
                                ? "bg-[#00e676]/10 border border-[#00e676]/30 font-bold text-[#00e676]" 
                                : "bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            30 FPS
                          </button>
                          <button 
                            onClick={() => handleFpsChange(60)}
                            className={`flex-1 py-2 rounded-lg text-sm cursor-pointer transition-all ${
                              defaultFps === 60 
                                ? "bg-[#00e676]/10 border border-[#00e676]/30 font-bold text-[#00e676]" 
                                : "bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            60 FPS
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "engine" && (
                  <div className="space-y-6">
                    <h2 className="text-white font-bold text-2xl mb-6">Advanced Engine</h2>
                    <div className="p-5 rounded-xl border border-yellow-500/30 bg-yellow-500/5 mb-6">
                      <div className="flex items-center gap-2 mb-2 text-yellow-500">
                        <AlertTriangle className="w-5 h-5" />
                        <h4 className="font-bold text-sm">Danger Zone</h4>
                      </div>
                      <p className="text-xs text-gray-400">Modifying these settings could result in high memory usage or application crashes on lower-end systems.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div>
                          <p className="text-white text-sm font-semibold mb-0.5">Dual-Stream 1000% Audio Gain</p>
                          <p className="text-xs text-gray-500">Allow independent track amplification over standard limits.</p>
                        </div>
                        <div className="w-10 h-5 rounded-full bg-[#00e676] relative cursor-pointer">
                          <div className="absolute right-1 top-0.5 w-4 h-4 bg-black rounded-full shadow" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
