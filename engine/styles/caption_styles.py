CAPTION_STYLES = {
    'none': {
        'text_color': (0, 0, 0, 0),
        'font_type': 'anton',
        'no_captions': True,
        'name': 'No Captions (Clean Video)'
    },
    'capcut_yellow': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 230, 0, 255),  # Radiant Viral Gold Yellow
        'font_type': 'anton',  # Ultra bold commercial typeface
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 2,
        'karaoke': True,
        'stroke_factor': 0.14,
        'name': 'Viral Yellow (Ultra-Bold Active Pop)'
    },
    'hormozi_bold': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 230, 0, 255),  # Yellow Highlight
        'font_type': 'anton', # Ultra heavy viral font
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 2,
        'karaoke': True,
        'stroke_factor': 0.16,
        'name': 'Hormozi Style (Bold Anton, Yellow Highlight, Heavy Outline)'
    },
    'opus_green': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (0, 255, 102, 255),  # Signature Neon Emerald Green
        'font_type': 'anton',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 2,
        'karaoke': True,
        'stroke_factor': 0.14,
        'name': 'Neon Emerald (Active Word Pop)'
    },
    'neon_cyan': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (0, 240, 255, 255),  # Electric Neon Cyan
        'font_type': 'anton',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 2,
        'karaoke': True,
        'stroke_factor': 0.14,
        'name': 'Electric Cyan (White Text + Cyan Highlight)'
    },
    'fire_red': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 60, 60, 255),   # High Voltage Red
        'font_type': 'anton',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 2,
        'karaoke': True,
        'stroke_factor': 0.14,
        'name': 'Fire Red (White Text + Red Highlight)'
    },
    'sigma_pink': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 77, 148, 255), # Hot pink highlight
        'font_type': 'anton',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 2,
        'karaoke': True,
        'stroke_factor': 0.14,
        'name': 'Sigma Pink (Thick Stroke, Hot Pink Highlight)'
    },
    'clean_white': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 230, 0, 255),
        'font_type': 'anton',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 2,
        'karaoke': True,
        'stroke_factor': 0.12,
        'name': 'Clean White (Bold Black Stroke)'
    },
    'capcut_banner': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 230, 0, 255),
        'font_type': 'anton',
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 3,
        'no_stroke': True,
        'bg_box_color': (0, 0, 0, 190),
        'name': 'CapCut Banner (Black Box Behind Text)'
    },
    'cinematic_sub': {
        'text_color': (255, 255, 255, 255),
        'highlight_color': (255, 230, 0, 255),
        'font_type': 'montserrat',
        'no_stroke': False,
        'uppercase': True,
        'phrase_mode': True,
        'max_words': 2,
        'stroke_factor': 0.12,
        'name': 'Cinematic Subtitles (Bold Yellow Pop)'
    }
}

HIGHLIGHT_KEYWORDS = [
    'amazing', 'incredible', 'secret', 'important', 'shocking', 'exclusive',
    'never', 'always', 'only', 'must', 'can\'t', 'won\'t', 'best', 'worst',
    'first', 'last', 'biggest', 'smallest', 'most', 'least', 'why', 'how',
    'what', 'when', 'where', 'money', 'free', 'easy', 'hard', 'truth',
    'reality', 'harsh', 'hospital', 'nursing', 'nurse', 'doctor', 'healthcare',
    'crazy', 'insane', 'shocked', 'die', 'dead', 'million', 'billion', 'dollars'
]

