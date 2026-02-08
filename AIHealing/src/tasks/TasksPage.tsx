import { type User } from "wasp/entities";
import { useState } from "react";
import { useQuery } from "wasp/client/operations";
import { getTestSuites, getTestSuiteStats } from "wasp/client/operations";
import { Button } from "../shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../shared/components/ui/card";
import { Badge } from "../shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../shared/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shared/components/ui/tabs";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  DollarSign,
  Plus,
  PlayCircle,
  Clock,
  TrendingUp,
  Loader2
} from "lucide-react";
import { CreateTestSuiteDialog } from "./components/CreateTestSuiteDialog";


export function TasksPage({ user }: { user: User }) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch real data from backend
  const { data: testSuites, isLoading: isLoadingTestSuites } = useQuery(getTestSuites);
  const { data: stats, isLoading: isLoadingStats } = useQuery(getTestSuiteStats);

  // Default stats while loading
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI Healing Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Welcome back, <span className="font-semibold">{user.username}</span>! 👋
              </p>
            </div>
            <Button 
              size="lg" 
              onClick={() => setIsCreateDialogOpen(true)}
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              New Test Suite
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading dashboard...</span>
          </div>
        )}

        {!isLoading && (
          <>
        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayStats.totalTests}</div>
              <p className="text-xs text-muted-foreground">
                Automation test suites
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {displayStats.successRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {displayStats.passedTests} passed / {displayStats.failedTests} failed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Self-Healing</CardTitle>
              <Wrench className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {displayStats.healingRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {displayStats.healedTests} auto-healed steps
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${displayStats.totalCost.toFixed(3)}</div>
              <p className="text-xs text-muted-foreground">
                AI model usage cost
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="test-suites">Test Suites</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Getting Started Card */}
            {displayStats.totalTests === 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Get Started with AI Healing
                  </CardTitle>
                  <CardDescription>
                    Create your first self-healing test automation suite
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">How it works:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>Describe your test goal in natural language</li>
                      <li>Provide a starting URL</li>
                      <li>AI will execute the test using browser automation</li>
                      <li>If selectors break, RAG-based healing fixes them automatically</li>
                    </ol>
                  </div>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Test Suite
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and operations</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <Button 
                  variant="outline" 
                  className="h-auto flex-col gap-2 p-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-sm">New Test Suite</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto flex-col gap-2 p-4"
                  disabled
                >
                  <PlayCircle className="h-6 w-6" />
                  <span className="text-sm">Run All Tests</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto flex-col gap-2 p-4"
                  disabled
                >
                  <Clock className="h-6 w-6" />
                  <span className="text-sm">View History</span>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Suites Tab */}
          <TabsContent value="test-suites" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Test Suites</CardTitle>
                <CardDescription>
                  Manage and monitor your automation test suites
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!testSuites || testSuites.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No test suites yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Create your first test suite to get started with AI-powered automation
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Test Suite
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Goal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Steps</TableHead>
                        <TableHead>Healed</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testSuites.map((suite) => (
                        <TableRow key={suite.id}>
                          <TableCell className="font-medium">{suite.goal}</TableCell>
                          <TableCell>
                            <Badge variant={
                              suite.status === "PASSED" ? "default" :
                              suite.status === "FAILED" ? "destructive" :
                              suite.status === "RUNNING" ? "secondary" :
                              "outline"
                            }>
                              {suite.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{suite.totalSteps}</TableCell>
                          <TableCell>{suite.healedSteps}</TableCell>
                          <TableCell>${(suite.estimatedCost || 0).toFixed(3)}</TableCell>
                          <TableCell>{new Date(suite.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" disabled={suite.status === "RUNNING"}>
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>
                  Performance metrics and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>Analytics and charts coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </>
        )}
      </div>

      {/* Create Test Suite Dialog */}
      <CreateTestSuiteDialog 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
