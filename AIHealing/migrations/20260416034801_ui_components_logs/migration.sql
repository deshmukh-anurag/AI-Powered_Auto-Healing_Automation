-- CreateTable
CREATE TABLE "GoldenState" (
    "id" TEXT NOT NULL,
    "testSuiteId" TEXT NOT NULL,
    "stepDescription" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "selector" TEXT NOT NULL,
    "selectorType" TEXT NOT NULL DEFAULT 'css',
    "elementTag" TEXT NOT NULL,
    "elementText" TEXT,
    "elementRole" TEXT,
    "elementAttributes" JSONB,
    "embeddingHash" TEXT,
    "chromaDbId" TEXT,
    "successCount" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoldenState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedScript" (
    "id" TEXT NOT NULL,
    "testSuiteId" TEXT NOT NULL,
    "scriptName" TEXT NOT NULL,
    "scriptContent" TEXT NOT NULL,
    "scriptType" TEXT NOT NULL DEFAULT 'basic',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSteps" INTEGER NOT NULL,
    "healedSteps" INTEGER NOT NULL,
    "healingRate" DOUBLE PRECISION NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownload" TIMESTAMP(3),

    CONSTRAINT "GeneratedScript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoldenState_testSuiteId_idx" ON "GoldenState"("testSuiteId");

-- CreateIndex
CREATE INDEX "GoldenState_embeddingHash_idx" ON "GoldenState"("embeddingHash");

-- CreateIndex
CREATE INDEX "GoldenState_lastUsedAt_idx" ON "GoldenState"("lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GoldenState_testSuiteId_stepDescription_key" ON "GoldenState"("testSuiteId", "stepDescription");

-- CreateIndex
CREATE INDEX "GeneratedScript_testSuiteId_idx" ON "GeneratedScript"("testSuiteId");

-- CreateIndex
CREATE INDEX "GeneratedScript_generatedAt_idx" ON "GeneratedScript"("generatedAt");

-- AddForeignKey
ALTER TABLE "GoldenState" ADD CONSTRAINT "GoldenState_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedScript" ADD CONSTRAINT "GeneratedScript_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
