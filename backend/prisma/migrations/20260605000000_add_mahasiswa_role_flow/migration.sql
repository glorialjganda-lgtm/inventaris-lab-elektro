ALTER TABLE `users`
  MODIFY `role` ENUM('admin_jurusan', 'kepala_lab', 'dosen', 'mahasiswa') NOT NULL;

ALTER TABLE `borrowings`
  ADD COLUMN `mahasiswa_id` BIGINT UNSIGNED NULL,
  ADD COLUMN `dosen_approval_status` ENUM('not_required', 'menunggu', 'disetujui', 'ditolak') NOT NULL DEFAULT 'not_required',
  ADD COLUMN `dosen_approval_note` TEXT NULL,
  ADD COLUMN `dosen_approved_at` DATETIME(0) NULL;

CREATE INDEX `idx_borrowings_mahasiswa_id` ON `borrowings`(`mahasiswa_id`);
CREATE INDEX `idx_borrowings_dosen_approval_status` ON `borrowings`(`dosen_approval_status`);

ALTER TABLE `borrowings`
  ADD CONSTRAINT `fk_borrowings_mahasiswa`
  FOREIGN KEY (`mahasiswa_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
