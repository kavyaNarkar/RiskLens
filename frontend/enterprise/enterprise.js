let trendChart;
const API_BASE = "http://localhost:8000/enterprise";

// Navigation Handler
function switchNav(viewId) {
    document.getElementById("dashboardView").style.display = "none";
    document.getElementById("projectsView").style.display = "none";
    document.getElementById("reportsView").style.display = "none";
    document.getElementById("settingsView").style.display = "none";

    // Disable all nav links
    document.querySelectorAll(".sidebar-nav a").forEach(el => el.classList.remove("active"));

    // Ensure trend chart/scan insights hide when switching away from dashboard or projects
    const trendEl = document.getElementById("trendSection");
    const scanEl = document.getElementById("latestScanSection");
    if (trendEl) trendEl.style.display = "none";
    if (scanEl) scanEl.style.display = "none";

    // Show selected view and activate link
    if (viewId === "dashboard") {
        document.getElementById("dashboardView").style.display = "grid";
        const navItem = document.getElementById("nav-dashboard");
        if (navItem) navItem.classList.add("active");
    } else if (viewId === "projects") {
        document.getElementById("projectsView").style.display = "block";
        const navItem = document.getElementById("nav-projects");
        if (navItem) navItem.classList.add("active");
    } else if (viewId === "reports") {
        document.getElementById("reportsView").style.display = "block";
        const navItem = document.getElementById("nav-reports");
        if (navItem) navItem.classList.add("active");
        loadReports();
    } else if (viewId === "settings") {
        document.getElementById("settingsView").style.display = "block";
        const navItem = document.getElementById("nav-settings");
        if (navItem) navItem.classList.add("active");
        loadSettings();
    }
}

function getToken() {
    return localStorage.getItem("access_token");
}

function checkAuth() {
    const token = getToken();
    const isDashboard = window.location.pathname.includes("dashboard.html");
    const isLogin = window.location.pathname.includes("login.html");

    if (!token && isDashboard) {
        console.log("No Token Found → Redirecting Login");
        window.location.href = "login.html";
    } else if (token && isLogin) {
        window.location.href = "dashboard.html";
    }
}

checkAuth();

function logout() {
    localStorage.removeItem("access_token");
    window.location.href = "login.html";
}

async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const btn = document.getElementById("loginBtn");

    if (btn) {
        btn.innerHTML = '<span class="btn-text">AUTHENTICATING...</span>';
        btn.disabled = true;
    }

    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    try {
        const response = await fetch("http://localhost:8000/enterprise/login", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("access_token", data.access_token);
            window.location.href = "dashboard.html";
        } else {
            document.getElementById("error").innerText = data.detail || "Login failed";
            if (btn) {
                btn.innerHTML = '<span class="btn-text">ACCESS DENIED</span>';
                setTimeout(() => { btn.innerHTML = '<span class="btn-text">ENTER SYSTEM</span>'; btn.disabled = false; }, 2000);
            }
        }
    } catch (err) {
        document.getElementById("error").innerText = "Connection error";
        if (btn) {
            btn.innerHTML = '<span class="btn-text">ENTER SYSTEM</span>';
            btn.disabled = false;
        }
    }
}

async function handleGoogleLogin(response) {
    const btn = document.getElementById("loginBtn");
    if (btn) {
        btn.innerHTML = '<span class="btn-text">VERIFYING GOOGLE TOKEN...</span>';
        btn.disabled = true;
    }

    try {
        const backendRes = await fetch("http://localhost:8000/enterprise/auth/google", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ token: response.credential })
        });

        const data = await backendRes.json();

        if (backendRes.ok) {
            localStorage.setItem("access_token", data.access_token);
            window.location.href = "dashboard.html";
        } else {
            document.getElementById("error").innerText = data.detail || "Google Auth failed";
            if (btn) {
                btn.innerHTML = '<span class="btn-text">ACCESS DENIED</span>';
                setTimeout(() => { btn.innerHTML = '<span class="btn-text">AUTHORIZE LOGIN</span>'; btn.disabled = false; }, 2000);
            }
        }
    } catch (err) {
        document.getElementById("error").innerText = "Connection error";
        if (btn) {
            btn.innerHTML = '<span class="btn-text">AUTHORIZE LOGIN</span>';
            btn.disabled = false;
        }
    }
}

