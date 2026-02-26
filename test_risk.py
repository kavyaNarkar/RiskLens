from backend.scanner.risk_engine import calculate_risk
from backend.enterprise_scanner.trend_engine import predict_future_risk
import sqlite3
import os

# Test Risk Engine
mock_issues = [
    {"name": "Port 80 Open", "severity": "High", "category": "Port Exposure"},
    {"name": "Missing CSP Header", "severity": "Medium", "category": "Header Security"},
    {"name": "HTTPS Not Enabled", "severity": "Critical", "category": "Transport Security"}
]

score, level, compliance, summary = calculate_risk(mock_issues)

print("--- RISK ENGINE TEST ---")
print(f"Score: {score}, Level: {level}, Compliance: {compliance}")
print("Executive Summary HTML:")
print(summary)


# Test Trend Engine
# First, setup dummy db environment so we don't pollute the real one
db_path = "test_enterprise.db"
conn = sqlite3.connect(db_path)
conn.execute("""
    CREATE TABLE IF NOT EXISTS scan_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        score INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
""")

import time

# Mock 5 scans improving over time
base_time = time.time() - 86400 * 5
for i, sc in enumerate([30, 45, 55, 65, 80]):
    # Add fake scans
    dt = base_time + (86400 * i)
    # Using python datetime
    from datetime import datetime
    dt_str = datetime.fromtimestamp(dt).strftime('%Y-%m-%d %H:%M:%S')
    conn.execute("INSERT INTO scan_history (project_id, score, timestamp) VALUES (999, ?, ?)", (sc, dt_str))
conn.commit()
conn.close()

# Mock get_connection behavior during test
import backend.enterprise_scanner.trend_engine as te
def mock_get_conn():
    return sqlite3.connect(db_path)
te.get_connection = mock_get_conn

try:
    print("\n--- TREND ENGINE TEST ---")
    prediction = predict_future_risk(999)
    print("Trend Prediction:", prediction)
finally:
    if os.path.exists(db_path):
        os.remove(db_path)
