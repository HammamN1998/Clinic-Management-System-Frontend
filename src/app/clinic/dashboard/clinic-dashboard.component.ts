import { Component, Injector, OnInit } from '@angular/core';
import { DatePipe, NgClass, formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, combineLatest, from } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { FirebaseAuthenticationService } from '@core';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { AppCurrencyPipe } from '@core/pipe/app-currency.pipe';
import { ClinicService } from '@core/service/clinic.service';
import { ClinicContextService } from '@core/service/clinic-context.service';
import { ClinicRecordsService, DoctorRangeTotals } from '@core/service/clinic-records.service';
import { CurrencyService } from '@core/service/currency.service';
import { NotificationService } from '@core/service/notification.service';
import { ClinicReport, ClinicReportLine } from '@core/models/clinic-report.model';
import { Patient } from '@core/models/patient.model';
import {
  ClinicAgreement,
  ClinicDoctor,
  ClinicInvite,
  LinkedDoctor,
  PatientDeletionRequest,
  inviteDisplayStatus,
} from '@core/models/clinic.model';
import { appointmentStart } from '@core/util/appointment-form.util';
import { isSupportedCurrency, roundCurrencyAmount } from '@core/util/currency.util';
import {
  DashboardRangePreset,
  formatDashboardRangeLabel,
  getAppDateLocale,
  getDashboardRangeDates,
} from '@core/util/dashboard-range-label.util';
import { downloadXlsx } from '@core/util/xlsx.util';

interface RangeOption {
  id: DashboardRangePreset;
  label: string;
}

interface DateRange {
  start: Date;
  end: Date;
}

/** One doctor's figures for the selected range. */
interface DoctorFigures {
  totals: DoctorRangeTotals;
  /** The money collected in the range since the doctor joined the clinic, which the commission is taken from. */
  commissionBase: number;
}

/** One line of Needs attention, translated in the template. */
interface AttentionItem {
  icon: string;
  key: string;
  params: Record<string, string>;
}

interface StatCard {
  label: string;
  icon: string;
  color: string;
  /** Null while loading. */
  value: number | null;
  money: boolean;
  hint?: string;
}

interface ScheduleRow {
  id: string;
  doctorId: string;
  start: Date;
  patient: Patient;
  attended: boolean;
}

const CURRENT_RANGE_LABELS: Record<DashboardRangePreset, string> = {
  today: 'DASHBOARD.RANGE.CURRENT.TODAY',
  week: 'DASHBOARD.RANGE.CURRENT.WEEK',
  month: 'DASHBOARD.RANGE.CURRENT.MONTH',
  year: 'DASHBOARD.RANGE.CURRENT.YEAR',
};

const sameIds = (a: string[], b: string[]) => a.join() === b.join();
const sameDoctors = (a: ClinicDoctor[], b: ClinicDoctor[]) =>
  a.length === b.length &&
  a.every((doctor, index) => doctor.doctorId === b[index].doctorId && doctor.linkedAt?.getTime() === b[index].linkedAt?.getTime());

/**
 * The clinic at a glance: what needs the admin, each doctor's figures for a range (the admin's
 * own work counts as one doctor), and today's appointments.
 */
@Component({
  selector: 'app-clinic-dashboard',
  templateUrl: './clinic-dashboard.component.html',
  styleUrls: ['./clinic-dashboard.component.scss'],
  standalone: true,
  imports: [
    AppCurrencyPipe,
    BreadcrumbComponent,
    DatePipe,
    NgClass,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    TranslateModule,
  ],
})
export class ClinicDashboardComponent extends UnsubscribeOnDestroyAdapter implements OnInit {
  readonly rangeOptions: RangeOption[] = [
    { id: 'today', label: 'DASHBOARD.RANGE.TODAY' },
    { id: 'week', label: 'DASHBOARD.RANGE.WEEK' },
    { id: 'month', label: 'DASHBOARD.RANGE.MONTH' },
    { id: 'year', label: 'DASHBOARD.RANGE.YEAR' },
  ];
  selectedRange: DashboardRangePreset = 'month';
  rangeOffset = 0;
  /** Null shows every doctor. */
  selectedDoctorId: string | null = null;
  doctors: ClinicDoctor[] = [];
  /** By doctor. Null while loading or after a failed load. */
  figures: Map<string, DoctorFigures> | null = null;
  outstanding: Map<string, number> | null = null;
  schedule: ScheduleRow[] | null = null;
  totalsFailed = false;
  outstandingFailed = false;
  scheduleFailed = false;
  opening = false;
  exporting = false;
  private linked: LinkedDoctor[] = [];
  /** By id. Null while loading. */
  private agreements: Map<string, ClinicAgreement> | null = null;
  private deletionRequests: PatientDeletionRequest[] = [];
  private invites: ClinicInvite[] = [];
  private readonly ranges = new BehaviorSubject<DateRange>(getDashboardRangeDates(this.selectedRange, this.rangeOffset));

