-- CreateTable
CREATE TABLE "governorate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "governorate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegation" (
    "id" SERIAL NOT NULL,
    "governorateId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "delegation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "governorate_name_key" ON "governorate"("name");

-- CreateIndex
CREATE INDEX "delegation_governorateId_idx" ON "delegation"("governorateId");

-- CreateIndex
CREATE UNIQUE INDEX "delegation_governorateId_name_key" ON "delegation"("governorateId", "name");

-- AddForeignKey
ALTER TABLE "delegation" ADD CONSTRAINT "delegation_governorateId_fkey" FOREIGN KEY ("governorateId") REFERENCES "governorate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
