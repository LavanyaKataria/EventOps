// EventOps Command Center - Core UI & Telemetry Controller

let stateData = null;
let charts = {
    crowd: null,
    volunteer: null,
    resource: null,
    incident: null
};

// Historical datasets for line graphs
let crowdDensityHistory = [];
let timeLabelsHistory = [];

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize clock
    setInterval(updateSystemClock, 1000);
    updateSystemClock();

    // 2. Setup Navigation Tab Swapper
    setupTabNavigation();

    // 3. Setup Dialog Modals
    setupDialogs();

    // 4. Setup Forms and Triggers
    setupFormsAndTriggers();

    // 5. Initialize ChartJS Instances
    initCharts();

    // 6. Start Live Polling (Every 3 seconds)
    setInterval(fetchStateUpdates, 3000);
    fetchStateUpdates(); // Initial fetch
});

// System Clock HH:MM:SS
function updateSystemClock() {
    const display = document.getElementById("clock-display");
    if (display) {
        const now = new Date();
        display.textContent = now.toTimeString().split(' ')[0];
    }
}

// Single Page Navigation Swapping
function setupTabNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const tabs = document.querySelectorAll(".tab-content");

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = item.getAttribute("data-tab");

            // Toggle Sidebar Selection
            navItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            // Toggle Visible Tab panel
            tabs.forEach(tab => {
                tab.classList.remove("active");
                if (tab.id === `tab-${tabId}`) {
                    tab.classList.add("active");
                }
            });

            // Adjust Leaflet maps when visible
            resizeActiveMaps();
        });
    });
}

// Dialog overlays handlers
function setupDialogs() {
    const overlay = document.getElementById("dispatch-modal-overlay");
    const btnClose = document.getElementById("btn-close-dispatch");

    btnClose.addEventListener("click", () => {
        overlay.style.display = "none";
    });

    // Click outside to close
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            overlay.style.display = "none";
        }
    });

    // Floating Demo Controller Drawer Toggle
    const demoDrawer = document.getElementById("demo-controller-drawer");
    const demoToggle = document.getElementById("demo-toggle-btn");

    demoToggle.addEventListener("click", () => {
        demoDrawer.classList.toggle("open");
    });
}

// Forms and event listeners
function setupFormsAndTriggers() {
    // A. Incident Logger Form
    const incidentForm = document.getElementById("incident-report-form");
    incidentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const payload = {
            title: document.getElementById("inc-title").value,
            zone_id: document.getElementById("inc-zone").value,
            severity: document.getElementById("inc-severity").value,
            reporter: document.getElementById("inc-reporter").value,
            description: document.getElementById("inc-desc").value
        };

        try {
            const response = await fetch("/api/incident", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                incidentForm.reset();
                fetchStateUpdates(); // refresh
                addNotificationLog("Incident dispatched and logged into state.");
            }
        } catch (error) {
            console.error("Failed to log incident:", error);
        }
    });

    // B. Volunteer Dispatch Form Submittal
    const btnSubmitDispatch = document.getElementById("btn-submit-dispatch");
    btnSubmitDispatch.addEventListener("click", async () => {
        const payload = {
            id: document.getElementById("dispatch-vol-id").value,
            zone_id: document.getElementById("dispatch-zone-select").value
        };

        try {
            const response = await fetch("/api/volunteer/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                document.getElementById("dispatch-modal-overlay").style.display = "none";
                fetchStateUpdates(); // refresh
                addNotificationLog("Personnel reassigned.");
            }
        } catch (error) {
            console.error("Failed to dispatch volunteer:", error);
        }
    });

    // C. Demo Controller triggers
    const demoBtns = document.querySelectorAll(".btn-demo-trigger");
    demoBtns.forEach(btn => {
        btn.addEventListener("click", async () => {
            const trigger = btn.getAttribute("data-trigger");
            try {
                const response = await fetch("/api/demo-trigger", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ trigger })
                });

                if (response.ok) {
                    fetchStateUpdates(); // immediately refresh state
                    addNotificationLog(`Simulation profile [${trigger.toUpperCase()}] injected.`);
                }
            } catch (error) {
                console.error("Demo trigger command failed:", error);
            }
        });
    });

    // D. Auto-Balance Workload button
    const btnBalance = document.getElementById("btn-balance-workload");
    btnBalance.addEventListener("click", () => {
        if (!stateData) return;
        
        // Find under-utilized volunteers and critical zones
        const maxZone = stateData.zones.reduce((max, z) => z.current_density > max.current_density ? z : max, stateData.zones[0]);
        const lowVolunteers = stateData.volunteers.filter(v => v.status === "Available" || v.workload_score < 4);

        if (lowVolunteers.length > 0 && maxZone.current_density > 65) {
            // Assign first low volunteer
            const targetVol = lowVolunteers[0];
            fetch("/api/volunteer/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: targetVol.id, zone_id: maxZone.id })
            }).then(res => {
                if (res.ok) {
                    fetchStateUpdates();
                    alert(`AI Auto-Balanced: Reassigned ${targetVol.name} to ${maxZone.name} due to elevated crowd levels.`);
                }
            });
        } else {
            alert("Workload Balance Check: Staff workload is currently optimal and proportional to zone crowd levels.");
        }
    });
}

