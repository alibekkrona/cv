CREATE TABLE `ShelterWalkingHour` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dayOfWeek` INTEGER NOT NULL,
    `opensAt` VARCHAR(191) NOT NULL,
    `closesAt` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ShelterWalkingHour_dayOfWeek_idx`(`dayOfWeek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

UPDATE `ShelterVisitHour`
SET
  `opensAt` = '09:00',
  `closesAt` = '16:30',
  `isEnabled` = true,
  `updatedAt` = CURRENT_TIMESTAMP(3);

INSERT INTO `ShelterWalkingHour` (`dayOfWeek`, `opensAt`, `closesAt`, `isEnabled`, `createdAt`, `updatedAt`)
VALUES
  (1, '10:00', '13:00', false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2, '10:00', '13:00', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3, '10:00', '13:00', false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (4, '10:00', '13:00', false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (5, '10:00', '13:00', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (6, '10:00', '13:00', false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (7, '10:00', '13:00', false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
