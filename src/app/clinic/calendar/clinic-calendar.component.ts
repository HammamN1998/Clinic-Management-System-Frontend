import { Component, OnInit } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { CalendarOptions, DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import arLocale from '@fullcalendar/core/locales/ar';
import { FullCalendarModule } from '@fullcalendar/angular';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, combineLatest, from } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { ClinicService } from '@core/service/clinic.service';
import { ClinicContextService } from '@core/service/clinic-context.service';
import { ClinicAppointment, ClinicRecordsService } from '@core/service/clinic-records.service';
import { ClinicDoctor } from '@core/models/clinic.model';
import { Patient } from '@core/models/patient.model';
import { appointmentStart, resolveDuration } from '@core/util/appointment-form.util';
import { isArabicLang } from '@core/util/app-locale.util';

/** One colour per doctor, in the order the doctors are listed. */
const DOCTOR_COLORS = ['#3f51b5', '#e91e63', '#009688', '#ff9800', '#9c27b0', '#4caf50', '#795548', '#03a9f4', '#f44336', '#607d8b'];

const MOBILE_BREAKPOINT = '(max-width: 767px)';

interface DateRange {
  start: Date;
  end: Date;
}

const sameIds = (a: string[], b: string[]) => a.join() === b.join();
const sameRange = (a: DateRange, b: DateRange) =>
  a.start.getTime() === b.start.getTime() && a.end.getTime() === b.end.getTime();