// Fetch telemetry updates from Flask API
async function fetchStateUpdates() {
    try {
        const response = await fetch("/api/state");
        const state = await response.json();
        stateData = state;

        // A. Update Executive KPIs with animated shifts
        updateDashboardCounters(state.stats);

        // B. Update Alert banner and notifications
        updateAlertBanners(state.alerts);

        // C. Update Maps Markers
        updateGeospatialMarkers(state);

        // D. Update Interactive Telemetry Tabs
        updateCrowdTab(state.zones);
        updateIncidentTab(state.incidents);
        updateVolunteersTab(state.volunteers, state.zones);
        updateTransportTab(state.transport);
        updateResourcesTab(state.resources);

        // E. Update Charts
        updateChartsData(state);

        // F. Update Live feed logs
        updateLiveActivityFeed(state.alerts, state.incidents);

    } catch (error) {
        console.error("Connection lost to telemetry stream:", error);
        document.getElementById("system-status-badge").className = "status-indicator-badge bg-red-950/40 text-red-500 border-red-500/30";
        document.getElementById("status-dot-indicator").className = "status-dot danger";
        document.getElementById("status-dot-indicator").style.backgroundColor = "#ef4444";
    }
}

// Update KPI counters
function updateDashboardCounters(stats) {
    animateCount("val-total-attendees", stats.total_attendees);
    
    const densityVal = document.getElementById("val-crowd-density");
    densityVal.textContent = stats.crowd_density_score;
    const densityTrend = document.getElementById("trend-crowd-density");
    
    if (stats.crowd_density_score >= 7.5) {
        densityVal.className = "metric-value text-red-500";
        densityTrend.innerHTML = '<span class="text-red-500 font-bold"><i data-lucide="alert-triangle" class="inline w-3 h-3"></i> CRITICAL SURGE</span>';
    } else if (stats.crowd_density_score >= 5.5) {
        densityVal.className = "metric-value text-amber-500";
        densityTrend.innerHTML = '<span class="text-amber-500"><i data-lucide="trending-up" class="inline w-3 h-3"></i> Elevated</span>';
    } else {
        densityVal.className = "metric-value";
        densityTrend.innerHTML = '<span class="text-emerald-500"><i data-lucide="check" class="inline w-3 h-3"></i> Normal</span>';
    }

    const valInc = document.getElementById("val-active-incidents");
    valInc.textContent = stats.incident_count;
    const trendInc = document.getElementById("trend-incidents");
    if (stats.incident_count > 0) {
        valInc.className = "metric-value text-red-500 font-bold";
        trendInc.innerHTML = `<span class="text-red-500 blink-text"><i class="inline w-3 h-3" data-lucide="bell-ring"></i> ${stats.incident_count} active triage</span>`;
    } else {
        valInc.className = "metric-value text-emerald-500";
        trendInc.textContent = "All clear";
    }

    document.getElementById("val-vol-avail").textContent = stats.volunteer_availability;
    document.getElementById("val-vol-total").textContent = stats.volunteer_total;

    const valTransport = document.getElementById("val-transport-status");
    valTransport.textContent = stats.transport_status;
    const trendTransport = document.getElementById("trend-transport");
    if (stats.transport_status === "Operational") {
        valTransport.className = "metric-value text-emerald-500 text-2xl";
        trendTransport.innerHTML = '<span class="text-emerald-500"><i data-lucide="check" class="inline w-3 h-3"></i> Normal loop</span>';
    } else {
        valTransport.className = "metric-value text-amber-500 text-2xl";
        trendTransport.innerHTML = '<span class="text-amber-500"><i data-lucide="alert-triangle" class="inline w-3 h-3"></i> Delays reported</span>';
    }

    document.getElementById("val-readiness").textContent = stats.emergency_readiness_score;
    document.getElementById("bar-readiness").style.width = `${stats.emergency_readiness_score}%`;
    if (stats.emergency_readiness_score < 75) {
        document.getElementById("bar-readiness").className = "bg-red-500 h-1.5 rounded-full";
    } else if (stats.emergency_readiness_score < 90) {
        document.getElementById("bar-readiness").className = "bg-amber-500 h-1.5 rounded-full";
    } else {
        document.getElementById("bar-readiness").className = "bg-emerald-500 h-1.5 rounded-full";
    }

    // Refresh icons inside dynamically updated divs
    lucide.createIcons();
}

