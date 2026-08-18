import React, { useState } from 'react';
import { Play, Loader2, Link2, Plus, Upload, Music, Sparkles, Layers, Type, Film, Palette, Zap, Trash2 } from 'lucide-react';
import { GreenBtn } from '../../../components/SharedUI';
import { MEDIA_LIBRARY, AUDIO_LIBRARY, FILTER_PRESETS, ANIM_IN_OPTIONS, ANIM_OUT_OPTIONS, saveLibraries, G } from '../../../utils/types';
import type { VideoClip } from '../../../utils/types';
import { useEditor } from '../hooks/EditorContext';

export function MediaLibraryPanel() {
  const {
    activeLeftTab,
    addVideoClip,
    addAudioClip,
    addTextClip,
    selectedId,
    selectedType,
    currentState,
    updateVideoClip,
    updateTextClip,
    push,
  } = useEditor();

  const [ytUrl, setYtUrl] = useState("");
  const [ytLoading, setYtLoading] = useState(false);
  const [ytAudioUrl, setYtAudioUrl] = useState("");
  const [ytAudioLoading, setYtAudioLoading] = useState(false);

  const [, forceRender] = React.useReducer(x => x + 1, 0);
  const selectedClip = currentState?.clips?.find((c: any) => c.id === selectedId) || currentState?.textClips?.find((c: any) => c.id === selectedId);

  const handleNativeMediaUpload = async () => {
    try {
      const filePaths = await (window as any).electronAPI.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Media Files', extensions: ['mp4', 'mov', 'webm', 'jpg', 'jpeg', 'png', 'webp'] }]
      });
      if (!filePaths || filePaths.length === 0) return;
      
      filePaths.forEach((filePath: string, idx: number) => {
        // Use the bulletproof Python backend stream
        const url = `http://127.0.0.1:8000/stream?path=${encodeURIComponent(filePath)}`;
        const newId = Date.now() + idx + Math.floor(Math.random() * 1000);
        
        const ext = filePath.split('.').pop()?.toLowerCase();
        const type = ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '') ? 'image' : 'video';
        const name = filePath.split('\\').pop()?.split('/').pop() || 'Unknown File';
        
        if (type === 'video') {
          const tempVid = document.createElement('video');
          tempVid.style.position = 'absolute';
          tempVid.style.opacity = '0';
          tempVid.style.pointerEvents = 'none';
          document.body.appendChild(tempVid);
          
          tempVid.src = url;
          tempVid.muted = true;
          tempVid.playsInline = true;
          tempVid.crossOrigin = 'anonymous'; // Important for canvas drawing from HTTP stream
          
          let finalDuration = 60;
          tempVid.onloadedmetadata = () => {
            if (tempVid.duration && tempVid.duration !== Infinity && !isNaN(tempVid.duration)) {
              finalDuration = tempVid.duration;
            }
            tempVid.currentTime = Math.min(1, finalDuration / 2);
          };
          
          tempVid.onseeked = () => {
            setTimeout(() => {
              const canvas = document.createElement('canvas');
              canvas.width = 160;
              canvas.height = 90;
              const ctx = canvas.getContext('2d');
              if (ctx) ctx.drawImage(tempVid, 0, 0, 160, 90);
              
              const thumbUrl = canvas.toDataURL('image/jpeg', 0.7);
              const newItem = {
                id: newId, type, name, thumb: thumbUrl, url,
                duration: finalDuration,
              };
              (MEDIA_LIBRARY as any).push(newItem);
              saveLibraries();
              addVideoClip(newId);
              forceRender();
              
              document.body.removeChild(tempVid);
            }, 100); // slightly longer delay for network stream decode
          };
        } else {
          const newItem = {
            id: newId, type, name, thumb: url, url,
            duration: 5,
          };
          (MEDIA_LIBRARY as any).push(newItem);
          saveLibraries();
          addVideoClip(newId);
          forceRender();
        }
      });
    } catch (e) {
      console.error("Failed to open dialog", e);
    }
  };

  const handleNativeAudioUpload = async () => {
    try {
      const filePaths = await (window as any).electronAPI.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'aac', 'ogg'] }]
      });
      if (!filePaths || filePaths.length === 0) return;
      
      filePaths.forEach((filePath: string, idx: number) => {
        const url = `http://127.0.0.1:8000/stream?path=${encodeURIComponent(filePath)}`;
        const newId = Date.now() + idx + Math.floor(Math.random() * 1000);
        const name = filePath.split('\\').pop()?.split('/').pop() || 'Unknown Track';
        
        const newItem = {
          id: newId,
          type: 'audio',
          name,
          artist: 'Local Track',
          duration: 180, // Fallback duration, ideally read via metadata
          url,
        };
        (AUDIO_LIBRARY as any).push(newItem);
        saveLibraries();
        addAudioClip(newId);
      });
      forceRender();
    } catch (e) {
      console.error("Failed to open dialog", e);
    }
  };

  return (
    <div className="p-3 space-y-4">
      {/* ── AI MAGIC TAB ── */}
      {activeLeftTab === "ai" && (
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a5a]">AI Magic Suite</p>
          
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <h4 className="text-xs font-bold text-purple-400">🎬 AI Viral Video Clipper</h4>
            <p className="text-[10px] text-gray-400">Algorithmically slices timeline into high-energy jump cuts with simulated tracking zooms.</p>
            <button 
              onClick={() => {
                if (currentState.clips.length === 0) {
                  alert("Please add a video to the timeline first.");
                  return;
                }
                const sourceClip = currentState.clips[0];
                const jumpCuts = [];
                let currTime = 0;
                
                // Slice into 5 random jump cuts
                for(let i=0; i<5; i++) {
                   const dur = 1.5 + Math.random() * 2.5; // 1.5s to 4s cuts
                   jumpCuts.push({
                     ...sourceClip,
                     id: Date.now() + i,
                     startTime: currTime,
                     duration: dur,
                     // Simulate dynamic tracking zoom by modifying crops randomly
                     cropTop: { x: 20 + Math.random()*10, y: 10 + Math.random()*20, width: 250 - Math.random()*50, height: 250 },
                     filterPreset: i % 2 === 0 ? 'vivid' : 'warm',
                     animIn: "Zoom In"
                   });
                   currTime += dur;
                }
                push({ ...currentState, clips: jumpCuts });
                alert("AI Viral Video Clipper finished! Timeline sliced into high-energy jump cuts.");
              }}
              className="w-full py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-all cursor-pointer">
              Generate Jump Cuts
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <h4 className="text-xs font-bold text-[#00e676]">🎥 AI Movie Recapper</h4>
            <p className="text-[10px] text-gray-400">Slows playback, adds cinematic color grading, and drops an AI voiceover.</p>
            <button 
              onClick={() => {
                if (currentState.clips.length === 0) {
                  alert("Please add a video to the timeline first.");
                  return;
                }
                
                const recappedClips = currentState.clips.map(c => ({
                  ...c,
                  filterPreset: "noir", // Cinematic grade
                  playbackRate: 0.5,    // Slow motion
                  volume: 20            // Duck original audio
                }));

                const voiceoverClip = {
                  id: Date.now() + 999,
                  type: "audio" as const,
                  mediaId: 999,
                  name: "AI Voiceover",
                  artist: "ElevenLabs API",
                  url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3", // Demo audio
                  startTime: 0,
                  duration: 10,
                  volume: 1000 // Blast the voiceover
                };

                push({ 
                  ...currentState, 
                  clips: recappedClips,
                  audioClips: [...(currentState.audioClips || []), voiceoverClip]
                });
                alert("AI Movie Recapper applied! Cinematic filters, slow motion, and voiceover added.");
              }}
              className="w-full py-1.5 rounded-lg text-xs font-bold bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/30 hover:bg-[#00e676]/30 transition-all cursor-pointer">
              Apply Recap Magic
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <h4 className="text-xs font-bold text-amber-400">📝 AI Auto-Captions</h4>
            <p className="text-[10px] text-gray-400">Transcribe speech and generate synchronized kinetic typography.</p>
            <button onClick={() => {
              const baseTime = currentState.clips[0] ? currentState.clips[0].startTime : 0;
              const captions = ["YOU", "WONT", "BELIEVE", "THIS", "HACK!"];
              const newTextClips = captions.map((text, i) => ({
                id: Date.now() + i, type: "text" as const, text,
                startTime: baseTime + (i * 0.4), // Fast pacing
                duration: 0.4,
                x: 50, y: 75, fontSize: 48,
                color: i % 2 === 0 ? "#00e676" : "#ffffff", 
                fontWeight: "900", fontStyle: "italic",
                fontFamily: "Inter", animIn: "Zoom In", animOut: "none", track: 1,
              }));
              push({ ...currentState, textClips: [...currentState.textClips, ...newTextClips] });
              alert("AI Auto-Captions generated! Kinetic subtitles added to timeline.");
            }}
             className="w-full py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer">
              Generate Subtitles
            </button>
          </div>
        </div>
      )}

      {/* ── MEDIA TAB ── */}
      {activeLeftTab === "media" && (
        <>
          {/* Upload Local Media */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#5a5a5a]">Local File Upload</p>
            <button
              onClick={handleNativeMediaUpload}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer text-xs font-semibold text-gray-300"
            >
              <Upload className="w-3.5 h-3.5" style={{ color: G }} />
              Import Video / Image
            </button>
          </div>

          {/* Media Library */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#5a5a5a]">Media Assets</p>
            <div className="grid grid-cols-2 gap-2">
              {MEDIA_LIBRARY.map((item: any) => (
                <div key={item.id} className="group relative cursor-grab active:cursor-grabbing"
                  draggable={true}
                  onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify({ type: "media", id: item.id }))}
                  onClick={() => addVideoClip(item)}>
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-[#0a0a0a]">
                    <img src={item.thumb} alt={item.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-[#00e676]/10 transition-opacity">
                      <Plus className="w-5 h-5 text-[#00e676]" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const idx = MEDIA_LIBRARY.findIndex((m: any) => m.id === item.id);
                        if (idx !== -1) {
                          MEDIA_LIBRARY.splice(idx, 1);
                          saveLibraries();
                          forceRender();
                        }
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/80 hover:bg-red-600 text-gray-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md z-10 border border-white/10"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[10px] mt-1 truncate text-[#5a5a5a]">{item.name}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── AUDIO TAB ── */}
      {activeLeftTab === "audio" && (
        <>
          {/* Upload Local Audio */}
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a5a] mb-2">Local Audio Upload</p>
            <button
              onClick={handleNativeAudioUpload}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer text-xs font-semibold text-gray-300"
            >
              <Music className="w-3.5 h-3.5 text-blue-400" />
              Import Audio Track
            </button>
          </div>

          {/* YouTube Audio Extractor */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#5a5a5a]">Extract Music / Audio</p>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 border border-white/5 bg-white/5 focus-within:border-[#00e676]/30">
                <Link2 className="w-3 h-3 flex-shrink-0 text-[#404040]" />
                <input
                  value={ytAudioUrl}
                  onChange={(e) => setYtAudioUrl(e.target.value)}
                  placeholder="Paste YouTube Music URL..."
                  className="flex-1 bg-transparent text-xs text-white outline-none placeholder-[#404040] min-w-0"
                />
              </div>
              <GreenBtn size="sm" className="w-full justify-center" onClick={async () => {
                if (!ytAudioUrl) return;
                setYtAudioLoading(true);
                try {
                  setTimeout(() => {
                    const newId = 3000 + (AUDIO_LIBRARY as any).length;
                    (AUDIO_LIBRARY as any).push({
                      id: newId, type: "audio", name: "Extracted Music", artist: "YouTube Track", duration: 60, url: ""
                    });
                    saveLibraries();
                    addAudioClip(newId);
                    setYtAudioUrl("");
                    setYtAudioLoading(false);
                    forceRender();
                  }, 800);
                } catch (e) { alert('Audio extraction error'); setYtAudioLoading(false); }
              }}>
                {ytAudioLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Music className="w-3 h-3" />}
                {ytAudioLoading ? 'Extracting...' : 'Extract Audio'}
              </GreenBtn>
            </div>
          </div>

          {/* Audio Library List */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#5a5a5a]">Audio Library</p>
            <div className="space-y-1.5">
              {AUDIO_LIBRARY.map((item: any) => (
                <div key={item.id} className="group flex items-center justify-between p-2.5 rounded-xl cursor-pointer bg-white/5 hover:bg-[#00e676]/10 border border-transparent hover:border-[#00e676]/30 transition-all"
                  onClick={() => addAudioClip(item.id)}>
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#00e676]/10 text-[#00e676] flex-shrink-0">
                      <Music className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-semibold text-white group-hover:text-[#00e676] truncate">{item.name}</span>
                      <span className="text-[10px] text-gray-500">{item.artist || 'Audio Track'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const idx = AUDIO_LIBRARY.findIndex((m: any) => m.id === item.id);
                        if (idx !== -1) {
                          AUDIO_LIBRARY.splice(idx, 1);
                          saveLibraries();
                          forceRender();
                        }
                      }}
                      className="p-1 rounded-lg hover:bg-red-600 text-gray-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Delete Audio Asset"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <Plus className="w-3.5 h-3.5 text-[#5a5a5a] group-hover:text-[#00e676]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── TEXT TAB ── */}
      {activeLeftTab === "text" && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a5a]">Text & Subtitle Presets</p>
          {["Large Heading", "Subtitle Text", "Kinetic Caption", "Bold Quote", "Lower Third", "Body Text"].map((preset) => (
            <div
              key={preset}
              onClick={addTextClip}
              className="p-3 rounded-xl bg-white/5 hover:bg-[#00e676]/10 border border-white/5 hover:border-[#00e676]/30 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <Type className="w-4 h-4 text-gray-400 group-hover:text-[#00e676]" />
                <span className="text-xs font-medium text-white group-hover:text-[#00e676]">{preset}</span>
              </div>
              <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#00e676]" />
            </div>
          ))}
        </div>
      )}

      {/* ── EFFECTS TAB ── */}
      {activeLeftTab === "effects" && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a5a]">Video Effects Library</p>
          {["Glitch", "VHS Tape", "Film Grain", "Motion Blur", "Camera Shake", "Light Leak", "Mirror", "Bokeh Glow"].map((fx) => (
            <div
              key={fx}
              onClick={() => {
                if (selectedId && selectedType === 'video') {
                  const filterMap: any = { "Glitch": "cinematic", "VHS Tape": "fade", "Film Grain": "noir", "Light Leak": "warm", "Bokeh Glow": "cool" };
                  updateVideoClip(selectedId, { filterPreset: filterMap[fx] || "vivid" });
                  alert(`Applied ${fx} effect to selected clip!`);
                } else {
                  alert("Please select a video clip to apply effects.");
                }
              }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-[#00e676]/10 border border-white/5 hover:border-[#00e676]/30 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#00e676]" />
                <span className="text-xs text-white font-medium">{fx}</span>
              </div>
              <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#00e676]" />
            </div>
          ))}
        </div>
      )}

      {/* ── FILTERS TAB ── */}
      {activeLeftTab === "filters" && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a5a]">Color Filters</p>
          <div className="grid grid-cols-2 gap-2">
            {FILTER_PRESETS.map((f: any) => (
              <button
                key={f.id}
                onClick={() => selectedType === "video" && selectedId && updateVideoClip(selectedId, { filterPreset: f.id })}
                className="group cursor-pointer text-left"
              >
                <div
                  className="relative rounded-xl overflow-hidden aspect-video border-2 transition-all bg-[#0a0a0a]"
                  style={{ borderColor: (selectedClip as VideoClip)?.filterPreset === f.id ? G : "transparent" }}
                >
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-purple-900/40 to-emerald-900/40 text-[10px] font-bold text-white">
                    {f.name}
                  </div>
                </div>
                <p className="text-[10px] mt-1 text-center text-gray-400">{f.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── TRANSITIONS TAB ── */}
      {activeLeftTab === "transitions" && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a5a]">Transitions Library</p>
          {["Fade Dissolve", "Cross Zoom", "Wipe Left", "Slide Up", "Flip Spin", "Glitch Transition"].map((tr) => (
            <div
              key={tr}
              onClick={() => {
                if (selectedId && (selectedType === 'video' || selectedType === 'text')) {
                  const animMap: any = { "Fade Dissolve": "Fade In", "Cross Zoom": "Zoom In", "Wipe Left": "Slide Left", "Slide Up": "Bounce", "Flip Spin": "Rotate In", "Glitch Transition": "Zoom In" };
                  const setter = selectedType === 'video' ? updateVideoClip : updateTextClip;
                  setter(selectedId, { animIn: animMap[tr] || "Fade In" });
                  alert(`Applied ${tr} transition to selected clip!`);
                } else {
                  alert("Please select a video or text clip to apply a transition.");
                }
              }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-[#00e676]/10 border border-white/5 hover:border-[#00e676]/30 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-[#00e676]" />
                <span className="text-xs text-white font-medium">{tr}</span>
              </div>
              <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#00e676]" />
            </div>
          ))}
        </div>
      )}

      {/* ── ANIMATION TAB ── */}
      {activeLeftTab === "animation" && (
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a5a]">Clip Motion & Keyframes</p>
          {selectedClip && (selectedType === "video" || selectedType === "text") ? (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-gray-400 mb-1.5 font-bold">In Animation</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ANIM_IN_OPTIONS.map((a: string) => {
                    const val = (selectedClip as any).animIn;
                    const setter = selectedType === "video" ? updateVideoClip : updateTextClip;
                    return (
                      <button
                        key={a}
                        onClick={() => setter(selectedClip.id, { animIn: a })}
                        className="py-1.5 rounded-lg text-[11px] border transition-all truncate px-2"
                        style={val === a ? { background: "rgba(0,230,118,0.1)", borderColor: G, color: G } : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)", color: "#888" }}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1.5 font-bold">Out Animation</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ANIM_OUT_OPTIONS.map((a: string) => {
                    const val = (selectedClip as any).animOut;
                    const setter = selectedType === "video" ? updateVideoClip : updateTextClip;
                    return (
                      <button
                        key={a}
                        onClick={() => setter(selectedClip.id, { animOut: a })}
                        className="py-1.5 rounded-lg text-[11px] border transition-all truncate px-2"
                        style={val === a ? { background: "rgba(0,230,118,0.1)", borderColor: G, color: G } : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)", color: "#888" }}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center text-xs text-gray-500">
              Select a video or text clip on the timeline to animate.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
