import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { navigationItems } from "./data/navigation";
import { createSimulationEngine } from "./simulation/engine";
import Sidebar from "./components/Sidebar";
import TelemetryPanel from "./components/TelemetryPanel";
import DetectorView from "./components/DetectorView";
import EventDisplayView from "./components/EventDisplayView";
import ExperimentBuilder from "./components/ExperimentBuilder";
import ColliderView from "./components/ColliderView";
import BeamControlView from "./components/BeamControlView";
import CollisionView from "./components/CollisionView";
import AnalysisView from "./components/AnalysisView";
import DataView from "./components/DataView";
import DiscoveryView from "./components/DiscoveryView";
import OverviewView from "./components/OverviewView";
import SettingsView from "./components/SettingsView";
import HelpView from "./components/HelpView";
import StartupSequence from "./components/StartupSequence";
import HelpModal from "./components/HelpModal";
import NotificationCenter from "./components/NotificationCenter";
import IncidentPopup from "./components/IncidentPopup";

const engine = createSimulationEngine();
const initialNotifications = [
  {
    id: 1,
    title: "SYSTEM READY",
    message: "Simulation controls ready. CMS event references loaded.",
    type: "success",
    time: "now",
  },
  {
    id: 2,
    title: "SIMULATION MODE",
    message: "Modelled accelerator telemetry / recorded CMS event references.",
    type: "info",
    time: "now",
  },
  {
    id: 3,
    title: "TELEMETRY",
    message: "No live CERN channels connected. Local simulation ready.",
    type: "success",
    time: "now",
  },
];

