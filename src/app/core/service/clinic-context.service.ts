import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '@core/models/user';
import { ClinicAccess } from '@core/models/clinic.model';

/** A clinic admin working in a linked doctor's account, with the access that doctor gave him. */
export interface ActingContext {
  doctor: User;
  access: ClinicAccess;
}

/**
 * The doctor whose records are on screen. Null means the signed-in doctor's own records.
 * Kept in sessionStorage so the choice survives a reload but stays in one tab.
 */
@Injectable({ providedIn: 'root' })
export class ClinicContextService {
  private static readonly storageKey = 'activeDoctor';

  private readonly actingSubject = new BehaviorSubject<ActingContext | null>(ClinicContextService.readStored());
  readonly acting$: Observable<ActingContext | null> = this.actingSubject.asObservable();

  get activeDoctor(): User | null {
    return this.actingSubject.value?.doctor ?? null;
  }

  get isActing(): boolean {
    return this.actingSubject.value !== null;
  }

  /** False only inside a doctor's account opened with view access. The rules refuse those writes anyway. */
  get canEdit(): boolean {
    return this.actingSubject.value?.access !== 'view';
  }

  /** Deleting stays with the doctor himself; the rules refuse it to his clinic admin. */
  get canDelete(): boolean {
    return !this.isActing;
  }

  set(doctor: User, access: ClinicAccess): void {
    const acting: ActingContext = { doctor, access };
    this.actingSubject.next(acting);
    try {
      sessionStorage.setItem(ClinicContextService.storageKey, JSON.stringify(acting));
    } catch {
      /* storage may be unavailable (private mode); the choice then lasts until reload */
    }
  }

  clear(): void {
    if (this.actingSubject.value) {
      this.actingSubject.next(null);
    }
    try {
      sessionStorage.removeItem(ClinicContextService.storageKey);
    } catch {
      /* storage may be unavailable (private mode); ignore */
    }
  }

  private static readStored(): ActingContext | null {
    try {
      const raw = sessionStorage.getItem(ClinicContextService.storageKey);
      const stored = raw ? (JSON.parse(raw) as Partial<ActingContext>) : null;
      if (stored?.doctor?.id && (stored.access === 'view' || stored.access === 'edit')) {
        return { doctor: stored.doctor, access: stored.access };
      }
      return null;
    } catch {
      return null;
    }
  }
}