async function loadDashboard() {
    const token = getToken();
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const dashboardRes = await fetch(`${API_BASE}/dashboard`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!dashboardRes.ok) {
            logout();
            return;
        }

        const dashboard = await dashboardRes.json();

        // Animate numbers
        animateValue("totalProjects", 0, dashboard.total_projects || 0, 1000);
        animateValue("monitoredProjects", 0, dashboard.monitored_projects || 0, 1000);
        animateValue("averageScore", 0, dashboard.average_score || 0, 1000);

        // Update Compliance Rings
        if (dashboard.compliance) {
            updateComplianceRing("gdpr", dashboard.compliance.gdpr);
            updateComplianceRing("dpdp", dashboard.compliance.dpdp);
        }

        // Update the Global Triage Action table
        const triageList = document.getElementById("globalTriageList");
        if (triageList && dashboard.recent_vulnerabilities) {
            triageList.innerHTML = "";
            if (dashboard.recent_vulnerabilities.length === 0) {
                triageList.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">No active threats detected across monitored targets. <i class="fa-solid fa-shield-check text-success"></i></td></tr>`;
            } else {
                dashboard.recent_vulnerabilities.forEach(vuln => {
                    let badgeClass = "bg-success";
                    if (vuln.severity === "Critical" || vuln.severity === "High") badgeClass = "bg-danger";
                    else if (vuln.severity === "Medium") badgeClass = "bg-warning";

                    triageList.innerHTML += `
                        <tr style="border-bottom: 1px dashed rgba(255, 255, 255, 0.05);">
                            <td style="padding: 1rem 0; color: #fff; font-weight: 500;">${vuln.name}</td>
                            <td><span class="text-muted"><i class="fa-solid fa-globe"></i> ${vuln.domain}</span></td>
                            <td><span class="badge-sm ${badgeClass}" style="color:white;">${vuln.severity}</span></td>
                            <td style="text-align: right;">
                                <button class="cyber-btn" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="location.href='library.html'">
                                    <span class="btn-text">RESEARCH</span>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
        }

        // Update Upcoming Scans Timeline
        const scheduleTimeline = document.querySelector(".schedule-timeline");
        if (scheduleTimeline && dashboard.upcoming_scans) {
            scheduleTimeline.innerHTML = "";
            if (dashboard.upcoming_scans.length === 0) {
                scheduleTimeline.innerHTML = `<div class="empty-state">No upcoming scans scheduled.</div>`;
            } else {
                dashboard.upcoming_scans.forEach(scan => {
                    const scanTime = new Date(scan.next_scan);
                    // Format relative time (e.g. today vs tomorrow)
                    const formatRelativeTime = (date) => {
                        const now = new Date();
                        const isToday = (d) => d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

                        const tomorrow = new Date(now);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const isTomorrow = (d) => d.getDate() === tomorrow.getDate() && d.getMonth() === tomorrow.getMonth() && d.getFullYear() === tomorrow.getFullYear();

                        if (isToday(date)) return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                        if (isTomorrow(date)) return `Tomorrow, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                        return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    };

                    const timeStr = formatRelativeTime(scanTime);
                    const taskStr = scan.frequency === "daily" ? `Daily Deep Scan: ${scan.domain}` : `Weekly Deep Scan: ${scan.domain}`;

                    scheduleTimeline.innerHTML += `
                        <div class="timeline-item">
                            <div class="time-marker"></div>
                            <div class="timeline-content">
                                <div class="time">${timeStr}</div>
                                <div class="task">${taskStr}</div>
                            </div>
                        </div>
                    `;
                });
            }
        }

        await loadProjects();
        await loadAlerts();
    } catch (e) {
        console.error("Dashboard load error", e);
    }
}