  constructor(
    private clinicService: ClinicService,
    private clinicContext: ClinicContextService,
    private records: ClinicRecordsService,
    private currencyService: CurrencyService,
    private authService: FirebaseAuthenticationService,
    private translate: TranslateService,
    private notificationService: NotificationService,
    private injector: Injector,
  ) {
    super();
  }

  ngOnInit(): void {
    // The Clinic pages are the admin's own, so opening one leaves the doctor's account he was in.
    this.clinicContext.clear();
    const adminId = this.authService.currentUserValue.id;
    const doctors$ = this.clinicService.clinicDoctors$().pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.subs.sink = doctors$.subscribe((doctors) => {
      this.doctors = doctors;
      if (!doctors.some((doctor) => doctor.doctorId === this.selectedDoctorId)) {
        this.selectedDoctorId = null;
      }
    });
    const doctorIds$ = doctors$.pipe(
      map((doctors) => doctors.map((doctor) => doctor.doctorId)),
      distinctUntilChanged(sameIds),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    // switchMap drops a slow answer for doctors or a range the admin has since changed.
    this.subs.sink = combineLatest([doctors$.pipe(distinctUntilChanged(sameDoctors)), this.ranges])
      .pipe(
        tap(() => {
          this.figures = null;
          this.totalsFailed = false;
        }),
        switchMap(([doctors, range]) => from(this.loadFigures(doctors, range))),
      )
      .subscribe((figures) => {
        this.figures = figures;
        this.totalsFailed = !figures;
      });
    this.subs.sink = doctorIds$
      .pipe(
        tap(() => {
          this.outstanding = null;
          this.outstandingFailed = false;
        }),
        switchMap((doctorIds) => from(this.loadOutstanding(doctorIds))),
      )
      .subscribe((outstanding) => {
        this.outstanding = outstanding;
        this.outstandingFailed = !outstanding;
      });
    this.subs.sink = doctorIds$
      .pipe(
        tap(() => {
          this.schedule = null;
          this.scheduleFailed = false;
        }),
        switchMap((doctorIds) => from(this.loadSchedule(doctorIds))),
      )
      .subscribe((schedule) => {
        this.schedule = schedule;
        this.scheduleFailed = !schedule;
      });

    this.subs.sink = this.clinicService.linkedDoctors$(adminId).subscribe((linked) => (this.linked = linked));
    this.subs.sink = doctorIds$
      .pipe(
        map((doctorIds) => doctorIds.filter((doctorId) => doctorId !== adminId)),
        switchMap((linkedIds) => this.clinicService.clinicDeletionRequests$(adminId, linkedIds)),
      )
      .subscribe((requests) => (this.deletionRequests = requests));
    this.subs.sink = this.clinicService.adminInvites$(adminId).subscribe((invites) => (this.invites = invites));
    this.subs.sink = this.clinicService.adminAgreements$(adminId).subscribe((agreements) => {
      this.agreements = new Map(agreements.map((agreement) => [agreement.id, agreement]));
    });
  }

  get dateLocale(): string {
    return getAppDateLocale(this.translate.currentLang);
  }

  setRange(preset: DashboardRangePreset): void {
    if (this.selectedRange === preset) {
      return;
    }
    this.selectedRange = preset;
    this.rangeOffset = 0;
    this.emitRange();
  }

  prevRange(): void {
    this.rangeOffset -= 1;
    this.emitRange();
  }

  nextRange(): void {
    if (!this.canGoNext) {
      return;
    }
    this.rangeOffset += 1;
    this.emitRange();
  }

  resetToCurrentRange(): void {
    if (this.rangeOffset === 0) {
      return;
    }
    this.rangeOffset = 0;
    this.emitRange();
  }

  get isCurrentRange(): boolean {
    return this.rangeOffset === 0;
  }

  get canGoNext(): boolean {
    return this.rangeOffset < 0;
  }

  get currentRangeButtonLabel(): string {
    return CURRENT_RANGE_LABELS[this.selectedRange];
  }

  get selectedRangeLabel(): string {
    const { start, end } = this.ranges.value;
    return formatDashboardRangeLabel(this.selectedRange, start, end, this.dateLocale);
  }

  selectDoctor(doctorId: string | null): void {
    this.selectedDoctorId = doctorId;
  }

  get selectedDoctorLabel(): string {
    const doctor = this.doctors.find((candidate) => candidate.doctorId === this.selectedDoctorId);
    return doctor ? this.doctorLabel(doctor) : this.translate.instant('CLINIC.DASHBOARD.ALL_DOCTORS');
  }

  get shownDoctors(): ClinicDoctor[] {
    return this.selectedDoctorId
      ? this.doctors.filter((doctor) => doctor.doctorId === this.selectedDoctorId)
      : this.doctors;
  }

  doctorLabel(doctor: ClinicDoctor): string {
    return doctor.isSelf ? this.translate.instant('CLINIC.SELF_NAME', { name: doctor.name }) : doctor.name;
  }

  totalsOf(doctor: ClinicDoctor): DoctorRangeTotals | null {
    return this.figures?.get(doctor.doctorId)?.totals ?? null;
  }

  outstandingOf(doctor: ClinicDoctor): number | null {
    return this.outstanding?.get(doctor.doctorId) ?? null;
  }

  /** From the doctor's agreement in force. Null for the admin himself. */
  commissionPercent(doctor: ClinicDoctor): number | null {
    const agreement = doctor.currentAgreementId ? this.agreements?.get(doctor.currentAgreementId) : undefined;
    return agreement ? agreement.terms.commissionPercent : null;
  }

  commissionOf(doctor: ClinicDoctor): number | null {
    const percent = this.commissionPercent(doctor);
    const figures = this.figures?.get(doctor.doctorId);
    return percent === null || !figures ? null : (figures.commissionBase * percent) / 100;
  }

  /** The shown doctors' figures added up. */
  get shownTotals(): DoctorRangeTotals | null {
    if (!this.figures) {
      return null;
    }
    const sum: DoctorRangeTotals = { appointments: 0, treatments: 0, newPatients: 0, collected: 0 };
    for (const doctor of this.shownDoctors) {
      const totals = this.totalsOf(doctor);
      if (totals) {
        sum.appointments += totals.appointments;
        sum.treatments += totals.treatments;
        sum.newPatients += totals.newPatients;
        sum.collected += totals.collected;
      }
    }
    return sum;
  }

  get shownCommission(): number | null {
    if (!this.figures || !this.agreements) {
      return null;
    }
    return this.shownDoctors.reduce((sum, doctor) => sum + (this.commissionOf(doctor) ?? 0), 0);
  }

  get shownOutstanding(): number | null {
    if (!this.outstanding) {
      return null;
    }
    return this.shownDoctors.reduce((sum, doctor) => sum + (this.outstandingOf(doctor) ?? 0), 0);
  }

  get cards(): StatCard[] {
    const totals = this.shownTotals;
    return [
      { label: 'DASHBOARD.APPOINTMENTS', icon: 'face', color: 'bg-purple', value: totals?.appointments ?? null, money: false },
      { label: 'DASHBOARD.TREATMENTS', icon: 'content_cut', color: 'bg-orange', value: totals?.treatments ?? null, money: false },
      { label: 'DASHBOARD.NEW_PATIENTS', icon: 'person_add', color: 'bg-green', value: totals?.newPatients ?? null, money: false },
      { label: 'DASHBOARD.EARNING', icon: 'local_activity', color: 'bg-blue', value: totals?.collected ?? null, money: true },
      {
        label: 'CLINIC.DASHBOARD.COMMISSION',
        icon: 'pie_chart',
        color: 'bg-teal',
        value: this.shownCommission,
        money: true,
        hint: 'CLINIC.DASHBOARD.COMMISSION_HINT',
      },
      {
        label: 'CLINIC.DASHBOARD.OUTSTANDING',
        icon: 'account_balance_wallet',
        color: 'bg-red',
        value: this.shownOutstanding,
        money: true,
        hint: 'CLINIC.DASHBOARD.OUTSTANDING_HINT',
      },
    ];
  }

  get shownSchedule(): ScheduleRow[] {
    const schedule = this.schedule ?? [];
    return this.selectedDoctorId ? schedule.filter((row) => row.doctorId === this.selectedDoctorId) : schedule;
  }

  /** Doctors who picked a currency other than the one this page shows amounts in. */
  get otherCurrencyDoctors(): string {
    const code = this.currencyService.code;
    return this.doctors
      .filter((doctor) => isSupportedCurrency(doctor.currency) && doctor.currency !== code)
      .map((doctor) => doctor.name)
      .join(', ');
  }

  get currencyCode(): string {
    return this.currencyService.code;
  }

  /** Every figure By doctor shows has loaded. */
  get canExport(): boolean {
    return !!this.figures && !!this.outstanding && !!this.agreements;
  }

  exportExcel(): void {
    const report = this.report();
    if (!report) {
      return;
    }
    const t = (key: string): string => this.translate.instant(key);
    const lines = report.total ? [...report.lines, report.total] : report.lines;
    downloadXlsx(
      `${report.fileName}.xlsx`,
      [
        [
          t('CLINIC.DASHBOARD.DOCTOR'),
          t('DASHBOARD.APPOINTMENTS'),
          t('DASHBOARD.TREATMENTS'),
          t('DASHBOARD.NEW_PATIENTS'),
          t('DASHBOARD.EARNING'),
          t('CLINIC.REPORT.COMMISSION_BASE'),
          t('CLINIC.REPORT.RATE'),
          t('CLINIC.DASHBOARD.COMMISSION'),
          t('CLINIC.DASHBOARD.OUTSTANDING'),
          t('CLINIC.REPORT.CURRENCY'),
        ],
        ...lines.map((line) => {
          const amount = (value: number | null) => (value === null ? null : roundCurrencyAmount(value, line.currency));
          return [
            line.label,
            line.appointments,
            line.treatments,
            line.newPatients,
            amount(line.collected),
            amount(line.commissionBase),
            line.commissionPercent === null ? null : line.commissionPercent / 100,
            amount(line.commission),
            amount(line.outstanding),
            line.currency,
          ];
        }),
      ],
      {
        name: t('CLINIC.REPORT.TITLE'),
        widths: [28, 14, 12, 14, 14, 24, 10, 18, 20, 10],
        boldRows: report.total ? [0, lines.length] : [0],
        percentColumns: [6],
        rightToLeft: this.translate.currentLang === 'ar',
      },
    );
  }

  async exportPdf(): Promise<void> {
    const report = this.report();
    if (!report) {
      return;
    }
    this.exporting = true;
    try {
      // pdfmake is large, so the Clinic pages load it only when a PDF is made.
      const { PdfService } = await import('@core/service/pdf.service');
      await this.injector.get(PdfService).downloadClinicReportPdf(report);
    } catch (err) {
      console.error('Failed to create the clinic report PDF', err);
      this.notificationService.showSwalOkDialog(
        this.translate.instant('CLINIC.REPORT.PDF_FAILED'),
        'error',
        'center',
        this.translate.instant('COMMON.OK'),
      );
    } finally {
      this.exporting = false;
    }
  }

  /** Each item is handled on Clinic > Doctors. */
  get attentionItems(): AttentionItem[] {
    const items: AttentionItem[] = [];
    for (const request of this.deletionRequests) {
      items.push({
        icon: 'delete_outline',
        key: 'CLINIC.DASHBOARD.ATTENTION.DELETION',
        params: {
          doctor: this.linkedName(request.doctorId),
          patient: request.patientName || this.translate.instant('CLINIC.DELETION.UNNAMED_PATIENT'),
        },
      });
    }
    for (const doctor of this.linked) {
      if (doctor.unlinkEffectiveAt) {
        items.push({
          icon: 'schedule',
          key: doctor.unlinkRequestedBy === 'doctor'
            ? 'CLINIC.DASHBOARD.ATTENTION.LEAVING_BY_DOCTOR'
            : 'CLINIC.DASHBOARD.ATTENTION.LEAVING_BY_ADMIN',
          params: {
            doctor: doctor.name || doctor.email,
            date: formatDate(doctor.unlinkEffectiveAt, 'mediumDate', this.dateLocale),
          },
        });
      }
    }
    for (const doctor of this.linked) {
      const proposal = doctor.pendingAgreementId ? this.agreements?.get(doctor.pendingAgreementId) : undefined;
      if (proposal?.status === 'proposed') {
        items.push({ icon: 'edit_note', key: 'CLINIC.DASHBOARD.ATTENTION.PROPOSAL', params: { doctor: doctor.name || doctor.email } });
      }
    }
    const now = Date.now();
    // Invites come newest first. Only each doctor's newest one counts, and none once he joined.
    const seen = new Set(this.linked.map((doctor) => doctor.doctorId));
    for (const invite of this.invites) {
      if (seen.has(invite.doctorId)) {
        continue;
      }
      seen.add(invite.doctorId);
      if (inviteDisplayStatus(invite, now) === 'expired') {
        items.push({ icon: 'mail_outline', key: 'CLINIC.DASHBOARD.ATTENTION.INVITE_EXPIRED', params: { name: invite.doctorName || invite.email } });
      }
    }
    return items;
  }

  doctorName(doctorId: string): string {
    const doctor = this.doctors.find((candidate) => candidate.doctorId === doctorId);
    return doctor ? this.doctorLabel(doctor) : '';
  }

  patientName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim() || this.translate.instant('DASHBOARD.EARNINGS.PATIENT_FALLBACK');
  }

