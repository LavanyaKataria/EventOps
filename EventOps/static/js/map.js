// Geospatial Map Controller

let maps = {
    ops: null,
    crowd: null,
    transit: null
};

let mapMarkers = {
    shuttles: [],
    incidents: [],
    resources: [],
    crowdZones: []
};

// Nominal coordinates for our simulated Event (Centered near Times Square, NY)
const EVENT_CENTER = [40.7580, -73.9855];
const ZONE_COORDS = {
    "zone-a": [40.7602, -73.9844], // North Entrance
    "zone-b": [40.7582, -73.9858], // Main Stage
    "zone-c": [40.7572, -73.9830], // Food Court
    "zone-d": [40.7562, -73.9862], // South Plaza
    "zone-e": [40.7594, -73.9870]  // Transport Hub
};

function initAllMaps() {
    // CartoDB Dark Matter tile layer URL
    const darkTilesUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const darkTilesAttrib = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

    // 1. Initialize Executive Ops Map
    if (document.getElementById('ops-map') && !maps.ops) {
        maps.ops = L.map('ops-map').setView(EVENT_CENTER, 16);
        L.tileLayer(darkTilesUrl, { attribution: darkTilesAttrib, maxZoom: 19 }).addTo(maps.ops);
    }

    // 2. Initialize Crowd Density Map
    if (document.getElementById('crowd-map') && !maps.crowd) {
        maps.crowd = L.map('crowd-map').setView(EVENT_CENTER, 16);
        L.tileLayer(darkTilesUrl, { attribution: darkTilesAttrib, maxZoom: 19 }).addTo(maps.crowd);
    }

    // 3. Initialize Transit Fleet Map
    if (document.getElementById('transit-map') && !maps.transit) {
        maps.transit = L.map('transit-map').setView(EVENT_CENTER, 15);
        L.tileLayer(darkTilesUrl, { attribution: darkTilesAttrib, maxZoom: 19 }).addTo(maps.transit);
    }
}

// Invalidate size on tab activation (prevents Leaflet grey box glitch)
function resizeActiveMaps() {
    Object.values(maps).forEach(map => {
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 50);
        }
    });
}

