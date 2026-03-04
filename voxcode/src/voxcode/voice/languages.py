"""Multi-language support for VoxCode.

Whisper supports 99 languages. This module provides:
- Language detection
- Language-specific prompts
- Code vocabulary boosting per language
- Programming term translations
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class LanguageConfig:
    """Configuration for a supported language."""
    code: str  # ISO 639-1 code
    name: str
    native_name: str
    whisper_code: str  # Whisper's language code
    programming_terms: Dict[str, str]  # Native term -> English code term
    wake_words: List[str]  # Alternative wake words


# Supported languages with programming term translations
LANGUAGES: Dict[str, LanguageConfig] = {
    "en": LanguageConfig(
        code="en",
        name="English",
        native_name="English",
        whisper_code="en",
        programming_terms={},  # Native
        wake_words=["hey vox", "ok vox", "hi vox"],
    ),
    "es": LanguageConfig(
        code="es",
        name="Spanish",
        native_name="Español",
        whisper_code="es",
        programming_terms={
            "función": "function",
            "variable": "variable",
            "clase": "class",
            "método": "method",
            "si": "if",
            "sino": "else",
            "mientras": "while",
            "para": "for",
            "retornar": "return",
            "importar": "import",
            "verdadero": "true",
            "falso": "false",
            "nulo": "null",
            "lista": "list",
            "diccionario": "dict",
            "cadena": "string",
            "número": "number",
            "crear": "create",
            "eliminar": "delete",
            "guardar": "save",
            "ejecutar": "run",
            "probar": "test",
        },
        wake_words=["oye vox", "hola vox"],
    ),
    "fr": LanguageConfig(
        code="fr",
        name="French",
        native_name="Français",
        whisper_code="fr",
        programming_terms={
            "fonction": "function",
            "variable": "variable",
            "classe": "class",
            "méthode": "method",
            "si": "if",
            "sinon": "else",
            "tant que": "while",
            "pour": "for",
            "retourner": "return",
            "importer": "import",
            "vrai": "true",
            "faux": "false",
            "nul": "null",
            "liste": "list",
            "dictionnaire": "dict",
            "chaîne": "string",
            "nombre": "number",
            "créer": "create",
            "supprimer": "delete",
            "sauvegarder": "save",
            "exécuter": "run",
            "tester": "test",
        },
        wake_words=["salut vox", "dis vox"],
    ),
    "de": LanguageConfig(
        code="de",
        name="German",
        native_name="Deutsch",
        whisper_code="de",
        programming_terms={
            "funktion": "function",
            "variable": "variable",
            "klasse": "class",
            "methode": "method",
            "wenn": "if",
            "sonst": "else",
            "während": "while",
            "für": "for",
            "zurückgeben": "return",
            "importieren": "import",
            "wahr": "true",
            "falsch": "false",
            "null": "null",
            "liste": "list",
            "wörterbuch": "dict",
            "zeichenkette": "string",
            "nummer": "number",
            "erstellen": "create",
            "löschen": "delete",
            "speichern": "save",
            "ausführen": "run",
            "testen": "test",
        },
        wake_words=["hallo vox", "hey vox"],
    ),
    "pt": LanguageConfig(
        code="pt",
        name="Portuguese",
        native_name="Português",
        whisper_code="pt",
        programming_terms={
            "função": "function",
            "variável": "variable",
            "classe": "class",
            "método": "method",
            "se": "if",
            "senão": "else",
            "enquanto": "while",
            "para": "for",
            "retornar": "return",
            "importar": "import",
            "verdadeiro": "true",
            "falso": "false",
            "nulo": "null",
            "lista": "list",
            "dicionário": "dict",
            "string": "string",
            "número": "number",
            "criar": "create",
            "excluir": "delete",
            "salvar": "save",
            "executar": "run",
            "testar": "test",
        },
        wake_words=["oi vox", "olá vox"],
    ),
    "zh": LanguageConfig(
        code="zh",
        name="Chinese",
        native_name="中文",
        whisper_code="zh",
        programming_terms={
            "函数": "function",
            "变量": "variable",
            "类": "class",
            "方法": "method",
            "如果": "if",
            "否则": "else",
            "当": "while",
            "循环": "for",
            "返回": "return",
            "导入": "import",
            "真": "true",
            "假": "false",
            "空": "null",
            "列表": "list",
            "字典": "dict",
            "字符串": "string",
            "数字": "number",
            "创建": "create",
            "删除": "delete",
            "保存": "save",
            "运行": "run",
            "测试": "test",
        },
        wake_words=["嘿 vox", "你好 vox"],
    ),
    "ja": LanguageConfig(
        code="ja",
        name="Japanese",
        native_name="日本語",
        whisper_code="ja",
        programming_terms={
            "関数": "function",
            "変数": "variable",
            "クラス": "class",
            "メソッド": "method",
            "もし": "if",
            "そうでなければ": "else",
            "の間": "while",
            "ループ": "for",
            "戻る": "return",
            "インポート": "import",
            "真": "true",
            "偽": "false",
            "ヌル": "null",
            "リスト": "list",
            "辞書": "dict",
            "文字列": "string",
            "数値": "number",
            "作成": "create",
            "削除": "delete",
            "保存": "save",
            "実行": "run",
            "テスト": "test",
        },
        wake_words=["ねえ vox", "こんにちは vox"],
    ),
    "ko": LanguageConfig(
        code="ko",
        name="Korean",
        native_name="한국어",
        whisper_code="ko",
        programming_terms={
            "함수": "function",
            "변수": "variable",
            "클래스": "class",
            "메소드": "method",
            "만약": "if",
            "아니면": "else",
            "동안": "while",
            "반복": "for",
            "반환": "return",
            "임포트": "import",
            "참": "true",
            "거짓": "false",
            "널": "null",
            "리스트": "list",
            "딕셔너리": "dict",
            "문자열": "string",
            "숫자": "number",
            "생성": "create",
            "삭제": "delete",
            "저장": "save",
            "실행": "run",
            "테스트": "test",
        },
        wake_words=["야 vox", "안녕 vox"],
    ),
    "ru": LanguageConfig(
        code="ru",
        name="Russian",
        native_name="Русский",
        whisper_code="ru",
        programming_terms={
            "функция": "function",
            "переменная": "variable",
            "класс": "class",
            "метод": "method",
            "если": "if",
            "иначе": "else",
            "пока": "while",
            "для": "for",
            "вернуть": "return",
            "импорт": "import",
            "истина": "true",
            "ложь": "false",
            "ноль": "null",
            "список": "list",
            "словарь": "dict",
            "строка": "string",
            "число": "number",
            "создать": "create",
            "удалить": "delete",
            "сохранить": "save",
            "запустить": "run",
            "тестировать": "test",
        },
        wake_words=["эй vox", "привет vox"],
    ),
    "ar": LanguageConfig(
        code="ar",
        name="Arabic",
        native_name="العربية",
        whisper_code="ar",
        programming_terms={
            "دالة": "function",
            "متغير": "variable",
            "فئة": "class",
            "طريقة": "method",
            "إذا": "if",
            "وإلا": "else",
            "بينما": "while",
            "لكل": "for",
            "إرجاع": "return",
            "استيراد": "import",
            "صحيح": "true",
            "خطأ": "false",
            "فارغ": "null",
            "قائمة": "list",
            "قاموس": "dict",
            "نص": "string",
            "رقم": "number",
            "إنشاء": "create",
            "حذف": "delete",
            "حفظ": "save",
            "تشغيل": "run",
            "اختبار": "test",
        },
        wake_words=["يا vox", "مرحبا vox"],
    ),
    "hi": LanguageConfig(
        code="hi",
        name="Hindi",
        native_name="हिन्दी",
        whisper_code="hi",
        programming_terms={
            "फंक्शन": "function",
            "वेरिएबल": "variable",
            "क्लास": "class",
            "मेथड": "method",
            "अगर": "if",
            "वरना": "else",
            "जबकि": "while",
            "के लिए": "for",
            "वापस": "return",
            "इंपोर्ट": "import",
            "सच": "true",
            "झूठ": "false",
            "नल": "null",
            "सूची": "list",
            "शब्दकोश": "dict",
            "स्ट्रिंग": "string",
            "नंबर": "number",
            "बनाएं": "create",
            "हटाएं": "delete",
            "सेव": "save",
            "चलाएं": "run",
            "टेस्ट": "test",
        },
        wake_words=["अरे vox", "हेलो vox"],
    ),
}


# All languages supported by Whisper (for reference)
WHISPER_LANGUAGES = [
    "en", "zh", "de", "es", "ru", "ko", "fr", "ja", "pt", "tr", "pl", "ca", "nl",
    "ar", "sv", "it", "id", "hi", "fi", "vi", "he", "uk", "el", "ms", "cs", "ro",
    "da", "hu", "ta", "no", "th", "ur", "hr", "bg", "lt", "la", "mi", "ml", "cy",
    "sk", "te", "fa", "lv", "bn", "sr", "az", "sl", "kn", "et", "mk", "br", "eu",
    "is", "hy", "ne", "mn", "bs", "kk", "sq", "sw", "gl", "mr", "pa", "si", "km",
    "sn", "yo", "so", "af", "oc", "ka", "be", "tg", "sd", "gu", "am", "yi", "lo",
    "uz", "fo", "ht", "ps", "tk", "nn", "mt", "sa", "lb", "my", "bo", "tl", "mg",
    "as", "tt", "haw", "ln", "ha", "ba", "jw", "su",
]


class LanguageManager:
    """Manages language detection and translation for coding."""

    def __init__(self, default_language: str = "en"):
        self.default_language = default_language
        self._current_language = default_language

    @property
    def current_language(self) -> str:
        return self._current_language

    @current_language.setter
    def current_language(self, value: str):
        if value in LANGUAGES or value in WHISPER_LANGUAGES:
            self._current_language = value

    def get_config(self, lang: str = None) -> LanguageConfig:
        """Get language configuration."""
        lang = lang or self._current_language
        return LANGUAGES.get(lang, LANGUAGES["en"])

    def translate_to_code(self, text: str, source_lang: str = None) -> str:
        """
        Translate native programming terms to English code equivalents.

        Example:
            "créer fonction calculer" -> "create function calculate" (French)
        """
        config = self.get_config(source_lang)

        for native_term, code_term in config.programming_terms.items():
            text = text.replace(native_term, code_term)
            text = text.replace(native_term.capitalize(), code_term)
            text = text.replace(native_term.upper(), code_term.upper())

        return text

    def get_wake_words(self, lang: str = None) -> List[str]:
        """Get wake words for a language."""
        config = self.get_config(lang)
        return config.wake_words

    def detect_language_from_text(self, text: str) -> Optional[str]:
        """
        Detect language from text content.

        Uses simple heuristics for now - could be enhanced with a proper
        language detection model.
        """
        # Check for non-ASCII characters
        for lang_code, config in LANGUAGES.items():
            # Check if any programming terms from this language are present
            for term in config.programming_terms.keys():
                if term in text.lower():
                    return lang_code

        return None

    def build_prompt_for_language(self, lang: str = None) -> str:
        """Build a language-specific prompt for better transcription."""
        config = self.get_config(lang)

        if config.code == "en":
            return ""

        # Build prompt with native terms
        terms = ", ".join(config.programming_terms.keys())

        return f"""
Programming in {config.name} ({config.native_name}):
Native programming terms: {terms}

Transcribe the spoken programming commands, preserving the native language terms.
"""

    def get_supported_languages(self) -> List[Dict[str, str]]:
        """Get list of supported languages with full info."""
        return [
            {
                "code": config.code,
                "name": config.name,
                "native_name": config.native_name,
            }
            for config in LANGUAGES.values()
        ]

    def format_language_list(self) -> str:
        """Format language list for display."""
        lines = []
        for config in LANGUAGES.values():
            lines.append(f"  {config.code:5} {config.name:15} ({config.native_name})")
        return "\n".join(lines)


# Global instance
_language_manager: LanguageManager | None = None


def get_language_manager() -> LanguageManager:
    """Get global language manager instance."""
    global _language_manager
    if _language_manager is None:
        _language_manager = LanguageManager()
    return _language_manager
