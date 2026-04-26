import { useParams, Link } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useAction } from "wasp/client/operations";
import {
  getExecutionLogs,
  getTestSuite,
  getHealingEvents,
  runTestSuite,
  stopTestSuite,
} from "wasp/client/operations";
import { Button } from "../shared/components/ui/button";
import { Badge } from "../shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../shared/components/ui/card";
import { Input } from "../shared/components/ui/input";
import {
  PlayCircle,
  ArrowLeft,
  Loader2,
  Terminal,
  AlertCircle,
  Square,
  Clock,
  Wrench,
  CheckCircle2,
  XCircle,
  DollarSign,
  Pause,
  Download,
  Search,
  Globe,
  Cpu,
  Sparkles,
} from "lucide-react";
import { cn } from "../lib/utils";

const LOG_LEVELS = ["ALL", "INFO", "AI", "SUCCESS", "WARN", "ERROR", "DEBUG"] as const;
type LogLevelFilter = (typeof LOG_LEVELS)[number];

export function TestSuitePage() {
  const { id } = useParams<{ id: string }>();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);

  const { data: suite, refetch: refetchSuite } = useQuery(getTestSuite, { testSuiteId: id! });
  const { data: logs, isLoading, refetch: refetchLogs } =
    useQuery(getExecutionLogs, { testSuiteId: id! });
  const { data: healingEvents, refetch: refetchHealing } =
    useQuery(getHealingEvents, { testSuiteId: id! });

  const runAction = useAction(runTestSuite);
  const stopAction = useAction(stopTestSuite);

  const [isRunning, setIsRunning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [logFilter, setLogFilter] = useState<LogLevelFilter>("ALL");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);

  // Poll every 1s while the suite is running; slow down otherwise.
  useEffect(() => {
    const interval = setInterval(() => {
      refetchLogs();
      refetchSuite();
      refetchHealing();
    }, suite?.status === "RUNNING" ? 1000 : 3000);
    return () => clearInterval(interval);
  }, [refetchLogs, refetchSuite, refetchHealing, suite?.status]);

  // Auto-scroll to bottom when logs arrive (if user hasn't disabled it)
  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      const matchesLevel = logFilter === "ALL" || log.level === logFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch = q.length === 0 || log.message.toLowerCase().includes(q);
      return matchesLevel && matchesSearch;
    });
  }, [logs, logFilter, search]);

  const handleRun = async () => {
    if (!id) return;
    setIsRunning(true);
    try {
      await runAction({ testSuiteId: id });
    } catch (e: any) {
      alert("Error starting test: " + e.message);
    } finally {
      // Give the UI a moment; polling takes over from here
      setTimeout(() => setIsRunning(false), 3000);
    }
  };

  const handleStop = async () => {
    if (!id) return;
    if (!confirm("Stop this test run? The agent will abort at the next step boundary.")) {
      return;
    }
    setIsStopping(true);
    try {
      await stopAction({ testSuiteId: id });
      await refetchSuite();
      await refetchLogs();
    } catch (e: any) {
      alert("Error stopping test: " + e.message);
    } finally {
      setIsStopping(false);
    }
  };

  const handleDownloadLogs = () => {
    if (!logs || logs.length === 0) return;
    const text = logs
      .map(
        (l) =>
          `[${new Date(l.timestamp).toISOString()}] [${l.level}] ${l.message}`
      )
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-suite-${id}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const status = suite?.status || "IDLE";
  const canRun = status !== "RUNNING" && !isRunning;
  const canStop = status === "RUNNING" && !isStopping;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-800 bg-slate-900/90 backdrop-blur shadow-sm flex-none">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-gray-300 hover:text-white hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-700 hidden md:block" />
            <div className="hidden md:flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <h1 className="text-sm font-bold text-white tracking-widest uppercase">
                Mission Control
              </h1>
            </div>
            <LiveStatusPill status={status} />
          </div>

          <div className="flex items-center gap-2">
            {canStop ? (
              <Button
                onClick={handleStop}
                disabled={isStopping}
                variant="destructive"
                className="gap-2 shadow-[0_0_15px_rgba(220,38,38,0.45)]"
              >
                {isStopping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 fill-current" />
                )}
                {isStopping ? "Stopping..." : "Stop"}
              </Button>
            ) : (
              <Button
                onClick={handleRun}
                disabled={!canRun}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-[0_0_15px_rgba(37,99,235,0.45)] transition-all"
              >
                {isRunning || status === "RUNNING" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                {isRunning || status === "RUNNING" ? "Starting..." : "Run AI Agent"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Suite info strip */}
      {suite && (
        <section className="border-b border-gray-800 bg-slate-900/60">
          <div className="container mx-auto px-4 py-3 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 text-xs">
            <InfoPill
              className="md:col-span-5"
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="Goal"
              value={suite.goal}
              mono={false}
            />
            <InfoPill
              className="md:col-span-4"
              icon={<Globe className="h-3.5 w-3.5" />}
              label="URL"
              value={suite.startUrl}
              mono
            />
            <InfoPill
              className="md:col-span-3"
              icon={<Cpu className="h-3.5 w-3.5" />}
              label="Model"
              value={suite.model}
            />
          </div>
        </section>
      )}

      {/* Stats grid */}
      {suite && (
        <section className="container mx-auto px-4 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MissionStat icon={<Clock className="h-3.5 w-3.5" />} label="Steps" value={suite.totalSteps.toString()} tint="slate" />
            <MissionStat icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Success" value={suite.successSteps.toString()} tint="green" />
            <MissionStat icon={<XCircle className="h-3.5 w-3.5" />} label="Failed" value={suite.failedSteps.toString()} tint="red" />
            <MissionStat icon={<Wrench className="h-3.5 w-3.5" />} label="Healed" value={suite.healedSteps.toString()} tint="blue" />
            <MissionStat icon={<DollarSign className="h-3.5 w-3.5" />} label="Cost" value={`$${(suite.estimatedCost || 0).toFixed(3)}`} tint="amber" />
          </div>
        </section>
      )}

      {/* Healing Events panel — the "money shot" for presentations */}
      {healingEvents && healingEvents.length > 0 && (
        <section className="container mx-auto px-4 pt-4">
          <HealingEventsPanel events={healingEvents} />
        </section>
      )}

      {/* Log terminal */}
      <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0">
        <Card className="bg-[#0c0c0c] border-gray-800 flex-1 flex flex-col overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600" />

          <CardHeader className="bg-[#1a1a1a] border-b border-gray-800 py-3 px-4 flex-none mt-1 space-y-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-gray-400" />
                <CardTitle className="text-gray-300 font-mono text-sm tracking-widest uppercase">
                  Agent Terminal
                </CardTitle>
              </div>
              <span className="text-gray-600 font-mono text-xs hidden md:block truncate max-w-[250px]">
                suite: {id}
              </span>

              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                  <Input
                    placeholder="Search logs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 pl-8 w-44 bg-[#0c0c0c] border-gray-800 text-gray-200 placeholder:text-gray-600 text-xs"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoScroll((v) => !v)}
                  className={cn(
                    "h-8 gap-1.5 text-xs",
                    autoScroll
                      ? "text-green-400 hover:text-green-300 hover:bg-green-950/30"
                      : "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                  )}
                >
                  <Pause className="h-3.5 w-3.5" />
                  {autoScroll ? "Auto-scroll" : "Paused"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadLogs}
                  disabled={!logs || logs.length === 0}
                  className="h-8 gap-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
                <LiveIndicator running={status === "RUNNING"} />
              </div>
            </div>

            {/* Level filters */}
            <div className="flex flex-wrap gap-1.5 pt-3">
              {LOG_LEVELS.map((lvl) => {
                const active = logFilter === lvl;
                const count =
                  lvl === "ALL"
                    ? (logs || []).length
                    : (logs || []).filter((l) => l.level === lvl).length;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLogFilter(lvl)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-mono transition-colors",
                      active
                        ? "bg-white text-gray-900 border-white"
                        : "bg-transparent text-gray-400 border-gray-700 hover:text-gray-200 hover:border-gray-500"
                    )}
                  >
                    {lvl}
                    <span
                      className={cn(
                        "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px]",
                        active ? "bg-gray-200 text-gray-700" : "bg-gray-800 text-gray-400"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent
            ref={logScrollRef}
            className="p-4 overflow-y-auto flex-1 font-mono text-[13px] md:text-sm space-y-1 md:space-y-1.5"
          >
            {isLoading && !logs ? (
              <div className="flex items-center gap-2 text-blue-400 animate-pulse mt-4">
                <Loader2 className="h-5 w-5 animate-spin" /> Establishing neural connection...
              </div>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-3 md:gap-4 hover:bg-gray-800/30 px-1 py-0.5 rounded transition-colors group"
                >
                  <span className="text-gray-600 flex-none w-20 tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                  </span>
                  <span className={cn("flex-none w-[74px]", levelColor(log.level))}>
                    [{log.level}]
                  </span>
                  <span className="text-gray-300 break-words flex-1 leading-relaxed group-hover:text-white transition-colors whitespace-pre-wrap">
                    {log.message}
                  </span>
                </div>
              ))
            ) : logs && logs.length > 0 ? (
              <div className="text-gray-500 flex flex-col items-center justify-center h-full gap-2 opacity-70">
                <Search className="h-8 w-8 text-gray-700" />
                <p>No logs match your filters.</p>
              </div>
            ) : (
              <div className="text-gray-500 flex flex-col items-center justify-center h-full gap-4 opacity-70">
                <AlertCircle className="h-10 w-10 text-gray-700 mb-2" />
                <p>Awaiting deployment sequence.</p>
                <p className="text-xs">Click "Run AI Agent" to begin autonomous execution.</p>
              </div>
            )}
            <div ref={logsEndRef} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

function levelColor(level: string) {
  switch (level) {
    case "ERROR":
      return "text-red-500 font-bold";
    case "WARN":
      return "text-yellow-400 font-bold";
    case "SUCCESS":
      return "text-green-500 font-bold";
    case "DEBUG":
      return "text-gray-500";
    case "AI":
      return "text-purple-400 font-bold";
    case "INFO":
      return "text-blue-400";
    default:
      return "text-gray-300";
  }
}

function LiveStatusPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string; dot: string }> = {
    RUNNING: { bg: "bg-blue-500/15 border-blue-500/40", text: "text-blue-300", label: "Running", dot: "bg-blue-400 animate-pulse" },
    PASSED: { bg: "bg-green-500/15 border-green-500/40", text: "text-green-300", label: "Passed", dot: "bg-green-400" },
    FAILED: { bg: "bg-red-500/15 border-red-500/40", text: "text-red-300", label: "Failed", dot: "bg-red-400" },
    STOPPED: { bg: "bg-amber-500/15 border-amber-500/40", text: "text-amber-300", label: "Stopped", dot: "bg-amber-400" },
    IDLE: { bg: "bg-gray-500/15 border-gray-500/40", text: "text-gray-300", label: "Idle", dot: "bg-gray-400" },
  };
  const c = cfg[status] || cfg.IDLE;
  return (
    <Badge
      variant="outline"
      className={cn(
        "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider border",
        c.bg,
        c.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </Badge>
  );
}

function LiveIndicator({ running }: { running: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {running && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        )}
        <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", running ? "bg-green-500" : "bg-gray-600")} />
      </span>
      <span
        className={cn(
          "text-[11px] font-mono uppercase tracking-widest font-bold",
          running ? "text-green-400" : "text-gray-500"
        )}
      >
        {running ? "Live" : "Idle"}
      </span>
    </div>
  );
}

function InfoPill({
  icon,
  label,
  value,
  mono = false,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <span className="text-gray-500 flex-none">{icon}</span>
      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold flex-none">
        {label}
      </span>
      <span className={cn("text-gray-200 truncate", mono && "font-mono")} title={value}>
        {value}
      </span>
    </div>
  );
}

function MissionStat({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: "slate" | "green" | "red" | "blue" | "amber";
}) {
  const color = {
    slate: "text-gray-300",
    green: "text-green-400",
    red: "text-red-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
  }[tint];
  return (
    <div className="rounded-lg border border-gray-800 bg-slate-900/60 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
        <span className={color}>{icon}</span>
        {label}
      </div>
      <div className={cn("text-lg font-bold mt-0.5 tabular-nums", color)}>
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Healing Events Panel — the visual proof for presentations
// ---------------------------------------------------------------------------

type HealingEvent = {
  id: string;
  stepNumber: number;
  stepDescription: string;
  action: string;
  oldSelector: string;
  newSelector: string;
  confidence: number;
  strategy: string;
  wasSuccessful: boolean;
  matchedOn: any;
  timestamp: string | Date;
};

function HealingEventsPanel({ events }: { events: HealingEvent[] }) {
  const successCount = events.filter((e) => e.wasSuccessful).length;
  const avgConfidence =
    events.reduce((sum, e) => sum + (e.confidence || 0), 0) / Math.max(events.length, 1);

  return (
    <Card className="bg-gradient-to-br from-blue-950/40 to-purple-950/40 border-blue-500/30 overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-blue-500/20 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30">
            <Wrench className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-base text-white">Healing Events</CardTitle>
            <p className="text-xs text-blue-200/70">
              {successCount} of {events.length} healed · avg confidence{" "}
              {(avgConfidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="bg-blue-500/15 border-blue-400/40 text-blue-200 font-mono text-[11px] uppercase tracking-wider"
        >
          🌟 RAG-driven
        </Badge>
      </CardHeader>

      <CardContent className="p-0 max-h-[280px] overflow-y-auto">
        <div className="divide-y divide-blue-500/10">
          {events.map((ev) => (
            <HealingEventRow key={ev.id} event={ev} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function HealingEventRow({ event }: { event: HealingEvent }) {
  const matched = event.matchedOn || {};
  const matchedKeys = Object.keys(matched).filter((k) => matched[k]);
  const confidencePct = Math.round((event.confidence || 0) * 100);
  const strategyLabel: Record<string, string> = {
    RAG_VECTOR: "Vector DB",
    TEXT_SIMILARITY: "Text similarity",
    STRUCTURAL: "Structural match",
    EXACT_TEXT: "Exact text",
    MANUAL_OVERRIDE: "Manual",
  };

  return (
    <div className="px-4 py-3 hover:bg-blue-500/5 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full flex-none mt-0.5 text-[10px] font-bold",
            event.wasSuccessful
              ? "bg-green-500/20 text-green-300 border border-green-400/40"
              : "bg-red-500/20 text-red-300 border border-red-400/40"
          )}
        >
          {event.wasSuccessful ? "✓" : "✗"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-blue-200/60 uppercase">
              Step {event.stepNumber}
            </span>
            <span className="text-xs text-gray-200 truncate">
              {event.stepDescription}
            </span>
            <Badge
              variant="outline"
              className="bg-purple-500/15 border-purple-400/40 text-purple-200 font-mono text-[10px] uppercase tracking-wider ml-auto flex-none"
            >
              {strategyLabel[event.strategy] || event.strategy}
            </Badge>
          </div>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-red-400 flex-none">old:</span>
              <code className="text-red-200 line-through break-all">
                {event.oldSelector || "—"}
              </code>
            </div>
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-green-400 flex-none">new:</span>
              <code className="text-green-200 break-all">
                {event.newSelector || "—"}
              </code>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="text-gray-500">confidence</span>
              <span
                className={cn(
                  "font-mono font-bold",
                  confidencePct >= 90
                    ? "text-green-300"
                    : confidencePct >= 70
                      ? "text-yellow-300"
                      : "text-orange-300"
                )}
              >
                {confidencePct}%
              </span>
            </span>
            {matchedKeys.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-gray-500">matched on</span>
                <span className="font-mono text-blue-200">
                  {matchedKeys.join(" + ")}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
