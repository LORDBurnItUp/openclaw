"""Code analysis using tree-sitter for AST parsing."""

from __future__ import annotations

import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import Any

try:
    import tree_sitter_languages as tsl
except ImportError:
    tsl = None

from voxcode.core.events import EventBus


logger = logging.getLogger(__name__)


@dataclass
class Symbol:
    """A code symbol (function, class, variable, etc.)."""
    name: str
    kind: str  # function, class, method, variable, parameter, import
    line: int
    column: int
    end_line: int | None = None
    end_column: int | None = None
    parent: str | None = None
    signature: str | None = None
    docstring: str | None = None
    children: list[Symbol] = field(default_factory=list)


@dataclass
class CodeContext:
    """Context information about current code position."""
    file_path: Path | None = None
    language: str | None = None
    line: int = 0
    column: int = 0

    # Current scope
    current_function: str | None = None
    current_class: str | None = None
    current_block: str | None = None  # if, for, try, etc.

    # Symbols in scope
    symbols: list[Symbol] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)

    # File info
    is_code_file: bool = False
    file_content: str = ""

    @property
    def scope_path(self) -> str:
        """Get full scope path (e.g., 'ClassName.method_name')."""
        parts = []
        if self.current_class:
            parts.append(self.current_class)
        if self.current_function:
            parts.append(self.current_function)
        return ".".join(parts) if parts else "module"


# Language detection by file extension
LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".cpp": "cpp",
    ".c": "c",
    ".h": "c",
    ".hpp": "cpp",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".cs": "c_sharp",
    ".lua": "lua",
    ".r": "r",
    ".R": "r",
    ".scala": "scala",
    ".hs": "haskell",
    ".elm": "elm",
    ".ex": "elixir",
    ".exs": "elixir",
    ".erl": "erlang",
    ".ml": "ocaml",
    ".vim": "vim",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "bash",
    ".fish": "fish",
    ".ps1": "powershell",
    ".sql": "sql",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json",
    ".toml": "toml",
    ".md": "markdown",
    ".rst": "rst",
}


