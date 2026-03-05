#!/usr/bin/env python3
"""
Start OpenClaw on Hostinger VPS using alt-nodejs22 + PM2.
Files already uploaded by deploy_vps.py.
"""
import time

SSH_HOST   = "46.202.197.97"
SSH_PORT   = 65002
SSH_USER   = "u142089309"
SSH_PASS   = "3Strada666!"
REMOTE_DIR = "/home/u142089309/openclaw"
NODE       = "/opt/alt/alt-nodejs22/root/usr/bin/node"
NPM        = "/opt/alt/alt-nodejs22/root/usr/bin/npm"
NPX        = "/opt/alt/alt-nodejs22/root/usr/bin/npx"

def connect():
    import paramiko
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=SSH_HOST, port=SSH_PORT, username=SSH_USER,
                   password=SSH_PASS, timeout=30)
    print("SSH connected")
    return client

def run(client, cmd, timeout=120, show=True):
    if show:
        print(f"  $ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors="replace").strip()
    err = stderr.read().decode(errors="replace").strip()
    if out and show:
        for line in out.split("\n")[-12:]:
            print(f"    {line}")
    if err and show and "warn" not in err.lower() and err:
        for line in err.split("\n")[-4:]:
            if line.strip():
                print(f"    ERR: {line}")
    return out

def main():
    client = connect()

    print("\n--- Node.js version ---")
    run(client, f"{NODE} --version && {NPM} --version")

    print("\n--- Install PM2 globally ---")
    run(client, f"{NPM} install -g pm2 2>&1 | tail -3", timeout=120)

    # Find pm2 binary
    pm2_out = run(client, "which pm2 2>/dev/null || find /home -name 'pm2' -type f 2>/dev/null | head -3", show=False)
    pm2 = pm2_out.split("\n")[0].strip() if pm2_out else f"{NODE} /home/{SSH_USER}/.npm-global/bin/pm2"
    print(f"    pm2 path: {pm2}")

    # Try common npm global paths
    pm2_paths = [
        f"/home/{SSH_USER}/.npm-global/bin/pm2",
        f"/home/{SSH_USER}/.local/lib/node_modules/pm2/bin/pm2",
        f"/opt/alt/alt-nodejs22/root/usr/bin/pm2",
        "/usr/local/bin/pm2",
        "/usr/bin/pm2",
    ]

    pm2_bin = None
    for p in pm2_paths:
        check = run(client, f"test -f {p} && echo YES || echo NO", show=False)
        if "YES" in check:
            pm2_bin = p
            break

    if not pm2_bin:
        # Use npx pm2 as fallback
        pm2_bin = f"{NODE} $(find /home -name 'pm2' -path '*/bin/pm2' 2>/dev/null | head -1)"
        print("    Using npx pm2 as fallback")
        # Install with prefix
        run(client, f"{NPM} install -g pm2 --prefix=/home/{SSH_USER}/.local 2>&1 | tail -3", timeout=120)
        pm2_check = run(client, f"ls /home/{SSH_USER}/.local/bin/pm2 2>/dev/null || ls /home/{SSH_USER}/.local/lib/node_modules/.bin/pm2 2>/dev/null", show=False)
        if pm2_check:
            pm2_bin = pm2_check.split("\n")[0].strip()

    print(f"\n--- PM2: {pm2_bin} ---")

    print("\n--- Install app dependencies ---")
    run(client, f"cd {REMOTE_DIR} && PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH {NPM} install --omit=dev --legacy-peer-deps 2>&1 | tail -6", timeout=180)

    print("\n--- Start with PM2 ---")
    env_prefix = f"NODE_ENV=production PORT=3000 PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH"

    if pm2_bin and "not found" not in pm2_bin.lower():
        run(client, f"cd {REMOTE_DIR} && {pm2_bin} stop openclaw 2>/dev/null; {pm2_bin} delete openclaw 2>/dev/null; true")
        start_result = run(client, f"cd {REMOTE_DIR} && {env_prefix} {pm2_bin} start server.js --interpreter {NODE} --name openclaw --update-env")
        run(client, f"{pm2_bin} save 2>/dev/null")
        run(client, f"{pm2_bin} list")
    else:
        # Pure node background start as fallback
        print("    PM2 not found, starting with nohup node ...")
        run(client, f"pkill -f 'node.*server.js' 2>/dev/null; true")
        run(client, f"cd {REMOTE_DIR} && {env_prefix} nohup {NODE} server.js > /home/{SSH_USER}/openclaw.log 2>&1 &")
        run(client, f"sleep 2 && echo 'Process started'")

    print("\n--- Health check ---")
    time.sleep(5)
    health = run(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || echo 000")
    print(f"\nHTTP {health}")

    if health == "200":
        print("Site is LIVE on port 3000!")
    else:
        print("Checking logs...")
        run(client, f"cat /home/{SSH_USER}/openclaw.log 2>/dev/null | tail -20 || true")

    # Show server log
    run(client, f"tail -5 /home/{SSH_USER}/openclaw.log 2>/dev/null || true")

    print(f"\nApp deployed to: http://{SSH_HOST}:3000")
    print("Domain: https://KingsFromEarthDevelopment.com")
    print("(Make sure Hostinger's Node.js app is configured in hPanel)")
    client.close()

if __name__ == "__main__":
    main()
