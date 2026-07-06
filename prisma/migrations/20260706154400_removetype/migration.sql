-- AlterTable
ALTER TABLE "Category" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "type";

-- DropEnum
DROP TYPE "TransactionType";

