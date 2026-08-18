CAPTION_STYLES = {
    'none': {
        'text_color': (0, 0, 0, 0),
        'font_type': 'regular',
        'no_captions': True,
        'name': 'No Captions (Clean Video)'
    },
    'tiktok_recap': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 255, 255, 255),  # Plain White
        'font_type': 'regular',
        'uppercase': False,
        'phrase_mode': True,
        'max_words': 8,
        'auto_emojis': True,
        'name': 'TikTok Movie Recap (White with Black Outline)'
    },
    'clean_white': {
        'text_color': (255, 255, 255, 255),
        'font_type': 'bold',
        'no_stroke': True,
        'name': 'Clean White (No Stroke)'
    },
    'capcut_white': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 223, 0, 255),  # Bright Yellow Highlight
        'font_type': 'bold',
        'auto_emojis': True,
        'name': 'CapCut White (Thick Stroke & Yellow Highlight)'
    },
    'capcut_yellow': {
        'text_color': (255, 223, 0, 255),
        'highlight_color': (0, 255, 0, 255),  # Bright Green Highlight
        'font_type': 'bold',
        'name': 'CapCut Yellow (Thick Stroke & Green Highlight)'
    },
    'bright_yellow': {
        'text_color': (255, 255, 0, 255),
        'highlight_color': (255, 255, 255, 255),
        'font_type': 'bold',
        'name': 'Bright Yellow'
    },
    'neon_cyan': {
        'text_color': (0, 255, 255, 255),
        'font_type': 'regular',
        'name': 'Neon Cyan'
    },
    'hot_pink': {
        'text_color': (255, 20, 147, 255),
        'font_type': 'bold',
        'name': 'Hot Pink'
    },
    'lime_green': {
        'text_color': (50, 205, 50, 255),
        'font_type': 'regular',
        'name': 'Lime Green'
    },
    'orange_fire': {
        'text_color': (255, 165, 0, 255),
        'font_type': 'bold',
        'name': 'Orange Fire'
    },
    'electric_blue': {
        'text_color': (30, 144, 255, 255),
        'font_type': 'regular',
        'name': 'Electric Blue'
    },
    'purple_pop': {
        'text_color': (138, 43, 226, 255),
        'font_type': 'bold',
        'name': 'Purple Pop'
    },
    'capcut_banner': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 223, 0, 255),  # Yellow Highlight
        'font_type': 'bold',
        'no_stroke': True,
        'bg_box_color': (0, 0, 0, 160),  # Black background with 60% opacity
        'name': 'CapCut Banner (Black Box Behind Text)'
    },
    'tiktok_banner': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (0, 255, 255, 255),  # Neon Cyan Highlight
        'font_type': 'regular',
        'no_stroke': True,
        'bg_box_color': (0, 0, 0, 140),  # Black background with 55% opacity
        'name': 'TikTok/Instagram Hook Banner'
    },
    'cinematic_sub': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 255, 255, 255),
        'font_type': 'regular',
        'no_stroke': True,
        'uppercase': False,
        'phrase_mode': True,
        'max_words': 6,
        'name': 'Cinematic Subtitles (Small, Lowercase, White)'
    },
    'sigma_pink': {
        'text_color': (255, 77, 148, 255), # Heavy hot pink/magenta
        'highlight_color': (255, 255, 255, 255), # Contrast white highlights
        'font_type': 'bold',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 4,
        'stroke_factor': 0.13, # Thicker border outline
        'name': 'Sigma Pink (Thick Stroke, Hot Pink Uppercase)'
    },
    'capcut_banger': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 40, 40, 255),  # High contrast red highlight
        'font_type': 'bangers',  # Will try to load Bangers
        'uppercase': True,
        'phrase_mode': False,
        'auto_emojis': True,
        'stroke_factor': 0.15,
        'name': 'CapCut Banger (Huge Impact & Drop Shadows)'
    },
    'hormozi_bold': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 223, 0, 255),  # Yellow Highlight
        'font_type': 'anton', # Ultra heavy font
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 3,
        'auto_emojis': True,
        'stroke_factor': 0.18, # Very heavy outline
        'name': 'Hormozi Style (Bold Anton, Yellow Highlight, Heavy Outline)'
    },
    'minimal_pop': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (0, 255, 255, 255),  # Cyan
        'font_type': 'bebas_neue',
        'uppercase': False,
        'phrase_mode': True,
        'max_words': 5,
        'stroke_factor': 0.05, # Subtle stroke
        'name': 'Minimal Pop (Clean Sans-Serif)'
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