EMOJI_MAP = {
    # Medical & Healthcare
    "NURSE": "🩺", "NURSES": "🩺", "NURSING": "🩺",
    "DOCTOR": "👨‍⚕️", "DOCTORS": "👨‍⚕️", "PHYSICIAN": "👨‍⚕️",
    "HOSPITAL": "🏥", "HOSPITALS": "🏥", "CLINIC": "🏥",
    "HEALTHCARE": "🩺", "MEDICINE": "💊", "MEDICAL": "🩺",
    "PATIENT": "🤒", "PATIENTS": "🤒", "SURGERY": "😷", "SURGEON": "😷",
    "INJECTION": "💉", "SHOT": "💉", "NEEDLE": "💉",
    "SICK": "🤢", "HEAL": "❤️‍🩹", "THERAPY": "🧠", "HEALTH": "🥗",

    # Shock, Reaction & Virality
    "CRAZY": "🤯", "INSANE": "🤯", "SHOCK": "🤯", "SHOCKED": "🤯", "SHOCKING": "🤯",
    "UNBELIEVABLE": "😱", "OMG": "😱", "WOW": "😲", "WILD": "🦁",
    "FIRE": "🔥", "LIT": "🔥", "BURNING": "🔥", "HOT": "🔥", "BURN": "🔥",
    "EXPLODE": "💥", "EXPLOSION": "💥", "BOOM": "💥",
    "VIRAL": "🚀", "MAGIC": "✨", "GENIUS": "🧠", "SMART": "💡",

    # Money, Wealth, Business & Success
    "MONEY": "💸", "CASH": "💵", "DOLLARS": "💰", "DOLLAR": "💵", "BUCKS": "💵",
    "RICH": "🤑", "WEALTH": "💰", "MILLION": "💰", "BILLION": "💰", "TRILLION": "💰",
    "PROFIT": "📈", "BUSINESS": "💼", "JOB": "💼", "SALARY": "💳", "CAREER": "💼",
    "EXPENSIVE": "💎", "PAY": "💳", "PAID": "💰", "FREE": "🎁", "PRICE": "🏷️",

    # Truth, Danger, Warning & Law
    "TRUTH": "👁️", "SECRET": "🤫", "SECRETS": "🤫", "REALITY": "🧠", "HARSH": "⚠️",
    "LIE": "🤥", "LIAR": "🤥", "FAKE": "🤡", "DANGER": "⚠️", "WARNING": "🚨", "DANGEROUS": "⚠️",
    "STOP": "🛑", "WRONG": "❌", "MISTAKE": "🤦", "FAIL": "📉",
    "POLICE": "👮", "COPS": "🚔", "LAW": "⚖️", "LAWYER": "⚖️", "JAIL": "🚔", "PRISON": "🚔",

    # Danger, Death, Spooky
    "DEAD": "💀", "DEATH": "💀", "DIE": "💀", "DYING": "💀", "KILL": "⚔️",
    "SPOOKY": "👻", "GHOST": "👻", "SCARY": "😱", "TERRIFYING": "😱", "FEAR": "😨",
    "POISON": "☠️", "TOXIC": "☣️",

    # Sports, Fitness & Action
    "FIGHT": "🥊", "FIGHTING": "🥊", "BOXING": "🥊", "BOXER": "🥊", "MMA": "🥋", "KARATE": "🥋",
    "GYM": "🏋️", "WORKOUT": "💪", "STRONG": "💪", "MUSCLE": "💪",
    "FITNESS": "🏃", "RUN": "🏃", "RUNNING": "🏃", "FAST": "⚡", "SPEED": "🏎️",
    "CAR": "🏎️", "CARS": "🚗", "DRIVE": "🚗", "VEHICLE": "🚗",
    "WIN": "🏆", "WINNER": "🏆", "CHAMPION": "🏆", "CHAMP": "🏆", "LOSE": "📉",

    # Emotion & Social
    "LOVE": "❤️", "HEART": "❤️", "HATE": "😡", "ANGRY": "🤬", "MAD": "😡",
    "CRY": "😭", "TEARS": "😢", "SAD": "😔", "HAPPY": "😄",
    "LAUGH": "😂", "FUNNY": "😂", "HILARIOUS": "🤣", "LOL": "😂", "SMILE": "😊",
    "SLEEP": "😴", "TIRED": "🥱", "DREAM": "💭",

    # Tech, Food, Time
    "AI": "🤖", "ROBOT": "🤖", "PHONE": "📱", "INTERNET": "🌐", "COMPUTER": "💻",
    "FOOD": "🍔", "PIZZA": "🍕", "COFFEE": "☕", "BEER": "🍺", "DRINK": "🍹",
    "TIME": "⏰", "CLOCK": "⏳", "NIGHT": "🌙", "DAY": "☀️", "SUN": "☀️"
}
