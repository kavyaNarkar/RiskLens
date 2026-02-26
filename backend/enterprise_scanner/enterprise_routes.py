from enterprise_scanner.trend_engine import calculate_score_change
from enterprise_scanner.trend_engine import get_trend, calculate_score_change, predict_future_risk
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends
from enterprise_scanner.models import UserCreate, UserLogin, ProjectCreate
from enterprise_scanner.database_enterprise import get_connection
from enterprise_scanner.auth import (
    hash_password,
    authenticate_user,
    create_access_token,
    get_current_user
)
from enterprise_scanner.project_manager import create_project, get_user_projects

from enterprise_scanner.rate_limiter import check_rate_limit
from enterprise_scanner.monitoring import run_project_scan
from fastapi import Depends
from fastapi.security import OAuth2PasswordRequestForm
from enterprise_scanner.auth import verify_password, create_access_token
from scanner.library_data import get_vulnerability_library




router = APIRouter(prefix="/enterprise", tags=["Enterprise"])


@router.post("/signup")
def signup(user: UserCreate):
    conn = get_connection()
    cursor = conn.cursor()

    hashed_pw = hash_password(user.password)

    try:
        cursor.execute(
            "INSERT INTO users (email, hashed_password) VALUES (?, ?)",
            (user.email, hashed_pw)
        )
        conn.commit()
    except Exception:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already exists")

    conn.close()
    return {"message": "User created successfully"}

    conn = get_connection()
    cursor = conn.cursor()

    hashed_pw = hash_password(user.password)

    try:
        cursor.execute(
            "INSERT INTO users (email, password) VALUES (?, ?)",
            (user.email, hashed_pw)
        )
        conn.commit()
    except:
        raise HTTPException(status_code=400, detail="Email already exists")

    conn.close()
    return {"message": "User created successfully"}


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE email=?", (form_data.username,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    access_token = create_access_token({"sub": user["email"]})


    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

from pydantic import BaseModel
class GoogleAuthRequest(BaseModel):
    token: str

import os
from google.oauth2 import id_token
from google.auth.transport import requests

@router.post("/auth/google")
def google_auth(request: GoogleAuthRequest):
    token = request.token
    
    # Using hardcoded Client ID to bypass Windows dotenv parsing issues during test
    CLIENT_ID = "1076109837665-u8uhfs6s2p89hvnkf05lebm0l0fnkvmf.apps.googleusercontent.com"
    
    try:
        # Verify the token with Google (allow 30 seconds of clock skew)
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            CLIENT_ID,
            clock_skew_in_seconds=60
        )
        
        email = idinfo.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
            
        conn = get_connection()
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute("SELECT * FROM users WHERE email=?", (email,))
        user = cursor.fetchone()
        
        if not user:
            # Auto-register new user from Google Login
            import secrets
            random_pw = secrets.token_hex(16)
            hashed_pw = hash_password(random_pw)
            cursor.execute(
                "INSERT INTO users (email, hashed_password) VALUES (?, ?)",
                (email, hashed_pw)
            )
            conn.commit()
            
        conn.close()
        
        # Generate our native JWT
        access_token = create_access_token({"sub": email})
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    except ValueError as e:
        print(f"FAILED TO VERIFY GOOGLE TOKEN: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")



