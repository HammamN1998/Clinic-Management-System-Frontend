import { Component, Inject, OnInit } from '@angular/core';
import { DatePipe, NgClass, formatDate } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ClinicService, HistoryPage } from '@core/service/clinic.service';
import { NotificationService } from '@core/service/notification.service';
import { getAppDateLocale } from '@core/util/app-locale.util';
import { HistoryAction, HistoryEntry } from '@core/models/clinic.model';

export interface RecordHistoryDialogData {
  title: string;
  hint: string;
  /** The clinic account: its admin's id. */
  accountId: string;
  /** Everyone in the clinic, with the names the entries show. Anyone else shows as `otherName`. */
  doctors: { id: string; name: string }[];
  otherName: string;
}

interface FieldRow {
  label: string;
  value: string;
}

interface ChangeRow {
  label: string;
  before: string;
  after: string;
}

interface HistoryRow {
  entry: HistoryEntry;
  actionKey: string;
  collectionKey: string;
  badge: string;
  actor: string;
  changedSummary: string;
  fields: FieldRow[];
  changes: ChangeRow[];
  restorable: boolean;
  restored: boolean;
  open: boolean;
}

const PAGE_SIZE = 25;
const TEXT_MAX_LENGTH = 300;

const ACTION_BADGES: Record<HistoryAction, string> = {
  create: 'badge-solid-green',
  update: 'badge-solid-blue',
  delete: 'badge-solid-red',
};

/** Shown in this order; any other field follows, by name. */
const FIELD_ORDER = [
  'firstName', 'lastName', 'phoneNumber', 'email', 'gender', 'birthDate', 'maritalState', 'address',
  'bloodGroup', 'bloodPressure', 'weight', 'condition', 'notes', 'img', 'attachments', 'createdAt',
  'providerId', 'date', 'time', 'durationMinutes', 'amount', 'price', 'discount', 'cost', 'costPaid', 'attended',
  'details', 'subjective', 'objective', 'assessment', 'plan', 'prescriptions', 'id', 'doctorId', 'patientId',
];

/** Fields the entry already shows, or that mean nothing to a reader. */
const HIDDEN_RECORD_FIELDS = ['id', 'doctorId', 'patientId', 'lastModifiedBy', 'imgSize'];
const HIDDEN_CHANGES = ['lastModifiedBy', 'imgSize'];

const DATE_FORMATS: Record<string, string> = { time: 'shortTime', createdAt: 'medium' };

