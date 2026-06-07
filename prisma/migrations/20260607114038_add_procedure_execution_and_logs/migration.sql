-- AlterTable
ALTER TABLE "Procedure" ADD COLUMN "description" TEXT,
ADD COLUMN "schedule" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastExecutedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Procedure_shop_isActive_idx" on "Procedure"("shop", "isActive");

-- CreateTable
CREATE TABLE "ProcedureExecution" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "productsMatched" INTEGER NOT NULL DEFAULT 0,
    "productsUpdated" INTEGER NOT NULL DEFAULT 0,
    "productsFailed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcedureExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcedureExecution_procedureId_status_idx" on "ProcedureExecution"("procedureId", "status");

-- CreateIndex
CREATE INDEX "ProcedureExecution_shop_createdAt_idx" on "ProcedureExecution"("shop", "createdAt");

-- AddForeignKey
ALTER TABLE "ProcedureExecution" ADD CONSTRAINT "ProcedureExecution_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ProcedureLog" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcedureLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcedureLog_executionId_idx" on "ProcedureLog"("executionId");

-- CreateIndex
CREATE INDEX "ProcedureLog_procedureId_productId_idx" on "ProcedureLog"("procedureId", "productId");

-- AddForeignKey
ALTER TABLE "ProcedureLog" ADD CONSTRAINT "ProcedureLog_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ProcedureExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
