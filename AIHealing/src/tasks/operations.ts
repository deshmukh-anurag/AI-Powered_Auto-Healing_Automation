// ============================================================================
// BACKEND OPERATIONS - AI Healing Test Automation
// ============================================================================
// This file contains all server-side operations for managing test suites.
// ============================================================================

import type { 
  TestSuite, 
  User,
} from "wasp/entities";
import type { 
  GetTestSuites, 
  GetTestSuiteStats,
  CreateTestSuite,
  RunTestSuite,
} from "wasp/server/operations";
import { HttpError } from "wasp/server";

// ============================================================================
// TYPES
// ============================================================================

type CreateTestSuiteInput = {
  goal: string;
  startUrl: string;
  model?: string;
  headless?: boolean;
  timeout?: number;
};

type TestSuiteStats = {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  healedTests: number;
  totalCost: number;
  successRate: number;
  healingRate: number;
};

// ============================================================================
// QUERIES (Read Operations)
// ============================================================================

/**
 * Get all test suites for the authenticated user
 */
export const getTestSuites: GetTestSuites<void, TestSuite[]> = async (
  _args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized - Please log in");
  }

  const testSuites = await context.entities.TestSuite.findMany({
    where: {
      userId: context.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      steps: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  return testSuites;
};

/**
 * Get dashboard statistics for the authenticated user
 */
export const getTestSuiteStats: GetTestSuiteStats<void, TestSuiteStats> = async (
  _args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized - Please log in");
  }

  const testSuites = await context.entities.TestSuite.findMany({
    where: {
      userId: context.user.id,
    },
    select: {
      status: true,
      totalSteps: true,
      successSteps: true,
      failedSteps: true,
      healedSteps: true,
      estimatedCost: true,
    },
  });

  // Calculate aggregate statistics
  const stats: TestSuiteStats = {
    totalTests: testSuites.length,
    passedTests: testSuites.filter(ts => ts.status === "PASSED").length,
    failedTests: testSuites.filter(ts => ts.status === "FAILED").length,
    healedTests: testSuites.reduce((sum, ts) => sum + ts.healedSteps, 0),
    totalCost: testSuites.reduce((sum, ts) => sum + (ts.estimatedCost || 0), 0),
    successRate: 0,
    healingRate: 0,
  };

  // Calculate success rate
  if (stats.totalTests > 0) {
    stats.successRate = Math.round((stats.passedTests / stats.totalTests) * 100);
  }

  // Calculate healing rate
  const totalSteps = testSuites.reduce((sum, ts) => sum + ts.totalSteps, 0);
  if (totalSteps > 0) {
    stats.healingRate = Math.round((stats.healedTests / totalSteps) * 100);
  }

  return stats;
};

// ============================================================================
// ACTIONS (Write Operations)
// ============================================================================

/**
 * Create a new test suite
 */
export const createTestSuite: CreateTestSuite<CreateTestSuiteInput, TestSuite> = async (
  args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized - Please log in");
  }

  // Validate inputs
  if (!args.goal || args.goal.trim().length === 0) {
    throw new HttpError(400, "Goal is required");
  }

  if (!args.startUrl || args.startUrl.trim().length === 0) {
    throw new HttpError(400, "Start URL is required");
  }

  // Validate URL format
  try {
    new URL(args.startUrl);
  } catch (error) {
    throw new HttpError(400, "Invalid URL format");
  }

  // Create the test suite
  const testSuite = await context.entities.TestSuite.create({
    data: {
      goal: args.goal.trim(),
      startUrl: args.startUrl.trim(),
      model: args.model || "gemini-flash",
      headless: args.headless !== undefined ? args.headless : true,
      timeout: args.timeout || 30000,
      status: "IDLE",
      userId: context.user.id,
      totalSteps: 0,
      successSteps: 0,
      failedSteps: 0,
      healedSteps: 0,
      totalTokensUsed: 0,
      estimatedCost: 0.0,
    },
  });

  return testSuite;
};

/**
 * Run a test suite (triggers the AI agent loop)
 * This is a stub - will be implemented with the AI agent core
 */
export const runTestSuite: RunTestSuite<{ testSuiteId: string }, TestSuite> = async (
  args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized - Please log in");
  }

  // Find the test suite
  const testSuite = await context.entities.TestSuite.findUnique({
    where: {
      id: args.testSuiteId,
    },
  });

  if (!testSuite) {
    throw new HttpError(404, "Test suite not found");
  }

  // Verify ownership
  if (testSuite.userId !== context.user.id) {
    throw new HttpError(403, "Forbidden - You don't own this test suite");
  }

  // Check if already running
  if (testSuite.status === "RUNNING") {
    throw new HttpError(400, "Test suite is already running");
  }

  // Update status to RUNNING
  const updatedTestSuite = await context.entities.TestSuite.update({
    where: {
      id: args.testSuiteId,
    },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      endedAt: null,
      errorMessage: null,
    },
  });

  // TODO: Trigger the AI agent loop here
  // This will be implemented in Step 5 (AI agent core)
  // For now, we just mark it as running

  console.log(`🚀 Test suite ${testSuite.id} started execution`);
  console.log(`📝 Goal: ${testSuite.goal}`);
  console.log(`🌐 Start URL: ${testSuite.startUrl}`);
  console.log(`🤖 Model: ${testSuite.model}`);

  return updatedTestSuite;
};
