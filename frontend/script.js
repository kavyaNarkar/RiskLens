let severityChart;
let categoryChart;
let historyChart;

// Theme Colors
const theme = {
    primary: '#00f3ff',
    secondary: '#ff00ea',
    accent: '#7000ff',
    success: '#00ff88',
    warning: '#ffb300',
    danger: '#ff0055',
    textMain: '#f0f4f8',
    textMuted: '#8b9bb4',
    gridColor: 'rgba(255, 255, 255, 0.1)'
};

async function startScan() {
    const urlInput = document.getElementById("urlInput");
    const url = urlInput.value.trim();
    const btn = document.getElementById('scanBtn');
    const btnText = document.getElementById('btnText');

    if (!url) {
        alert("Please enter a valid URL.");
        urlInput.focus();
        return;
    }

    // Prepare UI for loading state
    btn.disabled = true;
    btnText.innerHTML = '<div class="cyber-spinner"></div> SCANNING...';
    btn.style.opacity = "0.7";

    try {
        const response = await fetch("http://localhost:8000/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url })
        });

        if (!response.ok) throw new Error("Backend error processing scan");

        const data = await response.json();
        window.lastScanData = data;

        document.getElementById("resultSection").classList.remove("hidden");

        // Risk Score
        animateScore(data.score, "riskScore");
        document.getElementById("riskLevel").innerText = data.level || "Unknown";

        // Dynamic Risk level styling
        const riskCircle = document.getElementById("riskScore").parentElement;
        riskCircle.className = "score-circle"; // Reset classes
        if (data.score < 40) riskCircle.classList.add("safe");
        else if (data.score < 70) riskCircle.classList.add("medium");
        else riskCircle.classList.add("critical");

        // Compliance Score
        const complianceEl = document.getElementById("complianceScore");
        const complianceCircle = document.getElementById("complianceCircle");
        const complianceBadge = document.getElementById("complianceBadge");

        if (data.compliance_score !== undefined) {
            let score = data.compliance_score;
            if (typeof score === "object" && score.overall !== undefined) {
                score = score.overall;
            }

            animateScore(score, "complianceScore");

            complianceCircle.classList.remove("safe", "medium", "critical");
            complianceBadge.classList.remove("bg-success", "bg-warning", "bg-danger");

            if (score >= 80) {
                complianceCircle.classList.add("safe");
                complianceBadge.classList.add("bg-success");
                complianceBadge.innerText = "Strong Compliance";
            } else if (score >= 50) {
                complianceCircle.classList.add("medium");
                complianceBadge.classList.add("bg-warning");
                complianceBadge.innerText = "Moderate Compliance";
            } else {
                complianceCircle.classList.add("critical");
                complianceBadge.classList.add("bg-danger");
                complianceBadge.innerText = "High Compliance Risk";
            }
        }

        // Executive Summary
        document.getElementById("executiveSummary").innerHTML = data.executive_summary || "No executive summary available for this scan.";

        // Table
        renderTable(data.issues || []);

        // Charts
        renderCharts(data);

        // History
        loadHistory();

    } catch (error) {
        console.error("Scan failed:", error);
        alert("Scan failed. Ensure backend API is running and URL is accessible.");
    } finally {
        // Restore button state
        btn.disabled = false;
        btnText.innerHTML = 'INITIATE SCAN';
        btn.style.opacity = "1";
    }
}

// Animate Risk Score
function animateScore(targetScore, elementId) {
    const scoreEl = document.getElementById(elementId);
    let currentScore = 0;

    // Clear any existing interval on this element to prevent looping bugs
    if (scoreEl.dataset.intervalId) {
        clearInterval(parseInt(scoreEl.dataset.intervalId));
    }

    if (targetScore === 0) {
        scoreEl.innerText = targetScore;
        return;
    }

    const interval = setInterval(() => {
        if (currentScore >= targetScore) {
            clearInterval(interval);
            delete scoreEl.dataset.intervalId;
            scoreEl.innerText = targetScore;
        } else {
            currentScore++;
            scoreEl.innerText = currentScore;
        }
    }, 15);

    scoreEl.dataset.intervalId = interval;
}

