import sqlite3

try:
    conn = sqlite3.connect("enterprise.db")
    conn.execute("ALTER TABLE projects ADD COLUMN latest_issues TEXT")
    conn.commit()
    print("Successfully added latest_issues.")
    conn.close()
except sqlite3.OperationalError as e:
    print(f"Error or already exists: {e}")
