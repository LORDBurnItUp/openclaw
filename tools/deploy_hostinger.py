#!/usr/bin/env python3
"""
Deploy OpenClaw to Hostinger via FTP.

Usage:
    python tools/deploy_hostinger.py

Requirements:
    - HOSTINGER_DOMAIN_1_FTP_HOST, _USER, _PASS set in .env
    - Next.js static export already built (npm run build inside next-infastructure-scrapers/)
"""

import sys
import os
from pathlib import Path

# Project root
ROOT = Path(__file__).parent.parent
NEXT_DIR = ROOT / "next-infastructure-scrapers"
OUT_DIR = NEXT_DIR / "out"

sys.path.insert(0, str(ROOT))

from tools.core.env import load_env
load_env()

from tools.core.hostinger import ftp_upload_folder, ftp_connect


def check_build():
    if not OUT_DIR.exists() or not any(OUT_DIR.iterdir()):
        print("❌ No build output found.")
        print(f"   Run this first (in WSL):")
        print(f"   cd '{NEXT_DIR}' && npm run build")
        sys.exit(1)
    files = list(OUT_DIR.rglob("*"))
    print(f"✓ Build output ready — {len(files)} files in out/")


def test_connection():
    print("🔌 Testing FTP connection...")
    try:
        ftp = ftp_connect(1)
        pwd = ftp.pwd()
        ftp.quit()
        print(f"✓ Connected to FTP  (cwd: {pwd})")
    except Exception as e:
        print(f"❌ FTP connection failed: {e}")
        print("   Check HOSTINGER_DOMAIN_1_FTP_* values in your .env file")
        sys.exit(1)


def deploy():
    print("🚀 Uploading to /public_html/ ...")
    try:
        uploaded = ftp_upload_folder(
            local_folder=str(OUT_DIR),
            remote_folder="/public_html",
            domain_num=1,
        )
        print(f"✓ Uploaded {len(uploaded)} files")
        domain = os.environ.get("HOSTINGER_DOMAIN_1", "your-domain.com")
        print(f"\n🎉 Live at: https://{domain}")
        print(f"   Or:       https://KingsFromEarthDevelopment.com")
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    print("=" * 50)
    print("  OpenClaw → Hostinger Deploy")
    print("=" * 50)
    check_build()
    test_connection()
    deploy()
