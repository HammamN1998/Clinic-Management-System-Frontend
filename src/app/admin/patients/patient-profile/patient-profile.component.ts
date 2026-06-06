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
import { DeleteConfirmDialogService } from '@shared/components/delete-confirm-dialog/delete-confirm-dialog.service';
import {NotificationService} from "@core/service/notification.service";
import {SharedModule, UnsubscribeOnDestroyAdapter} from "@shared";
import {MatDatepickerModule} from "@angular/material/datepicker";
import { OwlDateTimeModule, OwlNativeDateTimeModule } from '@danielmoncada/angular-datetime-picker';
import {ReactiveFormsModule, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import {AppointmentDrug, AppointmentModel} from "@core/models/appointment.model";
import {from} from "rxjs";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import {UniversalTeethDiagramComponent} from "@shared/components/dentist/universal-teeth-diagram/universal-teeth-diagram.component";
import {FdiTeethDiagramComponent} from "@shared/components/dentist/fdi-teeth-diagram/fdi-teeth-diagram.component";
import {PalmerTeethDiagramComponent} from "@shared/components/dentist/palmer-teeth-diagram/palmer-teeth-diagram.component";
import * as firestore from 'firebase/firestore';
import {PaymentModel} from "@core/models/payment.model";
import {TreatmentModel} from "@core/models/treatment.model";
import {BalanceDetailsComponent} from "../allpatients/dialog/balance-details/balance-details.component";
import {isNullOrUndefined} from "@swimlane/ngx-datatable";
import {FileUploadComponent} from "@shared/components/file-upload/file-upload.component";
import {FullScreenImageComponent} from "@shared/components/full-screen-image/full-screen-image.component";
import {EditableTextComponent} from "@shared/components/editable-text/editable-text.component";
import {EditableTextCompactedComponent} from "@shared/components/editable-text-compacted/editable-text-compacted.component";
import {Attachment} from "@core/models/patient.model";
import {FirebaseStorageService} from "@core/service/firebase-storage.service";
import {FirebaseAuthenticationService} from "../../../authentication/services/firebase-authentication.service";
import {User} from "@core";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {PdfService} from "@core/service/pdf.service";
import {PrescriptionNoteDialogComponent} from "./dialog/prescription-note/prescription-note.component";
import {PatientLetterDialogComponent, PatientLetterResult} from "./dialog/patient-letter/patient-letter.component";
import {PatientDocumentsDialogComponent, PatientDocumentAction} from "./dialog/patient-documents/patient-documents.component";
import {buildBalanceLedger} from "@core/util/balance-ledger.util";

@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTabsModule, MatDatepickerModule, OwlDateTimeModule, OwlNativeDateTimeModule, ReactiveFormsModule, SharedModule, UniversalTeethDiagramComponent, FdiTeethDiagramComponent, FileUploadComponent, FullScreenImageComponent, EditableTextComponent, EditableTextCompactedComponent, PalmerTeethDiagramComponent, TranslateModule],
})
export class PatientProfileComponent extends UnsubscribeOnDestroyAdapter{

  appointmentForm: UntypedFormGroup;
  paymentForm: UntypedFormGroup;
  treatmentForm: UntypedFormGroup;

  patientAppointments: AppointmentModel[] = [];
  patientPayments: PaymentModel[] = [];
  patientTreatments: TreatmentModel[] = [];
  selectedDiagram: string ='universalTeethDiagram';
  /** Default on: smaller uploads; uncheck to keep full quality for medical images. */
  compressAttachments = true;

