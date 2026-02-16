let severityChart;
let categoryChart;
let historyChart;

// Theme Colors
const theme = {
    primary: '#06b6d4',
    secondary: '#ec4899',
    accent: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    textMain: '#f8fafc',
    textMuted: '#94a3b8',
    gridColor: 'rgba(255, 255, 255, 0.1)'
};

async function startScan() {
    const urlInput = document.getElementById("urlInput");
    const url = urlInput.value;
    const btn = document.querySelector('.cyber-btn');

    if (!url) {
        alert("Please enter a URL.");
        return;
    }

    // Loading State
    btn.innerHTML = '<span class="btn-text">SCANNING...</span><span class="btn-glitch"></span>';
    btn.style.opacity = '0.7';

    try {
        const response = await fetch("http://localhost:8000/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url })
        });

        const data = await response.json();

        document.getElementById("resultSection").classList.remove("hidden");

        // Animate Score
        animateScore(data.score);

        // Update Risk Level Badge
        const level = data.level.toLowerCase();
        const badge = document.getElementById("riskLevel");
        const scoreCircle = document.querySelector('.score-circle');

        badge.innerText = data.level;

        // Reset classes
        badge.className = "badge";
        scoreCircle.classList.remove('safe', 'medium', 'critical');

        if (level === 'low') {
            badge.classList.add('bg-success');
            scoreCircle.classList.add('safe');
        } else if (level === 'medium') {
            badge.classList.add('bg-warning');
            scoreCircle.classList.add('medium');
        } else {
            badge.classList.add('bg-danger');
            scoreCircle.classList.add('critical');
        }

        renderTable(data.issues);
        renderCharts(data);
        loadHistory();

    } catch (error) {
        console.error("Scan failed:", error);
        alert("Scan failed. Please check the backend.");
    } finally {
        btn.innerHTML = '<span class="btn-text">INITIATE SCAN</span><span class="btn-glitch"></span>';
        btn.style.opacity = '1';
    }
}

function animateScore(targetScore) {
    const scoreEl = document.getElementById("riskScore");
    let currentScore = 0;
    const interval = setInterval(() => {
        if (currentScore >= targetScore) {
            clearInterval(interval);
            scoreEl.innerText = targetScore;
        } else {
            currentScore++;
            scoreEl.innerText = currentScore;
        }
    }, 20);
}

function renderTable(issues) {
    const table = document.getElementById("vulnTable");
    table.innerHTML = "";

    issues.forEach(issue => {
        let severityClass = '';
        let icon = '';

        if (issue.severity === 'High') { severityClass = 'text-danger'; icon = '<i class="fa-solid fa-circle-exclamation"></i>'; }
        else if (issue.severity === 'Medium') { severityClass = 'text-warning'; icon = '<i class="fa-solid fa-triangle-exclamation"></i>'; }
        else { severityClass = 'text-success'; icon = '<i class="fa-solid fa-check-circle"></i>'; }

        const row = `<tr>
                        <td>${issue.name}</td>
                        <td class="${severityClass}">${icon} ${issue.severity}</td>
                        <td>${issue.attack_type}</td>

                    </tr>`;
        table.innerHTML += row;
    });
}

function renderCharts(data) {
    const severityCounts = {};
    const categoryCounts = {};

    data.issues.forEach(issue => {
        severityCounts[issue.severity] = (severityCounts[issue.severity] || 0) + 1;
        categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
    });

    Chart.defaults.color = theme.textMuted;
    Chart.defaults.borderColor = theme.gridColor;

    if (severityChart) severityChart.destroy();
    if (categoryChart) categoryChart.destroy();

    // Severity Chart
    severityChart = new Chart(document.getElementById("severityChart"), {
        type: "bar",
        data: {
            labels: Object.keys(severityCounts),
            datasets: [{
                label: "Severity Count",
                data: Object.values(severityCounts),
                backgroundColor: [theme.success, theme.warning, theme.danger],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: theme.gridColor } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Category Chart
    categoryChart = new Chart(document.getElementById("categoryChart"), {
        type: "doughnut",
        data: {
            labels: Object.keys(categoryCounts),
            datasets: [{
                data: Object.values(categoryCounts),
                backgroundColor: [theme.primary, theme.secondary, theme.accent, theme.success, theme.warning],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

async function loadHistory() {
    const response = await fetch("http://localhost:8000/history");
    const history = await response.json();

    const labels = history.map(h => new Date(h.timestamp).toLocaleTimeString());
    const scores = history.map(h => h.score);

    if (historyChart) historyChart.destroy();

    historyChart = new Chart(document.getElementById("historyChart"), {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Risk Score",
                data: scores,
                borderColor: theme.primary,
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: theme.bgDark,
                pointBorderColor: theme.primary,
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: theme.gridColor } },
                x: { grid: { display: false } }
            }
        }
    });
}
