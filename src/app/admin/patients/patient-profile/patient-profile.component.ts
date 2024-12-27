import { Component } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import {PatientService} from "@core/service/patient.service";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatTabsModule} from "@angular/material/tabs";
import {Router} from "@angular/router";
import {MatDialog} from "@angular/material/dialog";
import {DeleteComponent, DialogData} from "../allpatients/dialog/delete/delete.component";
import {Direction} from "@angular/cdk/bidi";
import {NotificationService} from "@core/service/notification.service";
import {SharedModule, UnsubscribeOnDestroyAdapter} from "@shared";
import {MatDatepickerModule} from "@angular/material/datepicker";
import { OwlDateTimeModule, OwlNativeDateTimeModule } from '@danielmoncada/angular-datetime-picker';
import {ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import {AppointmentModel} from "@core/models/appointment.model";
import {from} from "rxjs";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import {AdultTeethDiagramComponent} from "@shared/components/dentist/adult-teeth-diagram/adult-teeth-diagram.component";
import * as firestore from 'firebase/firestore';
import {PaymentModel} from "@core/models/payment.model";
import {TreatmentModel} from "@core/models/treatment.model";
import {BalanceDetailsComponent} from "../allpatients/dialog/balance-details/balance-details.component";
import {isNullOrUndefined} from "@swimlane/ngx-datatable";
import {FileUploadComponent} from "@shared/components/file-upload/file-upload.component";
import {ImageComponent} from "@shared/components/image/image.component";
import {FullScreenImageComponent} from "@shared/components/full-screen-image/full-screen-image.component";
import {Attachment} from "@core/models/patient.model";
import {FirebaseStorageService} from "@core/service/firebase-storage.service";
import {FirebaseAuthenticationService} from "../../../authentication/services/firebase-authentication.service";
import {Role, User} from "@core";

@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTabsModule, MatDatepickerModule, OwlDateTimeModule, OwlNativeDateTimeModule, ReactiveFormsModule, SharedModule, AdultTeethDiagramComponent, FileUploadComponent, ImageComponent, FullScreenImageComponent,],
})
export class PatientProfileComponent extends UnsubscribeOnDestroyAdapter{

  appointmentForm: UntypedFormGroup;
  paymentForm: UntypedFormGroup;
  treatmentForm: UntypedFormGroup;

  patientAppointments: AppointmentModel[] = [];
  patientPayments: PaymentModel[] = [];
  patientTreatments: TreatmentModel[] = [];
  selectedDiagram: string ='adultTeethDiagram';

  constructor(
    private patientService: PatientService,
    private router: Router,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private formBuilder: UntypedFormBuilder,
    private firebaseStorageService: FirebaseStorageService,
    private firebaseAuthenticationService: FirebaseAuthenticationService,
  ) {
    super();
    if (this.patientService.getDialogData().id === '' ) this.router.navigate(['/admin/patients/all-patients']);
    // constructor code
    this.appointmentForm = this.createAppointmentForm();
    this.paymentForm = this.createPaymentForm();
    this.treatmentForm = this.createTreatmentForm();
    this.getPatientAppointments();
    this.getPatientPayments();
    this.getPatientTreatments();
  }


  public get patient() {
    return this.patientService.getDialogData();
  }
  get doctor(): User {
    return this.firebaseAuthenticationService.currentUserValue;
  }

  goToEditPage() {
    this.router.navigate(['/admin/patients/edit-patient']);
  }

