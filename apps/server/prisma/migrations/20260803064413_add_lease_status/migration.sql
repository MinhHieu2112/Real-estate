/*
  Warnings:

  - Added the required column `status` to the `Lease` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('Draft', 'Active', 'Expired', 'Terminated');

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'Cancelled';

-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "status" "LeaseStatus" NOT NULL;
