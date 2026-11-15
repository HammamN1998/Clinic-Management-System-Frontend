import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import {PatientService} from "@core/service/patient.service";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatTabsModule} from "@angular/material/tabs";
import {MatSelectModule} from "@angular/material/select";
import {Router} from "@angular/router";
import {MatDialog} from "@angular/material/dialog";
import { DeleteConfirmDialogService } from '@shared/components/delete-confirm-dialog/delete-confirm-dialog.service';
import {NotificationService} from "@core/service/notification.service";
import {SharedModule, UnsubscribeOnDestroyAdapter} from "@shared";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {FormControl, ReactiveFormsModule, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import {AppointmentDrug, AppointmentModel} from "@core/models/appointment.model";
import {combineLatest, from} from "rxjs";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import * as firestore from 'firebase/firestore';
import {PaymentModel} from "@core/models/payment.model";
import {TreatmentModel} from "@core/models/treatment.model";
import {BalanceDetailsComponent} from "../allpatients/dialog/balance-details/balance-details.component";
import {isNullOrUndefined} from "@swimlane/ngx-datatable";
import {FileUploadComponent} from "@shared/components/file-upload/file-upload.component";
import {FullScreenImageComponent} from "@shared/components/full-screen-image/full-screen-image.component";
import {EditableTextComponent} from "@shared/components/editable-text/editable-text.component";
import {EditableTextCompactedComponent} from "@shared/components/editable-text-compacted/editable-text-compacted.component";
import {Attachment, DentalNotation} from "@core/models/patient.model";
import {FirebaseStorageService} from "@core/service/firebase-storage.service";
import {FirebaseAuthenticationService} from "../../../authentication/services/firebase-authentication.service";
import {User} from "@core";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {PdfService} from "@core/service/pdf.service";
import {PrescriptionNoteDialogComponent} from "./dialog/prescription-note/prescription-note.component";
import {PatientLetterDialogComponent, PatientLetterResult} from "./dialog/patient-letter/patient-letter.component";
import {PatientDocumentsDialogComponent, PatientDocumentAction} from "./dialog/patient-documents/patient-documents.component";
import {BalanceLedgerResult, buildBalanceLedger} from "@core/util/balance-ledger.util";
import {DentalChartService} from "@core/service/dental-chart.service";
import {DENTAL_NOTATIONS} from "@core/models/dental.constants";
import {CurrencyService} from "@core/service/currency.service";
import {AppCurrencyPipe} from "@core/pipe/app-currency.pipe";
import {NumericInputDirective} from "@core/directive/numeric-input.directive";
import {buildTimeSlots, compareTimeSlots, doctorDefaultDuration, nextTimeSlot, resolveDuration, toAmount} from "@core/util/appointment-form.util";
import {AppDurationPipe} from "@core/pipe/app-duration.pipe";
import {AppointmentDurationFieldComponent} from "@shared/components/appointment-duration-field/appointment-duration-field.component";
import {ClinicService} from "@core/service/clinic.service";
import {ClinicContextService} from "@core/service/clinic-context.service";
import {DoctorService} from "@core/service/doctor.service";
import {PatientDeletionRequest} from "@core/models/clinic.model";
import {getAppDateLocale} from "@core/util/app-locale.util";

/** The parts of an appointment, each shown only once it has something in it. */
type AppointmentTextSectionKey = 'details' | 'subjective' | 'objective' | 'assessment' | 'plan';
type AppointmentSectionKey = AppointmentTextSectionKey | 'prescriptions';

interface AppointmentSection {
  key: AppointmentSectionKey;
  labelKey: string;
}

const APPOINTMENT_SECTIONS: AppointmentSection[] = [
  { key: 'details', labelKey: 'PATIENTS.PROFILE.APPOINTMENT_DETAILS' },
  { key: 'subjective', labelKey: 'PATIENTS.PROFILE.SUBJECTIVE' },
  { key: 'objective', labelKey: 'PATIENTS.PROFILE.OBJECTIVE' },
  { key: 'assessment', labelKey: 'PATIENTS.PROFILE.ASSESSMENT' },
  { key: 'plan', labelKey: 'PATIENTS.PROFILE.PLAN' },
  { key: 'prescriptions', labelKey: 'PATIENTS.PROFILE.PRESCRIPTION' },
];

@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTabsModule, MatSelectModule, MatDatepickerModule, ReactiveFormsModule, SharedModule, FileUploadComponent, FullScreenImageComponent, EditableTextComponent, EditableTextCompactedComponent, TranslateModule, AppCurrencyPipe, NumericInputDirective, AppDurationPipe, AppointmentDurationFieldComponent],
})
export class PatientProfileComponent extends UnsubscribeOnDestroyAdapter implements OnInit, AfterViewInit {

