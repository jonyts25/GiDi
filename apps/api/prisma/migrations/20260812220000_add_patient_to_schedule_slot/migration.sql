-- Optional patient link on weekly schedule slots
ALTER TABLE "TherapistScheduleSlot" ADD COLUMN "patientId" UUID;

ALTER TABLE "TherapistScheduleSlot" ADD CONSTRAINT "TherapistScheduleSlot_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "TherapistScheduleSlot_patientId_idx" ON "TherapistScheduleSlot"("patientId");
