CREATE TYPE "FinanceTransactionType" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(100) NOT NULL,
    "type" "FinanceTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");
CREATE INDEX "transactions_status_created_at_idx" ON "transactions"("status", "created_at");
CREATE INDEX "transactions_type_created_at_idx" ON "transactions"("type", "created_at");
