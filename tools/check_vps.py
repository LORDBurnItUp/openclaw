#!/usr/bin/env python3
"""Check VPS status and fix if needed."""
import time

SSH_HOST   = "46.202.197.97"
SSH_PORT   = 65002
SSH_USER   = "u142089309"
SSH_PASS   = "3Strada666!"
REMOTE_DIR = "/home/u142089309/openclaw"
NODE       = "/opt/alt/alt-nodejs22/root/usr/bin/node"
NPM        = "/opt/alt/alt-nodejs22/root/usr/bin/npm"
PM2        = "/home/u142089309/.local/bin/pm2"

def connect():
    import paramiko
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS, timeout=30)
    return c

def run(c, cmd, timeout=60):
    _, out, err = c.exec_command(cmd, timeout=timeout)
    o = out.read().decode(errors="replace").strip()
    e = err.read().decode(errors="replace").strip()
    print(f"  $ {cmd[:80]}")
    if o: print(f"    {o[-800:]}")
    if e and "warn" not in e.lower(): print(f"    ERR: {e[-200:]}")
    return o

c = connect()
print("Connected\n")

print("=== PM2 logs ===")
run(c, f"PATH=/home/{SSH_USER}/.local/bin:{NODE.rsplit('/', 1)[0]}:$PATH {PM2} logs openclaw --lines 30 --nostream 2>/dev/null || cat ~/.pm2/logs/openclaw-error.log 2>/dev/null | tail -30")

print("\n=== Check next module ===")
run(c, f"ls {REMOTE_DIR}/node_modules/.bin/next 2>/dev/null && echo 'next binary found' || echo 'next NOT FOUND'")
run(c, f"ls {REMOTE_DIR}/node_modules/next/package.json 2>/dev/null | head -1 && echo 'next module found' || echo 'next module NOT FOUND'")

print("\n=== Files on server ===")
run(c, f"ls {REMOTE_DIR}/")

print("\n=== Manual server test ===")
run(c, f"cd {REMOTE_DIR} && PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH NODE_ENV=production PORT=3001 {NODE} server.js &", timeout=5)
time.sleep(6)
health = run(c, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001")
print(f"\nHTTP 3001: {health}")
run(c, "pkill -f 'node.*server.js' 2>/dev/null; true")

print("\n=== Restart PM2 with full PATH ===")
# Write a wrapper script
wrapper = f"""#!/bin/bash
export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH
export NODE_ENV=production
export PORT=3000
cd {REMOTE_DIR}
exec {NODE} server.js
"""
run(c, f"cat > {REMOTE_DIR}/start.sh << 'BASHEOF'\n{wrapper}\nBASHEOF")
run(c, f"chmod +x {REMOTE_DIR}/start.sh")

# Kill existing and restart
run(c, f"PATH=/opt/alt/alt-nodejs22/root/usr/bin:{PM2.rsplit('/', 1)[0]}:$PATH {PM2} stop openclaw 2>/dev/null; {PM2} delete openclaw 2>/dev/null; true")
run(c, f"PATH=/opt/alt/alt-nodejs22/root/usr/bin:{PM2.rsplit('/', 1)[0]}:$PATH {PM2} start {REMOTE_DIR}/start.sh --name openclaw --update-env")

time.sleep(8)
print("\n=== Final health check ===")
health = run(c, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000")
print(f"\nHTTP 3000: {health}")

print("\n=== PM2 status ===")
run(c, f"PATH=/opt/alt/alt-nodejs22/root/usr/bin:{PM2.rsplit('/', 1)[0]}:$PATH {PM2} list")

c.close()
