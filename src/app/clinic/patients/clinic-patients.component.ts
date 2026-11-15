import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, combineLatest, from } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, shareReplay, startWith, switchMap, tap } from 'rxjs/operators';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { ClinicService } from '@core/service/clinic.service';
import { ClinicContextService } from '@core/service/clinic-context.service';
import { ClinicRecordsService } from '@core/service/clinic-records.service';
import { ClinicDoctor } from '@core/models/clinic.model';
import { Patient } from '@core/models/patient.model';
import { getAppDateLocale } from '@core/util/app-locale.util';
import { matchesPatientSearch } from '@core/util/patient-search.util';

const sameIds = (a: string[], b: string[]) => a.join() === b.join();

/**
 * Finds a patient of any clinic doctor, with the All Patients search. The first search reads
 * every doctor's patients, as All Patients does for one doctor, and later ones reuse them.
 */
@Component({
  selector: 'app-clinic-patients',
  templateUrl: './clinic-patients.component.html',
  styleUrls: ['./clinic-patients.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, DatePipe, MatButtonModule, MatPaginatorModule, TranslateModule],
})
export class ClinicPatientsComponent extends UnsubscribeOnDestroyAdapter implements OnInit {
  doctors: ClinicDoctor[] = [];
  term = '';
  matches: Patient[] = [];
  searching = false;
  loadFailed = false;
  pageIndex = 0;
  pageSize = 10;
  opening = false;
  private readonly searches = new Subject<string>();
  private loaded: { doctorIds: string[]; patients: Promise<Patient[]> } | null = null;

  constructor(
    private clinicService: ClinicService,
    private clinicContext: ClinicContextService,
    private records: ClinicRecordsService,
    private translate: TranslateService,
  ) {
    super();
  }

  ngOnInit(): void {
    // The Clinic pages are the admin's own, so opening one leaves the doctor's account he was in.
    this.clinicContext.clear();
    const doctors$ = this.clinicService.clinicDoctors$().pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.subs.sink = doctors$.subscribe((doctors) => (this.doctors = doctors));
    const doctorIds$ = doctors$.pipe(
      map((doctors) => doctors.map((doctor) => doctor.doctorId)),
      distinctUntilChanged(sameIds),
    );
    const terms$ = this.searches.pipe(
      map((term) => term.trim()),
      debounceTime(300),
      distinctUntilChanged(),
      startWith(''),
    );
    // switchMap drops a slow answer for a search the admin has since changed.
    this.subs.sink = combineLatest([doctorIds$, terms$])
      .pipe(
        tap(([, term]) => {
          this.term = term;
          this.searching = !!term;
          this.loadFailed = false;
        }),
        switchMap(([doctorIds, term]) => from(this.search(doctorIds, term))),
      )
      .subscribe((matches) => {
        this.searching = false;
        this.loadFailed = !matches;
        this.matches = matches ?? [];
        this.pageIndex = 0;
      });
  }

  get dateLocale(): string {
    return getAppDateLocale(this.translate.currentLang);
  }

  get pageRows(): Patient[] {
    const start = this.pageIndex * this.pageSize;
    return this.matches.slice(start, start + this.pageSize);
  }

  onSearch(term: string): void {
    this.searches.next(term);
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  patientName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim() || this.translate.instant('DASHBOARD.EARNINGS.PATIENT_FALLBACK');
  }

  doctorName(doctorId: string): string {
    const doctor = this.doctors.find((candidate) => candidate.doctorId === doctorId);
    if (!doctor) {
      return '';
    }
    return doctor.isSelf ? this.translate.instant('CLINIC.SELF_NAME', { name: doctor.name }) : doctor.name;
  }

  /** Patients from before `createdAt` existed have none. */
  addedOn(patient: Patient): Date | null {
    return typeof patient.createdAt?.toDate === 'function' ? patient.createdAt.toDate() : null;
  }

  async openPatient(patient: Patient): Promise<void> {
    this.opening = true;
    try {
      await this.clinicService.openPatient(patient);
    } finally {
      this.opening = false;
    }
  }

  private async search(doctorIds: string[], term: string): Promise<Patient[] | null> {
    if (!term) {
      return [];
    }
    try {
      const patients = await this.patientsOf(doctorIds);
      return patients
        .filter((patient) => matchesPatientSearch(patient, term))
        .sort((a, b) => this.patientName(a).localeCompare(this.patientName(b)));
    } catch (err) {
      console.error('Failed to load the clinic patients', err);
      return null;
    }
  }

  /** Read once for the current doctors. After a failed read, the next search tries again. */
  private patientsOf(doctorIds: string[]): Promise<Patient[]> {
    if (!this.loaded || !sameIds(this.loaded.doctorIds, doctorIds)) {
      const patients = Promise.all(doctorIds.map((doctorId) => this.records.patients(doctorId))).then((lists) => lists.flat());
      this.loaded = { doctorIds, patients };
      patients.catch(() => {
        if (this.loaded?.patients === patients) {
          this.loaded = null;
        }
      });
    }
    return this.loaded.patients;
  }
}
