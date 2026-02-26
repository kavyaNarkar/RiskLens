import threading
import time
from enterprise_scanner.monitoring import run_all_monitored_projects

def start_monitoring_loop():
    def loop():
        while True:
            print("Running enterprise monitoring cycle...")
            run_all_monitored_projects()
            time.sleep(3600)  # runs every 1 hour

    thread = threading.Thread(target=loop, daemon=True)
    thread.start()