// Simple counter animation
function animateCount(elemId, endValue) {
    const el = document.getElementById(elemId);
    if (!el) return;
    const startValue = parseInt(el.textContent.replace(/,/g, '')) || 0;
    if (startValue === endValue) return;

    let duration = 800;
    let startTime = null;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        let progress = Math.min((timestamp - startTime) / duration, 1);
        let current = Math.floor(progress * (endValue - startValue) + startValue);
        el.textContent = current.toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    }
    window.requestAnimationFrame(step);
}

// Tickers/Alarms displays
function updateAlertBanners(alerts) {
    const banner = document.getElementById("alert-banner");
    const bannerText = document.getElementById("alert-banner-text");
    const badge = document.getElementById("notification-badge");

    const criticalAlerts = alerts.filter(a => a.type === "danger");
    badge.textContent = alerts.length;

    if (criticalAlerts.length > 0) {
        banner.style.display = "flex";
        bannerText.innerHTML = `🚨 WARNING: ${criticalAlerts[0].message} (Logged: ${criticalAlerts[0].timestamp})`;
    } else if (alerts.length > 0) {
        banner.style.display = "flex";
        banner.style.backgroundColor = "rgba(245, 158, 11, 0.15)";
        banner.style.borderBottom = "1px solid rgba(245, 158, 11, 0.3)";
        bannerText.innerHTML = `⚠️ ADVISORY: ${alerts[0].message}`;
    } else {
        banner.style.display = "none";
    }
}

