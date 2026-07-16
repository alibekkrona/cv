-- AlterTable
ALTER TABLE `AdoptionApplication` ADD COLUMN `type` ENUM('ADOPTION', 'ACQUAINTANCE', 'VISIT', 'WALKING', 'GUARDIANSHIP', 'VOLUNTEERING', 'OTHER') NOT NULL DEFAULT 'ADOPTION';

-- CreateIndex
CREATE INDEX `AdoptionApplication_type_idx` ON `AdoptionApplication`(`type`);
