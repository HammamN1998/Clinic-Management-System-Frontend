import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AmbulanceCallList } from './ambulance-call-list.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';

@Injectable({
  providedIn: 'root',
})
export class AmbulanceCallListService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = 'assets/data/ambulanceCallList.json';
  isTblLoading = true;
  dataChange: BehaviorSubject<AmbulanceCallList[]> = new BehaviorSubject<
    AmbulanceCallList[]
  >([]);
  // Temporarily stores data from dialogs
  dialogData!: AmbulanceCallList;
  constructor(private httpClient: HttpClient) {
    super();
  }
  get data(): AmbulanceCallList[] {
    return this.dataChange.value;
  }
  getDialogData() {
    return this.dialogData;
  }
  /** CRUD METHODS */
  getAllAmbulanceCallLists(): void {
    this.subs.sink = this.httpClient
      .get<AmbulanceCallList[]>(this.API_URL)
      .subscribe({
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
  addAmbulanceCallList(ambulanceCallList: AmbulanceCallList): void {
    this.dialogData = ambulanceCallList;

    // this.httpClient.post(this.API_URL, ambulanceCallList)
    //   .subscribe({
    //     next: (data) => {
    //       this.dialogData = ambulanceCallList;
    //     },
    //     error: (error: HttpErrorResponse) => {
    //        // error code here
    //     },
    //   });
  }
  updateAmbulanceCallList(ambulanceCallList: AmbulanceCallList): void {
    this.dialogData = ambulanceCallList;

    // this.httpClient.put(this.API_URL + ambulanceCallList.id, ambulanceCallList)
    //     .subscribe({
    //       next: (data) => {
    //         this.dialogData = ambulanceCallList;
    //       },
    //       error: (error: HttpErrorResponse) => {
    //          // error code here
    //       },
    //     });
  }
  deleteAmbulanceCallList(id: number): void {
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
