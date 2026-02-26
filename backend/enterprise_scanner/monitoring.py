import time
from enterprise_scanner.database_enterprise import get_connection
from enterprise_scanner.trend_engine import record_scan
from enterprise_scanner.alerts import send_risk_alert, send_webhook_alert
from scanner.header_analyzer import analyze_headers
from scanner.ssl_checker import check_ssl
from scanner.port_scanner import scan_ports
from scanner.risk_engine import calculate_risk
from enterprise_scanner.alert_engine import evaluate_and_store_alert
from datetime import datetime, timedelta

from scanner.domain_checker import check_domain_expiry

def run_project_scan(project_id: int, domain: str, mode: str = "deep"):
    scan_start_time = time.time()
    conn = get_connection()
    cursor = conn.cursor()

    # Get previous score
    cursor.execute(
        "SELECT last_scan_score FROM projects WHERE id=?",
        (project_id,)
    )
    project = cursor.fetchone()

    previous_score = None
    if project and project["last_scan_score"] is not None:
        previous_score = project["last_scan_score"]

    # Run scanning modules based on mode
    issues = []
    
    # Quick mode: Only fast checks
    if mode == "quick":
        issues += analyze_headers(domain)
    # Deep mode: Standard full scan 
    elif mode == "deep":
        issues += analyze_headers(domain)
        issues += check_ssl(domain)
        issues += scan_ports(domain)
    # Enterprise mode: Deep + Expiry Watchers
    elif mode == "enterprise":
        issues += analyze_headers(domain)
        issues += check_ssl(domain)
        issues += scan_ports(domain)
        issues += check_domain_expiry(domain)
        
    # Store the domain in the issue dict so calculate_risk can fuzz score based on it
    for issue in issues:
        issue["domain"] = domain

    score, level, compliance_score, executive_summary = calculate_risk(issues)

    # Record new score and issues
    record_scan(project_id, score, issues)

    # After calculating new score:
    if previous_score is not None:
        evaluate_and_store_alert(project_id, previous_score, score)

    alert_triggered = False

    # Alert logic
    if previous_score is not None:
        drop = previous_score - score
        if drop > 0:
            alert_triggered = True
            
            # Get user settings
            cursor.execute("""
                SELECT user_settings.email_digest, user_settings.webhook_url, user_settings.auto_escalate
                FROM projects
                JOIN user_settings ON projects.user_id = user_settings.user_id
                WHERE projects.id=?
            """, (project_id,))
            settings = cursor.fetchone()
            
            email_digest = 1
            webhook_url = ""
            auto_escalate = 1
            
            if settings:
                email_digest = settings["email_digest"]
                webhook_url = settings["webhook_url"]
                auto_escalate = settings["auto_escalate"]
            
            # Send alert logic
            if email_digest == 1:
                send_risk_alert(project_id, domain, previous_score, score)
            if webhook_url:
                send_webhook_alert(webhook_url, project_id, domain, previous_score, score)
            
            # Escalate scan automatically if a drop is detected and not already at max depth
            if auto_escalate == 1 and mode != "enterprise":
                print(f"[ESCALATION] Risk Drop Detected ({drop} pts). Escalating target {domain} to Enterprise mode.")
                # We return the executed escalated run result instantly instead of the current one
                conn.close()
                return run_project_scan(project_id, domain, mode="enterprise")

    conn.close()

    scan_duration_seconds = round(time.time() - scan_start_time, 2)

    return {
        "score": score,
        "level": level,
        "compliance_score": compliance_score,
        "executive_summary": executive_summary,
        "alert_triggered": alert_triggered,
        "issues": issues,
        "scan_duration_seconds": scan_duration_seconds
    }


def run_all_monitored_projects():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, domain, monitoring_frequency, last_scan_time
        FROM projects
        WHERE monitoring_enabled = 1
    """)

    projects = cursor.fetchall()
    conn.close()

    results = []

    now = datetime.utcnow()

    for project in projects:
        should_scan = False

        if project["last_scan_time"] is None:
            should_scan = True
        else:
            last_scan = datetime.fromisoformat(project["last_scan_time"])

            if project["monitoring_frequency"] == "daily":
                if now - last_scan >= timedelta(days=1):
                    should_scan = True

            elif project["monitoring_frequency"] == "weekly":
                if now - last_scan >= timedelta(weeks=1):
                    should_scan = True

        if should_scan:
            result = run_project_scan(project["id"], project["domain"])
            results.append(result)

    return results

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, domain
        FROM projects
        WHERE monitoring_enabled = 1
    """)

    projects = cursor.fetchall()
    conn.close()

    results = []

    for project in projects:
        result = run_project_scan(project["id"], project["domain"])
        results.append(result)

    return results
