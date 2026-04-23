import { type User } from "wasp/entities";
import { useMemo, useState } from "react";
import { useQuery } from "wasp/client/operations";
import { getTestSuites, getTestSuiteStats } from "wasp/client/operations";
import { Button } from "../shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../shared/components/ui/card";
import { Badge } from "../shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../shared/components/ui/table";
import { Input } from "../shared/components/ui/input";
import { Link } from "react-router";
import {
  Activity,
  CheckCircle2,
  Wrench,
  DollarSign,
  Plus,
  PlayCircle,
  TrendingUp,
  Loader2,
  Search,
  Sparkles,
  Zap,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { CreateTestSuiteDialog } from "./components/CreateTestSuiteDialog";
import { cn } from "../lib/utils";

type StatusFilter = "ALL" | "IDLE" | "RUNNING" | "PASSED" | "FAILED" | "STOPPED";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Running", value: "RUNNING" },
  { label: "Passed", value: "PASSED" },
  { label: "Failed", value: "FAILED" },
  { label: "Stopped", value: "STOPPED" },
  { label: "Idle", value: "IDLE" },
];

export function TasksPage({ user }: { user: User }) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const { data: testSuites, isLoading: isLoadingTestSuites } =
    useQuery(getTestSuites);
  const { data: stats, isLoading: isLoadingStats } = useQuery(getTestSuiteStats);

  const displayStats = stats || {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    healedTests: 0,
    totalCost: 0,
    successRate: 0,
    healingRate: 0,
  };

  const isLoading = isLoadingTestSuites || isLoadingStats;

  const filtered = useMemo(() => {
    if (!testSuites) return [];
    return testSuites.filter((s) => {
      const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        s.goal.toLowerCase().includes(q) ||
        s.startUrl.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [testSuites, statusFilter, search]);

  const runningCount = (testSuites || []).filter((s) => s.status === "RUNNING").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                AI Healing
              </h1>
              <p className="text-xs text-muted-foreground leading-tight">
                Self-healing test automation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs">
              <span className={cn("h-2 w-2 rounded-full", runningCount > 0 ? "bg-green-500 animate-pulse" : "bg-gray-300")} />
              <span className="text-gray-600">
                {runningCount > 0 ? `${runningCount} running` : "Idle"}
              </span>
            </div>
            <span className="hidden md:inline text-sm text-muted-foreground">
              {user.username}
            </span>
            <Button
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md"
            >
              <Plus className="h-4 w-4" />
              New Suite
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero welcome */}
        <section className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-transparent to-purple-50/60 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Welcome back, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{user.username}</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kick off a new test suite or watch live execution of a running one.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New Test Suite
              </Button>
            </div>
          </div>
        </section>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading dashboard...</span>
          </div>
        )}

        {!isLoading && (
          <>
            {/* Stats */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<Activity className="h-4 w-4" />}
                label="Total Suites"
                value={displayStats.totalTests.toString()}
                hint="All test runs"
                tone="slate"
              />
              <StatCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Success Rate"
                value={`${displayStats.successRate}%`}
                hint={`${displayStats.passedTests} passed · ${displayStats.failedTests} failed`}
                tone="green"
              />
              <StatCard
                icon={<Wrench className="h-4 w-4" />}
                label="Self-Healing"
                value={`${displayStats.healingRate}%`}
                hint={`${displayStats.healedTests} auto-healed steps`}
                tone="blue"
              />
              <StatCard
                icon={<DollarSign className="h-4 w-4" />}
                label="Total Cost"
                value={`$${displayStats.totalCost.toFixed(3)}`}
                hint="AI model usage"
                tone="amber"
              />
            </section>

            {/* Onboarding card (only when empty) */}
            {displayStats.totalTests === 0 && (
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Get started with AI Healing
                  </CardTitle>
                  <CardDescription>
                    Your first self-healing test suite takes under a minute to set up.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <HowItWorksStep n={1} title="Describe goal" body="Use plain English — no scripting." />
                    <HowItWorksStep n={2} title="Give a URL" body="The agent starts from here." />
                    <HowItWorksStep n={3} title="AI executes" body="Observe → Think → Act loop." />
                    <HowItWorksStep n={4} title="RAG heals" body="Broken selectors auto-recover." />
                  </div>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Plus className="h-4 w-4" />
                    Create your first test suite
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Test Suites list */}
            <Card>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Test Suites</CardTitle>
                  <CardDescription>
                    Manage, monitor, and watch live execution.
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full md:w-auto">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search goals or URLs..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 w-full sm:w-64"
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Status filter chips */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((f) => {
                    const active = statusFilter === f.value;
                    const count =
                      f.value === "ALL"
                        ? (testSuites || []).length
                        : (testSuites || []).filter((s) => s.status === f.value).length;
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setStatusFilter(f.value)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          active
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                        )}
                      >
                        {f.label}
                        <span
                          className={cn(
                            "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px]",
                            active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!testSuites || testSuites.length === 0 ? (
                  <EmptyTestSuites onCreate={() => setIsCreateDialogOpen(true)} />
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No suites match your filters.</p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/60">
                          <TableHead>Goal</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Steps</TableHead>
                          <TableHead>Healed</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((suite) => (
                          <TableRow key={suite.id} className="hover:bg-gray-50/70">
                            <TableCell className="font-medium max-w-xs truncate" title={suite.goal}>
                              {suite.goal}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={suite.status} />
                            </TableCell>
                            <TableCell>{suite.totalSteps}</TableCell>
                            <TableCell>
                              {suite.healedSteps > 0 ? (
                                <span className="inline-flex items-center gap-1 text-blue-700">
                                  <Wrench className="h-3 w-3" />
                                  {suite.healedSteps}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              ${(suite.estimatedCost || 0).toFixed(3)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(suite.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Link to={`/test-suites/${suite.id}`}>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                                >
                                  {suite.status === "RUNNING" ? (
                                    <>
                                      <Eye className="h-4 w-4" />
                                      Watch Live
                                    </>
                                  ) : (
                                    <>
                                      <PlayCircle className="h-4 w-4" />
                                      Open
                                    </>
                                  )}
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <CreateTestSuiteDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "slate" | "green" | "blue" | "amber";
}) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
  }[tone];

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
        <div className={cn("p-2 rounded-md", toneClass)}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { className: string; label: string }> = {
    PASSED: { className: "bg-green-100 text-green-800 border-green-200", label: "Passed" },
    FAILED: { className: "bg-red-100 text-red-800 border-red-200", label: "Failed" },
    RUNNING: { className: "bg-blue-100 text-blue-800 border-blue-200", label: "Running" },
    STOPPED: { className: "bg-amber-100 text-amber-800 border-amber-200", label: "Stopped" },
    IDLE: { className: "bg-gray-100 text-gray-700 border-gray-200", label: "Idle" },
    NEEDS_REVIEW: { className: "bg-purple-100 text-purple-800 border-purple-200", label: "Review" },
  };
  const c = cfg[status] || { className: "bg-gray-100 text-gray-700 border-gray-200", label: status };
  return (
    <Badge variant="outline" className={cn("font-medium", c.className)}>
      {status === "RUNNING" && (
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
      )}
      {c.label}
    </Badge>
  );
}

function HowItWorksStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-lg bg-white/80 border border-blue-100 p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">
          {n}
        </span>
        <span className="text-sm font-semibold text-gray-900">{title}</span>
      </div>
      <p className="text-xs text-gray-600 mt-1">{body}</p>
    </div>
  );
}

function EmptyTestSuites({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 mb-4">
        <Zap className="h-6 w-6 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        No test suites yet
      </h3>
      <p className="text-sm text-gray-600 mb-5 max-w-md mx-auto">
        Create your first test suite to let the AI agent drive the browser for you.
      </p>
      <Button onClick={onCreate} className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
        <Plus className="h-4 w-4" />
        Create Test Suite
      </Button>
    </div>
  );
}
