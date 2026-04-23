import { useParams, Link } from "react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useAction } from "wasp/client/operations";
import { getExecutionLogs, runTestSuite } from "wasp/client/operations";
import { Button } from "../shared/components/ui/button";
import { PlayCircle, ArrowLeft, Loader2, Terminal, AlertCircle } from "lucide-react";

export function TestSuitePage() {
  const { id } = useParams<{ id: string }>();
  const logsEndRef = useRef<HTMLDivElement>(null);

  const { data: logs, isLoading, refetch } = useQuery(getExecutionLogs, { testSuiteId: id! });
  const runAction = useAction(runTestSuite);
  const [isRunning, setIsRunning] = useState(false);

  // Poll every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 1000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Auto scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleRun = async () => {
    if (!id) return;
    setIsRunning(true);
    try {
      await runAction({ testSuiteId: id });
    } catch (e: any) {
      alert("Error starting test: " + e.message);
    }
    // Re-enable run after a delay, avoiding rapid clicking
    setTimeout(() => setIsRunning(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="border-b border-gray-800 bg-slate-900 shadow-sm flex-none">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2 text-gray-300 hover:text-white hover:bg-gray-800">
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-white tracking-widest hidden md:block">
                LIVE <span className="text-blue-500">MISSION CONTROL</span>
              </h1>
            </div>
            <Button
              onClick={handleRun}
              disabled={isRunning}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              {isRunning ? "Starting Engine..." : "Run AI Agent"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 flex-1 flex flex-col min-h-0">
        <div className="bg-[#0c0c0c] rounded-xl shadow-2xl border border-gray-800 flex-1 flex flex-col overflow-hidden relative">

          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600"></div>

          <div className="bg-[#1a1a1a] px-4 py-3 border-b border-gray-800 flex items-center gap-3 flex-none mt-1">
            <Terminal className="h-5 w-5 text-gray-400" />
            <span className="text-gray-300 font-mono text-sm tracking-widest">AGENT TERMINAL</span>
            <span className="text-gray-600 font-mono text-xs hidden md:block">(SUITE: {id})</span>

            <div className="ml-auto flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-xs text-green-400 font-mono uppercase tracking-widest font-bold">Live Stream</span>
            </div>
          </div>
          <div className="p-4 overflow-y-auto flex-1 font-mono text-[13px] md:text-sm space-y-1 md:space-y-2">
            {isLoading && !logs ? (
              <div className="flex items-center gap-2 text-blue-400 animate-pulse mt-4">
                <Loader2 className="h-5 w-5 animate-spin" /> Establishing neural connection...
              </div>
            ) : logs && logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="flex gap-4 hover:bg-gray-800/30 p-1 rounded transition-colors group">
                  <span className="text-gray-600 flex-none w-20">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                  </span>
                  <span className={
                    log.level === "ERROR" ? "text-red-500 font-bold" :
                      log.level === "WARN" ? "text-yellow-400 font-bold" :
                        log.level === "SUCCESS" ? "text-green-500 font-bold" :
                          log.level === "DEBUG" ? "text-gray-500" :
                            log.level === "AI" ? "text-purple-400 font-bold" :
                              log.level === "INFO" ? "text-blue-400" :
                                "text-gray-300"
                  }>
                    {`[${log.level}]`}
                  </span>
                  <span className="text-gray-300 break-words flex-1 leading-relaxed group-hover:text-white transition-colors">
                    {log.message}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 flex flex-col items-center justify-center h-full gap-4 opacity-50">
                <AlertCircle className="h-10 w-10 text-gray-600 mb-2" />
                <p>Awaiting deployment sequence.</p>
                <p>Click "Run AI Agent" to begin autonomous execution.</p>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