  @ViewChild('appointmentsSection') appointmentsSection?: ElementRef<HTMLElement>;

  appointmentForm: UntypedFormGroup;
  paymentForm: UntypedFormGroup;
  treatmentForm: UntypedFormGroup;

  patientAppointments: AppointmentModel[] = [];
  patientPayments: PaymentModel[] = [];
  patientTreatments: TreatmentModel[] = [];
  /** Recomputed by `refreshBalance()` rather than from the template, which would re-run it every change detection cycle. */
  balance: BalanceLedgerResult = buildBalanceLedger([], [], []);
  /** Default on: smaller uploads; uncheck to keep full quality for medical images. */
  compressAttachments = true;

  readonly timeSlots = buildTimeSlots();

  /** Empty sections the doctor opened from the picker, keyed `appointmentId:sectionKey`. */
  private readonly addedSections = new Set<string>();

  readonly dentalNotations = DENTAL_NOTATIONS;
  selectedDentalForm: DentalNotation = 'universal';
  visibleDentalForms: DentalNotation[] = [];

  /** Null until known. While linked, deleting a patient asks the clinic to approve it. */
  linkedToClinic: boolean | null = null;
  deletionBusy = false;
  private deletionRequests: PatientDeletionRequest[] = [];

  constructor(
    private patientService: PatientService,
    private dentalChartService: DentalChartService,
    private router: Router,
    private dialog: MatDialog,
    private deleteConfirmDialog: DeleteConfirmDialogService,
    private notificationService: NotificationService,
    private formBuilder: UntypedFormBuilder,
    private firebaseStorageService: FirebaseStorageService,
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private translate: TranslateService,
    private pdfService: PdfService,
    private currencyService: CurrencyService,
    private clinicService: ClinicService,
    private clinicContext: ClinicContextService,
    private doctorService: DoctorService,
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
    this.refreshVisibleDentalForms();
    this.selectedDentalForm = this.firstAvailableDentalForm();
  }


  ngOnInit(): void {
    this.subs.sink = combineLatest([this.clinicService.membership$, this.clinicService.deletionRequests$]).subscribe(
      ([membership, requests]) => {
        this.linkedToClinic = !!membership?.clinicAdminId;
        this.deletionRequests = requests;
      },
    );
  }

