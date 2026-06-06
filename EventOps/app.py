import os
import json
import random
from datetime import datetime
from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Initial Mock Data State
def get_initial_state():
    return {
        "stats": {
            "total_attendees": 14250,
            "crowd_density_score": 5.4, # out of 10
            "incident_count": 2,
            "volunteer_availability": 118, # available / total active
            "volunteer_total": 150,
            "resource_utilization": 64.2, # percentage
            "transport_status": "Operational",
            "emergency_readiness_score": 92.5 # percentage
        },
        "alerts": [
            {
                "id": "alert-1",
                "type": "warning",
                "message": "Heavy foot traffic detected near Sector B (Main Stage). Monitoring closely.",
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "zone_id": "zone-b"
            }
        ],
        "zones": [
            {
                "id": "zone-a",
                "name": "North Entrance (Gate A)",
                "current_count": 2100,
                "capacity": 5000,
                "current_density": 42.0, # percentage
                "risk_score": 3.2,
                "status": "Safe",
                "trend": "stable",
                "recommended_action": "Routine entry monitoring. No deployment adjustments required."
            },
            {
                "id": "zone-b",
                "name": "Main Stage Arena",
                "current_count": 7800,
                "capacity": 10000,
                "current_density": 78.0,
                "risk_score": 7.4,
                "status": "Moderate",
                "trend": "rising",
                "recommended_action": "Deploy 5 additional volunteers to stage barrier gates for flow control."
            },
            {
                "id": "zone-c",
                "name": "Food & Vendor Court",
                "current_count": 2800,
                "capacity": 4000,
                "current_density": 70.0,
                "risk_score": 6.1,
                "status": "Moderate",
                "trend": "rising",
                "recommended_action": "Monitor line queue lines. Check water station replenishment rates."
            },
            {
                "id": "zone-d",
                "name": "South Plaza (Exhibits)",
                "current_count": 1100,
                "capacity": 3000,
                "current_density": 36.6,
                "risk_score": 2.5,
                "status": "Safe",
                "trend": "falling",
                "recommended_action": "Clear. General patrol and direction guide volunteers active."
            },
            {
                "id": "zone-e",
                "name": "Transportation Hub",
                "current_count": 450,
                "capacity": 1500,
                "current_density": 30.0,
                "risk_score": 2.1,
                "status": "Safe",
                "trend": "stable",
                "recommended_action": "Ensure continuous shuttle arrivals. Monitor passenger lines."
            }
        ],
        "incidents": [
            {
                "id": "inc-1",
                "title": "Minor Trip & Fall Injury",
                "zone_id": "zone-c",
                "severity": "Medium",
                "status": "Dispatched",
                "reporter": "Volunteer Mark T.",
                "timestamp": "23:08:15",
                "description": "Attendee slipped on spilled liquid near Beverage Tent 3. Sustained minor ankle abrasion.",
                "recommended_actions": [
                    "Dispatch Medical Team 1 to food court",
                    "Notify facility cleanup to mop spilled beverage at Tent 3"
                ],
                "timeline": [
                    {"status": "Reported", "timestamp": "23:08:15", "msg": "Incident reported by Volunteer Mark T."},
                    {"status": "Dispatched", "timestamp": "23:09:40", "msg": "Medical Team 1 dispatched to Sector C"}
                ]
            },
            {
                "id": "inc-2",
                "title": "Lost Child Reported",
                "zone_id": "zone-a",
                "severity": "High",
                "status": "On-Scene",
                "reporter": "Security Officer Davis",
                "timestamp": "23:10:05",
                "description": "7-year-old male separated from family near North Entrance. Wearing yellow shirts.",
                "recommended_actions": [
                    "Broadcast alert to all North Entrance volunteer channels",
                    "Check CCTV footage at Gate A ticket turnstiles"
                ],
                "timeline": [
                    {"status": "Reported", "timestamp": "23:10:05", "msg": "Security Officer Davis reported lost child"},
                    {"status": "Dispatched", "timestamp": "23:11:00", "msg": "Area sweep units deployed near gate entry"},
                    {"status": "On-Scene", "timestamp": "23:13:20", "msg": "Officer Davis has contacted the child's mother"}
                ]
            }
        ],
        "volunteers": [
            {"id": "vol-1", "name": "Sarah Jenkins", "role": "Medical Support", "status": "Busy", "assigned_zone_id": "zone-c", "workload_score": 6.8, "contact": "+1 (555) 019-2834"},
            {"id": "vol-2", "name": "Michael Chang", "role": "Crowd Control", "status": "Busy", "assigned_zone_id": "zone-b", "workload_score": 8.2, "contact": "+1 (555) 019-3847"},
            {"id": "vol-3", "name": "Jessica Taylor", "role": "Info Guide", "status": "Available", "assigned_zone_id": "zone-a", "workload_score": 2.1, "contact": "+1 (555) 019-8833"},
            {"id": "vol-4", "name": "David Miller", "role": "Logistics", "status": "Available", "assigned_zone_id": "zone-e", "workload_score": 4.5, "contact": "+1 (555) 019-9944"},
            {"id": "vol-5", "name": "Elena Rostova", "role": "Crowd Control", "status": "Available", "assigned_zone_id": "zone-d", "workload_score": 3.0, "contact": "+1 (555) 019-1122"},
            {"id": "vol-6", "name": "Marcus Aurelius", "role": "Security Liaison", "status": "Busy", "assigned_zone_id": "zone-b", "workload_score": 7.8, "contact": "+1 (555) 019-4729"},
            {"id": "vol-7", "name": "Amina Al-Mansoor", "role": "Medical Support", "status": "Available", "assigned_zone_id": "zone-a", "workload_score": 1.5, "contact": "+1 (555) 019-5561"}
        ],
        "transport": {
            "routes": [
                {"id": "route-red", "name": "Red Route (Express Bus)", "status": "On Time", "delay_minutes": 0, "active_shuttles_count": 3},
                {"id": "route-blue", "name": "Blue Route (Plaza Loop)", "status": "On Time", "delay_minutes": 2, "active_shuttles_count": 2},
                {"id": "route-green", "name": "Green Route (Metro Link)", "status": "On Time", "delay_minutes": 0, "active_shuttles_count": 4}
            ],
            "shuttles": [
                {"id": "shuttle-101", "name": "Shuttle #101", "route_id": "route-red", "capacity_utilization": 45, "status": "Transit", "lat": 40.7589, "lng": -73.9851},
                {"id": "shuttle-102", "name": "Shuttle #102", "route_id": "route-blue", "capacity_utilization": 60, "status": "Loading", "lat": 40.7570, "lng": -73.9840},
                {"id": "shuttle-103", "name": "Shuttle #103", "route_id": "route-green", "capacity_utilization": 30, "status": "Transit", "lat": 40.7600, "lng": -73.9865},
                {"id": "shuttle-104", "name": "Shuttle #104", "route_id": "route-red", "capacity_utilization": 80, "status": "Transit", "lat": 40.7610, "lng": -73.9820}
            ]
        },
        "resources": [
            {"id": "res-1", "name": "Medical First Aid Post 1", "type": "Medical", "status": "Operational", "lat": 40.7595, "lng": -73.9842, "utilization_rate": 45.0, "details": "Fully stocked. 2 medics on standby."},
            {"id": "res-2", "name": "Main Gate Security Hub", "type": "Security", "status": "Operational", "lat": 40.7582, "lng": -73.9855, "utilization_rate": 70.0, "details": "9 personnel deployed. CCTV feed 100% active."},
            {"id": "res-3", "name": "Hydration Station Central", "type": "Water", "status": "Operational", "lat": 40.7578, "lng": -73.9835, "utilization_rate": 35.0, "details": "Water pressure normal. Spare ice supply available."},
            {"id": "res-4", "name": "Logistics Equipment Shed", "type": "Equipment", "status": "Operational", "lat": 40.7605, "lng": -73.9858, "utilization_rate": 80.0, "details": "Radio units low (3 remaining). Megaphones checked."}
        ]
    }

