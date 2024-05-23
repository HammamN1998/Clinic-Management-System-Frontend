import { Component, OnInit } from '@angular/core';
import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexDataLabels, ApexTooltip, ApexYAxis, ApexPlotOptions, ApexStroke, ApexLegend, ApexFill, ApexResponsive, ApexGrid, NgApexchartsModule } from 'ng-apexcharts';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import {from} from "rxjs";
import {DoctorService} from "@core/service/doctor.service";
import {AppointmentModel} from "@core/models/appointment.model";
import {TreatmentModel} from "@core/models/treatment.model";
import {Patient} from "@core/models/patient.model";
import {PaymentModel} from "@core/models/payment.model";
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

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    NgApexchartsModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    FeatherIconsComponent,
  ],
})

export class MainComponent implements OnInit {

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
  ) {

  }
  ngOnInit() {
    this.appointmentsChart();
    this.treatmentsChart();
    this.newPatientsChart();
    this.earningChart();

    setTimeout(() => {
      this.getAppointmentsData();
      this.getTreatmentsData();
      this.getNewPatientsData();
      this.getEarningData();
    }, 200);
  }

  private appointmentsChart() {
    const dataArray: number[] = this.appointmentsChartData.map((chartData) => chartData.data);
    const categoryArray: string[] = this.appointmentsChartData.map((chartData) => chartData.category);

    this.appointmentsChartOptions = {
      series: [
        {
          name: 'Appointments',
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
          name: 'Operations',
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
          name: 'New Patients',
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
          name: 'Earning',
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

  private  getAppointmentsData() {
    from(this.doctorService.getCurrentMonthAppointments())
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

  private getTreatmentsData() {
    from(this.doctorService.getCurrentMonthTreatments())
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

  private getNewPatientsData() {
    from(this.doctorService.getCurrentMonthNewPatients())
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

  private getEarningData() {
    // Get paid appointments
    from(this.doctorService.getCurrentMonthAppointments())
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
        from(this.doctorService.getCurrentMonthPayments())
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
