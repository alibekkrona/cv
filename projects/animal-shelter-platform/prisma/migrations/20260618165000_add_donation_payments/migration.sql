-- CreateTable
CREATE TABLE `DonationPayment` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `publicId` VARCHAR(191) NOT NULL,
  `donationId` INTEGER NOT NULL,
  `provider` ENUM('LIQPAY', 'MONOBANK') NOT NULL,
  `status` ENUM('CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'CREATED',
  `amountCents` INTEGER NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'UAH',
  `providerPaymentId` VARCHAR(191) NULL,
  `checkoutUrl` TEXT NULL,
  `requestJson` JSON NULL,
  `responseJson` JSON NULL,
  `rawCallbackJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `DonationPayment_publicId_key`(`publicId`),
  INDEX `DonationPayment_donationId_idx`(`donationId`),
  INDEX `DonationPayment_provider_idx`(`provider`),
  INDEX `DonationPayment_status_idx`(`status`),
  INDEX `DonationPayment_providerPaymentId_idx`(`providerPaymentId`),
  INDEX `DonationPayment_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DonationPaymentEvent` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `paymentId` INTEGER NOT NULL,
  `status` ENUM('CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED') NOT NULL,
  `payload` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `DonationPaymentEvent_paymentId_idx`(`paymentId`),
  INDEX `DonationPaymentEvent_status_idx`(`status`),
  INDEX `DonationPaymentEvent_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DonationPayment` ADD CONSTRAINT `DonationPayment_donationId_fkey` FOREIGN KEY (`donationId`) REFERENCES `Donation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DonationPaymentEvent` ADD CONSTRAINT `DonationPaymentEvent_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `DonationPayment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