# Dynamic Global State
EVENT_STATE = get_initial_state()

# Helper to simulate small real-time fluctuations
def tick_simulation():
    global EVENT_STATE
    
    # 1. Update attendee counts slightly
    change = random.randint(-50, 80)
    EVENT_STATE["stats"]["total_attendees"] = max(10000, EVENT_STATE["stats"]["total_attendees"] + change)
    
    # 2. Fluctuated densities in zones slightly, and re-compute density score
    total_density = 0.0
    for zone in EVENT_STATE["zones"]:
        # Zone B (Main stage) might rise faster if crowd surge simulation isn't active
        factor = 1.2 if zone["id"] == "zone-b" else 0.8
        count_change = int(random.randint(-15, 25) * factor)
        zone["current_count"] = max(100, min(zone["capacity"], zone["current_count"] + count_change))
        
        # Recalculate density percentage
        zone["current_density"] = round((zone["current_count"] / zone["capacity"]) * 100, 1)
        
        # Risk score calculation
        zone["risk_score"] = round(zone["current_density"] / 10, 1)
        
        # Status thresholding
        if zone["current_density"] >= 85:
            zone["status"] = "Critical"
        elif zone["current_density"] >= 65:
            zone["status"] = "Moderate"
        else:
            zone["status"] = "Safe"
            
        # Update trends
        if count_change > 5:
            zone["trend"] = "rising"
        elif count_change < -5:
            zone["trend"] = "falling"
        else:
            zone["trend"] = "stable"
            
        total_density += zone["risk_score"]
        
    # Recompute executive score
    EVENT_STATE["stats"]["crowd_density_score"] = round(total_density / len(EVENT_STATE["zones"]), 1)
    
    # 3. Simulate shuttle capacity adjustments and minor coordinate movement
    for shuttle in EVENT_STATE["transport"]["shuttles"]:
        # Capacity fluctuation
        shuttle["capacity_utilization"] = max(10, min(100, shuttle["capacity_utilization"] + random.randint(-8, 8)))
        # Micro coordinates update to simulate movement on map
        shuttle["lat"] = round(shuttle["lat"] + random.uniform(-0.0002, 0.0002), 5)
        shuttle["lng"] = round(shuttle["lng"] + random.uniform(-0.0002, 0.0002), 5)
        
    # 4. Resource utilization fluctuation
    EVENT_STATE["stats"]["resource_utilization"] = round(max(30, min(95, EVENT_STATE["stats"]["resource_utilization"] + random.uniform(-1.0, 1.2))), 1)
    
    # 5. Readiness score based on incidents and active alerts
    severity_deductions = {
        "Critical": 15.0,
        "High": 8.0,
        "Medium": 3.0,
        "Low": 1.0
    }
    deduction = 0.0
    for inc in EVENT_STATE["incidents"]:
        if inc["status"] != "Resolved":
            deduction += severity_deductions.get(inc["severity"], 1.0)
    EVENT_STATE["stats"]["emergency_readiness_score"] = max(50.0, round(100.0 - deduction, 1))

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/state", methods=["GET"])
def get_state():
    # Progress simulation tick
    tick_simulation()
    return jsonify(EVENT_STATE)

