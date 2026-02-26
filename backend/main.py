from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from urllib.parse import urlparse
import socket

from scanner.header_analyzer import analyze_headers
from scanner.ssl_checker import check_ssl
from scanner.port_scanner import scan_ports
from scanner.risk_engine import calculate_risk
from database import save_scan, get_history

from pdf_generator import generate_pdf_report
from fastapi.responses import FileResponse

from enterprise_scanner.enterprise_routes import router as enterprise_router
from enterprise_scanner.database_enterprise import init_enterprise_db

from enterprise_scanner.scheduler import start_monitoring_loop


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class URLRequest(BaseModel):
    url: str


app.include_router(enterprise_router)

init_enterprise_db()

start_monitoring_loop()

# -------------------------
# URL VALIDATION
# -------------------------
def validate_url(url: str):
    parsed = urlparse(url)
    return parsed.scheme in ("http", "https") and parsed.netloc != ""


# -------------------------
# DNS RESOLUTION CHECK
# -------------------------
def is_domain_resolvable(url: str):
    try:
        hostname = urlparse(url).hostname
        socket.gethostbyname(hostname)
        return True
    except:
        return False


@app.post("/scan")
def scan_target(data: URLRequest):
    url = data.url.strip()

    # Validate format
    if not validate_url(url):
        return {
            "score": 0,
            "level": "Invalid",
            "issues": [{
                "name": "Invalid URL Format",
                "severity": "Critical",
                "category": "Input Validation",
                "attack_type": "Improper Input Handling"
            }],
            "attack_types": ["Improper Input Handling"]
        }

    # Check DNS resolution
    if not is_domain_resolvable(url):
        return {
            "score": 0,
            "level": "Unreachable",
            "issues": [{
                "name": "Domain Does Not Exist or DNS Resolution Failed",
                "severity": "Critical",
                "category": "Connection",
                "attack_type": "Denial of Service Risk"
            }],
            "attack_types": ["Denial of Service Risk"]
        }

    issues = []

    issues += analyze_headers(url)
    issues += check_ssl(url)
    issues += scan_ports(url)

    score, level, compliance_score, executive_summary = calculate_risk(issues)


    save_scan(url, score, level)

    return {
        "score": score,
        "level": level,
        "compliance_score": compliance_score,
        "executive_summary": executive_summary,
        "issues": issues
    }


@app.get("/history")
def history():
    return get_history()


@app.post("/generate-report")
def generate_report(data: dict):
    file_path = generate_pdf_report(data)
    return FileResponse(file_path, media_type='application/pdf', filename="RiskLens_Report.pdf")

