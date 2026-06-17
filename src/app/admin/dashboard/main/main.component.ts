import {ChangeDetectorRef, Component, DestroyRef, OnInit, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexPlotOptions,
  ApexResponsive,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule
} from 'ng-apexcharts';
import {FeatherIconsComponent} from '@shared/components/feather-icons/feather-icons.component';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import {BreadcrumbComponent} from '@shared/components/breadcrumb/breadcrumb.component';
import {OnboardingChecklistComponent} from '@shared/components/onboarding-checklist/onboarding-checklist.component';
import {from} from "rxjs";
import {DoctorService} from "@core/service/doctor.service";
import {AppointmentModel} from "@core/models/appointment.model";
import {TreatmentModel} from "@core/models/treatment.model";
import {Patient} from "@core/models/patient.model";
import {PaymentModel} from "@core/models/payment.model";
import {FirebaseAuthenticationService} from "../../../authentication/services/firebase-authentication.service";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {
  formatDashboardRangeLabel,
  getAppDateLocale,
} from '@core/util/dashboard-range-label.util';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  responsive: ApexResponsive[];
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  grid: ApexGrid;
  colors: string[];
};
interface chartCategoryData {
  category: string,
  data: number
}
type RangePreset = 'today' | 'week' | 'month' | 'year';
interface RangeOption {
  id: RangePreset;
  label: string;
}

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BreadcrumbComponent,
    OnboardingChecklistComponent,
    NgApexchartsModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    FeatherIconsComponent,
    TranslateModule,
  ],
})

