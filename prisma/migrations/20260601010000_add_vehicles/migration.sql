-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER,
    "client" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "km" INTEGER NOT NULL DEFAULT 0,
    "vehicle_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_service_date" TIMESTAMP(3),
    "next_service_km" INTEGER,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_vehicles_client_id" ON "vehicles"("client_id");

-- CreateIndex
CREATE INDEX "idx_vehicles_plate" ON "vehicles"("plate");

-- CreateIndex
CREATE INDEX "idx_vehicles_status" ON "vehicles"("status");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;