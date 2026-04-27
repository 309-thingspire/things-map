-- CreateTable
CREATE TABLE "chat_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_message" TEXT NOT NULL,
    "assistant_message" TEXT NOT NULL DEFAULT '',
    "store_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_logs_user_id_idx" ON "chat_logs"("user_id");

-- CreateIndex
CREATE INDEX "chat_logs_created_at_idx" ON "chat_logs"("created_at");

-- AddForeignKey
ALTER TABLE "chat_logs" ADD CONSTRAINT "chat_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