// Crowd Tab UI populating
function updateCrowdTab(zones) {
    const container = document.getElementById("crowd-zone-container");
    if (!container) return;

    container.innerHTML = "";

    zones.forEach(zone => {
        const card = document.createElement("div");
        card.className = "glass-panel zone-card";

        const badgeClass = zone.status === "Safe" ? "safe" : (zone.status === "Moderate" ? "moderate" : "critical");
        const progressClass = zone.status === "Safe" ? "safe" : (zone.status === "Moderate" ? "moderate" : "critical");
        const trendIcon = zone.trend === "rising" ? "trending-up" : (zone.trend === "falling" ? "trending-down" : "minus");
        const trendColor = zone.trend === "rising" ? "text-red-400" : (zone.trend === "falling" ? "text-emerald-400" : "text-slate-400");

        card.innerHTML = `
            <div class="zone-header">
                <span class="zone-name">${zone.name}</span>
                <span class="zone-badge ${badgeClass}">${zone.status}</span>
            </div>
            <div class="zone-stats">
                <span>Count: <strong class="zone-count-val">${zone.current_count.toLocaleString()}</strong></span>
                <span>Limit: ${zone.capacity.toLocaleString()}</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar ${progressClass}" style="width: ${zone.current_density}%"></div>
            </div>
            <div class="flex justify-between items-center text-xs text-slate-400">
                <span>Density: ${zone.current_density}%</span>
                <span class="flex items-center gap-1 ${trendColor}">
                    <i data-lucide="${trendIcon}" class="w-3.5 h-3.5"></i> ${zone.trend}
                </span>
            </div>
            <div class="zone-action">
                <span class="text-cyan-400 font-bold uppercase text-[9px] font-mono block mb-1">AI Recommendation:</span>
                ${zone.recommended_action}
            </div>
        `;
        container.appendChild(card);
    });

    // Generate AI prediction reports box on Crowd tab
    const predictionsBox = document.getElementById("ai-crowd-predictions");
    if (predictionsBox && zones.length > 0) {
        const maxZone = zones.reduce((max, z) => z.current_density > max.current_density ? z : max, zones[0]);
        
        predictionsBox.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-start gap-3">
                    <span class="text-red-400 text-lg mt-0.5"><i data-lucide="zap"></i></span>
                    <div>
                        <strong class="text-slate-200 text-xs uppercase font-mono block">Impending congestion alerts</strong>
                        <p class="text-xs text-slate-400 mt-0.5">
                            High risk index (density: ${maxZone.current_density}%) computed at **${maxZone.name}**. Overcrowding likely during the next 45 minutes.
                        </p>
                    </div>
                </div>
                <div class="flex items-start gap-3 border-t border-slate-800 pt-3">
                    <span class="text-cyan-400 text-lg mt-0.5"><i data-lucide="shield-check"></i></span>
                    <div>
                        <strong class="text-slate-200 text-xs uppercase font-mono block">Mitigation Recommendations</strong>
                        <ul class="list-disc ml-4 mt-1 text-xs text-slate-400 space-y-1">
                            <li>Dispatch ${maxZone.status === "Critical" ? "8+" : "4+"} volunteers immediately to lead gates.</li>
                            <li>Configure electronic signage to display alternative exit routes.</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    lucide.createIcons();
}

// Incident Tab UI
function updateIncidentTab(incidents) {
    const container = document.getElementById("incident-roster-container");
    if (!container) return;

    container.innerHTML = "";

    if (incidents.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-slate-500">
                <i data-lucide="smile" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
                <p class="font-bold">No active incident logs</p>
                <p class="text-xs mt-1">All sectors report normal operations.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    incidents.forEach(inc => {
        const card = document.createElement("div");
        
        const borderColors = {
            "Critical": "border-red",
            "High": "border-amber",
            "Medium": "border-indigo",
            "Low": "border-cyan"
        };
        const badgeColors = {
            "Critical": "bg-red-950/60 text-red-500 border-red-500/30",
            "High": "bg-amber-950/60 text-amber-500 border-amber-500/30",
            "Medium": "bg-indigo-950/60 text-indigo-400 border-indigo-500/30",
            "Low": "bg-cyan-950/60 text-cyan-400 border-cyan-500/30"
        };
        const statusColors = {
            "Reported": "text-red-400",
            "Dispatched": "text-amber-400",
            "On-Scene": "text-indigo-400",
            "Resolved": "text-emerald-400"
        };

        const borderClass = borderColors[inc.severity] || "border-cyan";
        const badgeClass = badgeColors[inc.severity] || "text-slate-400";
        
        card.className = `glass-panel incident-card ${borderClass}`;
        
        // Compile actions list
        let actionsHtml = "";
        inc.recommended_actions.forEach(act => {
            actionsHtml += `<li>${act}</li>`;
        });

        // Compile timeline
        let timelineHtml = "";
        inc.timeline.forEach(t => {
            timelineHtml += `
                <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span class="font-mono text-cyan-400">[${t.timestamp}]</span>
                    <strong>${t.status}:</strong> ${t.msg}
                </div>
            `;
        });

        card.innerHTML = `
            <div class="incident-card-header">
                <div>
                    <span class="zone-badge ${badgeClass} mr-2 font-mono text-[9px]">${inc.severity.toUpperCase()}</span>
                    <strong class="incident-title">${inc.title}</strong>
                </div>
                <div class="text-xs font-mono font-bold ${statusColors[inc.status]}">${inc.status}</div>
            </div>
            <div class="incident-meta">
                <span>Location: ${getZoneName(inc.zone_id)}</span>
                <span>| Logged: ${inc.timestamp}</span>
                <span>| Reporter: ${inc.reporter}</span>
            </div>
            <p class="incident-desc text-slate-300">${inc.description}</p>
            
            <div class="incident-actions">
                <h5>AI Recommended Operations Action</h5>
                <ul>${actionsHtml}</ul>
            </div>
            
            <div class="border-t border-slate-800/60 pt-3 flex justify-between items-center">
                <div class="flex-grow">
                    <span class="text-[9px] uppercase font-mono text-slate-400 block mb-1">Status Timeline</span>
                    ${timelineHtml}
                </div>
                <div class="incident-status-control ml-4">
                    ${inc.status === "Reported" ? `<button class="btn btn-secondary py-1.5 px-3 text-xs" onclick="updateIncidentStatus('${inc.id}', 'Dispatched')">Dispatch</button>` : ''}
                    ${inc.status === "Dispatched" ? `<button class="btn btn-secondary py-1.5 px-3 text-xs" onclick="updateIncidentStatus('${inc.id}', 'On-Scene')">Deploy On-Scene</button>` : ''}
                    ${inc.status === "On-Scene" ? `<button class="btn btn-primary py-1.5 px-3 text-xs bg-emerald-600 hover:bg-emerald-500" onclick="updateIncidentStatus('${inc.id}', 'Resolved')">Resolve</button>` : ''}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    lucide.createIcons();
}

async function updateIncidentStatus(incId, status) {
    try {
        const response = await fetch("/api/incident/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: incId, status })
        });
        if (response.ok) {
            fetchStateUpdates();
            addNotificationLog(`Incident status shifted to [${status}].`);
        }
    } catch (e) {
        console.error(e);
    }
}

// Volunteer Tab UI
function updateVolunteersTab(volunteers, zones) {
    const container = document.getElementById("volunteers-directory-container");
    if (!container) return;

    container.innerHTML = "";

    volunteers.forEach(vol => {
        const card = document.createElement("div");
        card.className = "glass-panel volunteer-card";
        
        const statusColors = {
            "Available": "bg-emerald-950/60 text-emerald-400 border-emerald-500/20",
            "Busy": "bg-amber-950/60 text-amber-400 border-amber-500/20",
            "Off-Duty": "bg-slate-800 text-slate-400 border-slate-600/20"
        };
        const statusBadge = statusColors[vol.status] || "text-slate-400";
        const zoneName = getZoneName(vol.assigned_zone_id);

        const workloadClass = vol.workload_score >= 7.5 ? "high" : "";

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="volunteer-name">${vol.name}</h4>
                    <span class="volunteer-role">${vol.role}</span>
                </div>
                <span class="zone-badge text-[9px] ${statusBadge}">${vol.status}</span>
            </div>
            <div class="volunteer-meta mt-2 space-y-1">
                <div><i data-lucide="map-pin" class="inline w-3 h-3 mr-1 text-slate-400"></i> Assigned: ${zoneName}</div>
                <div><i data-lucide="phone" class="inline w-3 h-3 mr-1 text-slate-400"></i> ${vol.contact}</div>
            </div>
            <div class="workload-gauge">
                <span>Workload:</span>
                <div class="workload-bar-container">
                    <div class="workload-bar ${workloadClass}" style="width: ${vol.workload_score * 10}%"></div>
                </div>
                <span class="font-mono text-xs">${vol.workload_score}/10</span>
            </div>
            <button class="btn btn-secondary text-xs mt-3 w-full py-1.5" onclick="openDispatchModal('${vol.id}', '${vol.name}')">
                <i data-lucide="navigation"></i> Reassign Sector
            </button>
        `;
        container.appendChild(card);
    });

    // Populate recommendation list box
    const recsList = document.getElementById("volunteer-deployment-recommendations");
    if (recsList) {
        recsList.innerHTML = "";
        
        // Find most crowded zone
        const maxZone = zones.reduce((max, z) => z.current_density > max.current_density ? z : max, zones[0]);
        const availVolunteersCount = volunteers.filter(v => v.status === "Available").length;

        if (maxZone.current_density > 75) {
            recsList.innerHTML += `
                <li class="flex items-start gap-1.5 text-amber-400">
                    <span>⚡</span> 
                    <span>Deploy 3 volunteers to **${maxZone.name}** immediately. Currently understaffed for critical load.</span>
                </li>
            `;
        }
        if (availVolunteersCount > 0) {
            recsList.innerHTML += `
                <li class="flex items-start gap-1.5 text-emerald-400">
                    <span>✔</span> 
                    <span>You have ${availVolunteersCount} idle staff units. Station them at hydration or shuttle entries.</span>
                </li>
            `;
        } else {
            recsList.innerHTML += `
                <li class="flex items-start gap-1.5 text-slate-400">
                    <span>ℹ</span> 
                    <span>Volunteer distribution is aligned with visitor traffic. Workload averages 5.6/10.</span>
                </li>
            `;
        }
    }
    lucide.createIcons();
}

function openDispatchModal(volId, volName) {
    document.getElementById("dispatch-vol-id").value = volId;
    document.getElementById("dispatch-vol-name").textContent = volName;
    document.getElementById("dispatch-modal-overlay").style.display = "flex";
}

// Transit Tab UI
function updateTransportTab(transport) {
    // 1. Routes
    const routesContainer = document.getElementById("transit-routes-list");
    if (routesContainer) {
        routesContainer.innerHTML = "";
        transport.routes.forEach(route => {
            const item = document.createElement("div");
            item.className = "glass-panel p-4 mb-3 flex justify-between items-center";
            
            const badgeColors = {
                "On Time": "bg-emerald-950/60 text-emerald-400 border-emerald-500/20",
                "Delayed": "bg-amber-950/60 text-amber-400 border-amber-500/20",
                "Suspended": "bg-red-950/60 text-red-400 border-red-500/20"
            };
            const badgeClass = badgeColors[route.status] || "text-slate-400";
            
            item.innerHTML = `
                <div>
                    <h4 class="font-bold text-slate-100">${route.name}</h4>
                    <span class="text-xs text-slate-400 font-mono">Active Vehicles: ${route.active_shuttles_count}</span>
                </div>
                <div class="text-right">
                    <span class="zone-badge ${badgeClass} text-[9px] font-mono">${route.status}</span>
                    ${route.delay_minutes > 0 ? `<p class="text-xs text-amber-400 font-mono mt-1">+${route.delay_minutes}m delay</p>` : ''}
                </div>
            `;
            routesContainer.appendChild(item);
        });
    }

    // 2. Shuttle fleet roster
    const shuttleContainer = document.getElementById("shuttle-roster-grid");
    if (shuttleContainer) {
        shuttleContainer.innerHTML = "";
        transport.shuttles.forEach(shuttle => {
            const card = document.createElement("div");
            card.className = "glass-panel p-4 flex flex-col gap-2";
            
            const routeName = shuttle.route_id === "route-red" ? "Red Route" : (shuttle.route_id === "route-blue" ? "Blue Route" : "Green Route");
            const utilColor = shuttle.capacity_utilization >= 85 ? "bg-red-500" : (shuttle.capacity_utilization >= 65 ? "bg-amber-500" : "bg-indigo-500");
            
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <strong class="text-slate-100 text-sm">${shuttle.name}</strong>
                    <span class="text-[9px] font-mono text-cyan-400 uppercase">${routeName}</span>
                </div>
                <div class="text-xs text-slate-400 flex justify-between">
                    <span>Status: ${shuttle.status}</span>
                    <span class="font-mono text-slate-300 font-bold">${shuttle.capacity_utilization}% Util</span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-1.5 mt-1">
                    <div class="${utilColor} h-1.5 rounded-full" style="width: ${shuttle.capacity_utilization}%"></div>
                </div>
            `;
            shuttleContainer.appendChild(card);
        });
    }
}

// Resource Tab UI
function updateResourcesTab(resources) {
    const container = document.getElementById("resource-assets-grid");
    if (!container) return;

    container.innerHTML = "";

    resources.forEach(res => {
        const card = document.createElement("div");
        card.className = "glass-panel p-4 flex flex-col gap-2";

        const typeColors = {
            "Medical": "text-emerald-400",
            "Security": "text-cyan-400",
            "Water": "text-blue-400",
            "Equipment": "text-amber-400"
        };
        const statusColors = {
            "Operational": "bg-emerald-950/60 text-emerald-400 border-emerald-500/20",
            "Low Stock": "bg-amber-950/60 text-amber-400 border-amber-500/20",
            "Critical Stock": "bg-red-950/60 text-red-500 border-red-500/20"
        };

        const typeColor = typeColors[res.type] || "text-slate-400";
        const statusClass = statusColors[res.status] || "text-slate-400";

        card.innerHTML = `
            <div class="flex justify-between items-center">
                <strong class="text-slate-100 text-sm">${res.name}</strong>
                <span class="zone-badge text-[9px] font-mono ${statusClass}">${res.status}</span>
            </div>
            <div class="text-xs font-mono uppercase tracking-wider font-bold ${typeColor} mt-1">${res.type} unit</div>
            <p class="text-xs text-slate-400 line-clamp-2 mt-1">${res.details}</p>
            <div class="mt-2 text-xs flex justify-between items-center text-slate-400">
                <span>Capacity Deployed:</span>
                <span class="font-mono text-slate-200 font-bold">${res.utilization_rate}%</span>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-1.5">
                <div class="bg-indigo-500 h-1.5 rounded-full" style="width: ${res.utilization_rate}%"></div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Helper to get Zone Text
function getZoneName(zoneId) {
    const zones = {
        "zone-a": "North Entrance",
        "zone-b": "Main Stage Arena",
        "zone-c": "Food Court",
        "zone-d": "South Plaza",
        "zone-e": "Transportation Hub"
    };
    return zones[zoneId] || "Unknown Area";
}

// System Logs/Activity sidebar list
function updateLiveActivityFeed(alerts, incidents) {
    const feed = document.getElementById("live-activity-list");
    if (!feed) return;

    feed.innerHTML = "";

    // Combine alerts and incidents sorted by timestamp (simulated descending)
    let feedItems = [];

    alerts.forEach(a => {
        feedItems.push({
            time: a.timestamp,
            title: a.message,
            tag: a.type === "danger" ? "Critical" : "Warning",
            color: a.type === "danger" ? "text-red-400" : "text-amber-400"
        });
    });

    incidents.forEach(inc => {
        // Add log when reported
        feedItems.push({
            time: inc.timestamp,
            title: `Incident Filed: ${inc.title} - Severity: [${inc.severity}]`,
            tag: "Incident",
            color: "text-indigo-400"
        });
    });

    // Sort by timestamp
    feedItems.sort((a, b) => b.time.localeCompare(a.time));

    // Limit to 8 items
    feedItems.slice(0, 8).forEach(item => {
        const li = document.createElement("li");
        li.className = "activity-item";
        
        li.innerHTML = `
            <div class="activity-item-header">
                <span class="activity-time font-mono">${item.time}</span>
                <span class="${item.color} font-bold text-[9px] uppercase tracking-wider">${item.tag}</span>
            </div>
            <span class="activity-desc text-slate-200">${item.title}</span>
        `;
        feed.appendChild(li);
    });
}

// Appends notification log on manual dispatcher logs
function addNotificationLog(text) {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    
    // Add to state alerts temporarily
    if (stateData) {
        stateData.alerts.unshift({
            id: `sys-${Date.now()}`,
            type: "info",
            message: text,
            timestamp: timeStr,
            zone_id: "general"
        });
        updateAlertBanners(stateData.alerts);
        updateLiveActivityFeed(stateData.alerts, stateData.incidents);
    }
}

// ================= CHARTJS GRAPH FUNCTIONS =================
function initCharts() {
    const gridColor = "rgba(6, 182, 212, 0.05)";
    const textColor = "#94a3b8";

    // 1. Crowd Density Line Chart
    const ctxCrowd = document.getElementById("chart-crowd-density");
    if (ctxCrowd) {
        charts.crowd = new Chart(ctxCrowd, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Global Crowd Index',
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.15)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    data: []
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { min: 0, max: 10, grid: { color: gridColor }, ticks: { color: textColor } }
                }
            }
        });
    }

    // 2. Volunteer assignment bar chart
    const ctxVol = document.getElementById("chart-volunteer-allocation");
    if (ctxVol) {
        charts.volunteer = new Chart(ctxVol, {
            type: 'bar',
            data: {
                labels: ['Gate A', 'Main Stage', 'Food Court', 'South Plaza', 'Transit Hub'],
                datasets: [{
                    label: 'Volunteers Deployed',
                    backgroundColor: 'rgba(99, 102, 241, 0.65)',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    data: [0, 0, 0, 0, 0]
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } }
                }
            }
        });
    }

    // 3. Resource consumption radar/doughnut
    const ctxRes = document.getElementById("chart-resource-utilization");
    if (ctxRes) {
        charts.resource = new Chart(ctxRes, {
            type: 'doughnut',
            data: {
                labels: ['Medical Post 1', 'Main Gate Security', 'Central Water', 'Equipment Shed'],
                datasets: [{
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.6)',
                        'rgba(6, 182, 212, 0.6)',
                        'rgba(59, 130, 246, 0.6)',
                        'rgba(245, 158, 11, 0.6)'
                    ],
                    borderWidth: 0,
                    data: [45, 70, 35, 80]
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { color: textColor } } }
            }
        });
    }

    // 4. Incident resolution timeline line graph
    const ctxInc = document.getElementById("chart-incident-timeline");
    if (ctxInc) {
        charts.incident = new Chart(ctxInc, {
            type: 'bar',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low'],
                datasets: [
                    {
                        label: 'Active',
                        backgroundColor: 'rgba(239, 68, 68, 0.65)',
                        data: [0, 0, 0, 0]
                    },
                    {
                        label: 'Resolved',
                        backgroundColor: 'rgba(16, 185, 129, 0.65)',
                        data: [1, 2, 4, 3] // mock baseline resolved
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: textColor } } },
                scales: {
                    x: { stacked: true, grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { stacked: true, beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } }
                }
            }
        });
    }
}

