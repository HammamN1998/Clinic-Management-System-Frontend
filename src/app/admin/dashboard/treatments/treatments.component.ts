import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {BreadcrumbComponent} from '@shared/components/breadcrumb/breadcrumb.component';
import {DoctorService} from '@core/service/doctor.service';
import {PatientService} from '@core/service/patient.service';
import {TreatmentModel} from '@core/models/treatment.model';
import {Patient} from '@core/models/patient.model';
import {from} from 'rxjs';

type RangePreset = 'today' | 'week' | 'month' | 'year';
interface RangeOption {
  id: RangePreset;
  label: string;
}
interface TreatmentRow {
  id: string;
  patientId: string;
  patientName: string;
  date: Date;
  price: number;
  discount: number;
  details: string;
}

@Component({
  selector: 'app-treatments',
  templateUrl: './treatments.component.html',
  styleUrls: ['./treatments.component.scss'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, BreadcrumbComponent],
})
export class TreatmentsComponent implements OnInit {
  rangeOptions: RangeOption[] = [
    {id: 'today', label: 'Today'},
    {id: 'week', label: 'Week'},
    {id: 'month', label: 'Month'},
    {id: 'year', label: 'Year'},
  ];
  selectedRange: RangePreset = 'month';
  treatments: TreatmentRow[] = [];
  isLoading = false;
  private patientCache = new Map<string, Patient>();

  constructor(
    private doctorService: DoctorService,
    private patientService: PatientService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTreatments();
  }

  setRange(preset: RangePreset) {
    if (this.selectedRange === preset) {
      return;
    }
    this.selectedRange = preset;
    this.loadTreatments();
  }

  openPatient(row: TreatmentRow) {
    const cachedPatient = this.patientCache.get(row.patientId);
    if (cachedPatient) {
      this.patientService.dialogData = cachedPatient;
      this.router.navigate(['/admin/patients/patient-profile']);
      return;
    }
    from(this.patientService.getPatientInfo(row.patientId)).subscribe({
      next: (snapshot) => {
        const data = snapshot.data() as Patient | undefined;
        if (!data) {
          return;
        }
        const patient: Patient = {...data, id: snapshot.id};
        this.patientCache.set(row.patientId, patient);
        this.patientService.dialogData = patient;
        this.router.navigate(['/admin/patients/patient-profile']);
      },
      error: (error) => {
        console.log('error: ' + error);
      }
    });
  }

  private loadTreatments() {
    const {start, end} = this.getRangeDates(this.selectedRange);
    this.isLoading = true;
    this.treatments = [];
    from(this.doctorService.getTreatmentsByRange(start, end)).subscribe({
      next: (treatments) => {
        this.treatments = treatments.docs.map((doc) => {
          const data = doc.data() as TreatmentModel;
          const treatmentId = data.id ? data.id : doc.id;
          return {
            id: treatmentId,
            patientId: data.patientId,
            patientName: data.patientId ? 'Loading...' : 'Unknown',
            date: data.date.toDate(),
            price: data.price,
            discount: data.discount,
            details: data.details,
          };
        });
        this.prefetchPatients(this.treatments);
        this.isLoading = false;
      },
      error: (error) => {
        console.log('error: ' + error);
        this.isLoading = false;
      }
    });
  }

  private prefetchPatients(rows: TreatmentRow[]) {
    const uniqueIds = new Set(rows.map((row) => row.patientId).filter(Boolean));
    uniqueIds.forEach((patientId) => this.loadPatient(patientId));
  }

  private loadPatient(patientId: string) {
    if (this.patientCache.has(patientId)) {
      this.applyPatientToRows(patientId, this.patientCache.get(patientId)!);
      return;
    }
    from(this.patientService.getPatientInfo(patientId)).subscribe({
      next: (snapshot) => {
        const data = snapshot.data() as Patient | undefined;
        if (!data) {
          this.applyPatientName(patientId, 'Unknown');
          return;
        }
        const patient: Patient = {...data, id: snapshot.id};
        this.patientCache.set(patientId, patient);
        this.applyPatientToRows(patientId, patient);
      },
      error: (error) => {
        console.log('error: ' + error);
        this.applyPatientName(patientId, 'Unknown');
      }
    });
  }

  private applyPatientToRows(patientId: string, patient: Patient) {
    const patientName = this.getPatientName(patient);
    this.applyPatientName(patientId, patientName);
  }

  private applyPatientName(patientId: string, name: string) {
    this.treatments = this.treatments.map((row) =>
      row.patientId === patientId ? {...row, patientName: name} : row
    );
  }

  private getPatientName(patient: Patient): string {
    const name = `${patient.firstName} ${patient.lastName}`.trim();
    return name.length ? name : 'Patient';
  }

  private getRangeDates(preset: RangePreset): {start: Date; end: Date} {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (preset === 'today') {
      const end = new Date(startOfToday);
      end.setDate(end.getDate() + 1);
      return {start: startOfToday, end};
    }
    if (preset === 'week') {
      const day = startOfToday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(startOfToday);
      start.setDate(start.getDate() + diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return {start, end};
    }
    if (preset === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      return {start, end};
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {start, end};
  }
}