function updateGeospatialMarkers(state) {
    initAllMaps();
    
    // Clear old markers/polygons
    mapMarkers.shuttles.forEach(m => m.remove());
    mapMarkers.incidents.forEach(m => m.remove());
    mapMarkers.resources.forEach(m => m.remove());
    mapMarkers.crowdZones.forEach(z => z.remove());
    
    mapMarkers.shuttles = [];
    mapMarkers.incidents = [];
    mapMarkers.resources = [];
    mapMarkers.crowdZones = [];

    const statusColors = {
        "Safe": "#10b981",       // neon-green
        "Moderate": "#f59e0b",   // neon-amber
        "Critical": "#ef4444"    // neon-red
    };

    // 1. Draw Crowd Zones (Semi-transparent circles showing density)
    state.zones.forEach(zone => {
        const center = ZONE_COORDS[zone.id];
        if (center) {
            const color = statusColors[zone.status] || "#06b6d4";
            
            // Draw on Ops map
            if (maps.ops) {
                let circle = L.circle(center, {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.15,
                    radius: zone.id === "zone-b" ? 180 : 120
                }).addTo(maps.ops);
                circle.bindPopup(`<b>${zone.name}</b><br>Density: ${zone.current_density}% (${zone.status})`);
                mapMarkers.crowdZones.push(circle);
            }

            // Draw on Crowd map
            if (maps.crowd) {
                let circle = L.circle(center, {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.3,
                    radius: zone.id === "zone-b" ? 200 : 130
                }).addTo(maps.crowd);
                circle.bindPopup(`<b>${zone.name} Crowd Focus</b><br>Active Count: ${zone.current_count}/${zone.capacity}<br>Trend: ${zone.trend}`);
                mapMarkers.crowdZones.push(circle);
            }
        }
    });

    // 2. Draw Incidents (Blinking red circles)
    state.incidents.forEach(inc => {
        if (inc.status !== "Resolved") {
            const zoneCoord = ZONE_COORDS[inc.zone_id];
            if (zoneCoord) {
                // Introduce micro-offset so multiple incidents in the same zone don't overlap completely
                const offsetLat = (Math.random() - 0.5) * 0.0006;
                const offsetLng = (Math.random() - 0.5) * 0.0006;
                const coord = [zoneCoord[0] + offsetLat, zoneCoord[1] + offsetLng];
                
                const severityColors = {
                    "Critical": "#ef4444",
                    "High": "#f59e0b",
                    "Medium": "#6366f1",
                    "Low": "#94a3b8"
                };
                const color = severityColors[inc.severity] || "#ef4444";
                
                // Draw incident on Ops Map
                if (maps.ops) {
                    let marker = L.circleMarker(coord, {
                        radius: inc.severity === "Critical" ? 10 : 7,
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.8,
                        weight: 2,
                        className: inc.severity === "Critical" ? 'pulse-incident' : ''
                    }).addTo(maps.ops);
                    
                    marker.bindPopup(`
                        <div class="font-sans text-xs">
                            <strong class="text-red-500 font-bold uppercase">[${inc.severity}] ${inc.title}</strong><br>
                            Status: <em class="italic text-slate-300">${inc.status}</em><br>
                            Desc: ${inc.description}
                        </div>
                    `);
                    mapMarkers.incidents.push(marker);
                }
            }
        }
    });

    // 3. Draw Shuttles (Blue markers on Transit and Ops Map)
    state.transport.shuttles.forEach(shuttle => {
        const coord = [shuttle.lat, shuttle.lng];
        
        // Custom shuttle icon HTML
        const shuttleHtml = `
            <div style="
                background: #6366f1; 
                border: 2px solid white; 
                border-radius: 50%; 
                width: 20px; 
                height: 20px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                box-shadow: 0 0 10px rgba(99,102,241,0.6);
            ">
                <i data-lucide="bus" style="color: white; width: 10px; height: 10px;"></i>
            </div>
        `;
        
        const shuttleIcon = L.divIcon({
            html: shuttleHtml,
            className: 'shuttle-map-icon',
            iconSize: [20, 20]
        });

        // Draw shuttle on Transit Map
        if (maps.transit) {
            let marker = L.marker(coord, { icon: shuttleIcon }).addTo(maps.transit);
            marker.bindPopup(`
                <b>${shuttle.name}</b><br>
                Status: ${shuttle.status}<br>
                Capacity: ${shuttle.capacity_utilization}%
            `);
            mapMarkers.shuttles.push(marker);
        }

        // Draw shuttle on Ops Map
        if (maps.ops) {
            let marker = L.marker(coord, { icon: shuttleIcon }).addTo(maps.ops);
            marker.bindPopup(`<b>${shuttle.name}</b><br>Route Utilization: ${shuttle.capacity_utilization}%`);
            mapMarkers.shuttles.push(marker);
        }
    });

    // 4. Draw Resources (Medical/Security Icons)
    state.resources.forEach(res => {
        const coord = [res.lat, res.lng];
        
        let color = "#10b981"; // green for Medical
        let iconName = "heart";
        if (res.type === "Security") {
            color = "#06b6d4"; // Cyan for Security
            iconName = "shield";
        } else if (res.type === "Water") {
            color = "#3b82f6"; // Blue for Water
            iconName = "droplet";
        } else if (res.type === "Equipment") {
            color = "#f59e0b"; // Orange for Equipment
            iconName = "wrench";
        }

        const resHtml = `
            <div style="
                background: ${color}; 
                border: 2px solid white; 
                border-radius: 4px; 
                width: 18px; 
                height: 18px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                box-shadow: 0 0 8px ${color};
            ">
                <span style="color: white; font-size: 8px; font-weight: bold;">${res.type[0]}</span>
            </div>
        `;
        
        const resIcon = L.divIcon({
            html: resHtml,
            className: 'resource-map-icon',
            iconSize: [18, 18]
        });

        if (maps.ops) {
            let marker = L.marker(coord, { icon: resIcon }).addTo(maps.ops);
            marker.bindPopup(`
                <b>${res.name}</b><br>
                Type: ${res.type} (${res.status})<br>
                Util: ${res.utilization_rate}%
            `);
            mapMarkers.resources.push(marker);
        }
    });
}