function animateValue(id, start, end, duration) {
    if (start === end) return;
    let range = end - start;
    let current = start;
    let increment = end > start ? 1 : -1;
    let stepTime = Math.abs(Math.floor(duration / range));
    let obj = document.getElementById(id);
    if (!obj) return;

    let timer = setInterval(function () {
        current += increment;
        obj.innerHTML = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}

function updateComplianceRing(framework, score) {
    const ringEls = document.querySelectorAll('.compliance-ring-container p');
    let targetP = null;
    ringEls.forEach(p => {
        if (p.textContent.toLowerCase() === framework.toLowerCase()) {
            targetP = p;
        }
    });

    if (targetP) {
        const ring = targetP.previousElementSibling;
        if (ring && ring.classList.contains('progress-ring')) {
            ring.style.setProperty('--progress', score);
            const content = ring.querySelector('.ring-content');
            if (content) {
                content.innerHTML = `${score}<span>%</span>`;
            }
            // Update color based on score
            if (score >= 90) ring.style.setProperty('--ring-color', 'var(--success)');
            else if (score >= 70) ring.style.setProperty('--ring-color', 'var(--warning)');
            else ring.style.setProperty('--ring-color', 'var(--danger)');
        }
    }
}

async function loadProjects() {
    const token = getToken();
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/projects`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error("Failed to load projects");
        }

        const data = await response.json();

        const containers = document.querySelectorAll(".project-list-target");

        containers.forEach(container => {
            container.innerHTML = "";

            if (!data.projects || data.projects.length === 0) {
                container.innerHTML = '<div class="empty-state">No projects registered.</div>';
                return;
            }

            data.projects.forEach(project => {
                const lastScan = project.last_scan_time ? new Date(project.last_scan_time).toLocaleString() : "Never";
                const scoreClass = project.last_scan_score < 40 ? "text-danger" : (project.last_scan_score < 70 ? "text-warning" : "text-success");

                let grade = "N/A";
                if (project.last_scan_score !== null) {
                    if (project.last_scan_score >= 90) grade = "A";
                    else if (project.last_scan_score >= 80) grade = "B";
                    else if (project.last_scan_score >= 70) grade = "C";
                    else if (project.last_scan_score >= 60) grade = "D";
                    else grade = "F";
                }

                let gradeHtml = project.last_scan_score !== null ? `<span class="badge-sm project-grade">Grade ${grade}</span>` : "";

                let deltaHtml = "";
                if (project.score_change) {
                    if (project.score_change > 0) {
                        deltaHtml = `<span class="score-delta positive"><i class="fa-solid fa-arrow-trend-up"></i> +${project.score_change}</span>`;
                    } else if (project.score_change < 0) {
                        deltaHtml = `<span class="score-delta negative"><i class="fa-solid fa-arrow-trend-down"></i> ${project.score_change}</span>`;
                    }
                }

                const scoreBadge = project.last_scan_score !== null ?
                    `<div class="project-score-group">
                        <span class="badge-sm ${scoreClass} score-val">${project.last_scan_score}</span>
                        ${gradeHtml}
                        ${deltaHtml}
                    </div>` :
                    `<span class="badge-sm text-muted">N/A</span>`;

                container.innerHTML += `
                    <div class="project-item">
                        <div class="proj-top-row">
                            <div class="proj-info-group">
                                <div class="proj-header">
                                    <h4 class="proj-domain"><i class="fa-solid fa-globe globe-icon"></i> ${project.domain}</h4>
                                    ${scoreBadge}
                                </div>
                                <div class="proj-meta">
                                    <span class="meta-item"><i class="fa-solid fa-clock"></i> Last Scan: ${lastScan}</span>
                                    <span class="meta-item"><i class="fa-solid fa-satellite-dish"></i> Freq: <span class="highlight-text">${project.monitoring_frequency}</span></span>
                                </div>
                            </div>
                            <div class="proj-top-actions">
                                <button class="action-btn delete-btn" title="Delete Project" onclick="deleteProject(${project.id})">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="proj-bottom-row">
                            <div class="select-wrapper-sm">
                                <select id="scanMode_${project.id}_${Math.random().toString(36).substr(2, 5)}" class="cyber-select-sm scanModeSelect" data-project-id="${project.id}">
                                    <option value="quick">Quick Check</option>
                                    <option value="deep" selected>Deep Scan</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                            <div class="action-buttons-group">
                                <button class="action-btn pdf-btn" title="Download Audit PDF" onclick="downloadPDF(${project.id})">
                                    <i class="fa-solid fa-file-pdf"></i>
                                </button>
                                <button class="action-btn chart-btn" title="Trend History" onclick="loadTrend(${project.id}, '${project.domain}')">
                                    <i class="fa-solid fa-chart-line"></i>
                                </button>
                                <button class="action-btn scan-btn" title="Scan Now" onclick="manualScan(${project.id}, this)">
                                    <i class="fa-solid fa-radar"></i> <span class="btn-text-sm">SCAN AHEAD</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
        });

    } catch (e) {
        console.error("Failed to load projects", e);
    }
}

async function loadReports() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/projects`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error("Failed to load projects for reports");
        }

        const data = await response.json();
        const container = document.getElementById("reportsList");

        container.innerHTML = "";

        if (!data.projects || data.projects.length === 0) {
            container.innerHTML = '<div class="empty-state">No targets registered for reporting.</div>';
            return;
        }

        data.projects.forEach(project => {
            const dateStr = project.last_scan_time ? new Date(project.last_scan_time).toLocaleString() : 'Never Scanned';
            const scoreClass = project.last_scan_score >= 80 ? 'text-success' : (project.last_scan_score >= 50 ? 'text-warning' : 'text-danger');
            const scoreDisplay = project.last_scan_score ? `<span class="${scoreClass} fw-bold">${project.last_scan_score}</span> / 100` : '<span class="text-muted">N/A</span>';

            container.innerHTML += `
                <div class="report-item glass-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; margin-bottom: 1rem; border-radius: 8px;">
                    <div>
                        <h4 style="margin: 0; color: #fff; display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;">
                            <i class="fa-solid fa-globe text-primary"></i> ${project.domain}
                        </h4>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem; display: flex; gap: 1.5rem;">
                            <span><i class="fa-solid fa-clock"></i> Last Audit: ${dateStr}</span>
                            <span><i class="fa-solid fa-shield-virus"></i> Risk Score: ${scoreDisplay}</span>
                        </div>
                    </div>
                    <div>
                        <button onclick="downloadPDF(${project.id})" class="cyber-btn" ${!project.last_scan_score ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                            <span class="btn-text"><i class="fa-solid fa-file-pdf text-danger" style="margin-right:0.4rem;"></i> GENERATE AUDIT</span>
                        </button>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        console.error("Failed to load reports", e);
    }
}