class CodeAnalyzer:
    """
    Analyzes code using tree-sitter for AST parsing.

    Provides:
    - Symbol extraction (functions, classes, variables)
    - Scope detection
    - Import tracking
    - Context at cursor position
    """

    def __init__(self, bus: EventBus | None = None) -> None:
        if tsl is None:
            raise ImportError(
                "tree-sitter-languages not installed. "
                "Run: pip install tree-sitter-languages"
            )

        self.bus = bus
        self._parsers: dict[str, Any] = {}

    def _get_parser(self, language: str) -> Any:
        """Get or create parser for language."""
        if language not in self._parsers:
            try:
                self._parsers[language] = tsl.get_parser(language)
            except Exception as e:
                logger.warning(f"No parser for {language}: {e}")
                return None
        return self._parsers[language]

    def detect_language(self, file_path: Path | str) -> str | None:
        """Detect language from file extension."""
        path = Path(file_path)
        return LANGUAGE_MAP.get(path.suffix.lower())

    def analyze_file(self, file_path: Path | str) -> CodeContext:
        """Analyze a code file."""
        path = Path(file_path)

        if not path.exists():
            return CodeContext(file_path=path)

        language = self.detect_language(path)
        content = path.read_text(encoding="utf-8", errors="replace")

        return self.analyze_code(content, language, path)

    def analyze_code(
        self,
        code: str,
        language: str | None = None,
        file_path: Path | None = None
    ) -> CodeContext:
        """Analyze code and extract symbols."""
        ctx = CodeContext(
            file_path=file_path,
            language=language,
            is_code_file=language is not None,
            file_content=code
        )

        if not language:
            return ctx

        parser = self._get_parser(language)
        if not parser:
            return ctx

        try:
            tree = parser.parse(bytes(code, "utf8"))
            root = tree.root_node

            # Extract symbols based on language
            ctx.symbols = self._extract_symbols(root, language, code)
            ctx.imports = self._extract_imports(root, language, code)

        except Exception as e:
            logger.error(f"Parse error: {e}")

        return ctx

    def get_context_at_position(
        self,
        code: str,
        line: int,
        column: int,
        language: str | None = None,
        file_path: Path | None = None
    ) -> CodeContext:
        """Get code context at a specific position."""
        ctx = self.analyze_code(code, language, file_path)
        ctx.line = line
        ctx.column = column

        if not language:
            return ctx

        parser = self._get_parser(language)
        if not parser:
            return ctx

        try:
            tree = parser.parse(bytes(code, "utf8"))

            # Find node at position
            point = (line, column)
            node = self._find_node_at_point(tree.root_node, point)

            if node:
                # Walk up to find containing function/class
                ctx.current_function = self._find_containing_function(node, language)
                ctx.current_class = self._find_containing_class(node, language)
                ctx.current_block = self._find_containing_block(node, language)

        except Exception as e:
            logger.error(f"Context detection error: {e}")

        return ctx

    def _extract_symbols(
        self,
        root_node: Any,
        language: str,
        code: str
    ) -> list[Symbol]:
        """Extract symbols from AST."""
        symbols = []

        # Define node types to look for based on language
        if language == "python":
            function_types = ["function_definition", "async_function_definition"]
            class_types = ["class_definition"]
            import_types = ["import_statement", "import_from_statement"]
        elif language in ("javascript", "typescript"):
            function_types = ["function_declaration", "arrow_function", "method_definition"]
            class_types = ["class_declaration"]
            import_types = ["import_statement"]
        elif language == "go":
            function_types = ["function_declaration", "method_declaration"]
            class_types = ["type_declaration"]
            import_types = ["import_declaration"]
        elif language == "rust":
            function_types = ["function_item"]
            class_types = ["struct_item", "impl_item", "trait_item"]
            import_types = ["use_declaration"]
        else:
            function_types = ["function_definition", "function_declaration", "method_definition"]
            class_types = ["class_definition", "class_declaration"]
            import_types = ["import_statement"]

        def walk(node: Any, parent_name: str | None = None):
            node_type = node.type

            # Check for functions
            if node_type in function_types:
                name = self._get_name(node, language)
                if name:
                    symbols.append(Symbol(
                        name=name,
                        kind="function" if not parent_name else "method",
                        line=node.start_point[0],
                        column=node.start_point[1],
                        end_line=node.end_point[0],
                        end_column=node.end_point[1],
                        parent=parent_name,
                        signature=self._get_signature(node, code),
                    ))

            # Check for classes
            if node_type in class_types:
                name = self._get_name(node, language)
                if name:
                    symbols.append(Symbol(
                        name=name,
                        kind="class",
                        line=node.start_point[0],
                        column=node.start_point[1],
                        end_line=node.end_point[0],
                        end_column=node.end_point[1],
                    ))
                    # Process children with class as parent
                    for child in node.children:
                        walk(child, name)
                    return  # Don't recurse again

            # Recurse into children
            for child in node.children:
                walk(child, parent_name)

        walk(root_node)
        return symbols

    def _extract_imports(
        self,
        root_node: Any,
        language: str,
        code: str
    ) -> list[str]:
        """Extract import statements."""
        imports = []

        def walk(node: Any):
            if "import" in node.type.lower():
                # Get the full import text
                import_text = code[node.start_byte:node.end_byte]
                imports.append(import_text.strip())

            for child in node.children:
                walk(child)

        walk(root_node)
        return imports

    def _get_name(self, node: Any, language: str) -> str | None:
        """Get the name of a function/class node."""
        # Look for identifier child
        for child in node.children:
            if child.type == "identifier" or child.type == "name":
                return child.text.decode("utf8")
            if child.type == "property_identifier":
                return child.text.decode("utf8")
        return None

    def _get_signature(self, node: Any, code: str) -> str | None:
        """Get function signature."""
        # Get first line of function
        start = node.start_byte
        end = code.find("\n", start)
        if end == -1:
            end = node.end_byte
        return code[start:end].strip()

    def _find_node_at_point(self, node: Any, point: tuple[int, int]) -> Any | None:
        """Find the most specific node at a point."""
        if not (node.start_point <= point <= node.end_point):
            return None

        for child in node.children:
            result = self._find_node_at_point(child, point)
            if result:
                return result

        return node

    def _find_containing_function(self, node: Any, language: str) -> str | None:
        """Find the function containing a node."""
        function_types = {
            "function_definition", "async_function_definition",
            "function_declaration", "method_definition",
            "function_item", "method_declaration"
        }

        current = node
        while current:
            if current.type in function_types:
                return self._get_name(current, language)
            current = current.parent

        return None

    def _find_containing_class(self, node: Any, language: str) -> str | None:
        """Find the class containing a node."""
        class_types = {
            "class_definition", "class_declaration",
            "struct_item", "impl_item", "trait_item"
        }

        current = node
        while current:
            if current.type in class_types:
                return self._get_name(current, language)
            current = current.parent

        return None

    def _find_containing_block(self, node: Any, language: str) -> str | None:
        """Find the block type containing a node (if, for, try, etc.)."""
        block_types = {
            "if_statement": "if",
            "for_statement": "for",
            "while_statement": "while",
            "try_statement": "try",
            "with_statement": "with",
            "match_statement": "match",
        }

        current = node
        while current:
            if current.type in block_types:
                return block_types[current.type]
            current = current.parent

        return None


def get_symbols_summary(context: CodeContext) -> str:
    """Get a summary of symbols for AI context."""
    lines = []

    classes = [s for s in context.symbols if s.kind == "class"]
    functions = [s for s in context.symbols if s.kind == "function"]
    methods = [s for s in context.symbols if s.kind == "method"]

    if classes:
        lines.append(f"Classes: {', '.join(c.name for c in classes)}")

    if functions:
        lines.append(f"Functions: {', '.join(f.name for f in functions)}")

    if methods:
        by_class: dict[str, list[str]] = {}
        for m in methods:
            parent = m.parent or "unknown"
            by_class.setdefault(parent, []).append(m.name)

        for cls, meths in by_class.items():
            lines.append(f"  {cls}: {', '.join(meths)}")

    if context.imports:
        lines.append(f"Imports: {len(context.imports)} statements")

    return "\n".join(lines)
