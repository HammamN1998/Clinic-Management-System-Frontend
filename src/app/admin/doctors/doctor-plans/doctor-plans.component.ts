import { Component } from '@angular/core';
import {BreadcrumbComponent} from "@shared/components/breadcrumb/breadcrumb.component";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatTabsModule} from "@angular/material/tabs";
import {SharedModule} from "@shared";
import {PaymentService, PaymentType} from "@core/service/payment.service";
import {Router} from "@angular/router";
import {NotificationService} from "@core/service/notification.service";

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

  public get selectedPlane() {
    return this.paymentService.selectedPlane
  }
  public set selectedPlane(plane: PaymentType) {
    this.paymentService.selectedPlane = plane
  }

  protected readonly PaymentType = PaymentType;

  pay() {
    this.loading = true
    this.paymentService.initializePayment(this.selectedPlane).subscribe((result)=>{
      const status = result['status'];
      if (!status) {
        this.notificationService.showSnackBarNotification(
          'snackbar-danger',
          `error: ${result['message']}`,
          'bottom',
          'center'
        );
        this.loading = false
        return
      }
      this.loading = false
      window.open(result['data']['authorization_url'], '_blank');
    })
  }

}