@app.route("/api/incident", methods=["POST"])
def report_incident():
    global EVENT_STATE
    data = request.json
    
    # Incident structure
    new_inc_id = f"inc-{len(EVENT_STATE['incidents']) + 1}"
    new_incident = {
        "id": new_inc_id,
        "title": data.get("title", "Unnamed Incident"),
        "zone_id": data.get("zone_id", "zone-a"),
        "severity": data.get("severity", "Medium"),
        "status": "Reported",
        "reporter": data.get("reporter", "Dispatch Command"),
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "description": data.get("description", "No details provided."),
        "recommended_actions": data.get("recommended_actions", ["Awaiting commander triage"]),
        "timeline": [
            {"status": "Reported", "timestamp": datetime.now().strftime("%H:%M:%S"), "msg": "Incident logged by dispatcher."}
        ]
    }
    
    # AI recommendations injector for hackathon demo
    if new_incident["severity"] == "Critical":
        new_incident["recommended_actions"] = [
            "IMMEDIATE BROADCAST: Clear access path for emergency vehicles.",
            "Dispatch Security Taskforce 1 and Medical Unit 2 immediately.",
            "Move nearby Volunteer teams to Sector peripheral gates."
        ]
    elif new_incident["severity"] == "High":
        new_incident["recommended_actions"] = [
            "Re-route incoming foot traffic away from sector gates.",
            "Dispatch standby Medical support unit.",
            "Deploy adjacent zone support staff."
        ]
    
    EVENT_STATE["incidents"].insert(0, new_incident)
    EVENT_STATE["stats"]["incident_count"] = len([i for i in EVENT_STATE["incidents"] if i["status"] != "Resolved"])
    
    # Create an alert banner for critical incidents
    if new_incident["severity"] in ["High", "Critical"]:
        EVENT_STATE["alerts"].insert(0, {
            "id": f"alert-{random.randint(1000, 9999)}",
            "type": "danger",
            "message": f"EMERGENCY: {new_incident['title']} reported in {get_zone_name(new_incident['zone_id'])}.",
            "timestamp": new_incident["timestamp"],
            "zone_id": new_incident["zone_id"]
        })
        
    return jsonify({"status": "success", "incident": new_incident})

