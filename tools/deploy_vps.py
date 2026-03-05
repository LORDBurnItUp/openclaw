#!/usr/bin/env python3
"""
Deploy OpenClaw Next.js app to Hostinger VPS via SSH.
Uses paramiko for SSH/SFTP without needing sshpass.

Run: python tools/deploy_vps.py
"""
import sys
import os
import time
from pathlib import Path

ROOT    = Path(__file__).parent.parent
NEXT_DIR = ROOT / "next-infastructure-scrapers"

# ─── Hostinger VPS credentials ───────────────────────────────────────────────
SSH_HOST = "46.202.197.97"
SSH_PORT = 65002
SSH_USER = "u142089309"
SSH_PASS = "3Strada666!"
REMOTE_DIR = "/home/u142089309/openclaw"

def connect():
    import paramiko
    print(f"🔌 Connecting to {SSH_USER}@{SSH_HOST}:{SSH_PORT} ...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=SSH_HOST,
        port=SSH_PORT,
        username=SSH_USER,
        password=SSH_PASS,
        timeout=30,
        banner_timeout=30,
    )
    print("✓ SSH connected")
    return client

def run(client, cmd, show=True):
    if show:
        print(f"  $ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, get_pty=True)
    out = stdout.read().decode(errors="replace").strip()
    err = stderr.read().decode(errors="replace").strip()
    if out and show:
        print(f"    {out[-500:] if len(out) > 500 else out}")
    if err and show and "warning" not in err.lower():
        print(f"    ⚠ {err[-200:]}")
    return out

def upload_file(sftp, local_path: Path, remote_path: str):
    """Upload a single file, creating remote dirs as needed."""
    remote_dir = os.path.dirname(remote_path)
    try:
        sftp.makedirs(remote_dir)
    except Exception:
        pass
    sftp.put(str(local_path), remote_path)

def upload_dir(sftp, local_dir: Path, remote_dir: str, skip_patterns=None):
    """Recursively upload a directory via SFTP."""
    skip_patterns = skip_patterns or []
    count = 0
    for local_file in local_dir.rglob("*"):
        if local_file.is_dir():
            continue
        # Skip patterns
        rel = local_file.relative_to(local_dir)
        rel_str = str(rel)
        if any(p in rel_str for p in skip_patterns):
            continue
        remote_path = f"{remote_dir}/{rel_str.replace(os.sep, '/')}"
        # Ensure remote dir exists
        remote_file_dir = os.path.dirname(remote_path)
        try:
            sftp.mkdir(remote_file_dir)
        except Exception:
            pass
        try:
            sftp.put(str(local_file), remote_path)
            count += 1
        except Exception as e:
            print(f"    ⚠ Failed to upload {rel_str}: {e}")
    return count

def makedirs_recursive(sftp, path):
    """Create remote directory tree."""
    parts = path.split("/")
    current = ""
    for part in parts:
        if not part:
            continue
        current = f"{current}/{part}"
        try:
            sftp.mkdir(current)
        except Exception:
            pass  # Already exists

def deploy():
    import paramiko

    client = connect()
    sftp = client.open_sftp()

    print("\n📁 Setting up remote directory ...")
    makedirs_recursive(sftp, REMOTE_DIR)

    print("\n📦 Checking Node.js + PM2 on server ...")
    node_ver = run(client, "node --version 2>/dev/null || echo MISSING")
    pm2_ver  = run(client, "pm2 --version 2>/dev/null || echo MISSING")

    if "MISSING" in node_ver:
        print("  Installing Node.js 20 LTS ...")
        run(client, "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt-get install -y nodejs")

    if "MISSING" in pm2_ver:
        print("  Installing PM2 ...")
        run(client, "sudo npm install -g pm2")

    print("\n📤 Uploading package.json + server.js ...")
    for f in ["package.json", "package-lock.json", "server.js", "next.config.ts", "tsconfig.json"]:
        local = NEXT_DIR / f
        if local.exists():
            try:
                sftp.put(str(local), f"{REMOTE_DIR}/{f}")
                print(f"  ✓ {f}")
            except Exception as e:
                print(f"  ⚠ {f}: {e}")

    print("\n📤 Uploading .next build output ...")
    next_dir = NEXT_DIR / ".next"
    if not next_dir.exists():
        print("  ❌ .next directory not found! Run 'npm run build' first.")
        sys.exit(1)

    makedirs_recursive(sftp, f"{REMOTE_DIR}/.next")
    skip = ["cache", ".turbo"]
    count = upload_dir(sftp, next_dir, f"{REMOTE_DIR}/.next", skip_patterns=skip)
    print(f"  ✓ Uploaded {count} build files")

    print("\n📤 Uploading public/ ...")
    pub_dir = NEXT_DIR / "public"
    if pub_dir.exists():
        makedirs_recursive(sftp, f"{REMOTE_DIR}/public")
        count = upload_dir(sftp, pub_dir, f"{REMOTE_DIR}/public")
        print(f"  ✓ Uploaded {count} public files")

    print("\n📤 Uploading types/ ...")
    types_dir = NEXT_DIR / "types"
    if types_dir.exists():
        makedirs_recursive(sftp, f"{REMOTE_DIR}/types")
        count = upload_dir(sftp, types_dir, f"{REMOTE_DIR}/types")
        print(f"  ✓ Uploaded {count} type files")

    print("\n📝 Writing .env.local on server ...")
    env_content = (NEXT_DIR / ".env.local").read_text()
    # Write via echo to avoid sftp issues with special chars
    # Use heredoc approach
    env_cmd = f"cat > {REMOTE_DIR}/.env.local << 'ENVEOF'\n{env_content}\nENVEOF"
    _, stdout, stderr = client.exec_command(env_cmd, get_pty=True)
    stdout.read()
    print("  ✓ .env.local written")

    print("\n📦 Installing production dependencies ...")
    run(client, f"cd {REMOTE_DIR} && npm install --omit=dev --legacy-peer-deps 2>&1 | tail -5")

    print("\n🚀 Starting / restarting with PM2 ...")
    # Stop existing if running
    run(client, f"cd {REMOTE_DIR} && pm2 stop openclaw 2>/dev/null || true")
    run(client, f"cd {REMOTE_DIR} && pm2 delete openclaw 2>/dev/null || true")
    # Start fresh
    start_out = run(client, f"cd {REMOTE_DIR} && NODE_ENV=production PORT=3000 pm2 start server.js --name openclaw --update-env")
    run(client, "pm2 save")

    print("\n🏥 Checking server health ...")
    time.sleep(4)
    health = run(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || echo FAILED")
    print(f"  HTTP status: {health}")

    pm2_status = run(client, "pm2 list")
    print("\n✅ Deployment complete!")
    print(f"   Site: http://{SSH_HOST}:3000 (configure Nginx/domain to proxy)")
    print(f"   Domain: https://KingsFromEarthDevelopment.com")

    sftp.close()
    client.close()

if __name__ == "__main__":
    deploy()
