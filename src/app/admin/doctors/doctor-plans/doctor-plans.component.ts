import { Component } from '@angular/core';
import {BreadcrumbComponent} from "@shared/components/breadcrumb/breadcrumb.component";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatTabsModule} from "@angular/material/tabs";
import {SharedModule} from "@shared";
import {PaymentService} from "@core/service/payment.service";
import {NotificationService} from "@core/service/notification.service";
import { PAYMENT_PLANS } from '@core/util/payment-plans';
import {finalize} from "rxjs/operators";
import {DoctorService} from "@core/service/doctor.service";
import { LegalPolicyFooterComponent } from '@shared/components/legal-policy-footer/legal-policy-footer.component';

@Component({
  selector: 'app-doctor-plans',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    SharedModule,
    LegalPolicyFooterComponent,
  ],
  templateUrl: './doctor-plans.component.html',
  styleUrl: './doctor-plans.component.scss'
})

export class DoctorPlansComponent {

  loading = false;
  billingPortalLoading = false;

  constructor(
    private paymentService: PaymentService,
    private notificationService: NotificationService,
    private doctorService: DoctorService,
  ) {

  }

  /** In-memory doctor from session (not re-fetched from Firestore on this page). */
  get doctor() {
    return this.doctorService.doctor;
  }

  readonly PAYMENT_PLANS = PAYMENT_PLANS;

  renewablePrices(plan: any) {
    return plan.prices.filter((price: any) => price.type === 'renewable');
  }

  nonRenewablePrices(plan: any) {
    return plan.prices.filter((price: any) => price.type === 'non-renewable');
  }

  //  array of selected prices
  selectedPrices: any[] = [
    PAYMENT_PLANS[0].prices[0], // For basic plan
    PAYMENT_PLANS[1]?.prices[0], // For pro plan
  ];

  pay(_plan: any, price: any) {
    this.loading = true;
    this.paymentService.createCheckoutSession(price.priceId).pipe(
      finalize(() => { this.loading = false; }),
    ).subscribe({
      next: (res) => {
        if (res?.url) {
          window.open(res.url, '_blank', 'noopener,noreferrer');
        }
      },
      error: (err: { message?: string }) => {
        this.notificationService.showSnackBarNotification(
          'snackbar-danger',
          err?.message ?? 'Unable to start checkout.',
          'bottom',
          'center',
        );
      },
    });
  }

  openBillingPortal() {
    this.billingPortalLoading = true;
    this.paymentService.createBillingPortalSession().pipe(
      finalize(() => { this.billingPortalLoading = false; }),
    ).subscribe({
      next: (res) => {
        if (res?.url) {
          window.open(res.url, '_blank', 'noopener,noreferrer');
        }
      },
      error: (err: { message?: string }) => {
        this.notificationService.showSnackBarNotification(
          'snackbar-danger',
          err?.message ?? 'Unable to open billing portal.',
          'bottom',
          'center',
        );
      },
    });
  }

}
