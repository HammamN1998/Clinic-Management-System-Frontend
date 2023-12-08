import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BillList } from './bill-list.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';

@Injectable({
  providedIn: 'root',
})

export class BillListService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = 'assets/data/billList.json';
  isTblLoading = true;
  dataChange: BehaviorSubject<BillList[]> = new BehaviorSubject<BillList[]>([]);
  // Temporarily stores data from dialogs
  dialogData!: BillList;
  constructor(private httpClient: HttpClient) {
    super();
  }
  get data(): BillList[] {
    return this.dataChange.value;
  }
  getDialogData() {
    return this.dialogData;
  }
  /** CRUD METHODS */
  getAllBillLists(): void {
    this.subs.sink = this.httpClient.get<BillList[]>(this.API_URL).subscribe({
      next: (data) => {
        this.isTblLoading = false;
        this.dataChange.next(data);
      },
      error: (error: HttpErrorResponse) => {
        this.isTblLoading = false;
        console.log(error.name + ' ' + error.message);
      },
    });
  }
  addBillList(billList: BillList): void {
    this.dialogData = billList;

    // this.httpClient.post(this.API_URL, billList)
    //   .subscribe({
    //     next: (data) => {
    //       this.dialogData = billList;
    //     },
    //     error: (error: HttpErrorResponse) => {
    //        // error code here
    //     },
    //   });
  }
  updateBillList(billList: BillList): void {
    this.dialogData = billList;

    // this.httpClient.put(this.API_URL + billList.id, billList)
    //     .subscribe({
    //       next: (data) => {
    //         this.dialogData = billList;
    //       },
    //       error: (error: HttpErrorResponse) => {
    //          // error code here
    //       },
    //     });
  }
  deleteBillList(id: number): void {
    console.log(id);

    // this.httpClient.delete(this.API_URL + id)
    //     .subscribe({
    //       next: (data) => {
    //         console.log(id);
    //       },
    //       error: (error: HttpErrorResponse) => {
    //          // error code here
    //       },
    //     });
  }
}
