from datetime import datetime, timedelta
from enterprise_scanner.database_enterprise import get_connection

# Elevated rate limits for Enterprise users
MAX_REQUESTS_PER_HOUR = 5000

def check_rate_limit(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    one_hour_ago = datetime.utcnow() - timedelta(hours=1)

    cursor.execute("""
        SELECT COUNT(*) as count
        FROM rate_limits
        WHERE user_id=? AND timestamp >= ?
    """, (user_id, one_hour_ago))

    result = cursor.fetchone()
    request_count = result["count"]

    if request_count >= MAX_REQUESTS_PER_HOUR:
        conn.close()
        return False

    # Insert current request
    cursor.execute("""
        INSERT INTO rate_limits (user_id)
        VALUES (?)
    """, (user_id,))

    conn.commit()
    conn.close()

    return True