  constructor(
    private patientService: PatientService,
    private router: Router,
    private dialog: MatDialog,
    private deleteConfirmDialog: DeleteConfirmDialogService,
    private notificationService: NotificationService,
    private formBuilder: UntypedFormBuilder,
    private firebaseStorageService: FirebaseStorageService,
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private translate: TranslateService,
    private pdfService: PdfService,
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
    const name = `${this.patient.firstName} ${this.patient.lastName}`.trim();
    const message = this.translate.instant('PATIENTS.PROFILE.DELETE_PATIENT_CONFIRM', {
      name,
      gender: this.patient.gender,
      bloodGroup: this.patient.bloodGroup,
      mobile: this.patient.phoneNumber,
    });
    const dialogRef = this.deleteConfirmDialog.open(message);

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {

        // Delete patient from Firestore and local storage
        this.patientService.deletePatient(this.patient.id);
        this.router.navigate(['/admin/patients/all-patients']);
        this.notificationService.showSnackBarNotification(
          'snackbar-danger',
          this.translate.instant('PATIENTS.MESSAGES.DELETE_SUCCESS'),
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
    newAppointment.prescriptions = this.appointmentDrugs.value;
    newAppointment.subjective = this.appointmentForm.get('subjective')?.value ?? '';
    newAppointment.objective = this.appointmentForm.get('objective')?.value ?? '';
    newAppointment.assessment = this.appointmentForm.get('assessment')?.value ?? '';
    newAppointment.plan = this.appointmentForm.get('plan')?.value ?? '';

    // clear the form
    this.appointmentForm = this.createAppointmentForm();
    this.appointmentDrugs.clear();
    
    from(this.patientService.addPatientAppointment(newAppointment))
    .subscribe({
      next: () => {
        // show success  message
        this.notificationService.showSnackBarNotification(
          'snackbar-success',
          this.translate.instant('PATIENTS.PROFILE.MESSAGES.ADD_APPOINTMENT_SUCCESS'),
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

    this.paymentForm = this.createPaymentForm();

    from(this.patientService.addPatientPayment(newPayment))
      .subscribe({
        next: () => {
          this.notificationService.showSnackBarNotification(
            'snackbar-success',
            this.translate.instant('PATIENTS.PROFILE.MESSAGES.ADD_PAYMENT_SUCCESS'),
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

    this.treatmentForm = this.createTreatmentForm();

    from(this.patientService.addPatientTreatment(newTreatment))
      .subscribe({
        next: () => {
          this.notificationService.showSnackBarNotification(
            'snackbar-success',
            this.translate.instant('PATIENTS.PROFILE.MESSAGES.ADD_TREATMENT_SUCCESS'),
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
    const now = new Date();
    return this.formBuilder.group({
      date: [now, [Validators.required]],
      time: [now, [Validators.required]],
      details: [''],
      subjective: [''],
      objective: [''],
      assessment: [''],
      plan: [''],
      cost: [0, [Validators.min(0), Validators.max(1000)]],
      costPaid: [true],
      attended: [false],
      drugs: this.formBuilder.array([])
    })
  }

  get appointmentDrugs(): UntypedFormArray {
    return this.appointmentForm.get('drugs') as UntypedFormArray;
  }

  private createDrugForm(): UntypedFormGroup {
    return this.formBuilder.group({
      name: [''],
      type: [''],
      duration: [''],
      notes: ['']
    });
  }

  addDrug() {
    this.appointmentDrugs.push(this.createDrugForm());
  }

  removeDrug(index: number) {
    this.appointmentDrugs.removeAt(index);
  }

  private createPaymentForm(): UntypedFormGroup {
    const now = new Date();
    return this.formBuilder.group({
      amount: ['', [Validators.min(0), Validators.max(100000), Validators.required]],
      date: [now, [Validators.required]],
      details: [''],
    })
  }

  private createTreatmentForm(): UntypedFormGroup {
    const now = new Date();
    return this.formBuilder.group({
      price: ['', [Validators.min(0), Validators.max(100000), Validators.required]],
      discount: [0, [Validators.min(0), Validators.max(100000)]],
      date: [now, [Validators.required]],
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

  updateAppointmentDetails(appointment: AppointmentModel, details: string) {
    appointment.details = details;
    this.patientService.updateAppointmentDetails(appointment).subscribe({
      next: () => {
        this.notificationService.showSnackBarNotification(
          'black',
          this.translate.instant('PATIENTS.PROFILE.MESSAGES.UPDATE_APPOINTMENT_DETAILS_SUCCESS'),
          'bottom',
          'center'
        );
      },
      error: (error) => {
        console.log('error: ' + JSON.stringify(error));
      }
    });
  }

  patchAppointmentSoap(
    appointment: AppointmentModel,
    patch: Partial<
      Pick<AppointmentModel, 'subjective' | 'objective' | 'assessment' | 'plan'>
    >
  ) {
    Object.assign(appointment, patch);
    this.patientService.updateAppointmentSoap(appointment.id, patch).subscribe({
      next: () => {
        this.notificationService.showSnackBarNotification(
          'black',
          this.translate.instant('PATIENTS.PROFILE.MESSAGES.UPDATE_CLINICAL_NOTES_SUCCESS'),
          'bottom',
          'center'
        );
      },
      error: (error) => {
        console.log('error: ' + JSON.stringify(error));
      },
    });
  }

  addAppointmentDrug(appointment: AppointmentModel) {
    if (!appointment.prescriptions) {
      appointment.prescriptions = [];
    }
    appointment.prescriptions.push(this.createAppointmentDrug());
    this.patientService.updateAppointmentPrescriptions(appointment).subscribe({
      error: (error) => {
        console.log('error: ' + JSON.stringify(error));
      }
    });
  }

  removeAppointmentDrug(appointment: AppointmentModel, index: number) {
    if (!appointment.prescriptions || !appointment.prescriptions.length) {
      return;
    }
    appointment.prescriptions.splice(index, 1);
    this.patientService.updateAppointmentPrescriptions(appointment).subscribe({
      error: (error) => {
        console.log('error: ' + JSON.stringify(error));
      }
    });
  }

  updateAppointmentDrugField(
    appointment: AppointmentModel,
    index: number,
    field: keyof AppointmentDrug,
    value: string
  ) {
    if (!appointment.prescriptions || !appointment.prescriptions[index]) {
      return;
    }
    appointment.prescriptions[index][field] = value;
    this.patientService.updateAppointmentPrescriptions(appointment).subscribe({
      error: (error) => {
        console.log('error: ' + JSON.stringify(error));
      }
    });
  }

  private createAppointmentDrug(): AppointmentDrug {
    return {
      name: '',
      type: '',
      duration: '',
      notes: ''
    };
  }

  updatePaymentDetails(payment: PaymentModel, details: string) {
    payment.details = details;
    this.patientService.updatePaymentDetails(payment).subscribe({
      next: () => {
        this.notificationService.showSnackBarNotification(
          'black',
          this.translate.instant('PATIENTS.PROFILE.MESSAGES.UPDATE_PAYMENT_DETAILS_SUCCESS'),
          'bottom',
          'center'
        );
      },
      error: (error) => {
        console.log('error: ' + JSON.stringify(error));
      }
    });
  }

  updateTreatmentDetails(treatment: TreatmentModel, details: string) {
    treatment.details = details;
    this.patientService.updateTreatmentDetails(treatment).subscribe({
      next: () => {
        this.notificationService.showSnackBarNotification(
          'black',
          this.translate.instant('PATIENTS.PROFILE.MESSAGES.UPDATE_TREATMENT_DETAILS_SUCCESS'),
          'bottom',
          'center'
        );
      },
      error: (error) => {
        console.log('error: ' + JSON.stringify(error));
      }
    });
  }

  deleteAppointment(appointment: AppointmentModel) {
    const date = appointment.date.toDate().toDateString();
    const message = this.translate.instant('PATIENTS.PROFILE.MESSAGES.DELETE_APPOINTMENT_CONFIRM', { date });
    const dialogRef = this.deleteConfirmDialog.open(message);
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result !== 1) {
        return;
      }
      this.patientAppointments.splice(
        this.patientAppointments.findIndex(
          (foundAppointment) => foundAppointment.id === appointment.id,
        ),
        1,
      );
      this.patientService.deleteAppointment(appointment.id);
    });
  }

  deletePayment(payment: PaymentModel) {
    const message = this.translate.instant('PATIENTS.PROFILE.MESSAGES.DELETE_PAYMENT_CONFIRM', { amount: payment.amount });
    const dialogRef = this.deleteConfirmDialog.open(message);
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result !== 1) {
        return;
      }
      this.patientPayments.splice(
        this.patientPayments.findIndex((foundPayment) => foundPayment.id === payment.id),
        1,
      );
      this.patientService.deletePayment(payment.id);
    });
  }

  deleteTreatment(treatment: TreatmentModel) {
    const date = treatment.date.toDate().toDateString();
    const message = this.translate.instant('PATIENTS.PROFILE.MESSAGES.DELETE_TREATMENT_CONFIRM', { date });
    const dialogRef = this.deleteConfirmDialog.open(message);
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result !== 1) {
        return;
      }
      this.patientTreatments.splice(
        this.patientTreatments.findIndex((foundTreatment) => foundTreatment.id === treatment.id),
        1,
      );
      this.patientService.deleteTreatment(treatment.id);
    });
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
        patientName: `${this.patient.firstName} ${this.patient.lastName}`.trim(),
        patient: this.patient,
      },
    });
  }

  downloadAppointmentPdf(appointment: AppointmentModel) {
    void this.pdfService
      .downloadAppointmentPdf({ appointment, patient: this.patient })
      .catch(() => {});
  }

  downloadPrescriptionPdf(appointment: AppointmentModel) {
    this.dialog
      .open(PrescriptionNoteDialogComponent, { width: '480px' })
      .afterClosed()
      .subscribe((note?: string) => {
        if (note === undefined) {
          return;
        }
        void this.pdfService
          .downloadPrescriptionPdf({ appointment, patient: this.patient, note })
          .catch(() => {});
      });
  }

  downloadPaymentReceipt(payment: PaymentModel) {
    const ledger = buildBalanceLedger(
      this.patientTreatments,
      this.patientPayments,
      this.patientAppointments,
    );
    void this.pdfService
      .downloadPaymentReceiptPdf({
        payment,
        patient: this.patient,
        remainingBalance: ledger.totalBalance,
      })
      .catch(() => {});
  }

  openDocuments() {
    this.dialog
      .open(PatientDocumentsDialogComponent, { width: '420px' })
      .afterClosed()
      .subscribe((action?: PatientDocumentAction) => {
        if (!action) {
          return;
        }
        if (action === 'detailed') {
          void this.pdfService
            .downloadPatientBalancePdf(this.balancePdfInput())
            .catch(() => {});
        } else if (action === 'simple') {
          void this.pdfService
            .downloadPatientSimpleBalancePdf(this.balancePdfInput())
            .catch(() => {});
        } else if (action === 'letter') {
          this.openLetterDialog();
        }
      });
  }

  private openLetterDialog() {
    this.dialog
      .open(PatientLetterDialogComponent, { width: '560px' })
      .afterClosed()
      .subscribe((result?: PatientLetterResult) => {
        if (!result) {
          return;
        }
        void this.pdfService
          .downloadPatientLetterPdf({
            body: result.body,
            title: result.title,
            patient: this.patient,
          })
          .catch(() => {});
      });
  }

  private balancePdfInput() {
    return {
      treatments: this.patientTreatments,
      payments: this.patientPayments,
      appointments: this.patientAppointments,
      patient: this.patient,
      patientName: `${this.patient.firstName} ${this.patient.lastName}`.trim(),
    };
  }

  protected readonly isNullOrUndefined = isNullOrUndefined;

  addSpecialDiagram() {
    switch (this.selectedDiagram) {
      case 'universalTeethDiagram':
        this.patient.specialDiagrams.universalTeethDiagram = [];
        this.patient.specialDiagrams.universalTeethDiagram.push({activated: 'true'});
        break;
      case 'fdiTeethDiagram':
        this.patient.specialDiagrams.fdiTeethDiagram = [];
        this.patient.specialDiagrams.fdiTeethDiagram.push({activated: 'true'});
        break;
      case 'palmerTeethDiagram':
        this.patient.specialDiagrams.palmerTeethDiagram = [];
        this.patient.specialDiagrams.palmerTeethDiagram.push({activated: 'true'});
        break;
    }
  }

  deleteAttachment(attachment: Attachment) {
    const message = this.translate.instant('PATIENTS.PROFILE.MESSAGES.DELETE_ATTACHMENT_CONFIRM', { name: attachment.name });
    const dialogRef = this.deleteConfirmDialog.open(message);

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result !== 1) {
        return;
      }
      this.subs.sink = this.firebaseStorageService
        .deleteFile(attachment.url)
        .subscribe({
          next: () => {
            const removedSize = attachment.size ?? 0;
            this.patient.attachments = (this.patient.attachments ?? []).filter(
              (a) => a.url !== attachment.url,
            );
            this.doctor.subscription.storageBytesUsed = Math.max(
              0,
              this.doctor.subscription.storageBytesUsed - removedSize,
            );
            this.patientService.updatePatient(this.patient);
            this.notificationService.showSnackBarNotification(
              'snackbar-success',
              this.translate.instant('PATIENTS.PROFILE.MESSAGES.ATTACHMENT_DELETED_SUCCESS'),
              'bottom',
              'center',
            );
          },
          error: (error) => {
            console.log('error: ' + error);
            this.notificationService.showSwalOkDialog(
              this.translate.instant('PATIENTS.PROFILE.MESSAGES.ATTACHMENT_DELETE_ERROR'),
              'error',
            );
          },
        });
    });
  }

  addAttachment(attachment: Attachment) {
    if (this.doctor.subscription.storageBytesUsed + attachment.size > this.doctor.subscription.maxStorageLimitBytes || this.doctor.subscription.status !== 'active') {
      this.notificationService.showSwalDialogWithFunction(
        this.doctor.subscription.status !== 'active' ?
          this.translate.instant('PATIENTS.MESSAGES.PLAN_INACTIVE_TITLE') :
          this.translate.instant('PATIENTS.PROFILE.MESSAGES.UPGRADE_STORAGE_TITLE'),
        this.doctor.subscription.status !== 'active' ?
          this.translate.instant('PATIENTS.MESSAGES.PLAN_INACTIVE_TEXT') :
          this.translate.instant('PATIENTS.PROFILE.MESSAGES.UPGRADE_STORAGE_TEXT', { bytes: this.doctor.subscription.maxStorageLimitBytes }),
        'error',
        true,
        this.translate.instant('PATIENTS.MESSAGES.GO_TO_PLAN'),
        () => {
          this.router.navigate(['/admin/doctors/doctor-plans']);
        }
      );
      return;
    }

    if(isNullOrUndefined(this.patient.attachments)) this.patient.attachments = [];
    this.patient.attachments.push(attachment);
    this.patientService.updatePatient(this.patient);
    this.doctor.subscription.storageBytesUsed += attachment.size;
    this.compressAttachments = true;
  }

  updatePatientNotes() {
    this.patientService.updatePatientNotes(this.patient.notes);
    this.notificationService.showSnackBarNotification(
      'black',
      this.translate.instant('PATIENTS.PROFILE.MESSAGES.EDIT_NOTES_SUCCESS'),
      'bottom',
      'center'
    );
  }

  protected readonly console = console;
  protected readonly window = window;
}
