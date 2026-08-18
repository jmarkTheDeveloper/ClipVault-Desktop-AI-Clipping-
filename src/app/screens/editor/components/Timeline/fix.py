import sys

path = 'D:/Personal Coding Projects/PYTHON PROJECT/ClipVault/frontend/src/app/screens/editor/components/Timeline/TimelineContainer.tsx'

content = open('D:/Personal Coding Projects/PYTHON PROJECT/ClipVault/frontend/src/app/screens/EditorScreen_OLD_utf8.txt', 'r', encoding='utf-8').read()

start_idx = content.find('          {/* Timeline */}')
if start_idx == -1:
    print('Failed to find start index')
    sys.exit(1)

end_marker = '            </div>\n          </div>'
end_idx = content.find(end_marker, start_idx)
if end_idx == -1:
    print('Failed to find end index')
    sys.exit(1)

timeline_content = content[start_idx:end_idx + len(end_marker)]

header = '''import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, ZoomIn, Scissors, RotateCcw, RotateCw, Trash2, Maximize2, ZoomOut, Check, ChevronDown, ChevronRight, Type, Music, Film, Pointer, Minus, Plus, Copy as CopyIcon, FlipHorizontal, ArrowLeft, Grid } from 'lucide-react';
import { useEditor } from '../../hooks/EditorContext';
import { fmt, G } from '../../../../utils/types';
import type { VideoClip, AudioClip, TextClip } from '../../../../utils/types';
import * as ContextMenu from '@radix-ui/react-context-menu';

const TrimStartIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 18V6h3" />
    <path d="M8 18h3" />
    <path d="M15 12H8" />
  </svg>
);
const TrimSplitIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 6v12" />
    <path d="M14 6v12" />
    <path d="M10 6H8" />
    <path d="M10 18H8" />
    <path d="M14 6h2" />
    <path d="M14 18h2" />
    <path d="M12 4v16" strokeDasharray="2 2" strokeOpacity="0.5" />
  </svg>
);
const TrimEndIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 18V6h-3" />
    <path d="M16 18h-3" />
    <path d="M9 12h7" />
  </svg>
);

export function TimelineContainer() {
  const { 
    currentState, history, histIdx, pxPerSecRef, totalDuration, totalDurRef,
    currentTime, setCurrentTime, hoverTime, setHoverTime,
    selectedId, setSelectedId, selectedType, setSelectedType,
    undo, redo, deleteSelected, duplicateSelected,
    videoTrackExpanded, setVideoTrackExpanded,
    updateVideoClip, updateAudioClip, updateTextClip,
    dragState,
    pxPerSec, isDragging, isPanning, lastPanX, timelineRef,
    setIsPlaying, seekTo, push, makeVideoClip, saveLibraries, MEDIA_LIBRARY, AUDIO_LIBRARY, setZoomLevel, zoomLevel,
    setActiveRightTab, setActiveTool, selectedClip
  } = useEditor();
  const { clips, audioClips, textClips } = currentState;
  const [timelineTool, setTimelineTool] = useState('select');
  const panelBorder = 'rgba(255,255,255,0.08)';
  const PX_PER_SEC_BASE = 60;
  const trimStartToPlayhead = () => {};
  const splitAtPlayhead = () => {};
  const trimEndToPlayhead = () => {};

  return (
'''
timeline_content = timeline_content.replace('          {/* Timeline */}', '')

footer = '''
        </div>
      </div>
  );
}
'''

open(path, 'w', encoding='utf-8').write(header + timeline_content + footer)
print('Done')
