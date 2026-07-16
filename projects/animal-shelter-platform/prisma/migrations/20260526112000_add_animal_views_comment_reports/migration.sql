-- CreateTable
CREATE TABLE `AnimalView` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `animalId` INTEGER NOT NULL,
    `visitorKey` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AnimalView_animalId_visitorKey_key`(`animalId`, `visitorKey`),
    INDEX `AnimalView_animalId_idx`(`animalId`),
    INDEX `AnimalView_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnimalCommentReport` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commentId` INTEGER NOT NULL,
    `visitorKey` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AnimalCommentReport_commentId_visitorKey_key`(`commentId`, `visitorKey`),
    INDEX `AnimalCommentReport_commentId_idx`(`commentId`),
    INDEX `AnimalCommentReport_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AnimalView` ADD CONSTRAINT `AnimalView_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnimalCommentReport` ADD CONSTRAINT `AnimalCommentReport_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `AnimalComment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
