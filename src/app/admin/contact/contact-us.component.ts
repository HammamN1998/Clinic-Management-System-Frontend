import { Component } from '@angular/core';
import { NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroupDirective,
  NgForm,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ErrorStateMatcher, MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { LegalPolicyFooterComponent } from '@shared/components/legal-policy-footer/legal-policy-footer.component';
import { DoctorService } from '@core/service/doctor.service';
import { NotificationService } from '@core/service/notification.service';
import { PaymentService } from '@core/service/payment.service';
import { AnalyticsService } from '@core/service/analytics.service';
import { ContactService } from '@core/service/contact.service';
import { User } from '@core/models/user';
import { environment } from '../../../environments/environment';

const SUPPORT_CATEGORIES = [
  'billing',
  'account',
  'patients',
  'bug',
  'feature',
  'privacy',
  'other',
] as const;

@Component({
  selector: 'app-contact-us',
  templateUrl: './contact-us.component.html',
  styleUrls: ['./contact-us.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    LegalPolicyFooterComponent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    NgIf,
    NgFor,
    UpperCasePipe,
    TranslateModule,
  ],
  providers: [{ provide: ErrorStateMatcher, useExisting: ContactUsComponent }],
})
export class ContactUsComponent implements ErrorStateMatcher {
  readonly categories = SUPPORT_CATEGORIES;
  contactForm: UntypedFormGroup;
  submitted = false;
  sending = false;
  billingPortalLoading = false;

  constructor(
    private fb: UntypedFormBuilder,
    private doctorService: DoctorService,
    private contactService: ContactService,
    private notificationService: NotificationService,
    private paymentService: PaymentService,
    private analytics: AnalyticsService,
    private translate: TranslateService,
  ) {
    this.contactForm = this.createContactForm();
  }

  get doctor(): User {
    return this.doctorService.doctor;
  }

  get whatsappUrl(): string {
    const prefill = this.translate.instant('CONTACT.WHATSAPP.PREFILL', {
      name: this.doctor.name ?? '',
      email: this.doctor.email ?? '',
    });
    return `https://wa.me/${environment.supportContact.whatsappNumber}?text=${encodeURIComponent(prefill)}`;
  }

  get mailtoUrl(): string {
    const subject = this.translate.instant('CONTACT.EMAIL.SUBJECT');
    return `mailto:${environment.supportContact.email}?subject=${encodeURIComponent(subject)}`;
  }

  isErrorState(control: FormControl | null, _form: FormGroupDirective | NgForm | null): boolean {
    return !!(control && control.invalid && this.submitted);
  }

  private createContactForm(): UntypedFormGroup {
    return this.fb.group({
      category: ['', [Validators.required]],
      subject: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
    });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.contactForm.invalid) {
      return;
    }

    this.sending = true;
    this.contactService
      .submitRequest({
        category: this.contactForm.value.category,
        subject: String(this.contactForm.value.subject ?? '').trim(),
        description: String(this.contactForm.value.description ?? '').trim(),
      })
      .pipe(finalize(() => (this.sending = false)))
      .subscribe({
        next: () => {
          this.submitted = false;
          this.contactForm = this.createContactForm();
          this.notificationService.showSwalOkDialog(
            this.translate.instant('CONTACT.MESSAGES.SENT', { email: this.doctor.email ?? '' }),
            'success',
            'center',
            this.translate.instant('COMMON.OK'),
          );
        },
        error: (err: { message?: string }) => {
          this.notificationService.showSnackBarNotification(
            'snackbar-danger',
            err?.message ?? this.translate.instant('CONTACT.ERRORS.SEND_FAILED'),
            'bottom',
            'center',
          );
        },
      });
  }

  openBillingPortal(): void {
    this.billingPortalLoading = true;
    this.paymentService
      .createBillingPortalSession()
      .pipe(finalize(() => (this.billingPortalLoading = false)))
      .subscribe({
        next: (res) => {
          if (res?.url) {
            this.analytics.billingPortalOpened('contact_us');
            window.location.href = res.url;
          }
        },
        error: (err: { message?: string }) => {
          this.notificationService.showSnackBarNotification(
            'snackbar-danger',
            err?.message ?? this.translate.instant('DOCTORS.PLANS.MESSAGES.BILLING_PORTAL_ERROR'),
            'bottom',
            'center',
          );
        },
      });
  }
}
