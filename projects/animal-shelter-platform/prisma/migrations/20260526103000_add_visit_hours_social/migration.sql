-- CreateTable
CREATE TABLE `ShelterVisitHour` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dayOfWeek` INTEGER NOT NULL,
    `opensAt` VARCHAR(191) NOT NULL,
    `closesAt` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ShelterVisitHour_dayOfWeek_idx`(`dayOfWeek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnimalLike` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `animalId` INTEGER NOT NULL,
    `visitorKey` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AnimalLike_animalId_visitorKey_key`(`animalId`, `visitorKey`),
    INDEX `AnimalLike_animalId_idx`(`animalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnimalComment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `animalId` INTEGER NOT NULL,
    `parentId` INTEGER NULL,
    `visitorKey` VARCHAR(191) NOT NULL,
    `authorName` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AnimalComment_animalId_idx`(`animalId`),
    INDEX `AnimalComment_parentId_idx`(`parentId`),
    INDEX `AnimalComment_visitorKey_idx`(`visitorKey`),
    INDEX `AnimalComment_isHidden_idx`(`isHidden`),
    INDEX `AnimalComment_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AnimalLike` ADD CONSTRAINT `AnimalLike_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnimalComment` ADD CONSTRAINT `AnimalComment_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnimalComment` ADD CONSTRAINT `AnimalComment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `AnimalComment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default public visit hours: every day, 12:00-16:00.
INSERT INTO `ShelterVisitHour` (`dayOfWeek`, `opensAt`, `closesAt`, `isEnabled`, `createdAt`, `updatedAt`)
VALUES
  (1, '12:00', '16:00', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2, '12:00', '16:00', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3, '12:00', '16:00', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (4, '12:00', '16:00', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (5, '12:00', '16:00', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (6, '12:00', '16:00', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (7, '12:00', '16:00', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
