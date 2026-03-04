#!/usr/bin/env python3
"""
Environment variable loader for OpenClaw infrastructure.
No external dependencies required.

Usage:
    from tools.core.env import env, load_env

    # Load .env file (call once at startup)
    load_env()

    # Get variables
    api_key = env("ANTHROPIC_API_KEY")
    db_host = env("HOSTINGER_DB_HOST", default="localhost")

    # Get multiple related vars
    hostinger = env.group("HOSTINGER")
    # Returns: {"EMAIL": "...", "DB_HOST": "...", ...}
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any


def find_env_file() -> Optional[Path]:
    """Find .env file by walking up from current directory."""
    current = Path.cwd()

    # Check current and parent directories
    for _ in range(10):  # Max 10 levels up
        env_path = current / ".env"
        if env_path.exists():
            return env_path

        # Also check if we're in a subdirectory of the project
        parent = current.parent
        if parent == current:  # Reached root
            break
        current = parent

    # Fallback: check the script's directory
    script_dir = Path(__file__).parent.parent.parent
    env_path = script_dir / ".env"
    if env_path.exists():
        return env_path

    return None


def parse_env_file(filepath: Path) -> Dict[str, str]:
    """Parse .env file into dictionary."""
    env_vars = {}

    with open(filepath, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()

            # Skip empty lines and comments
            if not line or line.startswith('#'):
                continue

            # Handle KEY=VALUE format
            if '=' in line:
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip()

                # Remove quotes if present
                if (value.startswith('"') and value.endswith('"')) or \
                   (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]

                if key:
                    env_vars[key] = value

    return env_vars


def load_env(filepath: Optional[str] = None, override: bool = False) -> bool:
    """
    Load environment variables from .env file.

    Args:
        filepath: Path to .env file (auto-detected if None)
        override: If True, override existing env vars

    Returns:
        True if .env file was loaded, False otherwise
    """
    if filepath:
        env_path = Path(filepath)
    else:
        env_path = find_env_file()

    if not env_path or not env_path.exists():
        return False

    env_vars = parse_env_file(env_path)

    for key, value in env_vars.items():
        if override or key not in os.environ:
            os.environ[key] = value

    return True


class EnvGetter:
    """Helper class for getting environment variables."""

    def __call__(self, key: str, default: Optional[str] = None, required: bool = False) -> Optional[str]:
        """
        Get an environment variable.

        Args:
            key: Variable name
            default: Default value if not found
            required: If True, raise error when not found

        Returns:
            Variable value or default
        """
        value = os.environ.get(key)

        if value is None:
            if required:
                raise ValueError(f"Required environment variable '{key}' not set")
            return default

        return value

    def group(self, prefix: str) -> Dict[str, str]:
        """
        Get all environment variables with a common prefix.

        Args:
            prefix: Variable prefix (e.g., "HOSTINGER")

        Returns:
            Dict with prefix stripped from keys
        """
        prefix_with_underscore = f"{prefix}_"
        result = {}

        for key, value in os.environ.items():
            if key.startswith(prefix_with_underscore):
                # Remove prefix and underscore
                short_key = key[len(prefix_with_underscore):]
                result[short_key] = value

        return result

    def int(self, key: str, default: int = 0) -> int:
        """Get environment variable as integer."""
        value = self(key)
        if value is None:
            return default
        try:
            return int(value)
        except ValueError:
            return default

    def bool(self, key: str, default: bool = False) -> bool:
        """Get environment variable as boolean."""
        value = self(key)
        if value is None:
            return default
        return value.lower() in ('true', '1', 'yes', 'on')

    def list(self, key: str, separator: str = ',') -> list:
        """Get environment variable as list."""
        value = self(key)
        if not value:
            return []
        return [item.strip() for item in value.split(separator)]


# Global instance
env = EnvGetter()


# Auto-load .env on import
_loaded = load_env()


if __name__ == "__main__":
    # CLI tool to check env vars
    import sys

    if len(sys.argv) > 1:
        key = sys.argv[1]
        value = env(key)
        if value:
            print(value)
        else:
            print(f"Not set: {key}", file=sys.stderr)
            sys.exit(1)
    else:
        # List all loaded vars (redacted)
        env_path = find_env_file()
        if env_path:
            print(f"Loaded from: {env_path}")
            vars_loaded = parse_env_file(env_path)
            print(f"\nVariables configured: {len([v for v in vars_loaded.values() if v])}")
            print(f"Variables empty: {len([v for v in vars_loaded.values() if not v])}")
            print("\nConfigured services:")

            # Group by service
            services = {}
            for key, value in vars_loaded.items():
                if value:
                    service = key.split('_')[0]
                    services[service] = services.get(service, 0) + 1

            for service, count in sorted(services.items()):
                print(f"  - {service}: {count} vars")
        else:
            print("No .env file found")
            sys.exit(1)
