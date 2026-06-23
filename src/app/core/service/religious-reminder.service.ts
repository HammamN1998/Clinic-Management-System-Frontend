import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { FirebaseAuthenticationService } from '../../authentication/services/firebase-authentication.service';
import { isArabicLang } from '@core/util/app-locale.util';
import { isTruthyString } from '@core/util/boolean-string.util';

/** Short Arabic dhikr/ayat shown one at a time. Kept in Arabic, no i18n. */
export const REMINDER_PHRASES: string[] = [
  'اذكر الله',
  'لا اله الا الله',
  'اللهم صلي على سيدنا محمد',
  'توكل على الله',
  'الحمد لله',
  'سبحان الله',
  'الله اكبر',
  'سبحان الله وبحمدة',
  'لا تنسى ذكر الله',
  'استغفر الله',
  'لا حول ولا قوة إلا بالله',
  'بسم الله',
  'حسبنا الله ونعم الوكيل',
  'سبحان الله العظيم',
  'ربِّ اغفر لي',
  'ربِّ زِدْنِي عِلْمًا',
  'اللهم إني أسألك العفو والعافية',
  'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
  'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ',
  'رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا',
  'وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
  'اللهم بارك لي في عملي',
];

const DISPLAY_MS = 4000;
const INTERVAL_MS = 15 * 60 * 1000;

/**
 * Drives the dhikr reminder overlay: shows a random phrase for a few seconds
 * every 15 minutes, but only while the app is in Arabic and the doctor has not
 * disabled the feature. Active only inside the authenticated app shell.
 */
@Injectable({ providedIn: 'root' })
export class ReligiousReminderService implements OnDestroy {
  readonly active$ = new BehaviorSubject<boolean>(false);
  readonly currentPhrase$ = new BehaviorSubject<string>('');

  private intervalId?: ReturnType<typeof setInterval>;
  private hideTimeoutId?: ReturnType<typeof setTimeout>;
  private lastPhraseIndex = -1;
  private subs = new Subscription();
  private readonly onVisibilityChange = () => this.refresh();

  constructor(
    private translate: TranslateService,
    private auth: FirebaseAuthenticationService,
  ) {}

  /** Begin reacting to language/setting changes and schedule reminders. */
  start(): void {
    this.subs.add(this.translate.onLangChange.subscribe(() => this.refresh()));
    this.subs.add(this.auth.currentUser.subscribe(() => this.refresh()));
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.refresh();
  }

  /** Stop the scheduler and hide any visible reminder. */
  stop(): void {
    this.subs.unsubscribe();
    this.subs = new Subscription();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.clearTimers();
    this.hide();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  /**
   * Re-evaluate gating and (re)start or stop the scheduler accordingly. Public
   * so the settings toggle can restart reminders immediately after the doctor
   * re-enables them (editDoctor mutates the user in place without emitting). */
  refresh(): void {
    if (this.canShow()) {
      this.startScheduler();
    } else {
      this.clearTimers();
      this.hide();
    }
  }

  private canShow(): boolean {
    const doctor = this.auth.currentUserValue;
    return (
      !!doctor?.id &&
      isTruthyString(doctor.religiousRemindersEnabled) &&
      isArabicLang(this.translate.currentLang) &&
      !document.hidden
    );
  }

  private startScheduler(): void {
    if (this.intervalId !== undefined) {
      return;
    }
    this.intervalId = setInterval(() => this.show(), INTERVAL_MS);
  }

  private show(): void {
    if (!this.canShow()) {
      this.clearTimers();
      this.hide();
      return;
    }
    this.currentPhrase$.next(this.pickPhrase());
    this.active$.next(true);
    this.hideTimeoutId = setTimeout(() => this.hide(), DISPLAY_MS);
  }

  private hide(): void {
    if (this.hideTimeoutId !== undefined) {
      clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = undefined;
    }
    if (this.active$.value) {
      this.active$.next(false);
    }
  }

  private clearTimers(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /** Random phrase, avoiding an immediate repeat of the previous one. */
  private pickPhrase(): string {
    if (REMINDER_PHRASES.length === 1) {
      return REMINDER_PHRASES[0];
    }
    let index = this.lastPhraseIndex;
    while (index === this.lastPhraseIndex) {
      index = Math.floor(Math.random() * REMINDER_PHRASES.length);
    }
    this.lastPhraseIndex = index;
    return REMINDER_PHRASES[index];
  }
}
