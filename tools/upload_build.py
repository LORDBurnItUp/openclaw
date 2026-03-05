#!/usr/bin/env python3
"""
Upload the .next production build to Hostinger VPS and restart PM2.
Run: python tools/upload_build.py
"""
import os
import sys
import time
from pathlib import Path

ROOT     = Path(__file__).parent.parent
NEXT_DIR = ROOT / "next-infastructure-scrapers"

SSH_HOST   = "46.202.197.97"
SSH_PORT   = 65002
SSH_USER   = "u142089309"
SSH_PASS   = "3Strada666!"
REMOTE_DIR = "/home/u142089309/openclaw"
NODE       = "/opt/alt/alt-nodejs22/root/usr/bin/node"
PM2        = "/home/u142089309/.local/bin/pm2"

# Files/dirs in .next we DON'T need on the server
SKIP_DIRS  = {"dev", "diagnostics", "types"}

def connect():
    import paramiko
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS, timeout=30)
    print("SSH connected")
    return c

def run(c, cmd, timeout=120):
    _, out, err = c.exec_command(cmd, timeout=timeout)
    o = out.read().decode(errors="replace").strip()
    e = err.read().decode(errors="replace").strip()
    print(f"  $ {cmd[:100]}")
    if o: print(f"    {o[-600:]}")
    if e and "warn" not in e.lower(): print(f"    ERR: {e[-200:]}")
    return o

def mkdir_p(sftp, remote_path):
    """Create remote directory tree."""
    parts = [p for p in remote_path.split("/") if p]
    current = ""
    for part in parts:
        current = f"{current}/{part}"
        try:
            sftp.mkdir(current)
        except Exception:
            pass

def upload_dir(sftp, local_dir: Path, remote_dir: str, skip_dirs=None):
    """Recursively upload directory via SFTP, skipping listed subdirs."""
    skip_dirs = skip_dirs or set()
    count = 0
    errors = 0
    for local_file in sorted(local_dir.rglob("*")):
        if local_file.is_dir():
            continue
        rel = local_file.relative_to(local_dir)
        # Skip unwanted dirs
        parts = rel.parts
        if any(p in skip_dirs for p in parts):
            continue
        remote_path = f"{remote_dir}/{'/'.join(parts)}"
        remote_file_dir = "/".join(remote_path.split("/")[:-1])
        mkdir_p(sftp, remote_file_dir)
        try:
            sftp.put(str(local_file), remote_path)
            count += 1
            if count % 50 == 0:
                print(f"    ... {count} files uploaded")
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"    WARN: {rel}: {e}")
    return count

def main():
    import paramiko

    # Verify .next exists locally
    next_build = NEXT_DIR / ".next"
    if not next_build.exists():
        print("ERROR: .next not found. Run: npm run build")
        sys.exit(1)

    c = connect()
    sftp = c.open_sftp()

    # Check what's already on server
    print("\n=== Current server state ===")
    run(c, f"ls {REMOTE_DIR}/")

    print("\n=== Uploading .next build ===")
    mkdir_p(sftp, f"{REMOTE_DIR}/.next")
    count = upload_dir(
        sftp,
        next_build,
        f"{REMOTE_DIR}/.next",
        skip_dirs=SKIP_DIRS,
    )
    print(f"  Uploaded {count} files to .next/")

    # Upload app source so Next.js SSR works
    print("\n=== Uploading app/ source ===")
    app_dir = NEXT_DIR / "app"
    if app_dir.exists():
        mkdir_p(sftp, f"{REMOTE_DIR}/app")
        count2 = upload_dir(sftp, app_dir, f"{REMOTE_DIR}/app")
        print(f"  Uploaded {count2} source files")

    # Write .env.local
    print("\n=== Writing .env.local ===")
    env_path = NEXT_DIR / ".env.local"
    if env_path.exists():
        env_content = env_path.read_text(encoding="utf-8", errors="replace")
        # Write line by line to avoid heredoc issues
        escaped = env_content.replace("'", "'\\''")
        c.exec_command(f"cat > {REMOTE_DIR}/.env.local << 'ENVEOF'\n{env_content}\nENVEOF")
        time.sleep(1)
        print("  .env.local written")

    sftp.close()

    # Verify .next is there
    print("\n=== Verifying upload ===")
    run(c, f"ls {REMOTE_DIR}/.next/ | head -10")
    run(c, f"ls {REMOTE_DIR}/.next/server/ | head -5")

    # Create start wrapper with correct PATH
    print("\n=== Writing start.sh ===")
    start_sh = f"""#!/bin/bash
export PATH={NODE.rsplit('/', 1)[0]}:/home/{SSH_USER}/.local/bin:$PATH
export NODE_ENV=production
export PORT=3000
cd {REMOTE_DIR}
exec {NODE} server.js
"""
    run(c, f"printf '%s' '{start_sh.replace(chr(39), chr(39)+chr(92)+chr(39)+chr(39))}' > {REMOTE_DIR}/start.sh || echo WRITE_FAILED")
    run(c, f"cat > {REMOTE_DIR}/start.sh << 'SHEOF'\n{start_sh}\nSHEOF")
    run(c, f"chmod +x {REMOTE_DIR}/start.sh")

    # Kill old processes and restart
    print("\n=== Restarting PM2 ===")
    pm2_env = f"PATH={NODE.rsplit('/', 1)[0]}:/home/{SSH_USER}/.local/bin:$PATH"
    run(c, f"{pm2_env} {PM2} stop openclaw 2>/dev/null; {pm2_env} {PM2} delete openclaw 2>/dev/null; true")
    run(c, f"pkill -f 'node.*server' 2>/dev/null; true")
    time.sleep(2)
    run(c, f"{pm2_env} {PM2} start {REMOTE_DIR}/start.sh --name openclaw --update-env")

    # Wait and health check
    print("\n=== Health check (waiting 10s) ===")
    time.sleep(10)
    health = run(c, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000")
    print(f"\nHTTP 3000: {health}")

    if health == "200":
        print("SERVER IS LIVE!")
    else:
        print("Still not responding — checking logs...")
        run(c, f"tail -30 /home/{SSH_USER}/.pm2/logs/openclaw-error.log 2>/dev/null || true")
        run(c, f"tail -20 /home/{SSH_USER}/.pm2/logs/openclaw-out.log 2>/dev/null || true")

    print("\n=== PM2 status ===")
    run(c, f"{pm2_env} {PM2} list")

    c.close()

if __name__ == "__main__":
    main()
