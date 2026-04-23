-- CreateTable
CREATE TABLE "page_visits" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_visits_session_id_idx" ON "page_visits"("session_id");

-- CreateIndex
CREATE INDEX "page_visits_created_at_idx" ON "page_visits"("created_at");
