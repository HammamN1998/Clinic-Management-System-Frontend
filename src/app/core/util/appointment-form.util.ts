export const TIME_SLOT_MINUTES = 15;

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export const DEFAULT_APPOINTMENT_DURATION = 30;

/** The doctor's saved default, or 30 when they never picked one. */
export function doctorDefaultDuration(doctor?: { defaultAppointmentDuration?: number } | null): number {
  const minutes = Number(doctor?.defaultAppointmentDuration);
  return minutes > 0 ? minutes : DEFAULT_APPOINTMENT_DURATION;
}

/** Older appointments have no stored duration, so they take the doctor's default. */
export function resolveDuration(
  appointment: { durationMinutes?: number },
  doctor?: { defaultAppointmentDuration?: number } | null,
): number {
  const minutes = Number(appointment.durationMinutes);
  return minutes > 0 ? minutes : doctorDefaultDuration(doctor);
}

export interface TimeSlot {
  value: Date;
  label: string;
}

/** Appointment slots for a full day. Labels use en-US so the AM/PM reading never changes with the UI language. */
export function buildTimeSlots(): TimeSlot[] {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  const slots: TimeSlot[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += TIME_SLOT_MINUTES) {
    const value = new Date(midnight);
    value.setMinutes(minutes);
    slots.push({
      value,
      label: value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    });
  }
  return slots;
}

/** The control holds a Date, so the slot has to be matched on time of day rather than object identity. */
export function compareTimeSlots(a: Date, b: Date): boolean {
  return !!a && !!b && a.getHours() === b.getHours() && a.getMinutes() === b.getMinutes();
}

/** Next slot at or after the current time, so a new appointment opens on a sensible default. */
export function nextTimeSlot(slots: TimeSlot[] = buildTimeSlots()): Date {
  const now = new Date();
  const index = Math.ceil((now.getHours() * 60 + now.getMinutes()) / TIME_SLOT_MINUTES);
  return slots[Math.min(index, slots.length - 1)].value;
}

/**
 * Money read off a form control. An untouched field holds '' and a cleared one holds null,
 * and both have to become 0 before they reach the balance ledger, which sums with `+=`
 * and would otherwise concatenate strings instead of adding.
 */
export function toAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}
