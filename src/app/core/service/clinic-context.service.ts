import { Injectable } from '@angular/core';
import { User } from '@core/models/user';

/**
 * The doctor whose records are on screen. Null means the signed-in doctor's own records.
 * Kept in sessionStorage so the choice survives a reload but stays in one tab.
 */
@Injectable({ providedIn: 'root' })
export class ClinicContextService {
  private static readonly storageKey = 'activeDoctor';

  private activeDoctorValue: User | null = ClinicContextService.readStored();

  get activeDoctor(): User | null {
    return this.activeDoctorValue;
  }

  setActiveDoctor(doctor: User): void {
    this.activeDoctorValue = doctor;
    try {
      sessionStorage.setItem(ClinicContextService.storageKey, JSON.stringify(doctor));
    } catch {
      /* storage may be unavailable (private mode); the choice then lasts until reload */
    }
  }

  clear(): void {
    this.activeDoctorValue = null;
    try {
      sessionStorage.removeItem(ClinicContextService.storageKey);
    } catch {
      /* storage may be unavailable (private mode); ignore */
    }
  }

  private static readStored(): User | null {
    try {
      const raw = sessionStorage.getItem(ClinicContextService.storageKey);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
