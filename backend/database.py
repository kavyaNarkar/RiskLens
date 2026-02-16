import sqlite3
from datetime import datetime

conn = sqlite3.connect("storage.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT,
    score INTEGER,
    level TEXT,
    timestamp TEXT
)
""")
conn.commit()

def save_scan(url, score, level):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        "INSERT INTO scans (url, score, level, timestamp) VALUES (?, ?, ?, ?)",
        (url, score, level, timestamp)
    )
    conn.commit()

def get_history():
    cursor.execute("SELECT score, timestamp FROM scans ORDER BY id DESC LIMIT 10")
    rows = cursor.fetchall()
    return [{"score": r[0], "timestamp": r[1]} for r in rows]