  async openPatient(patient: Patient): Promise<void> {
    this.opening = true;
    try {
      await this.clinicService.openPatient(patient);
    } finally {
      this.opening = false;
    }
  }

  private linkedName(doctorId: string): string {
    const doctor = this.linked.find((candidate) => candidate.doctorId === doctorId);
    return doctor ? doctor.name || doctor.email : '';
  }

  private emitRange(): void {
    this.ranges.next(getDashboardRangeDates(this.selectedRange, this.rangeOffset));
  }

  /**
   * What By doctor shows, for its exports. Null until all of it has loaded. Doctors go by their
   * names alone, since "(you)" means nothing outside the app and the PDFs' Arabic font has no brackets.
   */
  private report(): ClinicReport | null {
    const { figures, outstanding, agreements } = this;
    if (!figures || !outstanding || !agreements) {
      return null;
    }
    const lines: ClinicReportLine[] = [];
    for (const doctor of this.shownDoctors) {
      const doctorFigures = figures.get(doctor.doctorId);
      const balance = outstanding.get(doctor.doctorId);
      if (!doctorFigures || balance === undefined) {
        return null;
      }
      const percent = this.commissionPercent(doctor);
      lines.push({
        label: doctor.name,
        appointments: doctorFigures.totals.appointments,
        treatments: doctorFigures.totals.treatments,
        newPatients: doctorFigures.totals.newPatients,
        collected: doctorFigures.totals.collected,
        commissionBase: percent === null ? null : doctorFigures.commissionBase,
        commissionPercent: percent,
        commission: this.commissionOf(doctor),
        outstanding: balance,
        currency: isSupportedCurrency(doctor.currency) ? doctor.currency : this.currencyCode,
      });
    }
    if (!lines.length) {
      return null;
    }
    const sum = (pick: (line: ClinicReportLine) => number | null) =>
      lines.reduce((total, line) => total + (pick(line) ?? 0), 0);
    const { start, end } = this.ranges.value;
    const lastDay = new Date(end);
    lastDay.setDate(lastDay.getDate() - 1);
    const day = (date: Date) => formatDate(date, 'yyyy-MM-dd', 'en');
    return {
      firstDay: start,
      lastDay,
      doctors: this.selectedDoctorId ? lines[0].label : this.translate.instant('CLINIC.DASHBOARD.ALL_DOCTORS'),
      lines,
      total:
        lines.length > 1
          ? {
              label: this.translate.instant('CLINIC.DASHBOARD.TOTAL'),
              appointments: sum((line) => line.appointments),
              treatments: sum((line) => line.treatments),
              newPatients: sum((line) => line.newPatients),
              collected: sum((line) => line.collected),
              commissionBase: sum((line) => line.commissionBase),
              commissionPercent: null,
              commission: sum((line) => line.commission),
              outstanding: sum((line) => line.outstanding),
              currency: this.currencyCode,
            }
          : null,
      fileName:
        start.getTime() === lastDay.getTime()
          ? `clinic-report-${day(start)}`
          : `clinic-report-${day(start)}-to-${day(lastDay)}`,
    };
  }

