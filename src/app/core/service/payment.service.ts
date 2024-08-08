import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private initializeTransactionUrl = 'https://initializepaymenttransaction-6vzzsxjwxq-uc.a.run.app';

  selectedPlane: PaymentType = PaymentType.AnnualMonthly;

  constructor(
    private http: HttpClient,
    private firebaseAuthenticationService: FirebaseAuthenticationService,
  ) { }

  public get doctor() {
    return this.firebaseAuthenticationService.currentUserValue
  }

  initializePayment(amount: number): Observable<any> {
    return this.http.post( this.initializeTransactionUrl, {
      email: this.doctor.email,
      first_name: this.doctor.name,
      mobile: this.doctor.phoneNumber,
      amount: amount * 100,
      currency: 'USD',
      doctorId: this.doctor.id,
    },);
  }

}

export enum PaymentType {
  AnnualMonthly = 15,  // 15 per month
  AnnualUpfront = 144, // 12 per month
  MonthToMonth = 20    // 20 per month
}
