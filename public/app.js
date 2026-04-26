const nodes = [
    "CityCenter", "SuburbNorth", "SuburbSouth", "Airport",
    "TechPark", "Mall", "Hospital", "University", "IndustrialZone"
];

let trafficRules = [];

document.addEventListener('DOMContentLoaded', () => {
    // Populate traffic select dropdowns
    const trafficU = document.getElementById('trafficU');
    const trafficV = document.getElementById('trafficV');
    
    nodes.forEach(node => {
        trafficU.add(new Option(node, node));
        trafficV.add(new Option(node, node));
    });
    
    // Default different node for V
    trafficV.selectedIndex = 1;

    document.getElementById('addTrafficBtn').addEventListener('click', addTrafficRule);
    document.getElementById('findRouteBtn').addEventListener('click', findRoute);
});

function addTrafficRule() {
    const u = document.getElementById('trafficU').value;
    const v = document.getElementById('trafficV').value;
    const penaltyStr = document.getElementById('trafficPenalty').value;
    const penaltyName = document.getElementById('trafficPenalty').options[document.getElementById('trafficPenalty').selectedIndex].text;
    
    if (u === v) {
        alert("Cannot add traffic on the same node.");
        return;
    }

    const exists = trafficRules.some(r => (r.u === u && r.v === v) || (r.u === v && r.v === u));
    if (exists) {
        alert("Traffic rule already exists for this road.");
        return;
    }

    trafficRules.push({ u, v, penalty: parseInt(penaltyStr), penaltyName });
    renderTrafficRules();
}

function removeTrafficRule(index) {
    trafficRules.splice(index, 1);
    renderTrafficRules();
}

function renderTrafficRules() {
    const container = document.getElementById('trafficRules');
    container.innerHTML = '';
    
    trafficRules.forEach((rule, index) => {
        const div = document.createElement('div');
        div.className = 'traffic-rule-item';
        div.innerHTML = `
            <span><strong>${rule.u} &harr; ${rule.v}</strong>: ${rule.penaltyName}</span>
            <button class="remove-btn" onclick="removeTrafficRule(${index})">Remove</button>
        `;
        container.appendChild(div);
    });
}

async function findRoute() {
    const start = document.getElementById('startNode').value;
    const end = document.getElementById('endNode').value;
    
    if (start === end) {
        showError("Start and destination cannot be the same.");
        return;
    }

    // UI State
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('errorBox').classList.add('hidden');
    document.getElementById('resultBox').classList.add('hidden');
    
    try {
        const response = await fetch('/api/route', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                start,
                end,
                trafficPenalties: trafficRules
            })
        });

        const data = await response.json();
        
        document.getElementById('loading').classList.add('hidden');

        if (!response.ok || data.error) {
            showError(data.error || "An error occurred.");
            return;
        }

        renderResult(data);
    } catch (err) {
        document.getElementById('loading').classList.add('hidden');
        showError("Failed to connect to the server. Make sure the Node.js server is running.");
    }
}

function showError(msg) {
    const errorBox = document.getElementById('errorBox');
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
}

function renderResult(data) {
    document.getElementById('resultBox').classList.remove('hidden');
    document.getElementById('totalCost').textContent = data.total_cost;
    
    const visualizer = document.getElementById('pathVisualizer');
    visualizer.innerHTML = '';
    
    data.path.forEach((node, index) => {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'path-node';
        nodeDiv.innerHTML = `
            <div class="node-icon">${index + 1}</div>
            <div class="node-name">${node}</div>
        `;
        visualizer.appendChild(nodeDiv);

        if (index < data.path.length - 1) {
            const edgeDiv = document.createElement('div');
            edgeDiv.className = 'path-edge';
            visualizer.appendChild(edgeDiv);
        }
    });
}
