/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
import {Component, EventEmitter, HostListener, Input, Output} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {FirebaseStorageService} from "@core/service/firebase-storage.service";
import {finalize, from} from "rxjs";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {NgIf} from "@angular/common";
import firebase from "firebase/compat";
import storage = firebase.storage;
import {Attachment} from "@core/models/patient.model";
import { NotificationService } from '@core/service/notification.service';
import { DoctorService } from '@core/service/doctor.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-file-upload',
    templateUrl: './file-upload.component.html',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: FileUploadComponent,
            multi: true,
        },
    ],
    styleUrls: ['./file-upload.component.scss'],
    standalone: true,
  imports: [MatButtonModule, MatProgressBarModule, NgIf],
})
export class FileUploadComponent implements ControlValueAccessor {

  @Input() accept: string = '';
  @Input() rootFolder: string = '';
  @Input() name: string = '';
  @Output() progressPercentage = new EventEmitter<number>();
  @Output() downloadedAttachment = new EventEmitter<Attachment>();

  public file: File | null = null;
  public progressPercentageField: number = 0;
  public totalFileSize: number = 0; // in bytes
  constructor(
    private firebaseStorageService: FirebaseStorageService,
    private notificationService: NotificationService,
    private doctorService: DoctorService,
    private router: Router,
  ) { }

  uploadFile($event: any) {
    let feedback:  storage.UploadTaskSnapshot;
    this.file = $event.target.files.item(0) ?? null;
    if (this.file === null) {
      this.notificationService.showSwalNotification(
        'No file selected',
        'info',
        'center',
        false,
        true
      );
      return;
    }
    if (this.doctorService.doctor.subscription.storageBytesUsed + this.file!.size > this.doctorService.doctor.subscription.maxStorageLimitBytes || this.doctorService.doctor.subscription.status !== 'active') {
      this.notificationService.showSwalDialogWithFunction(
        this.doctorService.doctor.subscription.status !== 'active' ? 
          'Your plan is not active.' :
          'Upgrade your plan to add more storage',
        this.doctorService.doctor.subscription.status !== 'active' ? 
          'Check your billing portal in plans page.' :
          `You have reached the maximum storage for your plan (${this.doctorService.doctor.subscription.maxStorageLimitBytes} bytes). \nYou can upgrade your plan to add more storage.`,
        'error',
        true,
        'Go to plan page',
        () => {
          this.router.navigate(['/admin/doctors/doctor-plans']);
        }
      );
      this.file = null;
      this.name = '';
      return;
    }
    if (this.name.trim() === '') this.name = this.file?.name as string;
    from(this.firebaseStorageService.uploadFile(this.file!, `${this.rootFolder}/${this.name}`))
      .pipe(
        finalize(()=>{
          from(feedback!.ref.getDownloadURL())
          .subscribe({
            next: (url) => {
              this.downloadedAttachment.emit({
                url: url,
                name: this.name,
                type: this.file?.type ?? '',
                size: this.totalFileSize ?? 0
              });
              this.file = null;
              this.name = '';
            },
            error: (error) => {
              console.log('error: '+ error);
            }
          })
        })
      )
    .subscribe({
      next: (result) => {
        this.progressPercentageField = result!.bytesTransferred / result!.totalBytes * 100;
        this.progressPercentage.emit( result!.bytesTransferred / result!.totalBytes * 100);
        feedback = result!;
        this.totalFileSize = result!.totalBytes;
      },
      error: (error) => {
        console.log('error: ' + error);
      }
    });
  }

  writeValue(value: null) {
    this.file = null;
  }

  registerOnChange(fn: Function) {

  }

  registerOnTouched(fn: Function) {

  }

}