// Refresh Charts data on tick
function updateChartsData(state) {
    // 1. Update Crowd Index line graph (keeps historical trend line sliding)
    const now = new Date();
    const labelTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    crowdDensityHistory.push(state.stats.crowd_density_score);
    timeLabelsHistory.push(labelTime);

    // Limit length to 10 points
    if (crowdDensityHistory.length > 10) {
        crowdDensityHistory.shift();
        timeLabelsHistory.shift();
    }

    if (charts.crowd) {
        charts.crowd.data.labels = timeLabelsHistory;
        charts.crowd.data.datasets[0].data = crowdDensityHistory;
        
        // Dynamic coloring of line if critical
        if (state.stats.crowd_density_score >= 7.5) {
            charts.crowd.data.datasets[0].borderColor = '#ef4444';
            charts.crowd.data.datasets[0].backgroundColor = 'rgba(239, 68, 68, 0.15)';
        } else {
            charts.crowd.data.datasets[0].borderColor = '#06b6d4';
            charts.crowd.data.datasets[0].backgroundColor = 'rgba(6, 182, 212, 0.15)';
        }
        
        charts.crowd.update('none'); // Update without animation stutter
    }

    // 2. Update Volunteer allocations per zone
    if (charts.volunteer) {
        const counts = [0, 0, 0, 0, 0]; // matching zone indices
        const zoneMapping = { "zone-a": 0, "zone-b": 1, "zone-c": 2, "zone-d": 3, "zone-e": 4 };
        
        state.volunteers.forEach(vol => {
            const index = zoneMapping[vol.assigned_zone_id];
            if (index !== undefined && vol.status === "Busy") {
                counts[index]++;
            }
        });
        
        charts.volunteer.data.datasets[0].data = counts;
        charts.volunteer.update('none');
    }

    // 3. Update Resource utilization
    if (charts.resource) {
        const utils = state.resources.map(res => res.utilization_rate);
        charts.resource.data.datasets[0].data = utils;
        charts.resource.update('none');
    }

    // 4. Update Incident status counts
    if (charts.incident) {
        const activeCounts = { "Critical": 0, "High": 0, "Medium": 0, "Low": 0 };
        const resolvedCounts = { "Critical": 0, "High": 1, "Medium": 3, "Low": 4 }; // baselines
        
        state.incidents.forEach(inc => {
            if (inc.status !== "Resolved") {
                activeCounts[inc.severity]++;
            } else {
                resolvedCounts[inc.severity]++;
            }
        });
        
        charts.incident.data.datasets[0].data = [activeCounts["Critical"], activeCounts["High"], activeCounts["Medium"], activeCounts["Low"]];
        charts.incident.data.datasets[1].data = [resolvedCounts["Critical"], resolvedCounts["High"], resolvedCounts["Medium"], resolvedCounts["Low"]];
        charts.incident.update('none');
    }
}