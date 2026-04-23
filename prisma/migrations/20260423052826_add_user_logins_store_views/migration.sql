-- CreateTable
CREATE TABLE "user_logins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_logins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_views" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_logins_user_id_idx" ON "user_logins"("user_id");

-- CreateIndex
CREATE INDEX "user_logins_created_at_idx" ON "user_logins"("created_at");

-- CreateIndex
CREATE INDEX "store_views_store_id_idx" ON "store_views"("store_id");

-- CreateIndex
CREATE INDEX "store_views_created_at_idx" ON "store_views"("created_at");

-- AddForeignKey
ALTER TABLE "user_logins" ADD CONSTRAINT "user_logins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_views" ADD CONSTRAINT "store_views_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_views" ADD CONSTRAINT "store_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