async function manualScan(projectId, btnContext) {
    const token = getToken();
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    let mode = "deep";
    if (btnContext) {
        const row = btnContext.closest('.proj-bottom-row');
        if (row) {
            const modeSelect = row.querySelector('.scanModeSelect');
            if (modeSelect) mode = modeSelect.value;
        }
    }

    try {
        const response = await fetch(`${API_BASE}/project/${projectId}/scan?mode=${mode}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 429) {
            alert("Rate limit exceeded.");
            return;
        }

        const result = await response.json();

        // Removed blocking alert so the scroll animation to new panels works seamlessly

        // Removed loadDashboard() and loadTrend() here to prevent async DOM rewrites from hiding the Latest Scan section.

        if (result.issues) {
            document.getElementById("latestScanSection").style.display = "block";

            let name_html = "Newly Generated Scan Insights";
            if (result.scan_duration_seconds !== undefined) {
                name_html += ` <span class="badge-sm" style="margin-left: 10px; background: rgba(0, 243, 255, 0.1); color: var(--primary);"><i class="fa-solid fa-stopwatch"></i> ${result.scan_duration_seconds}s</span>`;
            }
            document.getElementById("scanTargetName").innerHTML = name_html;

            renderHackerPOV(result.issues, "Target URL");
            renderAttackImpact(result.score, result.issues);
            renderSmartFixes(result.issues);
            if (result.compliance_score) renderComplianceBreakdown(result.compliance_score);

            // Render CEO Executive Summary
            const ceoContent = document.getElementById("ceoExecutiveContent");

            let extraPrefix = "";
            if (mode === "quick") {
                extraPrefix = `<div style="border-left: 4px solid #ff00ea; padding-left: 1rem; margin-bottom: 1rem;"><h4 style="color: #ff00ea; margin-bottom: 0.5rem;"><i class="fa-solid fa-rocket"></i> Post-Deployment Check</h4><p style="font-size: 0.9rem; margin-top: 0;">Verified using Quick Scan mode.</p></div>`;
            }

            if (ceoContent && result.executive_summary) {
                ceoContent.innerHTML = extraPrefix + result.executive_summary;
            } else if (ceoContent) {
                ceoContent.innerHTML = '<div class="empty-state">Executive summary not available.</div>';
            }

            // Ensure technical view is shown by default
            const ceoToggle = document.getElementById("ceoModeToggle");
            if (ceoToggle) {
                ceoToggle.checked = false;
                toggleCeoMode(); // Force update visibility
            }
            // Auto scroll to bottom
            setTimeout(() => {
                document.getElementById('latestScanSection').scrollIntoView({ behavior: 'smooth' });
            }, 500);
        }
    } catch (e) {
        alert("Scan request failed");
    }
}

async function downloadPDF(projectId) {
    const token = getToken();
    if (!token) return window.location.href = "login.html";

    const btn = event.currentTarget;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`${API_BASE}/project/${projectId}/report/pdf`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            alert("Failed to generate PDF. Does the project exist?");
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `RiskLens_Audit_Report_${projectId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (e) {
        alert("Error downloading PDF");
    } finally {
        btn.innerHTML = oldHtml;
    }
}

async function deleteProject(projectId) {
    if (!confirm("Are you sure you want to permanently delete this project?")) return;

    const token = getToken();
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/project/${projectId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            alert("Delete failed");
            return;
        }

        loadDashboard();
        document.getElementById("trendSection").style.display = "none";
    } catch (e) {
        alert("Delete error");
    }
}

async function loadTrend(projectId, domainName = "") {
    const token = getToken();
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/trend/${projectId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) return;

        const data = await response.json();

        document.getElementById("trendSection").style.display = "block";
        if (domainName) {
            document.getElementById("trendProjectName").innerText = domainName;
        }

        const labels = data.history.map(h => new Date(h.timestamp).toLocaleString());
        const scores = data.history.map(h => h.score);

        // Render Prediction if available
        if (data.prediction) {
            document.getElementById("predictionSection").style.display = "block";
            const pScore = document.getElementById("projectedScoreValue");
            const pStatus = document.getElementById("projectedStatusText");

            pScore.innerText = Math.round(data.prediction.projected_score);

            if (data.prediction.projected_score < 40) {
                pScore.style.color = "var(--danger)";
            } else if (data.prediction.projected_score < 70) {
                pScore.style.color = "var(--warning)";
            } else {
                pScore.style.color = "var(--success)";
            }

            pStatus.innerText = data.prediction.status_text;
        } else {
            document.getElementById("predictionSection").style.display = "none";
        }

        if (trendChart) trendChart.destroy();

        const ctx = document.getElementById("trendChart").getContext("2d");

        trendChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Security Score",
                    data: scores,
                    borderColor: "#00f3ff",
                    backgroundColor: "rgba(0, 243, 255, 0.2)",
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: "#ff00ea",
                    pointBorderColor: "#fff"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { color: "rgba(255,255,255,0.1)" } },
                    y: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { color: "rgba(255,255,255,0.1)" }, beginAtZero: true, max: 100 }
                }
            }
        });
    } catch (e) {
        console.error("Failed to load trend", e);
    }
}

