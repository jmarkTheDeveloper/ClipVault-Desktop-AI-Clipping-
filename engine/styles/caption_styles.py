CAPTION_STYLES = {
    'none': {
        'text_color': (0, 0, 0, 0),
        'font_type': 'montserrat',
        'no_captions': True,
        'name': 'No Captions (Clean Video)'
    },
    'capcut_yellow': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 230, 0, 255),  # Radiant CapCut Yellow
        'font_type': 'montserrat',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 3,
        'karaoke': True,
        'stroke_factor': 0.14,
        'name': 'CapCut Yellow (Classic Viral Auto-Captions)'
    },
    'opus_green': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (0, 255, 102, 255),  # Signature Opus Clip Neon Green
        'font_type': 'rubik',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 3,
        'karaoke': True,
        'stroke_factor': 0.14,
        'name': 'Opus Clip Neon (Active Word Pop)'
    },
    'clean_white': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 230, 0, 255),
        'font_type': 'montserrat',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 3,
        'karaoke': True,
        'stroke_factor': 0.12,
        'name': 'Clean White (Bold Black Stroke)'
    },
    'neon_cyan': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (0, 240, 255, 255),  # Electric Neon Cyan
        'font_type': 'montserrat',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 3,
        'karaoke': True,
        'stroke_factor': 0.14,
        'name': 'Electric Cyan (White Text + Cyan Highlight)'
    },
    'fire_red': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 50, 50, 255),   # High Voltage Red
        'font_type': 'montserrat',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 3,
        'karaoke': True,
        'stroke_factor': 0.14,
        'name': 'Fire Red (White Text + Red Highlight)'
    },
    'hormozi_bold': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 230, 0, 255),  # Yellow Highlight
        'font_type': 'anton', # Ultra heavy font
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 2,
        'karaoke': True,
        'stroke_factor': 0.16,
        'name': 'Hormozi Style (Bold Anton, Yellow Highlight, Heavy Outline)'
    },
    'sigma_pink': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 77, 148, 255), # Hot pink highlight
        'font_type': 'montserrat',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 3,
        'karaoke': True,
        'stroke_factor': 0.14,
        'name': 'Sigma Pink (Thick Stroke, Hot Pink Highlight)'
    },
    'emerald_green': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (0, 255, 102, 255),
        'font_type': 'rubik',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 3,
        'karaoke': True,
        'stroke_factor': 0.14,
        'name': 'Emerald Green'
    },
    'capcut_banner': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 230, 0, 255),
        'font_type': 'montserrat',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 4,
        'no_stroke': True,
        'bg_box_color': (0, 0, 0, 180),
        'name': 'CapCut Banner (Black Box Behind Text)'
    },
    'tiktok_recap': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 230, 0, 255),
        'font_type': 'montserrat',
        'uppercase': False,
        'phrase_mode': True,
        'max_words': 6,
        'stroke_factor': 0.12,
        'name': 'TikTok Movie Recap (White with Black Outline)'
    },
    'cinematic_sub': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 255, 255, 255),
        'font_type': 'montserrat',
        'no_stroke': False,
        'uppercase': False,
        'phrase_mode': True,
        'max_words': 5,
        'stroke_factor': 0.10,
        'name': 'Cinematic Subtitles (Clean Lowercase)'
    }
}

HIGHLIGHT_KEYWORDS = [
    'amazing', 'incredible', 'secret', 'important', 'shocking', 'exclusive',
    'never', 'always', 'only', 'must', 'can\'t', 'won\'t', 'best', 'worst',
    'first', 'last', 'biggest', 'smallest', 'most', 'least', 'why', 'how',
    'what', 'when', 'where', 'money', 'free', 'easy', 'hard', 'truth'
]

EMOJI_MAP = {
    "FIGHT": "🥊", "FIGHTING": "🥊", "BOXING": "🥊", "BOXER": "🥊",
    "SCARED": "😱", "TROUBLE": "😱", "TERRIFYING": "😱", "FEAR": "😱",
    "DOLL": "🧸", "TOY": "🧸",
    "SKELETON": "💀", "DEAD": "💀", "DEATH": "💀", "KILL": "💀",
    "CAR": "🚗", "VEHICLE": "🚗", "PARKING": "🚗", "DRIVE": "🚗",
    "MARTIAL": "🥋", "ARTS": "🥋", "DOJO": "🥋", "KARATE": "🥋",
    "MONSTER": "👹", "CREATURE": "👹", "BEAST": "👹",
    "POISON": "☠️", "DANGER": "⚠️", "WARNING": "⚠️",
    "SHOCKING": "🤯", "SHOCK": "🤯", "MIND": "🤯",
    "LAUGH": "😂", "FUNNY": "😂", "HILARIOUS": "😂",
    "CRY": "😭", "SAD": "😭", "TEARS": "😭",
    "MONEY": "💵", "CASH": "💵", "RICH": "💵",
    "HOUSE": "🏠", "HOME": "🏠", "ROOM": "🏠",
    "NIGHT": "🌃", "DARK": "🌃",
    "FIRE": "🔥", "HOT": "🔥", "BURN": "🔥"
}
