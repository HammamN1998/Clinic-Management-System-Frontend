import { Component, Injector, OnInit } from '@angular/core';
import { NgClass, formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, from } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { FirebaseAuthenticationService } from '@core';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { AppCurrencyPipe } from '@core/pipe/app-currency.pipe';
import { ClinicService } from '@core/service/clinic.service';
import { ClinicRecordsService } from '@core/service/clinic-records.service';
import { CurrencyService } from '@core/service/currency.service';
import { DoctorService } from '@core/service/doctor.service';
import { NotificationService } from '@core/service/notification.service';
import { ClinicReport, ClinicReportLine } from '@core/models/clinic-report.model';
import { AppointmentModel } from '@core/models/appointment.model';
import { PaymentModel } from '@core/models/payment.model';
import { TreatmentModel } from '@core/models/treatment.model';
import { ClinicAgreement, ClinicDoctor, ClinicInvite, LinkedDoctor, inviteDisplayStatus } from '@core/models/clinic.model';
import { amount } from '@core/util/balance-ledger.util';
import { roundCurrencyAmount } from '@core/util/currency.util';
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

/** What one doctor did in the range. */
interface DoctorFigures {
  appointments: number;
  treatments: number;
  /** Payments plus the appointment fees marked paid, as on the Earning card. */
  collected: number;
}

/** One line of By doctor. */
interface DoctorRow {
  doctorId: string;
  name: string;
  figures: DoctorFigures;
  /** Null, like the commission, for a doctor without an agreement, such as the admin himself. */
  commissionPercent: number | null;
  commission: number | null;
}

/** The doctors' figures added up: By doctor's last line, when there is more than one doctor. */
interface TotalRow {
  figures: DoctorFigures;
  commission: number;
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
  hint: string;
}

const CURRENT_RANGE_LABELS: Record<DashboardRangePreset, string> = {
  today: 'DASHBOARD.RANGE.CURRENT.TODAY',
  week: 'DASHBOARD.RANGE.CURRENT.WEEK',
  month: 'DASHBOARD.RANGE.CURRENT.MONTH',
  year: 'DASHBOARD.RANGE.CURRENT.YEAR',
};

const NO_FIGURES: DoctorFigures = { appointments: 0, treatments: 0, collected: 0 };

/**
 * The clinic at a glance: what needs the admin, what each doctor did in a range with his
 * share, and what the clinic's patients owe in all.
 */