@app.route("/api/incident/update", methods=["POST"])
def update_incident_status():
    global EVENT_STATE
    data = request.json
    inc_id = data.get("id")
    new_status = data.get("status")
    
    for inc in EVENT_STATE["incidents"]:
        if inc["id"] == inc_id:
            inc["status"] = new_status
            inc["timeline"].append({
                "status": new_status,
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "msg": f"Incident updated to {new_status}"
            })
            break
            
    EVENT_STATE["stats"]["incident_count"] = len([i for i in EVENT_STATE["incidents"] if i["status"] != "Resolved"])
    return jsonify({"status": "success"})

@app.route("/api/volunteer/assign", methods=["POST"])
def assign_volunteer():
    global EVENT_STATE
    data = request.json
    vol_id = data.get("id")
    zone_id = data.get("zone_id")
    
    assigned_name = ""
    for vol in EVENT_STATE["volunteers"]:
        if vol["id"] == vol_id:
            vol["assigned_zone_id"] = zone_id
            vol["status"] = "Busy"
            vol["workload_score"] = round(random.uniform(5.5, 9.0), 1)
            assigned_name = vol["name"]
            break
            
    # Add activity logs or alert
    EVENT_STATE["alerts"].insert(0, {
        "id": f"alert-{random.randint(1000, 9999)}",
        "type": "info",
        "message": f"Deployment: {assigned_name} dispatched to {get_zone_name(zone_id)}.",
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "zone_id": zone_id
    })
    
    # Re-calculate volunteer counts
    active_busy = len([v for v in EVENT_STATE["volunteers"] if v["status"] == "Busy"])
    EVENT_STATE["stats"]["volunteer_availability"] = len(EVENT_STATE["volunteers"]) - active_busy
    
    return jsonify({"status": "success"})

