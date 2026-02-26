import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from enterprise_scanner.database_enterprise import get_connection
import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()

SENDER_EMAIL = os.getenv("EMAIL_USER", "narkarp.kavya@gmail.com")
SENDER_PASSWORD = os.getenv("EMAIL_PASS", "ceky dkst iykn aoui")

def send_webhook_alert(webhook_url: str, project_id: int, domain: str, old_score: int, new_score: int):
    if not webhook_url:
        return
        
    payload = {
        "text": f"🚨 *RiskLens Security Alert* 🚨\nRisk score for *{domain}* dropped from {old_score} to {new_score}. Immediate review recommended."
    }
    
    req = urllib.request.Request(webhook_url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    try:
        urllib.request.urlopen(req)
        print(f"[WEBHOOK SENT] Alert sent to {webhook_url}")
    except Exception as e:
        print("Webhook sending failed:", e)

def send_risk_alert(project_id: int, domain: str, old_score: int, new_score: int):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT users.email
        FROM users
        JOIN projects ON users.id = projects.user_id
        WHERE projects.id=?
    """, (project_id,))

    user = cursor.fetchone()
    conn.close()

    if not user:
        return

    receiver_email = user["email"]

    subject = f"[RiskLens ALERT] Security Score Drop for {domain}"

    body = f"""
    Your website security score has decreased.

    Domain: {domain}
    Previous Score: {old_score}
    Current Score: {new_score}

    Immediate review recommended.

    — RiskLens Enterprise Monitoring
    """

    message = MIMEMultipart()
    message["From"] = SENDER_EMAIL
    message["To"] = receiver_email
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, receiver_email, message.as_string())
        server.quit()
        print(f"[EMAIL SENT] Alert sent to {receiver_email}")
    except Exception as e:
        print("Email sending failed:", e)