  ngAfterViewInit(): void {
    if (history.state?.openSection !== 'appointments') {
      return;
    }
    setTimeout(() => {
      this.appointmentsSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  public get patient() {
    return this.patientService.getDialogData();
  }
  get doctor(): User {
    return this.firebaseAuthenticationService.currentUserValue;
  }

  /** The doctor whose patient this is. */
  get activeDoctor(): User {
    return this.doctorService.activeDoctor;
  }

  get canEdit(): boolean {
    return this.clinicContext.canEdit;
  }

  get canDelete(): boolean {
    return this.clinicContext.canDelete;
  }

  /** This patient's request to the clinic, pending or rejected. */
  get deletionRequest(): PatientDeletionRequest | null {
    return this.deletionRequests.find((request) => request.patientId === this.patient.id) ?? null;
  }

  get dateLocale(): string {
    return getAppDateLocale(this.translate.currentLang);
  }

  /** Shown inside money inputs so it is clear which currency is being typed. */
  get currencySymbol(): string {
    return this.currencyService.symbol;
  }

  goToEditPage() {
    this.router.navigate(['/admin/patients/edit-patient']);
  }

  /** Open the dental chart for the given numbering-system form. */
  openDentalChart(notation: DentalNotation): void {
    this.router.navigate(['/admin/patients/dental-chart'], { state: { notation } });
  }

  isDentalFormTaken(notation: DentalNotation): boolean {
    return this.dentalChartService.isDentalFormTaken(notation);
  }

  get canCreateDentalForm(): boolean {
    return !this.dentalChartService.isDentalFormTaken(this.selectedDentalForm);
  }

  createDentalForm(): void {
    if (!this.canCreateDentalForm) {
      return;
    }
    this.dentalChartService.activateDentalForm(this.selectedDentalForm);
    this.refreshVisibleDentalForms();
    this.selectedDentalForm = this.firstAvailableDentalForm();
  }

  /** Short numbering-system label for Existing Forms buttons. */
  dentalFormLabelKey(notation: DentalNotation): string {
    const shortKeys: Record<DentalNotation, string> = {
      fdi: 'PATIENTS.DENTAL_CHART.NOTATIONS.FDI',
      universal: 'PATIENTS.DENTAL_CHART.NOTATIONS.UNIVERSAL',
      palmer: 'PATIENTS.DENTAL_CHART.NOTATIONS.PALMER',
    };
    return shortKeys[notation];
  }

  private refreshVisibleDentalForms(): void {
    this.visibleDentalForms = this.dentalChartService.getVisibleDentalForms();
  }

  private firstAvailableDentalForm(): DentalNotation {
    const available = this.dentalNotations.find((n) => !this.dentalChartService.isDentalFormTaken(n.value));
    return available?.value ?? 'universal';
  }

  deletePatient() {
    const linked = this.linkedToClinic;
    if (linked === null) {
      return;
    }
    const name = `${this.patient.firstName} ${this.patient.lastName}`.trim();
    const message = linked
      ? this.translate.instant('CLINIC.DELETION.CONFIRM_REQUEST', { name })
      : this.translate.instant('PATIENTS.PROFILE.DELETE_PATIENT_CONFIRM', {
        name,
        gender: this.patient.gender,
        bloodGroup: this.patient.bloodGroup,
        mobile: this.patient.phoneNumber,
      });
    const dialogRef = this.deleteConfirmDialog.open(message, linked ? 'CLINIC.DELETION.REQUEST' : undefined);

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        void (linked ? this.requestDeletion() : this.deleteNow());
      }
    });
  }

  /** Withdraws a pending request, or dismisses a rejected one. */
  async clearDeletionRequest(): Promise<void> {
    const pending = this.deletionRequest?.status === 'pending';
    await this.runDeletionCall(async () => {
      await this.clinicService.cancelPatientDeletion(this.patient.id);
      return pending ? 'CLINIC.DELETION.MESSAGES.WITHDRAWN' : 'CLINIC.DELETION.MESSAGES.DISMISSED';
    });
  }

  private async requestDeletion(): Promise<void> {
    await this.runDeletionCall(async () => {
      await this.clinicService.requestPatientDeletion(this.patient.id);
      return 'CLINIC.DELETION.MESSAGES.REQUESTED';
    });
  }

  /** The call resolves to the key of its success message. */
  private async runDeletionCall(call: () => Promise<string>): Promise<void> {
    this.deletionBusy = true;
    try {
      const messageKey = await call();
      this.notificationService.showSnackBarNotification('snackbar-success', this.translate.instant(messageKey), 'bottom', 'center');
    } catch (err) {
      this.notificationService.showSwalOkDialog(this.clinicService.errorMessage(err), 'error', 'center', this.translate.instant('COMMON.OK'));
    } finally {
      this.deletionBusy = false;
    }
  }

  private async deleteNow(): Promise<void> {
    this.deletionBusy = true;
    try {
      await this.patientService.deletePatient(this.patient.id);
    } catch (err) {
      console.error('Failed to delete the patient', err);
      this.notificationService.showSwalOkDialog(
        this.translate.instant('PATIENTS.MESSAGES.DELETE_FAILED'),
        'error',
        'center',
        this.translate.instant('COMMON.OK'),
      );
      return;
    } finally {
      this.deletionBusy = false;
    }
    this.router.navigate(['/admin/patients/all-patients']);
    this.notificationService.showSnackBarNotification(
      'snackbar-danger',
      this.translate.instant('PATIENTS.MESSAGES.DELETE_SUCCESS'),
      'bottom',
      'center'
    );
  }