function isTimestamp(value: unknown): value is { toDate(): Date } {
  return typeof (value as { toDate?: unknown }).toDate === 'function';
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function shorten(text: string): string {
  const chars = Array.from(text);
  return chars.length > TEXT_MAX_LENGTH ? `${chars.slice(0, TEXT_MAX_LENGTH).join('')}…` : text;
}

function fieldRank(field: string): number {
  const rank = FIELD_ORDER.indexOf(field);
  return rank === -1 ? FIELD_ORDER.length : rank;
}

function byFieldOrder([a]: [string, unknown], [b]: [string, unknown]): number {
  return fieldRank(a) - fieldRank(b) || a.localeCompare(b);
}

/**
 * The clinic account's history, newest first, for its admin: everyone's changes, or one
 * doctor's. Restores deleted appointments, treatments, and payments.
 */
@Component({
  selector: 'app-record-history-dialog',
  templateUrl: './record-history-dialog.component.html',
  styleUrls: ['./record-history-dialog.component.scss'],
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    TranslateModule,
  ],
})
export class RecordHistoryDialogComponent implements OnInit {
  rows: HistoryRow[] = [];
  loading = false;
  failed = false;
  hasMore = false;
  restoringId: string | null = null;
  /** Shows only this doctor's changes. Null shows everyone's. */
  actorId: string | null = null;
  private last: HistoryPage['last'] = null;
  private readonly names: Map<string, string>;

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: RecordHistoryDialogData,
    private clinicService: ClinicService,
    private notificationService: NotificationService,
    private translate: TranslateService,
  ) {
    this.names = new Map(data.doctors.map((doctor) => [doctor.id, doctor.name]));
  }

  ngOnInit(): void {
    void this.loadMore();
  }

  get dateLocale(): string {
    return getAppDateLocale(this.translate.currentLang);
  }

  /** The filter is disabled while a page loads, so a page always matches the filter it was read for. */
  filterBy(actorId: string | null): void {
    this.actorId = actorId;
    this.rows = [];
    this.last = null;
    this.hasMore = false;
    void this.loadMore();
  }

  async loadMore(): Promise<void> {
    this.loading = true;
    this.failed = false;
    try {
      const page = await this.clinicService.historyPage(this.data.accountId, this.actorId, PAGE_SIZE, this.last);
      this.rows = [...this.rows, ...page.entries.map((entry) => this.toRow(entry))];
      this.last = page.last ?? this.last;
      this.hasMore = page.entries.length === PAGE_SIZE;
    } catch (err) {
      console.error('Failed to read the record history', err);
      this.failed = true;
    } finally {
      this.loading = false;
    }
  }

  async restore(row: HistoryRow): Promise<void> {
    this.restoringId = row.entry.id;
    try {
      await this.clinicService.restoreRecord(row.entry.id);
      row.restored = true;
      this.notificationService.showSnackBarNotification(
        'snackbar-success',
        this.translate.instant('CLINIC.HISTORY.MESSAGES.RESTORED'),
        'bottom',
        'center',
      );
    } catch (err) {
      this.notificationService.showSwalOkDialog(
        this.clinicService.errorMessage(err),
        'error',
        'center',
        this.translate.instant('COMMON.OK'),
      );
    } finally {
      this.restoringId = null;
    }
  }

  private toRow(entry: HistoryEntry): HistoryRow {
    const changes = Object.entries(entry.changed ?? {})
      .filter(([field]) => !HIDDEN_CHANGES.includes(field))
      .sort(byFieldOrder)
      .map(([field, change]) => ({
        label: this.fieldLabel(field),
        before: this.formatValue(field, change?.before),
        after: this.formatValue(field, change?.after),
      }));
    const changedLabels = changes.map((change) => change.label);
    if (entry.dentalChartChanged) {
      changedLabels.push(this.translate.instant('CLINIC.HISTORY.DENTAL_CHART'));
    }
    return {
      entry,
      actionKey: `CLINIC.HISTORY.ACTIONS.${entry.action.toUpperCase()}`,
      collectionKey: `CLINIC.HISTORY.COLLECTIONS.${entry.collection.toUpperCase()}`,
      badge: ACTION_BADGES[entry.action] ?? 'badge-solid-brown',
      actor: this.nameOf(entry.actorId),
      changedSummary: changedLabels.join(', '),
      fields: Object.entries(entry.data ?? {})
        .filter(([field, value]) => !HIDDEN_RECORD_FIELDS.includes(field) && !isEmpty(value))
        .sort(byFieldOrder)
        .map(([field, value]) => ({ label: this.fieldLabel(field), value: this.formatValue(field, value) })),
      changes,
      restorable: entry.action === 'delete' && entry.collection !== 'patients' && !entry.tooLarge && !!entry.data,
      restored: false,
      open: false,
    };
  }

  private nameOf(uid: string | null): string {
    return (uid && this.names.get(uid)) || this.data.otherName;
  }

  private fieldLabel(field: string): string {
    const key = `CLINIC.HISTORY.FIELDS.${field.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}`;
    const label = this.translate.instant(key);
    return label === key ? field : label;
  }

  private formatValue(field: string, value: unknown): string {
    if (isEmpty(value)) {
      return '—';
    }
    if (field === 'providerId' && typeof value === 'string') {
      return this.nameOf(value);
    }
    if (typeof value === 'boolean') {
      return this.translate.instant(value ? 'COMMON.YES' : 'COMMON.NO');
    }
    if (typeof value === 'object' && isTimestamp(value)) {
      return formatDate(value.toDate(), DATE_FORMATS[field] ?? 'mediumDate', this.dateLocale);
    }
    if (field === 'img') {
      return this.translate.instant('CLINIC.HISTORY.PHOTO');
    }
    if (Array.isArray(value)) {
      const names = value.map((item) => (item as { name?: unknown } | null)?.name);
      return names.every((name) => typeof name === 'string' && name !== '')
        ? shorten(names.join(', '))
        : this.translate.instant('CLINIC.HISTORY.ITEMS', { count: value.length });
    }
    return shorten(typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
}
