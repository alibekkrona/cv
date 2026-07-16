CREATE TABLE `LostFoundLike` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reportId` INTEGER NOT NULL,
    `visitorKey` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LostFoundLike_reportId_idx`(`reportId`),
    UNIQUE INDEX `LostFoundLike_reportId_visitorKey_key`(`reportId`, `visitorKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LostFoundComment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reportId` INTEGER NOT NULL,
    `parentId` INTEGER NULL,
    `visitorKey` VARCHAR(191) NOT NULL,
    `authorName` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LostFoundComment_reportId_idx`(`reportId`),
    INDEX `LostFoundComment_parentId_idx`(`parentId`),
    INDEX `LostFoundComment_isHidden_idx`(`isHidden`),
    INDEX `LostFoundComment_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LostFoundCommentReport` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commentId` INTEGER NOT NULL,
    `visitorKey` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LostFoundCommentReport_commentId_idx`(`commentId`),
    UNIQUE INDEX `LostFoundCommentReport_commentId_visitorKey_key`(`commentId`, `visitorKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `LostFoundLike` ADD CONSTRAINT `LostFoundLike_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `LostFoundReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `LostFoundComment` ADD CONSTRAINT `LostFoundComment_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `LostFoundReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `LostFoundComment` ADD CONSTRAINT `LostFoundComment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `LostFoundComment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `LostFoundCommentReport` ADD CONSTRAINT `LostFoundCommentReport_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `LostFoundComment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