@app.route("/api/demo-trigger", methods=["POST"])
def demo_trigger():
    global EVENT_STATE
    trigger_type = request.json.get("trigger")
    
    if trigger_type == "crowd_surge":
        # Simulate heavy crowd at Main Stage
        for zone in EVENT_STATE["zones"]:
            if zone["id"] == "zone-b":
                zone["current_count"] = 9600
                zone["current_density"] = 96.0
                zone["risk_score"] = 9.6
                zone["status"] = "Critical"
                zone["trend"] = "rising"
                zone["recommended_action"] = "CRITICAL: Deploy 10+ volunteers. Open emergency overflow gates A and D. Halt entry queues."
                
        # Insert Critical Alert
        EVENT_STATE["alerts"].insert(0, {
            "id": f"alert-{random.randint(1000, 9999)}",
            "type": "danger",
            "message": "CROWD SURGE WARNING: Main Stage Arena density at 96%! Risk level: CRITICAL.",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "zone_id": "zone-b"
        })
        
    elif trigger_type == "medical_emergency":
        # Add critical incident
        new_inc_id = f"inc-{len(EVENT_STATE['incidents']) + 1}"
        new_incident = {
            "id": new_inc_id,
            "title": "Severe Heat Stroke & Crowd Crush Injury",
            "zone_id": "zone-b",
            "severity": "Critical",
            "status": "Reported",
            "reporter": "Officer Chang",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "description": "Attendee collapsed in center crowd barrier area. Unconscious but breathing. Crowd density is hindering extraction.",
            "recommended_actions": [
                "Immediate medical dispatch: Taskforce 1 (Stretcher unit).",
                "Deploy security cordon: Clear barrier gate sector 3.",
                "Volunteers to direct crowd back and broadcast alert."
            ],
            "timeline": [
                {"status": "Reported", "timestamp": datetime.now().strftime("%H:%M:%S"), "msg": "Officer Chang reported medical casualty."}
            ]
        }
        EVENT_STATE["incidents"].insert(0, new_incident)
        EVENT_STATE["stats"]["incident_count"] = len([i for i in EVENT_STATE["incidents"] if i["status"] != "Resolved"])
        
        # Flash alarm
        EVENT_STATE["alerts"].insert(0, {
            "id": f"alert-{random.randint(1000, 9999)}",
            "type": "danger",
            "message": "CRITICAL INCIDENT: Heat Stroke & Crowd Crush reported at Main Stage.",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "zone_id": "zone-b"
        })
        
        # Modify Medical station stock
        for res in EVENT_STATE["resources"]:
            if res["id"] == "res-1":
                res["status"] = "Low Stock"
                res["utilization_rate"] = 92.0
                res["details"] = "First Aid units deployed to Main Stage. Stretcher equipment low."
                
    elif trigger_type == "shuttle_delay":
        # Delay red route shuttles
        for route in EVENT_STATE["transport"]["routes"]:
            if route["id"] == "route-red":
                route["status"] = "Delayed"
                route["delay_minutes"] = 18
                
        # Trigger alert
        EVENT_STATE["alerts"].insert(0, {
            "id": f"alert-{random.randint(1000, 9999)}",
            "type": "warning",
            "message": "TRANSPORT BOTTLENECK: Red Route experiencing 18-minute delay due to north gate road congestion.",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "zone_id": "zone-e"
        })
        
        EVENT_STATE["stats"]["transport_status"] = "Delays Reported"
        
        # Increase shuttle capacities
        for shuttle in EVENT_STATE["transport"]["shuttles"]:
            if shuttle["route_id"] == "route-red":
                shuttle["capacity_utilization"] = 98
                shuttle["status"] = "Stuck in Traffic"
                
    elif trigger_type == "reset":
        EVENT_STATE = get_initial_state()
        
    return jsonify({"status": "success", "state": EVENT_STATE})