async function loadAlerts() {
    const token = getToken();
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/alerts`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();

        // Update badge
        const badge = document.getElementById("alertBadge");
        if (badge) {
            if (data.alerts && data.alerts.length > 0) {
                badge.innerText = data.alerts.length;
                badge.style.display = "inline-block";
            } else {
                badge.style.display = "none";
            }
        }

        const renderAlertsToContainer = (containerId) => {
            const container = document.getElementById(containerId);
            if (!container) return;

            container.innerHTML = "";

            if (data.alerts && data.alerts.length === 0) {
                container.innerHTML = '<div class="empty-state">No Active Alerts.</div>';
                return;
            }

            data.alerts.forEach(alert => {
                const severityClass = alert.severity ? alert.severity.toLowerCase() : 'medium';
                container.innerHTML += `
                    <div class="alert-item ${severityClass}">
                        <div class="alert-domain">
                            <span><i class="fa-solid fa-triangle-exclamation"></i> ${alert.domain}</span>
                            <span class="badge-sm">${alert.severity}</span>
                        </div>
                        <p class="alert-msg">${alert.message}</p>
                        <div class="alert-time">${new Date(alert.created_at).toLocaleString()}</div>
                    </div>
                `;
            });
        };

        renderAlertsToContainer("alertList");
        renderAlertsToContainer("drawerAlertList");

    } catch (e) {
        console.error("Failed to load alerts", e);
    }
}

function toggleAlertDrawer() {
    const drawer = document.getElementById("alertDrawer");
    const overlay = document.getElementById("drawerOverlay");
    if (drawer && overlay) {
        drawer.classList.toggle("open");
        overlay.classList.toggle("open");
    }
}

// --- Settings Logic ---

function editWebhook(btn) {
    const input = document.getElementById("webhookInput");
    if (input.disabled) {
        input.disabled = false;
        input.type = "text";
        input.focus();
        btn.innerHTML = '<span class="btn-text"><i class="fa-solid fa-check text-success"></i></span>';
    } else {
        input.disabled = true;
        input.type = "password";
        btn.innerHTML = '<span class="btn-text"><i class="fa-solid fa-pen"></i></span>';
    }
}

function copyAPIKey(btn) {
    const keyDisplay = document.getElementById("apiKeyDisplay");
    navigator.clipboard.writeText(keyDisplay.innerText).then(() => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<span class="btn-text"><i class="fa-solid fa-check"></i> COPIED</span>';
        btn.style.borderColor = "var(--success)";
        btn.style.color = "var(--success)";
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.style.borderColor = "";
            btn.style.color = "";
        }, 2000);
    });
}

async function loadSettings() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/settings`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
            const settings = await response.json();

            document.getElementById("settingsScanDepth").value = settings.scan_depth || "deep";
            document.getElementById("settingsAutoEscalate").checked = settings.auto_escalate === 1;
            document.getElementById("settingsEmailDigest").checked = settings.email_digest === 1;
            document.getElementById("webhookInput").value = settings.webhook_url || "";

            if (settings.api_key) {
                document.getElementById("apiKeyDisplay").innerText = settings.api_key;
            } else {
                document.getElementById("apiKeyDisplay").innerText = "Not generated yet";
            }
        }
    } catch (e) {
        console.error("Failed to load settings", e);
    }
}

