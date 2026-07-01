-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CompanyMentor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyLogo" TEXT,
    "position" TEXT,
    "phone" TEXT,
    "themeColor" TEXT NOT NULL DEFAULT 'yellow',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompanyMentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CompanyMentor" ("companyLogo", "companyName", "createdAt", "id", "phone", "position", "updatedAt", "userId") SELECT "companyLogo", "companyName", "createdAt", "id", "phone", "position", "updatedAt", "userId" FROM "CompanyMentor";
DROP TABLE "CompanyMentor";
ALTER TABLE "new_CompanyMentor" RENAME TO "CompanyMentor";
CREATE UNIQUE INDEX "CompanyMentor_userId_key" ON "CompanyMentor"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
