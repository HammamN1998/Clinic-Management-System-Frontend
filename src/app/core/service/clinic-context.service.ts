import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '@core/models/user';

/** A linked doctor working in his clinic's account, which is his clinic admin's doctor account. */
export interface ActingContext {
  doctor: User;
}

/**
 * The account whose records are on screen when it is not the signed-in doctor's own: the clinic
 * account a linked doctor works in. Null means his own account. Kept in sessionStorage with his
 * choice of his own account, so both survive a reload but stay in one tab.
 */
@Injectable({ providedIn: 'root' })
export class ClinicContextService {
  private static readonly storageKey = 'clinicAccount';
  private static readonly ownAccountKey = 'ownAccount';

  private readonly actingSubject = new BehaviorSubject<ActingContext | null>(ClinicContextService.readStored());
  readonly acting$: Observable<ActingContext | null> = this.actingSubject.asObservable();

  /** The clinic admin whose account the signed-in doctor works in. */
  get activeDoctor(): User | null {
    return this.actingSubject.value?.doctor ?? null;
  }

  get isActing(): boolean {
    return this.actingSubject.value !== null;
  }

  /** Patients are deleted by the account's owner only; the rules refuse it to his clinic's doctors. */
  get canDeletePatients(): boolean {
    return !this.isActing;
  }

  /** True once the signed-in doctor left the clinic account for his own in this tab. */
  get choseOwnAccount(): boolean {
    return ClinicContextService.read(ClinicContextService.ownAccountKey) === 'true';
  }

  set(doctor: User): void {
    const acting: ActingContext = { doctor };
    this.actingSubject.next(acting);
    ClinicContextService.write(ClinicContextService.storageKey, JSON.stringify(acting));
    ClinicContextService.write(ClinicContextService.ownAccountKey, null);
  }

  /** Back to the signed-in doctor's own account, where he stays until he opens the clinic account again. */
  chooseOwnAccount(): void {
    this.clear();
    ClinicContextService.write(ClinicContextService.ownAccountKey, 'true');
  }

  clear(): void {
    if (this.actingSubject.value) {
      this.actingSubject.next(null);
    }
    ClinicContextService.write(ClinicContextService.storageKey, null);
  }

  /** Forgets the account and the choice, so the next sign-in starts in the clinic account again. */
  reset(): void {
    this.clear();
    ClinicContextService.write(ClinicContextService.ownAccountKey, null);
  }

  private static readStored(): ActingContext | null {
    try {
      const raw = ClinicContextService.read(ClinicContextService.storageKey);
      const stored = raw ? (JSON.parse(raw) as Partial<ActingContext>) : null;
      return stored?.doctor?.id ? { doctor: stored.doctor } : null;
    } catch {
      return null;
    }
  }

  private static read(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /** Null removes the key. */
  private static write(key: string, value: string | null): void {
    try {
      if (value === null) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
      }
    } catch {
      /* storage may be unavailable (private mode); the state then lasts until reload */
    }
  }
}
