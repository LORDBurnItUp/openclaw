#!/usr/bin/env python3
"""
Fix VPS: install TypeScript + create next.config.js, then restart PM2.
Root cause: next.config.ts triggers TS auto-install but npm not in child PATH.
"""
import time

SSH_HOST   = "46.202.197.97"
SSH_PORT   = 65002
SSH_USER   = "u142089309"
SSH_PASS   = "3Strada666!"
REMOTE_DIR = "/home/u142089309/openclaw"
NODE       = "/opt/alt/alt-nodejs22/root/usr/bin/node"
NPM        = "/opt/alt/alt-nodejs22/root/usr/bin/npm"
PM2        = "/home/u142089309/.local/bin/pm2"
PATH_ENV   = f"PATH={NODE.rsplit('/', 1)[0]}:/home/{SSH_USER}/.local/bin:$PATH"

def connect():
    import paramiko
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS, timeout=30)
    print("Connected")
    return c

def run(c, cmd, timeout=120):
    _, out, err = c.exec_command(cmd, timeout=timeout)
    o = out.read().decode(errors="replace").strip()
    e = err.read().decode(errors="replace").strip()
    print(f"$ {cmd[:120]}")
    if o: print(o[-800:])
    if e and "warn" not in e.lower(): print(f"STDERR: {e[-300:]}")
    return o

c = connect()

# Fix 1: Create next.config.js (JS version, no TS needed)
print("\n=== Fix 1: next.config.js (replaces .ts) ===")
next_config_js = """/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
"""
run(c, f"cat > {REMOTE_DIR}/next.config.js << 'CFEOF'\n{next_config_js}\nCFEOF")
# Remove the TS config so Next.js uses the JS one
run(c, f"rm -f {REMOTE_DIR}/next.config.ts")
run(c, f"cat {REMOTE_DIR}/next.config.js")

# Fix 2: Install TypeScript as fallback (in case anything else needs it)
print("\n=== Fix 2: Install TypeScript on server ===")
run(c, f"cd {REMOTE_DIR} && {PATH_ENV} {NPM} install --save-dev typescript 2>&1 | tail -5", timeout=120)

# Fix 3: Update start.sh to export NPM path explicitly
print("\n=== Fix 3: Update start.sh with explicit NPM path ===")
start_sh = f"""#!/bin/bash
export PATH={NODE.rsplit('/', 1)[0]}:/home/{SSH_USER}/.local/bin:$PATH
export npm_execpath={NPM}
export NODE_ENV=production
export PORT=3000
cd {REMOTE_DIR}
exec {NODE} server.js
"""
run(c, f"cat > {REMOTE_DIR}/start.sh << 'SHEOF'\n{start_sh}\nSHEOF")
run(c, f"chmod +x {REMOTE_DIR}/start.sh")

# Restart PM2
print("\n=== Restarting PM2 ===")
run(c, f"{PATH_ENV} {PM2} stop openclaw 2>/dev/null; {PATH_ENV} {PM2} delete openclaw 2>/dev/null; true")
run(c, "pkill -f 'node.*server' 2>/dev/null; true")
time.sleep(2)
run(c, f"{PATH_ENV} {PM2} start {REMOTE_DIR}/start.sh --name openclaw")

print("\n=== Waiting 12s for startup ===")
time.sleep(12)

health = run(c, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000")
print(f"\nHTTP 3000: {health}")

if health == "200":
    print("SERVER IS LIVE!")
else:
    print("Still down — logs:")
    run(c, f"cat ~/.pm2/logs/openclaw-error.log 2>/dev/null | tail -30")
    run(c, f"cat ~/.pm2/logs/openclaw-out.log 2>/dev/null | tail -20")

print("\n=== PM2 list ===")
run(c, f"{PATH_ENV} {PM2} list")

c.close()