@Component({
  selector: 'app-clinic-dashboard',
  templateUrl: './clinic-dashboard.component.html',
  styleUrls: ['./clinic-dashboard.component.scss'],
  standalone: true,
  imports: [AppCurrencyPipe, BreadcrumbComponent, NgClass, MatButtonModule, MatIconModule, RouterLink, TranslateModule],
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
  /** Null while loading or after a failed load. */
  rows: DoctorRow[] | null = null;
  /** Null with the rows. */
  total: TotalRow | null = null;
  /** All time. Null while loading or after a failed load. */
  outstanding: number | null = null;
  figuresFailed = false;
  outstandingFailed = false;
  exporting = false;
  private adminId = '';
  private doctors: ClinicDoctor[] = [];
  /** By doctor. Null while loading or after a failed load. */
  private figures: Map<string, DoctorFigures> | null = null;
  /** Null while loading. */
  private agreements: ClinicAgreement[] | null = null;
  private linked: LinkedDoctor[] = [];
  private invites: ClinicInvite[] = [];
  private readonly ranges = new BehaviorSubject<DateRange>(getDashboardRangeDates(this.selectedRange, this.rangeOffset));

  constructor(
    private clinicService: ClinicService,
    private records: ClinicRecordsService,
    private doctorService: DoctorService,
    private currencyService: CurrencyService,
    private authService: FirebaseAuthenticationService,
    private translate: TranslateService,
    private notificationService: NotificationService,
    private injector: Injector,
  ) {
    super();
  }

  ngOnInit(): void {
    this.adminId = this.authService.currentUserValue.id;
    this.subs.sink = this.clinicService.clinicDoctors$(this.adminId).subscribe((doctors) => {
      this.doctors = doctors;
      this.buildRows();
    });
    this.subs.sink = this.clinicService.adminAgreements$(this.adminId).subscribe((agreements) => {
      this.agreements = agreements;
      this.buildRows();
    });
    // switchMap drops a slow answer for a range the admin has since left.
    this.subs.sink = this.ranges
      .pipe(
        tap(() => {
          this.figures = null;
          this.figuresFailed = false;
          this.buildRows();
        }),
        switchMap((range) => from(this.loadFigures(range))),
      )
      .subscribe((figures) => {
        this.figures = figures;
        this.figuresFailed = !figures;
        this.buildRows();
      });
    this.records
      .outstanding(this.adminId)
      .then((outstanding) => (this.outstanding = outstanding))
      .catch((err) => {
        console.error('Failed to load the outstanding balance', err);
        this.outstandingFailed = true;
      });
    this.subs.sink = this.clinicService.linkedDoctors$(this.adminId).subscribe((linked) => (this.linked = linked));
    this.subs.sink = this.clinicService.adminInvites$(this.adminId).subscribe((invites) => (this.invites = invites));
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

  doctorLabel(row: DoctorRow): string {
    return row.doctorId === this.adminId ? this.translate.instant('CLINIC.SELF_NAME', { name: row.name }) : row.name;
  }

  get cards(): StatCard[] {
    return [
      {
        label: 'CLINIC.DASHBOARD.COLLECTED',
        icon: 'local_activity',
        color: 'bg-blue',
        value: this.total?.figures.collected ?? null,
        hint: 'CLINIC.DASHBOARD.COLLECTED_HINT',
      },
      {
        label: 'CLINIC.DASHBOARD.COMMISSION',
        icon: 'pie_chart',
        color: 'bg-teal',
        value: this.total?.commission ?? null,
        hint: 'CLINIC.DASHBOARD.COMMISSION_HINT',
      },
      {
        label: 'CLINIC.DASHBOARD.OUTSTANDING',
        icon: 'account_balance_wallet',
        color: 'bg-red',
        value: this.outstanding,
        hint: 'CLINIC.DASHBOARD.OUTSTANDING_HINT',
      },
    ];
  }

  /** Every figure the exports show has loaded. */
  get canExport(): boolean {
    return !!this.rows?.length && this.outstanding !== null;
  }

  exportExcel(): void {
    const report = this.report();
    if (!report) {
      return;
    }
    const t = (key: string): string => this.translate.instant(key);
    const lines = report.total ? [...report.lines, report.total] : report.lines;
    const money = (value: number | null) => (value === null ? null : roundCurrencyAmount(value, report.currency));
    downloadXlsx(
      `${report.fileName}.xlsx`,
      [
        [
          t('CLINIC.DASHBOARD.DOCTOR'),
          t('DASHBOARD.APPOINTMENTS'),
          t('DASHBOARD.TREATMENTS'),
          t('CLINIC.DASHBOARD.COLLECTED'),
          t('CLINIC.REPORT.RATE'),
          t('CLINIC.DASHBOARD.COMMISSION'),
        ],
        ...lines.map((line) => [
          line.label,
          line.appointments,
          line.treatments,
          money(line.collected),
          line.commissionPercent === null ? null : line.commissionPercent / 100,
          money(line.commission),
        ]),
        [],
        [t('CLINIC.DASHBOARD.OUTSTANDING'), money(report.outstanding)],
        [t('CLINIC.REPORT.CURRENCY'), report.currency],
      ],
      {
        name: t('CLINIC.REPORT.TITLE'),
        widths: [28, 14, 12, 14, 10, 18],
        boldRows: report.total ? [0, lines.length] : [0],
        percentColumns: [4],
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
    for (const doctor of this.linked) {
      const proposal = doctor.pendingAgreementId
        ? this.agreements?.find((agreement) => agreement.id === doctor.pendingAgreementId)
        : undefined;
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

  private emitRange(): void {
    this.ranges.next(getDashboardRangeDates(this.selectedRange, this.rangeOffset));
  }

  /** Records that name no doctor are the admin's, since the clinic account is his. */
  private async loadFigures({ start, end }: DateRange): Promise<Map<string, DoctorFigures> | null> {
    try {
      const [appointments, treatments, payments] = await Promise.all([
        this.doctorService.getAppointmentsByRange(start, end),
        this.doctorService.getTreatmentsByRange(start, end),
        this.doctorService.getPaymentsByRange(start, end),
      ]);
      const figures = new Map<string, DoctorFigures>();
      const figuresOf = (providerId: string | undefined): DoctorFigures => {
        const doctorId = providerId || this.adminId;
        let doctorFigures = figures.get(doctorId);
        if (!doctorFigures) {
          doctorFigures = { ...NO_FIGURES };
          figures.set(doctorId, doctorFigures);
        }
        return doctorFigures;
      };
      for (const doc of appointments.docs) {
        const appointment = doc.data() as AppointmentModel;
        const doctorFigures = figuresOf(appointment.providerId);
        doctorFigures.appointments += 1;
        if (appointment.costPaid) {
          doctorFigures.collected += amount(appointment.cost);
        }
      }
      for (const doc of treatments.docs) {
        figuresOf((doc.data() as TreatmentModel).providerId).treatments += 1;
      }
      for (const doc of payments.docs) {
        const payment = doc.data() as PaymentModel;
        figuresOf(payment.providerId).collected += amount(payment.amount);
      }
      return figures;
    } catch (err) {
      console.error('Failed to load the clinic figures', err);
      return null;
    }
  }

  /** Current doctors always; a former doctor only when he did work in the range. */
  private buildRows(): void {
    const { figures, agreements } = this;
    if (!figures || !agreements) {
      this.rows = null;
      this.total = null;
      return;
    }
    const listed = this.doctors.filter((doctor) => (doctor.active && !doctor.secretary) || figures.has(doctor.doctorId));
    const unlisted = [...figures.keys()].filter((doctorId) => !this.doctors.some((doctor) => doctor.doctorId === doctorId));
    const rows: DoctorRow[] = [
      ...listed.map((doctor) => ({ doctorId: doctor.doctorId, name: doctor.name })),
      ...unlisted.map((doctorId) => ({ doctorId, name: this.translate.instant('CLINIC.HISTORY.UNKNOWN') })),
    ].map(({ doctorId, name }) => {
      const doctorFigures = figures.get(doctorId) ?? NO_FIGURES;
      const percent = this.commissionPercent(doctorId, agreements);
      return {
        doctorId,
        name,
        figures: doctorFigures,
        commissionPercent: percent,
        commission: percent === null ? null : (doctorFigures.collected * percent) / 100,
      };
    });
    this.rows = rows;
    this.total = {
      figures: {
        appointments: rows.reduce((sum, row) => sum + row.figures.appointments, 0),
        treatments: rows.reduce((sum, row) => sum + row.figures.treatments, 0),
        collected: rows.reduce((sum, row) => sum + row.figures.collected, 0),
      },
      commission: rows.reduce((sum, row) => sum + (row.commission ?? 0), 0),
    };
  }

  /** From the doctor's last accepted agreement: the one in force, or his last one if he left. Null for the admin. */
  private commissionPercent(doctorId: string, agreements: ClinicAgreement[]): number | null {
    let last: ClinicAgreement | null = null;
    for (const agreement of agreements) {
      if (agreement.doctorId !== doctorId || !agreement.acceptedAt) {
        continue;
      }
      if (!last?.acceptedAt || agreement.acceptedAt > last.acceptedAt) {
        last = agreement;
      }
    }
    return last ? last.terms.commissionPercent : null;
  }

  /** Doctors go by their names alone, since "(you)" means nothing outside the app and the PDFs' Arabic font has no brackets. */
  private report(): ClinicReport | null {
    const { rows, total, outstanding } = this;
    if (!rows?.length || outstanding === null) {
      return null;
    }
    const { start, end } = this.ranges.value;
    const lastDay = new Date(end);
    lastDay.setDate(lastDay.getDate() - 1);
    const day = (date: Date) => formatDate(date, 'yyyy-MM-dd', 'en');
    const line = (label: string, figures: DoctorFigures, commissionPercent: number | null, commission: number | null): ClinicReportLine => ({
      label,
      appointments: figures.appointments,
      treatments: figures.treatments,
      collected: figures.collected,
      commissionPercent,
      commission,
    });
    return {
      firstDay: start,
      lastDay,
      lines: rows.map((row) => line(row.name, row.figures, row.commissionPercent, row.commission)),
      total:
        total && rows.length > 1
          ? line(this.translate.instant('CLINIC.DASHBOARD.TOTAL'), total.figures, null, total.commission)
          : null,
      outstanding,
      currency: this.currencyService.code,
      fileName:
        start.getTime() === lastDay.getTime()
          ? `clinic-report-${day(start)}`
          : `clinic-report-${day(start)}-to-${day(lastDay)}`,
    };
  }
}