/** Every clinic doctor's appointments, view only. Clicking one opens the patient in his doctor's account. */
@Component({
  selector: 'app-clinic-calendar',
  templateUrl: './clinic-calendar.component.html',
  styleUrls: ['./clinic-calendar.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, FullCalendarModule, MatCheckboxModule, TranslateModule],
})
export class ClinicCalendarComponent extends UnsubscribeOnDestroyAdapter implements OnInit {
  doctors: ClinicDoctor[] = [];
  loadFailed = false;
  calendarOptions: CalendarOptions;
  private isMobile: boolean;
  private opening = false;
  private appointments: ClinicAppointment[] = [];
  private readonly hiddenDoctorIds = new Set<string>();
  private readonly visibleRanges = new Subject<DateRange>();
  private readonly patients = new Map<string, Patient>();

  constructor(
    private clinicService: ClinicService,
    private clinicContext: ClinicContextService,
    private records: ClinicRecordsService,
    private translate: TranslateService,
    private breakpointObserver: BreakpointObserver,
  ) {
    super();
    this.isMobile = this.breakpointObserver.isMatched(MOBILE_BREAKPOINT);
    this.calendarOptions = {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
      ...this.toolbarOptions(),
      ...this.localeOptions(this.translate.currentLang),
      initialView: this.isMobile ? 'listWeek' : 'timeGridWeek',
      editable: false,
      selectable: false,
      dayMaxEvents: true,
      allDaySlot: false,
      slotEventOverlap: false,
      stickyHeaderDates: true,
      nowIndicator: true,
      height: this.isMobile ? 'auto' : undefined,
      eventTimeFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },
      // In the month and list views FullCalendar shows an event's colour only as a dot, which the
      // theme hides in the month view, so each appointment is filled with its doctor's colour.
      eventDidMount: ({ el, backgroundColor }) => {
        el.style.backgroundColor = backgroundColor;
      },
      eventClick: (arg) => void this.openPatient(arg),
      datesSet: (arg: DatesSetArg) => this.visibleRanges.next({ start: arg.start, end: arg.end }),
    };
  }

  ngOnInit(): void {
    // The Clinic pages are the admin's own, so opening one leaves the doctor's account he was in.
    this.clinicContext.clear();
    this.subs.sink = this.translate.onLangChange.subscribe(({ lang }) => {
      this.calendarOptions = { ...this.calendarOptions, ...this.localeOptions(lang) };
    });
    this.subs.sink = this.breakpointObserver.observe(MOBILE_BREAKPOINT).subscribe(({ matches }) => {
      if (matches !== this.isMobile) {
        this.isMobile = matches;
        this.calendarOptions = { ...this.calendarOptions, ...this.toolbarOptions(), height: matches ? 'auto' : undefined };
      }
    });
    const doctors$ = this.clinicService.clinicDoctors$().pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.subs.sink = doctors$.subscribe((doctors) => {
      this.doctors = doctors;
      this.render();
    });
    const doctorIds$ = doctors$.pipe(
      map((doctors) => doctors.map((doctor) => doctor.doctorId)),
      distinctUntilChanged(sameIds),
    );
    // switchMap drops a slow answer for doctors or dates the admin has since left.
    this.subs.sink = combineLatest([doctorIds$, this.visibleRanges.pipe(distinctUntilChanged(sameRange))])
      .pipe(switchMap(([doctorIds, range]) => from(this.load(doctorIds, range))))
      .subscribe((appointments) => {
        this.loadFailed = !appointments;
        this.appointments = appointments ?? [];
        this.render();
      });
  }

  colorAt(index: number): string {
    return DOCTOR_COLORS[index % DOCTOR_COLORS.length];
  }

  doctorLabel(doctor: ClinicDoctor): string {
    return doctor.isSelf ? this.translate.instant('CLINIC.SELF_NAME', { name: doctor.name }) : doctor.name;
  }

  isShown(doctor: ClinicDoctor): boolean {
    return !this.hiddenDoctorIds.has(doctor.doctorId);
  }

  toggleDoctor(doctor: ClinicDoctor, shown: boolean): void {
    if (shown) {
      this.hiddenDoctorIds.delete(doctor.doctorId);
    } else {
      this.hiddenDoctorIds.add(doctor.doctorId);
    }
    this.render();
  }

  private async load(doctorIds: string[], { start, end }: DateRange): Promise<ClinicAppointment[] | null> {
    try {
      return await this.records.clinicAppointments(doctorIds, start, end, this.patients);
    } catch (err) {
      console.error('Failed to load the clinic calendar', err);
      return null;
    }
  }

  /** Colours and durations come from the current doctor list, so a doctor's change shows without a reload. */
  private render(): void {
    const events: EventInput[] = [];
    this.doctors.forEach((doctor, index) => {
      if (!this.isShown(doctor)) {
        return;
      }
      const color = this.colorAt(index);
      for (const { appointment, patient } of this.appointments) {
        if (appointment.doctorId !== doctor.doctorId) {
          continue;
        }
        const start = appointmentStart(appointment);
        events.push({
          // FullCalendar keeps an event's element while its id stays the same, and eventDidMount
          // colours the element only when it is created, so a new colour needs a new id.
          id: `${appointment.id}:${color}`,
          title: `${patient.firstName} ${patient.lastName}`.trim(),
          start,
          end: new Date(start.getTime() + resolveDuration(appointment, doctor) * 60_000),
          backgroundColor: color,
          borderColor: color,
          textColor: '#fff',
          extendedProps: { patient },
        });
      }
    });
    this.calendarOptions = { ...this.calendarOptions, events };
  }

  private async openPatient(arg: EventClickArg): Promise<void> {
    if (this.opening) {
      return;
    }
    this.opening = true;
    try {
      await this.clinicService.openPatient(arg.event.extendedProps['patient'] as Patient);
    } finally {
      this.opening = false;
    }
  }

  private toolbarOptions(): Pick<CalendarOptions, 'headerToolbar' | 'dayHeaderFormat'> {
    return {
      headerToolbar: this.isMobile
        ? { left: 'prev,next', center: 'title', right: 'listWeek,timeGridDay,dayGridMonth' }
        : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
      dayHeaderFormat: this.isMobile ? { weekday: 'short' } : { weekday: 'short', month: 'numeric', day: 'numeric' },
    };
  }

  private localeOptions(lang: string): Pick<CalendarOptions, 'locale' | 'direction' | 'firstDay'> {
    const isArabic = isArabicLang(lang);
    return {
      locale: isArabic ? arLocale : 'en',
      direction: isArabic ? 'rtl' : 'ltr',
      firstDay: isArabic ? 6 : 0,
    };
  }
}