  private async loadFigures(doctors: ClinicDoctor[], range: DateRange): Promise<Map<string, DoctorFigures> | null> {
    try {
      const figures = await Promise.all(doctors.map((doctor) => this.doctorFigures(doctor, range)));
      return new Map(doctors.map((doctor, index) => [doctor.doctorId, figures[index]]));
    } catch (err) {
      console.error('Failed to load the clinic totals', err);
      return null;
    }
  }

  /** Commission is due only on what a doctor collected as a member, so a doctor who joined during the range needs a second sum. */
  private async doctorFigures(doctor: ClinicDoctor, { start, end }: DateRange): Promise<DoctorFigures> {
    const linkedAt = doctor.linkedAt;
    // A record dated with the date picker holds only its day, at midnight, so the day he joined counts in full.
    const joinedAt = linkedAt && new Date(linkedAt.getFullYear(), linkedAt.getMonth(), linkedAt.getDate());
    const joinedDuringRange = !!joinedAt && joinedAt > start && joinedAt < end;
    const [totals, collectedSinceJoining] = await Promise.all([
      this.records.rangeTotals(doctor.doctorId, start, end),
      joinedDuringRange ? this.records.collected(doctor.doctorId, joinedAt, end) : Promise.resolve(0),
    ]);
    let commissionBase = totals.collected;
    if (joinedDuringRange) {
      commissionBase = collectedSinceJoining;
    } else if (joinedAt && joinedAt >= end) {
      commissionBase = 0;
    }
    return { totals, commissionBase };
  }

  private async loadOutstanding(doctorIds: string[]): Promise<Map<string, number> | null> {
    try {
      const balances = await Promise.all(doctorIds.map((doctorId) => this.records.outstanding(doctorId)));
      return new Map(doctorIds.map((doctorId, index) => [doctorId, balances[index]]));
    } catch (err) {
      console.error('Failed to load the outstanding balances', err);
      return null;
    }
  }

  private async loadSchedule(doctorIds: string[]): Promise<ScheduleRow[] | null> {
    const { start, end } = getDashboardRangeDates('today');
    try {
      const appointments = await this.records.clinicAppointments(doctorIds, start, end, new Map());
      return appointments
        .map(({ appointment, patient }) => ({
          id: appointment.id,
          doctorId: appointment.doctorId,
          start: appointmentStart(appointment),
          patient,
          attended: appointment.attended === true,
        }))
        .sort((a, b) => a.start.getTime() - b.start.getTime());
    } catch (err) {
      console.error('Failed to load today\'s appointments', err);
      return null;
    }
  }
}