# Gemini AI Copilot route
@app.route("/api/copilot", methods=["POST"])
def ai_copilot():
    global EVENT_STATE
    user_message = request.json.get("message", "")
    
    # 1. Compile current system summary context
    context_zones = []
    for z in EVENT_STATE["zones"]:
        context_zones.append(f"{z['name']}: count={z['current_count']}, density={z['current_density']}%, status={z['status']}, risk={z['risk_score']}/10")
        
    context_incidents = []
    for inc in EVENT_STATE["incidents"]:
        if inc["status"] != "Resolved":
            context_incidents.append(f"[{inc['severity']}] {inc['title']} at {get_zone_name(inc['zone_id'])} - Status: {inc['status']}")
            
    context_transport = []
    for r in EVENT_STATE["transport"]["routes"]:
        context_transport.append(f"{r['name']}: {r['status']} ({r['delay_minutes']}m delay)")
        
    system_prompt_context = f"""
    You are the "EventOps Operations Command Assistant," a critical mission-control system advising event commanders at a large festival or mega event.
    
    CURRENT TELEMETRY DATA:
    - Total Attendees: {EVENT_STATE['stats']['total_attendees']}
    - Global Crowd Density Index: {EVENT_STATE['stats']['crowd_density_score']}/10
    - Emergency Readiness Index: {EVENT_STATE['stats']['emergency_readiness_score']}%
    - Resource Deployed: {EVENT_STATE['stats']['resource_utilization']}%
    - Active Volunteers: {EVENT_STATE['stats']['volunteer_availability']} available of {EVENT_STATE['stats']['volunteer_total']}
    
    CROWD ZONES STATUS:
    {chr(10).join(context_zones)}
    
    UNRESOLVED INCIDENTS:
    {chr(10).join(context_incidents) if context_incidents else "None. All areas clear."}
    
    TRANSPORT OPERATION:
    {chr(10).join(context_transport)}
    
    Your role is to analyze this command-center data and provide highly concise, tactical, and immediately actionable advice. Focus on crowd control, personnel dispatching, resource deployment, and emergency response.
    Format your response cleanly in brief bullet points, highlighting warnings in **BOLD**. Do not give generic advice—refer directly to the current metrics above. Keep the response under 150 words.
    """
    
    # 2. Invoke Gemini if Key exists, otherwise fall back to rule-based logic
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content([system_prompt_context, user_message])
            reply = response.text
            return jsonify({"source": "gemini", "reply": reply})
        except Exception as e:
            # Fallback to local rule engine on API error
            reply = get_rule_based_reply(user_message, EVENT_STATE)
            return jsonify({"source": "fallback-api-error", "reply": reply})
    else:
        # Local mock assistant logic
        reply = get_rule_based_reply(user_message, EVENT_STATE)
        return jsonify({"source": "mock-ai", "reply": reply})

def get_zone_name(zone_id):
    zones_map = {
        "zone-a": "North Entrance",
        "zone-b": "Main Stage Arena",
        "zone-c": "Food Court",
        "zone-d": "South Plaza",
        "zone-e": "Transportation Hub"
    }
    return zones_map.get(zone_id, "Unknown Zone")