// Render Table
function renderTable(issues) {
    const table = document.getElementById("vulnTable");
    table.innerHTML = "";

    if (issues.length === 0) {
        table.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--success); padding: 2rem;">No vulnerabilities found. System is secure!</td></tr>`;
        return;
    }

    issues.forEach(issue => {
        const severityClass = issue.severity === "Critical" ? "text-danger font-bold" :
            issue.severity === "High" ? "text-warning font-bold" :
                issue.severity === "Medium" ? "text-warning" : "text-success";

        const row = `<tr>
                        <td>${issue.name}</td>
                        <td class="${severityClass}">${issue.severity}</td>
                        <td>${issue.attack_type || "N/A"}</td>
                        <td>${issue.priority || "N/A"}</td>
                        <td>${issue.remediation || "N/A"}</td>
                    </tr>`;
        table.innerHTML += row;
    });
}

// Render Charts
function renderCharts(data) {
    const severityCounts = { "Critical": 0, "High": 0, "Medium": 0, "Low": 0 };
    const categoryCounts = {};

    (data.issues || []).forEach(issue => {
        if (severityCounts[issue.severity] !== undefined) {
            severityCounts[issue.severity]++;
        } else {
            severityCounts[issue.severity] = 1;
        }
        categoryCounts[issue.name] = (categoryCounts[issue.name] || 0) + 1;
    });

    Chart.defaults.color = theme.textMuted;
    Chart.defaults.borderColor = theme.gridColor;
    Chart.defaults.font.family = theme.fontBody;

    if (severityChart) severityChart.destroy();
    if (categoryChart) categoryChart.destroy();

    severityChart = new Chart(document.getElementById("severityChart"), {
        type: "bar",
        data: {
            labels: Object.keys(severityCounts),
            datasets: [{
                label: "Quantity",
                data: Object.values(severityCounts),
                backgroundColor: [
                    theme.danger,
                    theme.warning,
                    theme.accent,
                    theme.success
                ],
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: theme.gridColor },
                    ticks: { stepSize: 1 }
                },
                y: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });

    const categories = Object.keys(categoryCounts);

    // We need to safely map colors for each category length
    const bgColors = [
        theme.primary, theme.secondary, theme.accent,
        theme.warning, theme.danger, theme.success
    ];
    let doughnutColors = categories.length > 0 ? categories.map((_, i) => bgColors[i % bgColors.length]) : [theme.success];

    categoryChart = new Chart(document.getElementById("categoryChart"), {
        type: "doughnut",
        data: {
            labels: categories.length > 0 ? categories : ["No Issues"],
            datasets: [{
                data: categories.length > 0 ? Object.values(categoryCounts) : [1],
                backgroundColor: doughnutColors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}



// Load History
async function loadHistory() {
    try {
        const response = await fetch("http://localhost:8000/history");
        if (!response.ok) return;

        const history = await response.json();
        if (!history || history.length === 0) return;

        const labels = history.map(h => new Date(h.timestamp).toLocaleTimeString());
        const scores = history.map(h => h.score);

        if (historyChart) historyChart.destroy();

        historyChart = new Chart(document.getElementById("historyChart"), {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Risk Score History",
                    data: scores,
                    borderColor: theme.primary,
                    backgroundColor: 'rgba(0, 243, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: theme.secondary,
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: theme.secondary
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } catch (e) {
        console.error("Failed to load history", e);
    }
}

// PDF Download
async function downloadReport() {
    if (!window.lastScanData) {
        alert("Please run a scan first.");
        return;
    }

    try {
        const response = await fetch("http://localhost:8000/generate-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(window.lastScanData)
        });

        if (!response.ok) throw new Error("Failed to generate PDF");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "RiskLens_Security_Report.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error(error);
        alert("Failed to download PDF report. Ensure backend PDF generation is working.");
    }
}
