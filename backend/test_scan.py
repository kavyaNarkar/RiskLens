import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'enterprise_scanner'))

from enterprise_scanner.monitoring import run_project_scan

try:
    print(run_project_scan(18, 'scanme.nmap.org'))
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