def get_rule_based_reply(message, state):
    msg = message.lower()
    
    # Find most crowded zone
    max_zone = max(state["zones"], key=lambda x: x["current_density"])
    
    # Check open high severity incidents
    active_incidents = [i for i in state["incidents"] if i["status"] != "Resolved"]
    critical_incidents = [i for i in active_incidents if i["severity"] in ["High", "Critical"]]
    
    if "crowd" in msg or "congest" in msg or "area" in msg:
        reply = f"### Crowd Intelligence Report\n"
        reply += f"* **Most Congested Area**: **{max_zone['name']}** is at **{max_zone['current_density']}% capacity** (density index: {max_zone['risk_score']}/10).\n"
        if max_zone["status"] == "Critical":
            reply += f"* **Tactical Warning**: Zone is at critical capacity limit. Recommend immediate diversion gates opened at Sector B outer gate.\n"
        else:
            reply += f"* **Observation**: Crowd flow is stable, but density is building. Maintain visual surveillance.\n"
        reply += f"* **Volunteer Allocation**: Deploy additional personnel from South Plaza to assist with crowd lanes."
        return reply
        
    elif "volunteer" in msg or "deploy" in msg or "staff" in msg:
        avail = state["stats"]["volunteer_availability"]
        total = state["stats"]["volunteer_total"]
        reply = f"### Volunteer Dispatch Guide\n"
        reply += f"* **Current Status**: **{avail} volunteers are available** out of {total} total.\n"
        if max_zone["current_density"] > 75:
            reply += f"* **Ops Suggestion**: Deploy 4 volunteers from the under-utilized South Plaza to **{max_zone['name']}** to assist with barrier flow.\n"
        else:
            reply += f"* **Ops Suggestion**: General patrols are adequate. Station 2 volunteers at Gate A to guide arriving shuttle passengers."
        if critical_incidents:
            reply += f"\n* **Urgent**: Assign 2 medics from station to check on the incident: '{critical_incidents[0]['title']}'."
        return reply
        
    elif "incident" in msg or "emergency" in msg or "medical" in msg or "accident" in msg:
        if not active_incidents:
            return "### Incident Command\n* **Status**: No active incidents. Emergency readiness index is at **100%**. Patrol units maintaining status quo."
        
        reply = f"### Active Incidents Triage\n"
        for inc in active_incidents:
            reply += f"* **[{inc['severity']}]** **{inc['title']}** in {get_zone_name(inc['zone_id'])}\n"
            reply += f"  - Status: *{inc['status']}*\n"
            reply += f"  - Ops Action: {inc['recommended_actions'][0]}\n"
        reply += f"\n* **Readiness Score**: Current index at **{state['stats']['emergency_readiness_score']}%**."
        return reply
        
    elif "transport" in msg or "shuttle" in msg or "route" in msg or "delay" in msg or "bottleneck" in msg:
        delayed_routes = [r for r in state["transport"]["routes"] if r["status"] == "Delayed"]
        reply = f"### Transit Telemetry Review\n"
        if delayed_routes:
            for route in delayed_routes:
                reply += f"* **Warning**: **{route['name']}** is experiencing a **{route['delay_minutes']}-minute delay**.\n"
                reply += f"  - Cause: High vehicle utilization (average 90%+) and roadway congestions.\n"
                reply += f"  - Ops Action: Re-route metro shuttle buses to Plaza Loop to bypass the traffic pocket.\n"
        else:
            reply += f"* **Status**: All transport networks (Red, Blue, Green routes) are **ON TIME**.\n"
            reply += f"  - Active Shuttles: {sum(r['active_shuttles_count'] for r in state['transport']['routes'])} units in loop.\n"
            reply += f"  - Ops Action: Maintain normal operational dispatch."
        return reply
        
    elif "predict" in msg or "hour" in msg or "risk" in msg:
        # Generate some predictions based on current state
        reply = f"### Operations 2-Hour Predictive Risk Forecast\n"
        if max_zone["current_density"] > 75:
            reply += f"* **Risk Probability: 85%**: Impending congestion bottleneck near {max_zone['name']} as Main Stage event finishes. **ACTION**: Pre-stage 8 volunteers at Exit Gate 3.\n"
        else:
            reply += f"* **Risk Probability: 30%**: Mild congestion buildup at North Entrance during afternoon shuttle arrivals. Normal patrols.\n"
        
        reply += f"* **Incident Probability: Medium**: Minor trip & dehydration incidents likely at Food Court area due to rising heat index. **ACTION**: Increase water dispatch to supply depots.\n"
        reply += f"* **Transport Delay Risk: High**: Red route traffic expected to increase by 10m as rush hour peaks."
        return reply
        
    else:
        # Default prompt suggestion helper
        reply = f"### EventOps Commander Copilot\n"
        reply += f"I have analyzed the current event status. The event readiness is at **{state['stats']['emergency_readiness_score']}%** with **{state['stats']['incident_count']} active incidents**.\n\n"
        reply += f"Ask me tactical commands, such as:\n"
        reply += f"1. *'Which area is most crowded?'*\n"
        reply += f"2. *'Where should volunteers be deployed?'*\n"
        reply += f"3. *'Triage active incidents.'*\n"
        reply += f"4. *'Show transport delay details.'*\n"
        reply += f"5. *'Predict risks for the next hour.'*"
        return reply

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)