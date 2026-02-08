-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSuite" (
    "id" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "startUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "successSteps" INTEGER NOT NULL DEFAULT 0,
    "failedSteps" INTEGER NOT NULL DEFAULT 0,
    "healedSteps" INTEGER NOT NULL DEFAULT 0,
    "totalTokensUsed" INTEGER DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION DEFAULT 0.0,
    "headless" BOOLEAN NOT NULL DEFAULT true,
    "timeout" INTEGER NOT NULL DEFAULT 30000,
    "model" TEXT NOT NULL DEFAULT 'gemini-flash',
    "errorMessage" TEXT,
    "executionTime" INTEGER,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TestSuite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Step" (
    "id" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "value" TEXT,
    "goldenState" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confidence" DOUBLE PRECISION DEFAULT 1.0,
    "reasoning" TEXT,
    "errorMessage" TEXT,
    "screenshot" TEXT,
    "executionTime" INTEGER,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "testSuiteId" TEXT NOT NULL,

    CONSTRAINT "Step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealingEvent" (
    "id" TEXT NOT NULL,
    "oldSelector" TEXT NOT NULL,
    "newSelector" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "matchedOn" JSONB NOT NULL,
    "strategy" TEXT NOT NULL DEFAULT 'RAG_VECTOR',
    "wasSuccessful" BOOLEAN NOT NULL DEFAULT false,
    "requiresManualReview" BOOLEAN NOT NULL DEFAULT false,
    "manuallyConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "stepId" TEXT NOT NULL,

    CONSTRAINT "HealingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "testSuiteId" TEXT,

    CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VectorEmbedding" (
    "id" TEXT NOT NULL,
    "elementType" TEXT NOT NULL,
    "elementData" JSONB NOT NULL,
    "embeddingHash" TEXT NOT NULL,
    "embedding" JSONB,
    "embeddingId" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gemini-embedding-001',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usageCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VectorEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModelUsage" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "operation" TEXT NOT NULL,
    "tokensInput" INTEGER NOT NULL,
    "tokensOutput" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "latencyMs" INTEGER,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "testSuiteId" TEXT,

    CONSTRAINT "AIModelUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auth" (
    "id" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "providerName" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "providerData" TEXT NOT NULL DEFAULT '{}',
    "authId" TEXT NOT NULL,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("providerName","providerUserId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "TestSuite_userId_idx" ON "TestSuite"("userId");

-- CreateIndex
CREATE INDEX "TestSuite_status_idx" ON "TestSuite"("status");

-- CreateIndex
CREATE INDEX "TestSuite_createdAt_idx" ON "TestSuite"("createdAt");

-- CreateIndex
CREATE INDEX "Step_testSuiteId_idx" ON "Step"("testSuiteId");

-- CreateIndex
CREATE INDEX "Step_status_idx" ON "Step"("status");

-- CreateIndex
CREATE INDEX "Step_stepNumber_idx" ON "Step"("stepNumber");

-- CreateIndex
CREATE INDEX "HealingEvent_stepId_idx" ON "HealingEvent"("stepId");

-- CreateIndex
CREATE INDEX "HealingEvent_confidence_idx" ON "HealingEvent"("confidence");

-- CreateIndex
CREATE INDEX "HealingEvent_wasSuccessful_idx" ON "HealingEvent"("wasSuccessful");

-- CreateIndex
CREATE INDEX "ExecutionLog_testSuiteId_idx" ON "ExecutionLog"("testSuiteId");

-- CreateIndex
CREATE INDEX "ExecutionLog_level_idx" ON "ExecutionLog"("level");

-- CreateIndex
CREATE INDEX "ExecutionLog_timestamp_idx" ON "ExecutionLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "VectorEmbedding_embeddingHash_key" ON "VectorEmbedding"("embeddingHash");

-- CreateIndex
CREATE INDEX "VectorEmbedding_embeddingHash_idx" ON "VectorEmbedding"("embeddingHash");

-- CreateIndex
CREATE INDEX "VectorEmbedding_elementType_idx" ON "VectorEmbedding"("elementType");

-- CreateIndex
CREATE INDEX "AIModelUsage_testSuiteId_idx" ON "AIModelUsage"("testSuiteId");

-- CreateIndex
CREATE INDEX "AIModelUsage_modelName_idx" ON "AIModelUsage"("modelName");

-- CreateIndex
CREATE INDEX "AIModelUsage_timestamp_idx" ON "AIModelUsage"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_userId_key" ON "Auth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_id_key" ON "Session"("id");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Step" ADD CONSTRAINT "Step_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealingEvent" ADD CONSTRAINT "HealingEvent_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIModelUsage" ADD CONSTRAINT "AIModelUsage_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auth" ADD CONSTRAINT "Auth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_authId_fkey" FOREIGN KEY ("authId") REFERENCES "Auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;
