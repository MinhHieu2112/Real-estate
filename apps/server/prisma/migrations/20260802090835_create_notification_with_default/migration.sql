-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('New_application', 'Application_approved', 'Application_denied', 'New_message');

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "receiverCognitoId" TEXT NOT NULL,
    "senderCognitoId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "applicationId" INTEGER,
    "conversationId" INTEGER,
    "messageId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_receiverCognitoId_isRead_idx" ON "Notification"("receiverCognitoId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