function App() {
  const [activeView, setActiveView] = useState("Overview");
  const [simulation, setSimulation] = useState(engine.snapshot());
  const [injectorStage, setInjectorStage] = useState(0);
  const [telemetryVisible, setTelemetryVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [booting, setBooting] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const notifiedIncidentId = useRef(null);
    const [analysisEventId, setAnalysisEventId] = useState(null);
  const addNotification = useCallback((title, message, type = "info") => {
    setNotifications((current) =>
      [
        { id: Date.now(), title, message, type, time: "just now" },
        ...current,
      ].slice(0, 6),
    );
  }, []);
  const finishBoot = useCallback(() => setBooting(false), []);
  const endFill = useCallback(() => {
    engine.endFill();
    addNotification("END OF FILL REQUESTED", "The model will stop collisions after the next event boundary.", "warning");
  }, [addNotification]);
  const operations = {
    performStartupAction: engine.performStartupAction,
    endFill,
    dumpBeam: engine.dumpBeam,
    prepareNextFill: engine.prepareNextFill,
    rampDown: engine.rampDown,
  };
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement)
      await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }, []);
  useEffect(() => engine.subscribe(setSimulation), []);
  useEffect(() => {
    const incident = simulation.incident;
    if (!incident || notifiedIncidentId.current === incident.id) return;
    notifiedIncidentId.current = incident.id;
    const type = incident.severity === "CRITICAL" ? "error" : incident.severity === "FAULT" ? "warning" : "info";
    addNotification(`${incident.severity}: ${incident.name}`, incident.description, type);
  }, [simulation.incident, addNotification]);
    useEffect(() => { const openEvent = (event) => { setAnalysisEventId(event.detail); setActiveView("Event Display"); }; window.addEventListener("open-event-display", openEvent); return () => window.removeEventListener("open-event-display", openEvent); }, []);
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setHelpOpen(false);
        setNotificationsOpen(false);
        return;
      }
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName,
        )
      )
        return;
      if (event.key === "?") {
        event.preventDefault();
        setHelpOpen((open) => !open);
      }
      if (event.key.toLowerCase() === "f") toggleFullscreen();
      const views = {
        1: "Overview",
        2: "Detector",
        3: "Event Display",
        4: "Experiments",
      };
      if (views[event.key]) setActiveView(views[event.key]);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    toggleFullscreen,
  ]);
  return (
    <main className={reducedMotion ? "control-room reduced-motion" : "control-room"}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <div className="eyebrow">LHC / SIMULATION CONSOLE</div>
            <h1>PARTICLE COLLIDER SIMULATOR</h1>
            <div className="brand-subline">
              <i /> EDUCATIONAL / CERN DATA-REFERENCE SIMULATOR
            </div>
          </div>
        </div>
        <div className="topbar-metrics">
          <div className="top-metric">
            <span className="metric-label">SIMULATION STATUS</span>
            <strong
              className={`status-value ${simulation.status.toLowerCase()}`}
            >
              <i />
              {simulation.status}
            </strong>
          </div>
          <div className="top-metric">
            <span className="metric-label">SIMULATION TIME</span>
            <strong>
              {simulation.time.toFixed(3)} <small>ns</small>
            </strong>
          </div>
          <div className="top-metric">
            <span className="metric-label">EXPERIMENT ID</span>
            <strong className="mono">{simulation.experimentId}</strong>
          </div>
          <div className="top-metric performance-metric">
            <span className="metric-label">PERFORMANCE</span>
            <strong>
              <i className="performance-dot" />
              {simulation.fps} <small>FPS</small>
            </strong>
          </div>
          <div className="health">
            <span className="health-dot" />
            SYSTEM HEALTH <b>{simulation.systemHealth?.toFixed(1) ?? '98.7'}%</b>
          </div>
          <div className="topbar-tools">
            <label title="Global simulation speed">
              SPEED
              <input
                type="range"
                min="0.25"
                max="10"
                step="0.25"
                value={simulation.speed}
                onChange={(event) =>
                  engine.setSpeed(Number(event.target.value))
                }
              />
              <b>{simulation.speed.toFixed(2)}×</b>
            </label>
            <NotificationCenter
              notifications={notifications}
              open={notificationsOpen}
              onToggle={() => setNotificationsOpen((open) => !open)}
            />
            <button
              className="utility-button"
              onClick={() => setHelpOpen(true)}
              title="Open simulator guide"
              aria-label="Open simulator guide"
            >
              ?
            </button>
            <button
              className="utility-button"
              onClick={toggleFullscreen}
              title="Toggle fullscreen"
              aria-label="Toggle fullscreen"
            >
              ⛶
            </button>
          </div>
        </div>
      </header>
      <div className={telemetryVisible ? "workspace" : "workspace telemetry-hidden"}>
        <Sidebar
          items={navigationItems}
          activeView={activeView}
          onSelect={setActiveView}
        />
        <section className="simulation-view">
          <div className="view-header">
            <div>
              <span className="section-kicker">CONTROL ROOM / {activeView.toUpperCase()}</span>
              <h2>
                  {activeView === "Overview" ? "Experiment Overview" : activeView}
              </h2>
            </div>
            <div className="view-actions">
              <span className="recording">
                <i /> MODEL TELEMETRY
              </span>
              <button
                className="icon-button"
                title="Open settings"
                aria-label="Open settings"
                onClick={() => setActiveView("Settings")}
              >
                ⚙
              </button>
            </div>
          </div>
          {activeView === "Overview" ? (
            <OverviewView simulation={simulation} operations={operations} onNavigate={setActiveView} />
          ) : activeView === "Collider" ? (
            <ColliderView
              simulation={simulation}
              onSpeed={engine.setSpeed}
              onNavigate={setActiveView}
              injectorStage={injectorStage}
              onInjectorStageChange={setInjectorStage}
            />
          ) : activeView === "Beam Control" ? (
            <BeamControlView
              simulation={simulation}
              onBeamChange={engine.setBeamConfig}
              onSpeed={engine.setSpeed}
            />
          ) : activeView === "Collision" ? (
            <CollisionView simulation={simulation} />
          ) : activeView === "Detector" ? (
            <DetectorView simulation={simulation} />
          ) : activeView === "Analysis" ? (
            <AnalysisView simulation={simulation} />
          ) : activeView === "Data" ? (
            <DataView simulation={simulation} />
          ) : activeView === "Discovery" ? (
            <DiscoveryView simulation={simulation} />
          ) : activeView === "Help" ? (
            <HelpView />
          ) : activeView === "Settings" ? (
            <SettingsView
              telemetryVisible={telemetryVisible}
              onTelemetryVisibilityChange={setTelemetryVisible}
              reducedMotion={reducedMotion}
              onReducedMotionChange={setReducedMotion}
            />
          ) : activeView === "Event Display" ? (
            <EventDisplayView key={analysisEventId ?? "live-event"} simulation={simulation} initialEventId={analysisEventId} />
          ) : activeView === "Experiments" ? (
            <ExperimentBuilder engine={engine} />
          ) : (
            <div className="unavailable-view">
              <span className="section-kicker">NAVIGATION / PAGE NOT FOUND</span>
              <p>This page is not available in the current console.</p>
              <button onClick={() => setActiveView("Overview")}>RETURN TO OVERVIEW</button>
            </div>
          )}
        </section>
        {telemetryVisible && (
          <TelemetryPanel
            simulation={simulation}
            onBeamChange={engine.setBeamConfig}
            onEndFill={endFill}
          />
        )}
      </div>
      <footer className="statusbar">
        <span>
          <i className="online-dot" /> SYSTEM ONLINE
        </span>
        <span>
          SIMULATION FPS <b>{simulation.fps}</b>
        </span>
        <span>
          EVENTS PROCESSED <b>{simulation.events.toLocaleString()}</b>
        </span>
        <span>
          SIMULATION TIME <b>{simulation.time.toFixed(3)} ns</b>
        </span>
        <span className="system-message">
          <i /> {simulation.message}
        </span>
        <span className="build">BUILD 0.1.0-ALPHA</span>
      </footer>
      {booting && <StartupSequence onComplete={finishBoot} />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      <IncidentPopup incident={simulation.incident} onResolve={engine.resolveIncident} />
    </main>
  );
}

export default App;