async function regenerateAPIKey(btn) {
    if (!confirm("Generating a new API key will revoke the current one immediately. All existing CI/CD pipelines using the old key will break. Proceed?")) return;

    const token = getToken();
    if (!token) return window.location.href = "login.html";

    const keyDisplay = document.getElementById("apiKeyDisplay");
    btn.innerHTML = '<span class="btn-text"><i class="fa-solid fa-spinner fa-spin"></i> GENERATING</span>';

    try {
        const response = await fetch(`${API_BASE}/settings/api-key`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("API call failed");

        const data = await response.json();
        keyDisplay.innerText = data.api_key;
    } catch (e) {
        alert("Failed to generate API Key.");
    } finally {
        btn.innerHTML = '<span class="btn-text" style="color: var(--danger);"><i class="fa-solid fa-rotate"></i> REGENERATE</span>';
    }
}

async function saveSettings(btn) {
    const token = getToken();
    if (!token) return window.location.href = "login.html";

    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-text" style="font-size: 0.9rem;"><i class="fa-solid fa-spinner fa-spin"></i> SAVING...</span>';

    const payload = {
        scan_depth: document.getElementById("settingsScanDepth").value,
        auto_escalate: document.getElementById("settingsAutoEscalate").checked ? 1 : 0,
        email_digest: document.getElementById("settingsEmailDigest").checked ? 1 : 0,
        webhook_url: document.getElementById("webhookInput").value.trim()
    };

    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Save failed");

        btn.innerHTML = '<span class="btn-text" style="font-size: 0.9rem; color: var(--success);"><i class="fa-solid fa-check"></i> SAVED SUCCESSFULLY</span>';
        btn.style.borderColor = "var(--success)";
    } catch (e) {
        btn.innerHTML = '<span class="btn-text" style="font-size: 0.9rem; color: var(--danger);"><i class="fa-solid fa-xmark"></i> ERROR SAVING</span>';
        btn.style.borderColor = "var(--danger)";
    } finally {
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.borderColor = "";
        }, 2500);
    }
}

async function createProject(btn) {
    const token = getToken();
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const parentBox = btn.closest('.add-project-box');
    const domainInput = parentBox.querySelector(".domain-input");
    const frequencyInput = parentBox.querySelector(".frequency-input");

    const domain = domainInput.value.trim();
    const frequency = frequencyInput.value;

    if (!domain) {
        alert("Please enter website URL");
        return;
    }

    if (btn) {
        btn.innerHTML = '<span class="btn-text">CREATING... <div class="cyber-spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-left:5px;"></div></span>';
        btn.disabled = true;
    }

    try {
        const response = await fetch(`${API_BASE}/project`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ domain: domain, monitoring_frequency: frequency })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.detail || "Project creation failed");
            if (btn) {
                btn.innerHTML = '<div class="btn-content"><span class="btn-text">CREATE</span></div>';
                btn.disabled = false;
            }
            return;
        }

        // Auto first scan
        const projectId = data.project_id;
        await fetch(`${API_BASE}/project/${projectId}/scan`, {
            method: "POST",
            headers: { "Authorization": "Bearer " + token }
        });

        if (btn) {
            btn.innerHTML = '<div class="btn-content"><span class="btn-text">REGISTER</span></div>';
            btn.disabled = false;
            domainInput.value = "";
        }

        loadDashboard();
    } catch (error) {
        console.error("Create Project Error:", error);
        alert("Something went wrong");
        if (btn) {
            btn.innerHTML = '<div class="btn-content"><span class="btn-text">REGISTER</span></div>';
            btn.disabled = false;
        }
    }
}

