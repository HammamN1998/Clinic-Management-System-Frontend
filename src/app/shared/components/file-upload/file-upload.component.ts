/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { FirebaseStorageService } from '@core/service/firebase-storage.service';
import { finalize, from } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import firebase from 'firebase/compat';
import storage = firebase.storage;
import { Attachment } from '@core/models/patient.model';
import { NotificationService } from '@core/service/notification.service';
import { DoctorService } from '@core/service/doctor.service';
import { Router } from '@angular/router';
import {
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MAX_IMAGE_DIMENSION,
  FileUploadPreprocessorService,
  PrepareUploadResult,
  UploadPrepareError,
  UploadPrepareMode,
} from '@core/service/file-upload-preprocessor.service';

export interface PreparationSummary {
  originalSize: number;
  finalSize: number;
  compressed: boolean;
}

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
  imports: [MatButtonModule, MatProgressBarModule, MatProgressSpinnerModule, NgIf, TranslateModule],
})
export class FileUploadComponent implements ControlValueAccessor, OnInit {
  @Input() accept: string = '';
  @Input() rootFolder: string = '';
  @Input() name: string = '';
  @Input() maxFileBytes = DEFAULT_MAX_FILE_BYTES;
  @Input() maxImageDimension = DEFAULT_MAX_IMAGE_DIMENSION;
  @Input() uploadMode: UploadPrepareMode = 'attachments';
  /** For attachments only; profile uploads (imageOnly) always compress. */
  @Input() compressImages = true;

  @Output() progressPercentage = new EventEmitter<number>();
  @Output() downloadedAttachment = new EventEmitter<Attachment>();

  public file: File | null = null;
  public progressPercentageField = 0;
  public totalFileSize = 0;
  public isPreparing = false;
  public isUploading = false;
  public preparationSummary: PreparationSummary | null = null;

  constructor(
    private firebaseStorageService: FirebaseStorageService,
    private notificationService: NotificationService,
    private doctorService: DoctorService,
    private router: Router,
    private fileUploadPreprocessor: FileUploadPreprocessorService,
  ) {}

  ngOnInit(): void {
    if (
      this.uploadMode === 'attachments' &&
      this.accept &&
      /^image(\/\*|$)/i.test(this.accept.trim())
    ) {
      this.uploadMode = 'imageOnly';
    }
  }