@router.post("/project")
def add_project(project: ProjectCreate,
                current_user=Depends(get_current_user)):

    conn = get_connection()
    cursor = conn.cursor()

    # ⭐ Check existing project
    cursor.execute(
        "SELECT id FROM projects WHERE user_id=?",
        (current_user["id"],)
    )

    existing = cursor.fetchone()

    # ⭐ If exists → delete old one
    if existing:

        cursor.execute(
            "DELETE FROM projects WHERE user_id=?",
            (current_user["id"],)
        )

    # ⭐ Create new project
    cursor.execute("""
        INSERT INTO projects
        (user_id, domain, monitoring_frequency)
        VALUES (?, ?, ?)
    """,
    (
        current_user["id"],
        project.domain,
        project.monitoring_frequency
    ))

    conn.commit()

    project_id = cursor.lastrowid

    conn.close()

    return {
        "message":"Project Created",
        "project_id": project_id
    }

    conn = get_connection()
    cursor = conn.cursor()

    # ⭐ Allow only ONE PROJECT
    cursor.execute(
    "SELECT id FROM projects WHERE user_id=?",
    (current_user["id"],)
    )

    existing = cursor.fetchone()

    if existing:

        conn.close()

        raise HTTPException(
        status_code=400,
        detail="Project already exists"
        )

    cursor.execute("""

    INSERT INTO projects
    (user_id,domain,monitoring_frequency)

    VALUES(?,?,?)

    """,

    (

    current_user["id"],
    project.domain,
    project.monitoring_frequency

    )

    )

    conn.commit()

    project_id = cursor.lastrowid

    conn.close()

    return {

    "message":"Project created",

    "project_id":project_id

    }

    conn = get_connection()
    cursor = conn.cursor()

    # ✅ CHECK IF USER ALREADY HAS PROJECT
    cursor.execute(
        "SELECT id FROM projects WHERE user_id=?",
        (current_user["id"],)
    )

    existing = cursor.fetchone()

    if existing:
        conn.close()

        raise HTTPException(
            status_code=400,
            detail="Project already exists"
        )

    # ✅ CREATE NEW PROJECT
    create_project(
        current_user["id"],
        project.domain,
        project.monitoring_frequency
    )

    conn.close()

    return {"message": "Project added"}



@router.get("/projects")
def list_projects(current_user=Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM projects
        WHERE user_id=?
    """, (current_user["id"],))

    projects = cursor.fetchall()
    conn.close()

    enriched_projects = []
    all_vulnerabilities = []

    for p in projects:
        score_change = calculate_score_change(p["id"])

        if score_change > 0:
            trend = "improving"
        elif score_change < 0:
            trend = "declining"
        else:
            trend = "stable"

        enriched_projects.append({
            "id": p["id"],
            "domain": p["domain"],
            "last_scan_score": p["last_scan_score"],
            "last_scan_time": p["last_scan_time"],
            "monitoring_enabled": p["monitoring_enabled"],
            "monitoring_frequency": p["monitoring_frequency"],
            "trend": trend,
            "score_change": score_change
        })

        if p["latest_issues"]:
            try:
                issues = json.loads(p["latest_issues"])
                for issue in issues:
                    all_vulnerabilities.append({
                        "name": issue.get("name", "Unknown Issue"),
                        "severity": issue.get("severity", "Medium"),
                        "domain": p["domain"],
                        "project_id": p["id"]
                    })
            except Exception:
                pass

    # Sort vulnerabilities by severity
    severity_rank = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    all_vulnerabilities.sort(key=lambda x: severity_rank.get(x["severity"], 4))

    return {
        "projects": enriched_projects,
        "recent_vulnerabilities": all_vulnerabilities[:10]
    }



@router.get("/trend/{project_id}")
def get_project_trend(project_id: int, current_user=Depends(get_current_user)):

    # Ensure project belongs to user
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM projects
        WHERE id=? AND user_id=?
    """, (project_id, current_user["id"]))

    project = cursor.fetchone()
    conn.close()

    if not project:
        raise HTTPException(status_code=403, detail="Unauthorized project access")

    history = get_trend(project_id)
    score_change = calculate_score_change(project_id)

    trend_status = "stable"

    if score_change > 0:
        trend_status = "improving"
    elif score_change < 0:
        trend_status = "declining"

    prediction = predict_future_risk(project_id)

    return {
        "history": [dict(row) for row in history],
        "score_change": score_change,
        "trend_status": trend_status,
        "prediction": prediction
    }