export class MainComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  rangeOptions: RangeOption[] = [
    {id: 'today', label: 'DASHBOARD.RANGE.TODAY'},
    {id: 'week', label: 'DASHBOARD.RANGE.WEEK'},
    {id: 'month', label: 'DASHBOARD.RANGE.MONTH'},
    {id: 'year', label: 'DASHBOARD.RANGE.YEAR'},
  ];
  selectedRange: RangePreset = 'month';
  rangeOffset: number = 0;

  // Appointments chart properties
  public appointmentsChartOptions!: Partial<ChartOptions>;
  public appointmentsChartData: chartCategoryData[] = [];
  public numberOfAppointments: number = 0;

  // Treatments chart properties
  public treatmentsChartOptions!: Partial<ChartOptions>;
  public treatmentsChartData: chartCategoryData[] = [];
  public numberOfTreatments: number = 0;

  // newPatients chart properties
  public newPatientsChartOptions!: Partial<ChartOptions>;
  public newPatientsChartData: chartCategoryData[] = [];
  public numberOfNewPatients: number = 0;

  // earning chart properties
  public earningChartOptions!: Partial<ChartOptions>;
  public earningChartData: chartCategoryData[] = [];
  public numberOfEarning: number = 0;

  constructor(
    private doctorService: DoctorService,
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private translate: TranslateService,
  ) {

  }
  ngOnInit() {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.appointmentsChart();
        this.treatmentsChart();
        this.newPatientsChart();
        this.earningChart();
        this.cdr.markForCheck();
      });
    this.initializeCharts();
    this.loadDashboardData();
  }

  setRange(preset: RangePreset) {
    if (this.selectedRange === preset) {
      return;
    }
    this.selectedRange = preset;
    this.rangeOffset = 0;
    this.loadDashboardData();
  }

  prevRange() {
    this.rangeOffset -= 1;
    this.loadDashboardData();
  }

  nextRange() {
    if (!this.canGoNext) {
      return;
    }
    this.rangeOffset += 1;
    this.loadDashboardData();
  }

  get isCurrentRange(): boolean {
    return this.rangeOffset === 0;
  }

  get canGoNext(): boolean {
    return this.rangeOffset < 0;
  }

  get currentRangeButtonLabel(): string {
    const labels: Record<RangePreset, string> = {
      today: 'DASHBOARD.RANGE.CURRENT.TODAY',
      week: 'DASHBOARD.RANGE.CURRENT.WEEK',
      month: 'DASHBOARD.RANGE.CURRENT.MONTH',
      year: 'DASHBOARD.RANGE.CURRENT.YEAR',
    };
    return labels[this.selectedRange];
  }

  resetToCurrentRange() {
    if (this.rangeOffset === 0) {
      return;
    }
    this.rangeOffset = 0;
    this.loadDashboardData();
  }

  get selectedRangeLabel(): string {
    const {start, end} = this.getRangeDates(this.selectedRange, this.rangeOffset);
    return formatDashboardRangeLabel(
      this.selectedRange,
      start,
      end,
      getAppDateLocale(this.translate.currentLang),
    );
  }

  private loadDashboardData() {
    const {start, end} = this.getRangeDates(this.selectedRange, this.rangeOffset);
    this.resetDashboardData();
    setTimeout(() => {
      this.getAppointmentsData(start, end);
      this.getTreatmentsData(start, end);
      this.getNewPatientsData(start, end);
      this.getEarningData(start, end);
    }, 200);
  }

  private initializeCharts() {
    this.appointmentsChart();
    this.treatmentsChart();
    this.newPatientsChart();
    this.earningChart();
  }

  private resetDashboardData() {
    this.appointmentsChartData = [];
    this.treatmentsChartData = [];
    this.newPatientsChartData = [];
    this.earningChartData = [];
    this.numberOfAppointments = 0;
    this.numberOfTreatments = 0;
    this.numberOfNewPatients = 0;
    this.numberOfEarning = 0;
    this.initializeCharts();
  }

  private getRangeDates(preset: RangePreset, offset: number = 0): {start: Date; end: Date} {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (preset === 'today') {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() + offset);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return {start, end};
    }
    if (preset === 'week') {
      const day = startOfToday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(startOfToday);
      start.setDate(start.getDate() + diff + offset * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return {start, end};
    }
    if (preset === 'year') {
      const start = new Date(now.getFullYear() + offset, 0, 1);
      const end = new Date(now.getFullYear() + offset + 1, 0, 1);
      return {start, end};
    }
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
    return {start, end};
  }

  private appointmentsChart() {
    const dataArray: number[] = this.appointmentsChartData.map((chartData) => chartData.data);
    const categoryArray: string[] = this.appointmentsChartData.map((chartData) => chartData.category);

    this.appointmentsChartOptions = {
      series: [
        {
          name: this.translate.instant('DASHBOARD.APPOINTMENTS'),
          data: dataArray,
        },
      ],
      chart: {
        height: 70,
        type: 'area',
        toolbar: {
          show: false,
        },
        sparkline: {
          enabled: true,
        },
        foreColor: '#9aa0ac',
      },
      colors: ['#6F42C1'],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
      },
      xaxis: {
        categories: categoryArray,
      },
      legend: {
        show: false,
      },

      tooltip: {
        theme: 'dark',
        marker: {
          show: true,
        },
        x: {
          show: true,
        },
      },
    };
  }

  private treatmentsChart() {
    const dataArray: number[] = this.treatmentsChartData.map((chartData) => chartData.data);
    const categoryArray: string[] = this.treatmentsChartData.map((chartData) => chartData.category);

    this.treatmentsChartOptions = {
      series: [
        {
          name: this.translate.instant('DASHBOARD.OPERATIONS'),
          data: dataArray,
        },
      ],
      chart: {
        height: 70,
        type: 'area',
        toolbar: {
          show: false,
        },
        sparkline: {
          enabled: true,
        },
        foreColor: '#9aa0ac',
      },
      colors: ['#FD7E14'],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
      },
      xaxis: {
        categories: categoryArray,
      },
      legend: {
        show: false,
      },

      tooltip: {
        theme: 'dark',
        marker: {
          show: true,
        },
        x: {
          show: true,
        },
      },
    };
  }

  private newPatientsChart() {
    const dataArray: number[] = this.newPatientsChartData.map((chartData) => chartData.data);
    const categoryArray: string[] = this.newPatientsChartData.map((chartData) => chartData.category);

    this.newPatientsChartOptions = {
      series: [
        {
          name: this.translate.instant('DASHBOARD.NEW_PATIENTS'),
          data: dataArray,
        },
      ],
      chart: {
        height: 70,
        type: 'area',
        toolbar: {
          show: false,
        },
        sparkline: {
          enabled: true,
        },
        foreColor: '#9aa0ac',
      },
      colors: ['#4CAF50'],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
      },
      xaxis: {
        categories: categoryArray,
      },
      legend: {
        show: false,
      },

      tooltip: {
        theme: 'dark',
        marker: {
          show: true,
        },
        x: {
          show: true,
        },
      },
    };
  }

  private earningChart() {
    const dataArray: number[] = this.earningChartData.map((chartData) => chartData.data);
    const categoryArray: string[] = this.earningChartData.map((chartData) => chartData.category);

    this.earningChartOptions = {
      series: [
        {
          name: this.translate.instant('DASHBOARD.EARNING'),
          data: dataArray,
        },
      ],
      chart: {
        height: 70,
        type: 'area',
        toolbar: {
          show: false,
        },
        sparkline: {
          enabled: true,
        },
        foreColor: '#9aa0ac',
      },
      colors: ['#2196F3'],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
      },
      xaxis: {
        categories: categoryArray,
      },
      legend: {
        show: false,
      },

      tooltip: {
        theme: 'dark',
        marker: {
          show: true,
        },
        x: {
          show: true,
        },
      },
    };
  }

  private  getAppointmentsData(start: Date, end: Date) {
    from(this.doctorService.getAppointmentsByRange(start, end))
    .subscribe({
      next: (appointments) => {
        this.numberOfAppointments = appointments.docs.length;
        appointments.docs.forEach((appointment) => {
          const appointmentData = appointment.data() as AppointmentModel;
          const chartDataIndex = this.appointmentsChartData.findIndex((chartData) => chartData.category === (appointment.data() as AppointmentModel).date.toDate().toLocaleDateString() )
          // Fill appointments chart
          if (chartDataIndex === -1) {
            this.appointmentsChartData.push({
              category: appointmentData.date.toDate().toLocaleDateString(),
              data: 1,
            })
          } else {
            this.appointmentsChartData[chartDataIndex].data++;
          }
        });
        this.appointmentsChart();
      },
      error: (error) => {
        console.log('error: ' + error)
      }
    })
  }

  private getTreatmentsData(start: Date, end: Date) {
    from(this.doctorService.getTreatmentsByRange(start, end))
      .subscribe({
        next: (treatments) => {
          this.numberOfTreatments = treatments.docs.length;
          treatments.docs.forEach((treatment) => {
            const chartDataIndex = this.treatmentsChartData.findIndex((chartData) => chartData.category === (treatment.data() as TreatmentModel).date.toDate().toLocaleDateString() )
            if (chartDataIndex === -1) {
              this.treatmentsChartData.push({
                category: (treatment.data() as TreatmentModel).date.toDate().toLocaleDateString(),
                data: 1,
              })
            } else {
              this.treatmentsChartData[chartDataIndex].data++;
            }
          });
          this.treatmentsChart();
        },
        error: (error) => {
          console.log('error: ' + error)
        }
      })
  }

  private getNewPatientsData(start: Date, end: Date) {
    from(this.doctorService.getNewPatientsByRange(start, end))
      .subscribe({
        next: (patients) => {
          this.numberOfNewPatients = patients.docs.length;
          patients.docs.forEach((patient) => {
            const chartDataIndex = this.newPatientsChartData.findIndex((chartData) => chartData.category === (patient.data() as Patient).createdAt.toDate().toLocaleDateString() )
            if (chartDataIndex === -1) {
              this.newPatientsChartData.push({
                category: (patient.data() as Patient).createdAt.toDate().toLocaleDateString(),
                data: 1,
              })
            } else {
              this.newPatientsChartData[chartDataIndex].data++;
            }
          });
          this.newPatientsChart();
        },
        error: (error) => {
          console.log('error: ' + error)
        }
      })
  }

  private getEarningData(start: Date, end: Date) {
    // Get paid appointments
    from(this.doctorService.getAppointmentsByRange(start, end))
    .subscribe({
      next: (appointments) => {
        appointments.docs.forEach((appointment) => {
          if ((appointment.data() as AppointmentModel).costPaid) {
            const chartDataIndex = this.earningChartData.findIndex((chartData) => chartData.category === (appointment.data() as AppointmentModel).date.toDate().toLocaleDateString() )
            if (chartDataIndex === -1) {
              this.earningChartData.push({
                category: (appointment.data() as AppointmentModel).date.toDate().toLocaleDateString(),
                data: (appointment.data() as AppointmentModel).cost,
              })
            } else {
              this.earningChartData[chartDataIndex].data += (appointment.data() as AppointmentModel).cost;
            }
            this.numberOfEarning += (appointment.data() as AppointmentModel).cost;
          }
        });
        // Get payments
        from(this.doctorService.getPaymentsByRange(start, end))
          .subscribe({
            next: (payments) => {
              payments.docs.forEach((payment) => {
                const chartDataIndex = this.earningChartData.findIndex((chartData) => chartData.category === (payment.data() as PaymentModel).date.toDate().toLocaleDateString() )
                if (chartDataIndex === -1) {
                  this.earningChartData.push({
                    category: (payment.data() as PaymentModel).date.toDate().toLocaleDateString(),
                    data: (payment.data() as PaymentModel).amount,
                  })
                } else {
                  this.earningChartData[chartDataIndex].data += (payment.data() as PaymentModel).amount;
                }
                this.numberOfEarning += (payment.data() as PaymentModel).amount;
              })
              this.earningChart();
            },
            error: (error) => {
              console.log('error: ' + error)
            }
          })
      },
      error: (error) => {
        console.log('error: ' + error)
      }
    })
  }

}
