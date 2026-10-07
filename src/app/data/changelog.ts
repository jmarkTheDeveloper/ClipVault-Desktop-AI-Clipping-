export interface ChangelogItem {
  type: "fix" | "feature" | "perf" | "security";
  title: string;
  description: string;
  badge?: string;
}

export interface ReleaseVersion {
  version: string;
  date: string;
  title: string;
  isLatest?: boolean;
  highlights: string;
  items: ChangelogItem[];
}

export const APP_CHANGELOG: ReleaseVersion[] = [
  {
    version: "1.0.0",
    date: "October 2026",
    title: "Official Release: Smoother Previews, Clearer Thumbnails & Organized Vault",
    isLatest: true,
    highlights:
      "We fixed video playback, made clip thumbnails much clearer, and gave your saved clips their own clean space.",
    items: [
      {
        type: "fix",
        title: "Smoother Video Playback",
        description:
          "Video previews now start playing instantly without freezing, black screens, or loading errors when you scrub through your clips.",
        badge: "Playback Fix",
      },
      {
        type: "fix",
        title: "Clearer, High-Quality Cover Thumbnails",
        description:
          "Removed blurry cover images and eliminated big text boxes covering the speaker's face. ClipVault now automatically picks the sharpest shot of the speaker for your covers.",
        badge: "Visual Fix",
      },
      {
        type: "security",
        title: "Dedicated Saved Clips Folder",
        description:
          "Your saved clips now have their own clean, separate home where you can organize videos into folders and open them right on your computer.",
        badge: "Organization",
      },
      {
        type: "fix",
        title: "Smoother Video Scrubbing & Controls",
        description:
          "Added an easy timeline seek bar so you can play, pause, check exact clip lengths, and jump to any moment in your generated clips with zero lag.",
        badge: "Controls Fix",
      },
      {
        type: "feature",
        title: "Automatic Update & Bug Fix Alerts",
        description:
          "You'll now see friendly alerts whenever new bug fixes or speed improvements are downloading in the background, so you always know what has been improved.",
        badge: "New Feature",
      },
      {
        type: "perf",
        title: "Accidental Close Protection",
        description:
          "If you accidentally try to close the app while ClipVault is actively generating your clips, it will now ask you to confirm so you never lose your progress.",
        badge: "Safety",
      },
    ],
  },
  {
    version: "0.9.8",
    date: "September 2026",
    title: "1-Click Auto Clipper & Faster Processing",
    highlights:
      "Automatic clip generation from long videos with face tracking, dynamic subtitles, and faster export speeds.",
    items: [
      {
        type: "feature",
        title: "1-Click Auto Clipper",
        description:
          "Paste any video link to automatically find highlights, center speakers, and add animated subtitles in 9:16 vertical format.",
      },
      {
        type: "perf",
        title: "Hardware Speed Boost",
        description:
          "Uses your computer's graphics card to generate and export clips much faster.",
      },
      {
        type: "fix",
        title: "Accurate Subtitle Sync",
        description:
          "Improved subtitle timing so spoken words match on-screen text smoothly without delays.",
      },
    ],
  },
];