@router.put("/project/{project_id}/enable")
def enable_monitoring(project_id: int, current_user=Depends(get_current_user)):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE projects
        SET monitoring_enabled=1
        WHERE id=? AND user_id=?
    """, (project_id, current_user["id"]))

    conn.commit()
    conn.close()

    return {"message": "Monitoring enabled"}


@router.put("/project/{project_id}/disable")
def disable_monitoring(project_id: int, current_user=Depends(get_current_user)):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE projects
        SET monitoring_enabled=0
        WHERE id=? AND user_id=?
    """, (project_id, current_user["id"]))

    conn.commit()
    conn.close()

    return {"message": "Monitoring disabled"}

@router.put("/project/{project_id}/frequency")
def update_frequency(project_id: int, frequency: str, current_user=Depends(get_current_user)):

    if frequency not in ["daily", "weekly"]:
        raise HTTPException(status_code=400, detail="Invalid frequency")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE projects
        SET monitoring_frequency=?
        WHERE id=? AND user_id=?
    """, (frequency, project_id, current_user["id"]))

    conn.commit()
    conn.close()

    return {"message": f"Monitoring frequency updated to {frequency}"}

from scanner.risk_engine import enhanced_compliance_score
import json
from datetime import datetime, timedelta

@router.get("/dashboard")
def enterprise_dashboard(current_user=Depends(get_current_user)):

    conn = get_connection()
    cursor = conn.cursor()

    # Fetch all user projects
    cursor.execute("""
        SELECT id, domain, last_scan_score, monitoring_enabled, latest_issues, monitoring_frequency, last_scan_time
        FROM projects
        WHERE user_id=?
    """, (current_user["id"],))

    projects = cursor.fetchall()
    conn.close()

    total_projects = len(projects)
    monitored_projects = sum(1 for p in projects if p["monitoring_enabled"] == 1)

    scores = [p["last_scan_score"] for p in projects if p["last_scan_score"] is not None]

    average_score = sum(scores) / len(scores) if scores else 0

    improving = 0
    declining = 0
    stable = 0
    
    all_issues = []
    
    upcoming_scans = []
    now = datetime.utcnow()

    for project in projects:
        # Score Changes
        change = calculate_score_change(project["id"])

        if change > 0:
            improving += 1
        elif change < 0:
            declining += 1
        else:
            stable += 1
            
        if project["latest_issues"]:
            try:
                issues = json.loads(project["latest_issues"])
                for issue in issues:
                    # Inject domain to the issue so triage table can show it
                    issue["domain"] = project["domain"]
                    all_issues.append(issue)
            except Exception:
                pass
            
    # Calculate global compliance score based on all active issues
    global_compliance = enhanced_compliance_score(all_issues)

    # Sort vulnerabilities by severity for Global Triage Action
    severity_rank = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    triage_issues = []
    
    for issue in all_issues:
        triage_issues.append({
            "name": issue.get("name", "Unknown Issue"),
            "severity": issue.get("severity", "Medium"),
            "domain": issue.get("domain", "Unknown Target")
        })

    triage_issues.sort(key=lambda x: severity_rank.get(x["severity"], 4))

    # Calculate Upcoming Scans
    for project in projects:
        if project["monitoring_enabled"] == 1:
            next_scan_time = None
            if not project["last_scan_time"]:
                next_scan_time = now
            else:
                last_scan = datetime.fromisoformat(project["last_scan_time"])
                if project["monitoring_frequency"] == "daily":
                    next_scan_time = last_scan + timedelta(days=1)
                elif project["monitoring_frequency"] == "weekly":
                    next_scan_time = last_scan + timedelta(weeks=1)
                else:
                    next_scan_time = last_scan + timedelta(days=1) # Default
            
            upcoming_scans.append({
                "domain": project["domain"],
                "frequency": project["monitoring_frequency"],
                "next_scan": next_scan_time.isoformat() if next_scan_time else None
            })
            
    # Sort upcoming scans by next_scan time
    upcoming_scans.sort(key=lambda x: x["next_scan"] if x["next_scan"] else "")

    return {
        "total_projects": total_projects,
        "monitored_projects": monitored_projects,
        "average_score": round(average_score, 2),
        "improving_projects": improving,
        "declining_projects": declining,
        "stable_projects": stable,
        "compliance": global_compliance,
        "recent_vulnerabilities": triage_issues[:10],
        "upcoming_scans": upcoming_scans[:5]
    }

@router.post("/project/{project_id}/scan")
def manual_scan(project_id: int, mode: str = "deep", current_user=Depends(get_current_user)):

    if not check_rate_limit(current_user["id"]):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT domain FROM projects
        WHERE id=? AND user_id=?
    """, (project_id, current_user["id"]))

    project = cursor.fetchone()
    conn.close()

    if not project:
        raise HTTPException(status_code=403, detail="Unauthorized project access")

    if mode not in ["quick", "deep", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid scan mode")

    result = run_project_scan(project_id, project["domain"], mode=mode)

    return result

@router.get("/alerts")
def get_alerts(current_user=Depends(get_current_user)):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT alerts.*, projects.domain
        FROM alerts
        JOIN projects ON alerts.project_id = projects.id
        WHERE projects.user_id=?
        ORDER BY alerts.created_at DESC
    """, (current_user["id"],))

    alerts = cursor.fetchall()
    conn.close()

    # Alerts table
    return {"alerts": [dict(a) for a in alerts]}

import json

@router.get("/library")
def get_library(current_user=Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT domain, latest_issues FROM projects WHERE user_id=?", (current_user["id"],))
    projects = cursor.fetchall()
    conn.close()

    affected_map = {}
    for p in projects:
        if p["latest_issues"]:
            try:
                issues = json.loads(p["latest_issues"])
                for issue in issues:
                    v_name = issue.get("name")
                    if v_name:
                        if v_name not in affected_map:
                            affected_map[v_name] = []
                        if p["domain"] not in affected_map[v_name]:
                            affected_map[v_name].append(p["domain"])
            except Exception:
                pass

    library = get_vulnerability_library()

    for item in library:
        item["affected_domains"] = affected_map.get(item["name"], [])

    # Sort so vulnerabilities affecting user domains appear at the top
    library.sort(key=lambda x: (len(x["affected_domains"]) == 0, x["name"]))

    return {"library": library}

@router.get("/project/{project_id}/report/pdf")
def download_pdf_report(project_id: int, current_user=Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM projects
        WHERE id=? AND user_id=?
    """, (project_id, current_user["id"]))
    project = cursor.fetchone()

    if not project:
        conn.close()
        raise HTTPException(status_code=403, detail="Unauthorized project access")

    if not project["latest_issues"]:
        conn.close()
        raise HTTPException(status_code=400, detail="No scan data available yet to generate a report.")

    from scanner.risk_engine import calculate_risk
    import json
    
    issues = json.loads(project["latest_issues"])
    score, level, compliance_score, executive_summary = calculate_risk(issues)

    scan_results = {
        "score": score,
        "level": level,
        "compliance_score": compliance_score,
        "executive_summary": executive_summary,
        "issues": issues,
        "domain": project["domain"]
    }

    conn.close()

    from pdf_generator import generate_pdf_report
    from fastapi.responses import FileResponse
    import os
    
    file_path = generate_pdf_report(scan_results)
    
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type='application/pdf', filename=f"{project['domain']}_audit_report.pdf")
    else:
        raise HTTPException(status_code=500, detail="PDF generation failed")