  addAppointment() {
    const newAppointment = new AppointmentModel();
    newAppointment.date = firestore.Timestamp.fromDate(this.appointmentForm.get('date')?.value);
    newAppointment.time = firestore.Timestamp.fromDate(this.appointmentForm.get('time')?.value);
    newAppointment.durationMinutes = this.newAppointmentDurationControl.value;
    newAppointment.details = this.appointmentForm.get('details')?.value;
    newAppointment.attended = this.appointmentForm.get('attended')?.value;
    newAppointment.cost = toAmount(this.appointmentForm.get('cost')?.value);
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
        this.notifySaveFailed();
      }
    })
  }

  addPayment() {
    const newPayment = new PaymentModel();
    newPayment.amount = toAmount(this.paymentForm.get('amount')?.value);
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
          this.notifySaveFailed();
        }
      })
  }

  addTreatment() {
    const newTreatment = new TreatmentModel();
    newTreatment.price = toAmount(this.treatmentForm.get('price')?.value);
    newTreatment.discount = toAmount(this.treatmentForm.get('discount')?.value);
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
          this.notifySaveFailed();
        }
      })
  }

  getPatientAppointments() {
    this.patientAppointments = [];
    from(this.patientService.getPatientAppointments())
    .subscribe({
      next: (appointments) => {
        appointments.docs.map((appointment) => {
          // Take the id from the document, not the stored field: a freshly added record is
          // written before its id is backfilled, so the field can still be empty here.
          this.patientAppointments.push({ ...(appointment.data() as AppointmentModel), id: appointment.id });
        })
        this.refreshBalance();
      }
    });
  }

  private getPatientPayments() {
    this.patientPayments = [];
    from(this.patientService.getPatientPayments())
    .subscribe({
      next: (payments) => {
        payments.docs.map((payment) => {
          this.patientPayments.push({ ...(payment.data() as PaymentModel), id: payment.id });
        })
        this.refreshBalance();
      }
    });
  }

  private getPatientTreatments() {
    this.patientTreatments = [];
    from(this.patientService.getPatientTreatments())
    .subscribe({
      next: (treatments) => {
        treatments.docs.map((treatment) => {
          this.patientTreatments.push({ ...(treatment.data() as TreatmentModel), id: treatment.id });
        })
        this.refreshBalance();
      }
    });
  }

  /** The control holds a Date, so the slot has to be matched on time of day rather than object identity. */
  compareTimeSlots = compareTimeSlots;

  private createAppointmentForm(): UntypedFormGroup {
    const now = new Date();
    return this.formBuilder.group({
      date: [now, [Validators.required]],
      time: [nextTimeSlot(this.timeSlots), [Validators.required]],
      durationMinutes: [doctorDefaultDuration(this.activeDoctor), [Validators.required]],
      details: [''],
      subjective: [''],
      objective: [''],
      assessment: [''],
      plan: [''],
      cost: ['', [Validators.min(0)]],
      costPaid: [true],
      attended: [false],
      drugs: this.formBuilder.array([])
    })
  }

  get newAppointmentDurationControl(): FormControl<number> {
    return this.appointmentForm.get('durationMinutes') as FormControl<number>;
  }

  /** One control per appointment, so each panel's select keeps its own value across change detection. */
  private readonly appointmentDurationControls = new Map<string, FormControl<number>>();

  appointmentDuration(appointment: AppointmentModel): number {
    return resolveDuration(appointment, this.activeDoctor);
  }

  appointmentDurationControl(appointment: AppointmentModel): FormControl<number> {
    let control = this.appointmentDurationControls.get(appointment.id);
    if (!control) {
      control = new FormControl<number>(this.appointmentDuration(appointment), { nonNullable: true });
      this.appointmentDurationControls.set(appointment.id, control);
    }
    return control;
  }

  changeAppointmentDuration(appointment: AppointmentModel, minutes: number) {
    const previous = appointment.durationMinutes;
    appointment.durationMinutes = minutes;
    this.patientService.updateAppointmentDuration(appointment.id, minutes)
      .then(() => {
        this.notificationService.showSnackBarNotification(
          'black',
          this.translate.instant('PATIENTS.PROFILE.MESSAGES.UPDATE_APPOINTMENT_DURATION_SUCCESS'),
          'bottom',
          'center'
        );
      })
      .catch((error) => {
        console.log('error: ' + JSON.stringify(error));
        appointment.durationMinutes = previous;
        this.appointmentDurationControl(appointment).setValue(this.appointmentDuration(appointment));
        this.notificationService.showSnackBarNotification(
          'snackbar-danger',
          this.translate.instant('PATIENTS.PROFILE.MESSAGES.UPDATE_APPOINTMENT_DURATION_ERROR'),
          'bottom',
          'center'
        );
      });
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
      discount: ['', [Validators.min(0), Validators.max(100000)]],
      date: [now, [Validators.required]],
      details: [''],
    })
  }

  changeAppointmentAttended($event: MatSlideToggleChange, appointment: AppointmentModel) {
    appointment.attended = $event.checked;
    this.patientService.changeAppointmentAttended(appointment, $event.checked).catch((error) => {
      console.log('error: ' + JSON.stringify(error));
      appointment.attended = !$event.checked;
      this.notifySaveFailed();
    });
  }
  changeAppointmentCostPaid($event: MatSlideToggleChange, appointment: AppointmentModel) {
    appointment.costPaid = $event.checked;
    this.refreshBalance();
    this.patientService.changeAppointmentCostPaid(appointment, $event.checked).catch((error) => {
      console.log('error: ' + JSON.stringify(error));
      appointment.costPaid = !$event.checked;
      this.refreshBalance();
      this.notifySaveFailed();
    });
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
        this.notifySaveFailed();
      }
    });
  }

  /** Sections holding content, plus any empty one the doctor just picked from the list. */
  appointmentSections(appointment: AppointmentModel): AppointmentSection[] {
    return APPOINTMENT_SECTIONS.filter(
      (section) =>
        this.hasSectionContent(appointment, section) ||
        this.addedSections.has(this.sectionId(appointment, section)),
    );
  }

  /** What the "add a section" list still has to offer for this appointment. */
  missingAppointmentSections(appointment: AppointmentModel): AppointmentSection[] {
    const shown = new Set(this.appointmentSections(appointment));
    return APPOINTMENT_SECTIONS.filter((section) => !shown.has(section));
  }

  addAppointmentSection(appointment: AppointmentModel, section: AppointmentSection): void {
    this.addedSections.add(this.sectionId(appointment, section));
    if (section.key === 'prescriptions') {
      // A prescription block with no drug in it is the same blank space we are removing.
      this.addAppointmentDrug(appointment);
    }
  }

  /** A just-added section has no content yet, so open it ready to type. */
  isAddedAppointmentSection(appointment: AppointmentModel, section: AppointmentSection): boolean {
    return (
      !this.hasSectionContent(appointment, section) &&
      this.addedSections.has(this.sectionId(appointment, section))
    );
  }

  appointmentSectionText(appointment: AppointmentModel, section: AppointmentSection): string {
    return section.key === 'prescriptions' ? '' : appointment[section.key] || '';
  }

  saveAppointmentSection(
    appointment: AppointmentModel,
    section: AppointmentSection,
    text: string,
  ): void {
    if (section.key === 'prescriptions') {
      return;
    }
    if (section.key === 'details') {
      this.updateAppointmentDetails(appointment, text);
      return;
    }
    this.patchAppointmentSoap(appointment, { [section.key]: text });
  }

  private hasSectionContent(appointment: AppointmentModel, section: AppointmentSection): boolean {
    if (section.key === 'prescriptions') {
      return (appointment.prescriptions || []).length > 0;
    }
    return !!appointment[section.key]?.trim();
  }

  trackSection(_index: number, section: AppointmentSection): string {
    return section.key;
  }

  private sectionId(appointment: AppointmentModel, section: AppointmentSection): string {
    return `${appointment.id}:${section.key}`;
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
        this.notifySaveFailed();
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
        this.notifySaveFailed();
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
        this.notifySaveFailed();
      }
    });
  }

  updateAppointmentDrugField(
    appointment: AppointmentModel,
    index: number,
    field: keyof AppointmentDrug,
    value: string
  ) {
    // A focus-out without a change, which is all a view-only field allows, saves nothing.
    if (!appointment.prescriptions || !appointment.prescriptions[index] || appointment.prescriptions[index][field] === value) {
      return;
    }
    appointment.prescriptions[index][field] = value;
    this.patientService.updateAppointmentPrescriptions(appointment).subscribe({
      error: (error) => {
        console.log('error: ' + JSON.stringify(error));
        this.notifySaveFailed();
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
        this.notifySaveFailed();
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
        this.notifySaveFailed();
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
      this.refreshBalance();
      this.patientService.deleteAppointment(appointment.id).catch((error) => {
        console.log('error: ' + JSON.stringify(error));
        this.getPatientAppointments();
        this.notifyDeleteFailed();
      });
    });
  }

  deletePayment(payment: PaymentModel) {
    const message = this.translate.instant('PATIENTS.PROFILE.MESSAGES.DELETE_PAYMENT_CONFIRM', {
      amount: this.currencyService.format(payment.amount),
    });
    const dialogRef = this.deleteConfirmDialog.open(message);
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result !== 1) {
        return;
      }
      this.patientPayments.splice(
        this.patientPayments.findIndex((foundPayment) => foundPayment.id === payment.id),
        1,
      );
      this.refreshBalance();
      this.patientService.deletePayment(payment.id).catch((error) => {
        console.log('error: ' + JSON.stringify(error));
        this.getPatientPayments();
        this.notifyDeleteFailed();
      });
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
      this.refreshBalance();
      this.patientService.deleteTreatment(treatment.id).catch((error) => {
        console.log('error: ' + JSON.stringify(error));
        this.getPatientTreatments();
        this.notifyDeleteFailed();
      });
    });
  }

  private refreshBalance() {
    this.balance = buildBalanceLedger(
      this.patientTreatments,
      this.patientPayments,
      this.patientAppointments,
    );
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
    void this.pdfService
      .downloadPaymentReceiptPdf({
        payment,
        patient: this.patient,
        remainingBalance: this.balance.totalBalance,
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
            this.patientService.updatePatient(this.patient)
              .then(() => {
                this.notificationService.showSnackBarNotification(
                  'snackbar-success',
                  this.translate.instant('PATIENTS.PROFILE.MESSAGES.ATTACHMENT_DELETED_SUCCESS'),
                  'bottom',
                  'center',
                );
              })
              .catch((error) => {
                console.log('error: ' + JSON.stringify(error));
                this.notifySaveFailed();
              });
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
    // Inside a doctor's account the upload counts against his plan, which the storage rules have already checked.
    const isActing = this.clinicContext.isActing;
    if (!isActing && (this.doctor.subscription.storageBytesUsed + attachment.size > this.doctor.subscription.maxStorageLimitBytes || this.doctor.subscription.status !== 'active')) {
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
    this.patientService.updatePatient(this.patient).catch((error) => {
      console.log('error: ' + JSON.stringify(error));
      this.patient.attachments = (this.patient.attachments ?? []).filter((a) => a.url !== attachment.url);
      this.notifySaveFailed();
    });
    if (!isActing) {
      this.doctor.subscription.storageBytesUsed += attachment.size;
    }
    this.compressAttachments = true;
  }

  updatePatientNotes() {
    this.patientService.updatePatientNotes(this.patient.notes)
      .then(() => {
        this.notificationService.showSnackBarNotification(
          'black',
          this.translate.instant('PATIENTS.PROFILE.MESSAGES.EDIT_NOTES_SUCCESS'),
          'bottom',
          'center'
        );
      })
      .catch((error) => {
        console.log('error: ' + JSON.stringify(error));
        this.notifySaveFailed();
      });
  }

  private notifySaveFailed(): void {
    this.notificationService.showSnackBarNotification(
      'snackbar-danger',
      this.translate.instant('COMMON.SAVE_FAILED'),
      'bottom',
      'center'
    );
  }

  private notifyDeleteFailed(): void {
    this.notificationService.showSnackBarNotification(
      'snackbar-danger',
      this.translate.instant('COMMON.DELETE_FAILED'),
      'bottom',
      'center'
    );
  }

  protected readonly console = console;
  protected readonly window = window;
}
