from enterprise_scanner.database_enterprise import get_connection
from datetime import datetime

import json

def record_scan(project_id: int, score: int, issues: list = None):
    conn = get_connection()
    cursor = conn.cursor()

    now = datetime.utcnow()

    cursor.execute("""
        INSERT INTO scan_history (project_id, score)
        VALUES (?, ?)
    """, (project_id, score))

    if issues is not None:
        issues_json = json.dumps(issues)
        cursor.execute("""
            UPDATE projects
            SET last_scan_score=?, last_scan_time=?, latest_issues=?
            WHERE id=?
        """, (score, now, issues_json, project_id))
    else:
        cursor.execute("""
            UPDATE projects
            SET last_scan_score=?, last_scan_time=?
            WHERE id=?
        """, (score, now, project_id))

    conn.commit()
    conn.close()


def get_trend(project_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT score, timestamp
        FROM scan_history
        WHERE project_id=?
        ORDER BY timestamp ASC
    """, (project_id,))

    history = cursor.fetchall()
    conn.close()

    return history


def calculate_score_change(project_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT score
        FROM scan_history
        WHERE project_id=?
        ORDER BY timestamp DESC
        LIMIT 2
    """, (project_id,))

    rows = cursor.fetchall()
    conn.close()

    if len(rows) < 2:
        return 0

    return rows[0]["score"] - rows[1]["score"]

def predict_future_risk(project_id: int):
    history = get_trend(project_id)
    if not history or len(history) < 2:
        return {
            "projected_score": history[-1]["score"] if history else 100,
            "status_text": "Insufficient data to project trend. Need more scans."
        }
    
    # Calculate simple velocity over the last 5 scans
    recent = history[-5:]
    start_score = recent[0]["score"]
    end_score = recent[-1]["score"]
    
    # time span in seconds
    import time
    from datetime import datetime
    
    start_time = recent[0]["timestamp"]
    end_time = recent[-1]["timestamp"]
    
    # average change per scan
    scans_count = max(1, len(recent) - 1)
    change_per_scan = (end_score - start_score) / scans_count
    
    # extrapolate for 4 more scans (~1 month if weekly)
    projected = end_score + (change_per_scan * 4)
    projected = max(0, min(100, projected))
    
    if projected < 40:
        status = "Critical Risk Trajectory"
    elif projected < 70:
        status = "Deteriorating Posture"
    elif change_per_scan < -0.1:
        status = "Slow Decline Detected"
    elif change_per_scan > 0.1:
        status = "Improving Posture"
    else:
        status = "Stable Posture"
        
    return {
        "projected_score": projected,
        "status_text": status
    }