async function exportCSV() {
    const token = getToken();
    if (!token) return;

    try {
        const projRes = await fetch(`${API_BASE}/projects`, { headers: { Authorization: `Bearer ${token}` } });
        const alertsRes = await fetch(`${API_BASE}/alerts`, { headers: { Authorization: `Bearer ${token}` } });

        const pData = await projRes.json();
        const aData = await alertsRes.json();

        let csvContent = "data:text/csv;charset=utf-8,";

        // Projects Table
        csvContent += "REPORT: ENTERPRISE PROJECTS\r\n";
        csvContent += "Domain,Last Score,Trend,Monitoring Freq.,Last Scan\r\n";
        if (pData.projects) {
            pData.projects.forEach(p => {
                const score = p.last_scan_score || "N/A";
                const date = p.last_scan_time ? new Date(p.last_scan_time).toLocaleString() : "Never";
                csvContent += `${p.domain},${score},${p.trend},${p.monitoring_frequency},"${date}"\r\n`;
            });
        }

        csvContent += "\r\n";

        // Alerts Table
        csvContent += "REPORT: ACTIVE ALERTS\r\n";
        csvContent += "Domain,Severity,Message,Date\r\n";
        if (aData.alerts) {
            aData.alerts.forEach(a => {
                const date = new Date(a.created_at).toLocaleString();
                csvContent += `${a.domain},${a.severity},"${a.message}","${date}"\r\n`;
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `RiskLens_Enterprise_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (e) {
        console.error("Export failed", e);
        alert("Failed to export report.");
    }
}

// ==========================================
// NEW FEATURE: Executive CEO Mode Toggle
// ==========================================
function toggleCeoMode() {
    const isCeoMode = document.getElementById("ceoModeToggle").checked;
    const technicalGrid = document.getElementById("technicalViewGrid");
    const ceoPanel = document.getElementById("ceoExecutivePanel");

    // Add dynamic CSS for the slider toggle if it hasn't been added yet
    if (!document.getElementById("toggleStyles")) {
        const style = document.createElement("style");
        style.id = "toggleStyles";
        style.innerHTML = `
            .switch { position: relative; display: inline-block; width: 44px; height: 24px; z-index: 10; cursor: pointer; }
            .switch input { opacity: 0; width: 0; height: 0; position: absolute; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255, 255, 255, 0.2); transition: .4s; border-radius: 24px; pointer-events: none; }
            .switch input:checked + .slider { background-color: var(--primary); box-shadow: 0 0 10px var(--primary); }
            .switch input:focus + .slider { box-shadow: 0 0 1px var(--primary); }
            .switch input:checked + .slider:before { transform: translateX(20px); background-color: #000; }
            .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; pointer-events: none; }
        `;
        document.head.appendChild(style);
    }

    if (isCeoMode) {
        technicalGrid.style.display = "none";
        ceoPanel.style.display = "block";
        // Animate entrance
        ceoPanel.style.opacity = "0";
        ceoPanel.style.transform = "translateY(10px)";
        setTimeout(() => {
            ceoPanel.style.transition = "all 0.4s ease";
            ceoPanel.style.opacity = "1";
            ceoPanel.style.transform = "translateY(0)";
        }, 50);
    } else {
        technicalGrid.style.display = "grid";
        ceoPanel.style.display = "none";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("loginBtn");
    if (btn) btn.addEventListener("click", login);

    if (window.location.pathname.includes("dashboard.html")) {
        loadDashboard();
    }
});

// ==========================================
// NEW FEATURE: Hacker POV Panel
// ==========================================
function renderHackerPOV(issues, url) {
    const povOutput = document.getElementById("hackerPovOutput");
    if (!povOutput) return;

    const terminalLines = [];

    terminalLines.push(`[+] Target: ${url}`);
    terminalLines.push(`[+] Initiating deep scan...`);
    terminalLines.push(` `);

    let openPortsCounter = 0;
    let missingHeadersCounter = 0;
    let sslIssuesCounter = 0;
    let serverExposed = false;

    issues.forEach(issue => {
        if (issue.category === "Port Exposure") {
            terminalLines.push(`[!] open port detected: ${issue.name.replace("Port ", "").replace(" Open", "")}/tcp`);
            openPortsCounter++;
        }
        if (issue.category === "Header Security" || issue.category === "Transport Security") {
            missingHeadersCounter++;
        }
        if (issue.category === "Information Exposure" && issue.name.includes("Server")) {
            terminalLines.push(`[*] Information Disclosure: Server version leaked [EASY RECON]`);
            serverExposed = true;
        }
        if (issue.category === "SSL/TLS") {
            sslIssuesCounter++;
        }
    });

    terminalLines.push(` `);
    terminalLines.push(`[+] Scan Complete. Summary:`);
    terminalLines.push(`    - Open Ports found: ${openPortsCounter}`);
    terminalLines.push(`    - Missing Security Headers: ${missingHeadersCounter}`);
    if (serverExposed) terminalLines.push(`    - Server Fingerprint EXPOSED`);
    if (sslIssuesCounter > 0) terminalLines.push(`    - SSL Interception / MITM Possible`);

    if (openPortsCounter > 0 || missingHeadersCounter > 2 || serverExposed || sslIssuesCounter > 0) {
        terminalLines.push(` `);
        terminalLines.push(`<span style="color: var(--danger)">[!] TARGET IS VULNERABLE TO EXPLOITATION.</span>`);
    } else {
        terminalLines.push(` `);
        terminalLines.push(`<span style="color: var(--warning)">[-] Target appears hardened. Requires advanced tactics.</span>`);
    }

    povOutput.innerHTML = terminalLines.join('<br>');
}

// ==========================================
// NEW FEATURE: Attack Impact Simulator
// ==========================================
function renderAttackImpact(overallScore, issues) {
    if (!document.getElementById("attackImpactMetrics")) return;

    let financialRiskCount = 0;
    let reputationRiskCount = 0;
    let regulatoryRiskCount = 0;
    let operationalRiskCount = 0;

    issues.forEach(issue => {
        let points = issue.severity === "Critical" ? 4 :
            issue.severity === "High" ? 3 :
                issue.severity === "Medium" ? 2 : 1;

        if (issue.category === "Port Exposure") {
            operationalRiskCount += points;
            financialRiskCount += points;
        }
        if (issue.category === "Header Security" || issue.category === "Transport Security") {
            regulatoryRiskCount += points;
        }
        if (issue.attack_type && (issue.attack_type.includes("MITM") || issue.attack_type.includes("XSS"))) {
            reputationRiskCount += points;
            financialRiskCount += points;
            regulatoryRiskCount += points;
        }
        if (issue.category === "SSL/TLS") {
            reputationRiskCount += points;
        }
    });

    const calculateImpact = (points) => {
        if (points >= 8) return { level: 'CRITICAL', colorClass: 'bg-danger', width: '100%', baseColor: 'var(--danger)' };
        if (points >= 5) return { level: 'HIGH', colorClass: 'bg-danger', width: '75%', baseColor: 'var(--danger)' };
        if (points >= 3) return { level: 'MEDIUM', colorClass: 'bg-warning', width: '50%', baseColor: 'var(--warning)' };
        if (points >= 1) return { level: 'LOW', colorClass: 'bg-success', width: '25%', baseColor: 'var(--success)' };
        return { level: 'NONE', colorClass: 'bg-success', width: '5%', baseColor: 'var(--text-muted)' };
    };

    const financial = calculateImpact(financialRiskCount);
    const reputation = calculateImpact(reputationRiskCount);
    const regulatory = calculateImpact(regulatoryRiskCount);
    const operational = calculateImpact(operationalRiskCount);

    const updateBar = (idPrefix, data) => {
        const textEl = document.getElementById(`${idPrefix}Text`);
        const barEl = document.getElementById(`${idPrefix}Bar`);
        if (textEl && barEl) {
            textEl.innerText = data.level;
            textEl.style.color = data.baseColor;
            barEl.className = `impact-bar ${data.colorClass}`;
            setTimeout(() => { barEl.style.width = data.width; }, 100);
        }
    };

    updateBar('impactFinancial', financial);
    updateBar('impactReputation', reputation);
    updateBar('impactFinancial', financial);
    updateBar('impactReputation', reputation);
    updateBar('impactRegulatory', regulatory);
    updateBar('impactOperational', operational);
}

// ==========================================
// NEW FEATURE: Smart Fix Recommendation Engine
// ==========================================
function renderSmartFixes(issues) {
    const container = document.getElementById("smartFixList");
    if (!container) return;

    container.innerHTML = "";

    const criticalList = issues.filter(i => i.severity === "Critical" || i.severity === "High");

    if (criticalList.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="border: 1px solid var(--success); color: var(--success); padding: 1.5rem; text-align: center; border-radius: 8px;">
                <i class="fa-solid fa-shield-check" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                <br>No Critical fixes required. System is secure.
            </div>
        `;
        return;
    }

    criticalList.forEach(issue => {
        const severityClass = issue.severity === "Critical" ? "text-danger" : "text-warning";

        // If remediation is a string (legacy backup) convert to steps logic gracefully
        let summaryText = "";
        let stepsHtml = "";

        if (typeof issue.remediation === 'object' && issue.remediation !== null) {
            summaryText = issue.remediation.summary || issue.name;
            const stepsArray = issue.remediation.steps || [];
            if (stepsArray.length > 0) {
                stepsHtml = `<ol class="smart-fix-steps" style="margin-top: 1rem; color: var(--text-muted); font-size: 0.9rem; padding-left: 1.5rem;">
                    ${stepsArray.map(step => `<li style="margin-bottom: 0.5rem;">${step}</li>`).join('')}
                </ol>`;
            }
        } else {
            summaryText = String(issue.remediation || issue.name);
        }

        container.innerHTML += `
            <div class="smart-fix-card" style="background: rgba(0,0,0,0.3); border-left: 4px solid var(--${issue.severity === 'Critical' ? 'danger' : 'warning'}); margin-bottom: 1rem; padding: 1.5rem; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4 style="margin: 0; font-size: 1.1rem; color: #fff;">${issue.name}</h4>
                        <span class="${severityClass}" style="font-size: 0.8rem; font-weight: bold; text-transform: uppercase;">${issue.severity} PRIORITY</span>
                    </div>
                </div>
                <div style="margin-top: 1rem; color: #e0e0e0; font-weight: 500;">
                    ${summaryText}
                </div>
                ${stepsHtml}
            </div>
        `;
    });
}

// ==========================================
// NEW FEATURE: Compliance Breakdown
// ==========================================
function renderComplianceBreakdown(scores) {
    if (!scores) return;

    const setScore = (idPrefix, value) => {
        const textEl = document.getElementById(`${idPrefix}Score`);
        const barEl = document.getElementById(`${idPrefix}Bar`);
        if (textEl && barEl) {
            textEl.innerText = `${value}/100`;

            let colorClass = 'bg-success';
            let textColor = 'var(--success)';
            if (value < 50) {
                colorClass = 'bg-danger';
                textColor = 'var(--danger)';
            } else if (value < 80) {
                colorClass = 'bg-warning';
                textColor = 'var(--warning)';
            }

            textEl.style.color = textColor;
            barEl.className = `impact-bar ${colorClass}`;
            setTimeout(() => { barEl.style.width = `${value}%`; }, 100);
        }
    };

    setScore("gdpr", scores.gdpr !== undefined ? scores.gdpr : 100);
    setScore("dpdp", scores.dpdp !== undefined ? scores.dpdp : 100);
    setScore("hygiene", scores.hygiene !== undefined ? scores.hygiene : 100);
}