# DELETE PROJECT
@router.delete("/project/{project_id}")
def delete_project(project_id: int,
                   current_user=Depends(get_current_user)):

    conn = get_connection()
    cursor = conn.cursor()

    # verify ownership
    cursor.execute("""
        SELECT id FROM projects
        WHERE id=? AND user_id=?
    """, (project_id, current_user["id"]))

    project = cursor.fetchone()

    if not project:
        conn.close()
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    # delete scan history first
    cursor.execute(
        "DELETE FROM scan_history WHERE project_id=?",
        (project_id,)
    )

    # delete project
    cursor.execute(
        "DELETE FROM projects WHERE id=?",
        (project_id,)
    )

    conn.commit()
    conn.close()

    return {"message": "Project deleted successfully"}


@router.get("/project")
def get_project(current_user=Depends(get_current_user)):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM projects
        WHERE user_id=?
        LIMIT 1
    """,(current_user["id"],))

    project = cursor.fetchone()

    conn.close()

    if not project:
        return {"project": None}

    return {"project": dict(project)}

from fastapi import Header

class APIScanRequest(BaseModel):
    domain: str
    mode: str = "deep"

@router.post("/scan/api")
def api_triggered_scan(data: APIScanRequest, x_api_key: str = Header(None)):
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")
        
    conn = get_connection()
    cursor = conn.cursor()
    
    # Authenticate API Key
    cursor.execute("SELECT user_id FROM user_settings WHERE api_key=?", (x_api_key,))
    settings = cursor.fetchone()
    
    if not settings:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid API Key")
        
    user_id = settings["user_id"]
    
    # Check if this domain belongs to this user
    cursor.execute("SELECT id FROM projects WHERE user_id=? AND domain=?", (user_id, data.domain))
    project = cursor.fetchone()
    
    if not project:
        conn.close()
        raise HTTPException(status_code=403, detail="Domain not registered to this user account")
        
    project_id = project["id"]
    conn.close()
    
    # Execute the scan
    result = run_project_scan(project_id, data.domain, mode=data.mode)
    
    return result

import secrets

class SettingsUpdate(BaseModel):
    scan_depth: str
    auto_escalate: int
    email_digest: int
    webhook_url: str

@router.get("/settings")
def get_user_settings(current_user=Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM user_settings WHERE user_id=?", (current_user["id"],))
    settings = cursor.fetchone()

    if not settings:
        # Create default settings
        cursor.execute(
            """INSERT INTO user_settings (user_id) VALUES (?)""",
            (current_user["id"],)
        )
        conn.commit()
        cursor.execute("SELECT * FROM user_settings WHERE user_id=?", (current_user["id"],))
        settings = cursor.fetchone()

    conn.close()
    return dict(settings)

@router.put("/settings")
def update_user_settings(settings_data: SettingsUpdate, current_user=Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    # Ensure settings exist
    cursor.execute("SELECT id FROM user_settings WHERE user_id=?", (current_user["id"],))
    if not cursor.fetchone():
        cursor.execute("INSERT INTO user_settings (user_id) VALUES (?)", (current_user["id"],))

    cursor.execute("""
        UPDATE user_settings 
        SET scan_depth=?, auto_escalate=?, email_digest=?, webhook_url=?
        WHERE user_id=?
    """, (
        settings_data.scan_depth,
        settings_data.auto_escalate,
        settings_data.email_digest,
        settings_data.webhook_url,
        current_user["id"]
    ))

    conn.commit()
    conn.close()

    return {"message": "Settings updated successfully"}

@router.post("/settings/api-key")
def generate_api_key(current_user=Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    new_key = "rl_ent_live_" + secrets.token_hex(20)

    # Ensure settings exist
    cursor.execute("SELECT id FROM user_settings WHERE user_id=?", (current_user["id"],))
    if not cursor.fetchone():
        cursor.execute("INSERT INTO user_settings (user_id) VALUES (?)", (current_user["id"],))

    cursor.execute("UPDATE user_settings SET api_key=? WHERE user_id=?", (new_key, current_user["id"]))
    conn.commit()
    conn.close()

    return {"api_key": new_key}

