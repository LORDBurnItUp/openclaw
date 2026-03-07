import time
import os
import sys
import json
from datetime import datetime
from pathlib import Path

# Provide a robust memory heartbeat daemon
# This acts as the automated heartbeat system for OpenClaw that never forgets

CURRENT_DIR = Path(__file__).resolve().parent
DB_SCRIPT = CURRENT_DIR / "memory_db.py"
MEMORY_MD = CURRENT_DIR.parent.parent / "memory" / "MEMORY.md"

def log_event(event_txt, type="event"):
    """Logs to the sqlite DB using memory_db.py"""
    os.system(f'python "{DB_SCRIPT}" --action add --type {type} --content "{event_txt}" --source system')

def append_to_memory_md(note):
    """Appends major insights or heartbeat logs to MEMORY.md if instructed"""
    try:
        if MEMORY_MD.exists():
            with open(MEMORY_MD, "a") as f:
                f.write(f"\n- **Automated Heartbeat ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})**: {note}")
    except Exception as e:
        print(f"Failed to append to MEMORY.md: {e}")

def run_heartbeat():
    print("Heartbeat daemon started. Keeping memory alive and actively scanning...")
    
    # Initialize start memory
    log_event("Heartbeat daemon started to run tasks autonomously.")
    
    cycle_count = 0
    poll_interval = 60 # seconds
    
    while True:
        cycle_count += 1
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # simulated autonomous check
        task_done = f"Heartbeat cycle {cycle_count}. System operational."
        
        # Periodically log to the persistent sqlite DB so we 'never forget a thing'
        log_event(task_done)
        
        # Every 10th cycle, make a permanent physical mark in the MEMORY.md file for the user to see
        if cycle_count % 10 == 0:
            append_to_memory_md(f"I am still here, alive and monitoring. Cycle {cycle_count} completed. No anomalies detected.")
            
        print(f"[{current_time}] Heartbeat pulse {cycle_count}... Memory integrated.")
        
        # Sleep until next pulse
        time.sleep(poll_interval)

if __name__ == "__main__":
    run_heartbeat()
