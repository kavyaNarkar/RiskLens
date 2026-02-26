from enterprise_scanner.database_enterprise import get_connection


def create_project(user_id: int, domain: str, frequency: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO projects (user_id, domain, monitoring_frequency)
        VALUES (?, ?, ?)
    """, (user_id, domain, frequency))

    conn.commit()
    conn.close()


def get_user_projects(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM projects WHERE user_id=?", (user_id,))
    projects = cursor.fetchall()
    conn.close()

    return projects
