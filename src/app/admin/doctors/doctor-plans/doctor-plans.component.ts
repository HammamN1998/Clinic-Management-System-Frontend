import { Component } from '@angular/core';
import {BreadcrumbComponent} from "@shared/components/breadcrumb/breadcrumb.component";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatTabsModule} from "@angular/material/tabs";
import {SharedModule} from "@shared";
import {PaymentService} from "@core/service/payment.service";
import {Router} from "@angular/router";
import {NotificationService} from "@core/service/notification.service";
import { PAYMENT_PLANS } from '@core/util/payment-plans';

@Component({
  selector: 'app-doctor-plans',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    SharedModule
  ],
  templateUrl: './doctor-plans.component.html',
  styleUrl: './doctor-plans.component.scss'
})

export class DoctorPlansComponent {

  loading = false;

  constructor(
    private paymentService: PaymentService,
    private router: Router,
    private notificationService: NotificationService,
  ) {

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
    PAYMENT_PLANS[1].prices[0], // For pro plan
  ];

  pay(plane: any, price: any) {
    // TODO: Implement payment logic
    console.log('plane:', plane)
    console.log('price:', price)
  }

}
