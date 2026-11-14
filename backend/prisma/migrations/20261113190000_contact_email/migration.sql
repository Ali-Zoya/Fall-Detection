-- Fall alerts are now sent by e-mail instead of SMS.
-- Contacts get an e-mail address; the phone number becomes optional.

-- DropIndex
DROP INDEX "EmergencyContact_userId_phone_key";

-- AlterTable
ALTER TABLE "EmergencyContact" ADD COLUMN     "email" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyContact_userId_email_key" ON "EmergencyContact"("userId", "email");
