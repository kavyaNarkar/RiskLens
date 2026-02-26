from enterprise_scanner.database_enterprise import get_connection


def evaluate_and_store_alert(project_id: int, previous_score: int, new_score: int):

    if previous_score is None:
        return

    drop = previous_score - new_score

    severity = None
    message = None

    if drop >= 20:
        severity = "critical"
        message = f"Critical security drop of {drop} points detected."

    elif drop >= 10:
        severity = "high"
        message = f"High risk increase detected: score dropped {drop} points."

    elif drop >= 5:
        severity = "warning"
        message = f"Security score decreased by {drop} points."

    if severity:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO alerts (project_id, severity, message)
            VALUES (?, ?, ?)
        """, (project_id, severity, message))

        conn.commit()
        conn.close()