  deletePatient() {
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(DeleteComponent, {
      data: {
        id: this.patient.id,
        gender: this.patient.gender,
        phoneNumber: this.patient.phoneNumber,
        bloodGroup: this.patient.bloodGroup,
        name: this.patient.firstName + ' ' + this.patient.lastName,
      } as DialogData,
      direction: tempDirection,
    });

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {

        // Delete patient from Firestore and local storage
        this.patientService.deletePatient(this.patient.id);
        this.router.navigate(['/admin/patients/all-patients']);
        this.notificationService.showSnackBarNotification(
          'snackbar-danger',
          'Delete Record Successfully...!!!',
          'bottom',
          'center'
        );
      }
    });

  }

  addAppointment() {
    const newAppointment = new AppointmentModel();
    newAppointment.date = firestore.Timestamp.fromDate(this.appointmentForm.get('date')?.value);
    newAppointment.time = firestore.Timestamp.fromDate(this.appointmentForm.get('time')?.value);
    newAppointment.details = this.appointmentForm.get('details')?.value;
    newAppointment.attended = this.appointmentForm.get('attended')?.value;
    newAppointment.cost = this.appointmentForm.get('cost')?.value;
    newAppointment.costPaid = this.appointmentForm.get('costPaid')?.value;

    from(this.patientService.addPatientAppointment(newAppointment))
    .subscribe({
      next: () => {
        this.appointmentForm = this.createAppointmentForm();
        this.notificationService.showSnackBarNotification(
          'snackbar-success',
          'Add Appointment Successfully...!!!',
          'bottom',
          'center'
        );
        this.getPatientAppointments();
      },
      error: (error) => {
        console.log('error: ' + error)
      }
    })
  }

  addPayment() {
    const newPayment = new PaymentModel();
    newPayment.amount = this.paymentForm.get('amount')?.value;
    newPayment.date = firestore.Timestamp.fromDate(this.paymentForm.get('date')?.value);
    newPayment.details = this.paymentForm.get('details')?.value;


    from(this.patientService.addPatientPayment(newPayment))
      .subscribe({
        next: () => {
          this.paymentForm = this.createPaymentForm();
          this.notificationService.showSnackBarNotification(
            'snackbar-success',
            'Add Payment Successfully...!!!',
            'bottom',
            'center'
          );
          this.getPatientPayments();
        },
        error: (error) => {
          console.log('error: ' + error)
        }
      })
  }

  addTreatment() {
    const newTreatment = new TreatmentModel();
    newTreatment.price = this.treatmentForm.get('price')?.value;
    newTreatment.discount = this.treatmentForm.get('discount')?.value;
    newTreatment.date = firestore.Timestamp.fromDate(this.treatmentForm.get('date')?.value);
    newTreatment.details = this.treatmentForm.get('details')?.value;


    from(this.patientService.addPatientTreatment(newTreatment))
      .subscribe({
        next: () => {
          this.treatmentForm = this.createTreatmentForm();
          this.notificationService.showSnackBarNotification(
            'snackbar-success',
            'Add Treatment Successfully...!!!',
            'bottom',
            'center'
          );
          this.getPatientTreatments();
        },
        error: (error) => {
          console.log('error: ' + error)
        }
      })
  }

  getPatientAppointments() {
    this.patientAppointments = [];
    from(this.patientService.getPatientAppointments())
    .subscribe({
      next: (appointments) => {
        appointments.docs.map((appointment) => {
          this.patientAppointments.push(appointment.data() as AppointmentModel);
        })
      }
    });
  }

  private getPatientPayments() {
    this.patientPayments = [];
    from(this.patientService.getPatientPayments())
    .subscribe({
      next: (payments) => {
        payments.docs.map((payment) => {
          this.patientPayments.push(payment.data() as PaymentModel);
        })
      }
    });
  }

  private getPatientTreatments() {
    this.patientTreatments = [];
    from(this.patientService.getPatientTreatments())
    .subscribe({
      next: (treatments) => {
        treatments.docs.map((treatment) => {
          this.patientTreatments.push(treatment.data() as TreatmentModel);
        })
      }
    });
  }

  private createAppointmentForm(): UntypedFormGroup {
    return this.formBuilder.group({
      date: ['', [Validators.required]],
      time: ['', [Validators.required]],
      details: [''],
      cost: [0, [Validators.min(0), Validators.max(1000)]],
      costPaid: [true],
      attended: [false]
    })
  }

  private createPaymentForm(): UntypedFormGroup {
    return this.formBuilder.group({
      amount: ['', [Validators.min(0), Validators.max(100000), Validators.required]],
      date: ['', [Validators.required]],
      details: [''],
    })
  }

  private createTreatmentForm(): UntypedFormGroup {
    return this.formBuilder.group({
      price: ['', [Validators.min(0), Validators.max(100000), Validators.required]],
      discount: [0, [Validators.min(0), Validators.max(100000)]],
      date: ['', [Validators.required]],
      details: [''],
    })
  }

  changeAppointmentAttended($event: MatSlideToggleChange, appointment: AppointmentModel) {
    appointment.attended = $event.checked;
    this.patientService.changeAppointmentAttended(appointment, $event.checked);
  }
  changeAppointmentCostPaid($event: MatSlideToggleChange, appointment: AppointmentModel) {
    appointment.costPaid = $event.checked;
    this.patientService.changeAppointmentCostPaid(appointment, $event.checked);
  }

  deleteAppointment(appointment: AppointmentModel) {
    this.patientAppointments.splice(this.patientAppointments.findIndex((foundAppointment) => foundAppointment.id === appointment.id), 1);
    this.patientService.deleteAppointment(appointment.id);
  }

  deletePayment(payment: PaymentModel) {
    this.patientPayments.splice(this.patientPayments.findIndex((foundPayment) => foundPayment.id === payment.id), 1);
    this.patientService.deletePayment(payment.id);
  }

  deleteTreatment(treatment: TreatmentModel) {
    this.patientTreatments.splice(this.patientTreatments.findIndex((foundTreatment) => foundTreatment.id === treatment.id), 1);
    this.patientService.deleteTreatment(treatment.id);
  }

  getTreatmentsCost(): number {
    let treatmentsCost: number = 0;
    // Get Treatments Costs
    this.patientTreatments.forEach( (treatment)=>{
      treatmentsCost += treatment.price - treatment.discount;
    })
    // Get Appointments Unpaid Fees
    this.patientAppointments.forEach( (appointment)=>{
      treatmentsCost += !appointment.costPaid ? appointment.cost : 0;
    })
    return treatmentsCost;
  }

  getPaymentsAmount(): number {
    let paymentsAmount: number = 0;
    this.patientPayments.forEach( (payment)=>{
      paymentsAmount += payment.amount;
    })
    return paymentsAmount;
  }

  getBalanceDetails() {
    this.dialog.open(BalanceDetailsComponent, {
      data: {
        treatments: this.patientTreatments,
        payments: this.patientPayments,
        appointments: this.patientAppointments,
      },
    });
  }

  protected readonly isNullOrUndefined = isNullOrUndefined;

  addSpecialDiagram() {
    this.patient.specialDiagrams.adultTeethDiagram.push({activated: 'true'});
    console.log('selectedDiagram: ' + this.selectedDiagram);
  }

  deleteAttachment(attachment: Attachment) {
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(DeleteComponent, {
      direction: tempDirection,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        this.firebaseStorageService.deleteFile(attachment.url);
        this.patient.attachments = this.patient.attachments.filter(attach => attach !== attachment);
        this.patientService.updatePatient(this.patient);
      }
    });
  }

  addAttachment(attachment: Attachment) {
    if(isNullOrUndefined(this.patient.attachments)) this.patient.attachments = [];
    this.patient.attachments.push(attachment);
    this.patientService.updatePatient(this.patient);
  }

  protected readonly console = console;
  protected readonly window = window;
  protected readonly Role = Role;
}
