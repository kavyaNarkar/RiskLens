from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from datetime import datetime
import os


def generate_pdf_report(data):
    file_name = f"risk_report_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    file_path = os.path.join("reports", file_name)

    os.makedirs("reports", exist_ok=True)

    doc = SimpleDocTemplate(file_path, pagesize=A4)
    elements = []

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        "AuditTitle",
        parent=styles["Title"],
        fontSize=24,
        spaceAfter=30,
        alignment=1
    )

    # PAGE 1: COVER PAGE
    elements.append(Spacer(1, 2 * inch))
    elements.append(Paragraph("<b>RISKLENS ENTERPRISE SECURITY AUDIT</b>", title_style))
    elements.append(Spacer(1, 1 * inch))
    
    target_domain = data.get("domain", "Unknown Target")
    elements.append(Paragraph(f"<b>Target Scope:</b> {target_domain}", styles["Heading2"]))
    elements.append(Paragraph(f"<b>Scan Timestamp:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}", styles["Normal"]))
    
    elements.append(Spacer(1, 2 * inch))
    elements.append(Paragraph("<b>CONFIDENTIAL - AUTHORIZED PERSONNEL ONLY</b>", styles["Normal"]))
    
    elements.append(PageBreak())

    # PAGE 2: REPORT BODY
    elements.append(Paragraph("<b>Audit Diagnostics</b>", styles["Heading1"]))
    elements.append(Spacer(1, 0.2 * inch))

    elements.append(Paragraph(f"<b>Overall Risk Score:</b> {data.get('score', 0)}/100", styles["Normal"]))
    
    comp = data.get('compliance_score', {})
    if isinstance(comp, dict):
        elements.append(Paragraph(f"<b>GDPR Readiness:</b> {comp.get('gdpr', 0)}/100", styles["Normal"]))
        elements.append(Paragraph(f"<b>DPDP Alignment:</b> {comp.get('dpdp', 0)}/100", styles["Normal"]))
        elements.append(Paragraph(f"<b>Cyber Hygiene:</b> {comp.get('hygiene', 0)}/100", styles["Normal"]))
    else:
        elements.append(Paragraph(f"<b>Compliance Score:</b> {comp}/100", styles["Normal"]))
        
    elements.append(Spacer(1, 0.3 * inch))

    import re
    # Clean HTML from executive summary for PDF text rendering
    raw_exec_summary = data.get("executive_summary", "")
    clean_exec_summary = re.sub('<[^<]+?>', ' ', raw_exec_summary)

    elements.append(Paragraph("<b>Executive Summary</b>", styles["Heading2"]))
    elements.append(Paragraph(clean_exec_summary.strip(), styles["Normal"]))
    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph("<b>Strategic Recommendations</b>", styles["Heading2"]))
    priorities = []
    if "issues" in data:
        for issue in data["issues"]:
            if issue.get("priority") == "Critical Fix Required" or issue.get("severity") == "Critical":
                attk = issue.get('attack_type', '')
                priorities.append(f"• Resolve {issue['name']} ({attk}) immediately.")
    
    if priorities:
        for p in priorities:
            elements.append(Paragraph(p, styles["Normal"]))
    else:
        elements.append(Paragraph("No critical actions required at this time.", styles["Normal"]))

    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph("<b>Detected Vulnerabilities</b>", styles["Heading2"]))
    elements.append(Spacer(1, 0.2 * inch))

    table_data = [["Issue", "Severity", "Priority"]]

    for issue in data["issues"]:
        table_data.append([
            issue["name"],
            issue["severity"],
            issue.get("priority", "")
        ])

    table = Table(table_data, colWidths=[2.5 * inch, 1 * inch, 1.5 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))

    elements.append(table)

    doc.build(elements)

    return file_path