  async uploadFile($event: Event): Promise<void> {
    const input = $event.target as HTMLInputElement;
    let feedback: storage.UploadTaskSnapshot;
    let prepared: PrepareUploadResult | null = null;

    this.file = input.files?.item(0) ?? null;
    this.preparationSummary = null;
    this.progressPercentageField = 0;

    if (this.file === null) {
      this.notificationService.showSwalOkDialog('No file selected', 'info');
      return;
    }

    const prepareOptions = {
      maxBytes: this.maxFileBytes,
      maxImageDimension: this.maxImageDimension,
      mode: this.uploadMode,
      compressImages: this.effectiveCompressImages,
    };
    const willCompress = this.fileUploadPreprocessor.willCompressImage(
      this.file,
      prepareOptions,
    );
    if (willCompress) {
      this.isPreparing = true;
    }
    try {
      prepared = await this.fileUploadPreprocessor.prepareForUpload(
        this.file,
        prepareOptions,
      );
      this.preparationSummary = {
        originalSize: prepared.originalSize,
        finalSize: prepared.finalSize,
        compressed: prepared.compressed,
      };
      this.file = prepared.file;
    } catch (error) {
      this.handlePrepareError(error);
      this.resetSelection(input);
      return;
    } finally {
      this.isPreparing = false;
    }

    if (
      this.doctorService.doctor.subscription.storageBytesUsed + prepared!.file.size >
        this.doctorService.doctor.subscription.maxStorageLimitBytes ||
      this.doctorService.doctor.subscription.status !== 'active'
    ) {
      this.notificationService.showSwalDialogWithFunction(
        this.doctorService.doctor.subscription.status !== 'active'
          ? 'Your plan is not active.'
          : 'Upgrade your plan to add more storage',
        this.doctorService.doctor.subscription.status !== 'active'
          ? 'Check your billing portal in plans page.'
          : `You have reached the maximum storage for your plan (${this.doctorService.doctor.subscription.maxStorageLimitBytes} bytes). \nYou can upgrade your plan to add more storage.`,
        'error',
        true,
        'Go to plan page',
        () => {
          this.router.navigate(['/admin/doctors/doctor-plans']);
        },
      );
      this.resetSelection(input);
      return;
    }

    const displayName =
      this.name.trim() === '' ? prepared!.file.name : this.name.trim();
    const storageFileName =
      this.uploadMode === 'attachments'
        ? this.buildUniqueStorageFileName(displayName)
        : displayName;

    this.isUploading = true;
    from(
      this.firebaseStorageService.uploadFile(
        prepared!.file,
        `${this.rootFolder}/${storageFileName}`,
        prepared!.contentType,
      ),
    )
      .pipe(
        finalize(() => {
          from(feedback!.ref.getDownloadURL()).subscribe({
            next: (url) => {
              this.downloadedAttachment.emit({
                url,
                name: displayName,
                type: prepared!.contentType,
                size: prepared!.file.size,
              });
              this.file = null;
              this.name = '';
              this.isUploading = false;
              this.resetSelection(input);
            },
            error: (err) => {
              console.log('error: ' + err);
              this.isUploading = false;
              this.resetSelection(input);
              this.notificationService.showSwalOkDialog(
                'Upload failed. Please try again.',
                'error',
              );
            },
          });
        }),
      )
      .subscribe({
        next: (result) => {
          this.progressPercentageField =
            (result!.bytesTransferred / result!.totalBytes) * 100;
          this.progressPercentage.emit(this.progressPercentageField);
          feedback = result!;
          this.totalFileSize = result!.totalBytes;
        },
        error: (err) => {
          console.log('error: ' + err);
          this.isUploading = false;
          this.resetSelection(input);
          this.notificationService.showSwalOkDialog(
            'Upload failed. Please try again.',
            'error',
          );
        },
      });
  }

  formatBytes(bytes: number): string {
    return this.fileUploadPreprocessor.formatBytes(bytes);
  }

  get isBusy(): boolean {
    return this.isPreparing || this.isUploading;
  }

  get effectiveCompressImages(): boolean {
    return this.uploadMode === 'imageOnly' || this.compressImages;
  }

  get showOptimizationHint(): boolean {
    return this.uploadMode === 'imageOnly' || this.compressImages;
  }

  private handlePrepareError(error: unknown): void {
    if (error instanceof UploadPrepareError) {
      const icon =
        error.code === 'UNSUPPORTED_TYPE' || error.code === 'FILE_TOO_LARGE'
          ? 'warning'
          : 'error';
      this.notificationService.showSwalOkDialog(error.message, icon);
      return;
    }
    this.notificationService.showSwalOkDialog(
      'Could not prepare file for upload.',
      'error',
    );
  }

  private buildUniqueStorageFileName(originalName: string): string {
    const safeName = originalName.replace(/[/\\]/g, '_').trim() || 'file';
    const lastDot = safeName.lastIndexOf('.');
    const base = lastDot > 0 ? safeName.slice(0, lastDot) : safeName;
    const ext = lastDot > 0 ? safeName.slice(lastDot) : '';
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return `${base}_${suffix}${ext}`;
  }

  private resetSelection(input: HTMLInputElement): void {
    input.value = '';
    if (!this.isUploading) {
      this.file = null;
    }
  }

  writeValue(value: null) {
    this.file = null;
  }

  registerOnChange(fn: Function) {}

  registerOnTouched(fn: Function) {}
}
