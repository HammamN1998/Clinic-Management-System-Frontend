import { Component, Inject, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FileUploadComponent } from '@shared/components/file-upload/file-upload.component';
import { ClinicService } from '@core/service/clinic.service';
import { DoctorService } from '@core/service/doctor.service';
import { FirebaseStorageService } from '@core/service/firebase-storage.service';
import { Attachment } from '@core/models/patient.model';
import { CLINIC_NAME_MAX_LENGTH, ClinicBrand } from '@core/models/clinic.model';

/** Storage refuses to overwrite a file, and the replaced logo is deleted after saving, so every upload gets a new name. */
function newLogoFileName(): string {
  return `logo-${Date.now()}`;
}

/**
 * Edits the clinic name and logo the admin's doctors see. A logo uploaded here is kept only once
 * he saves; cancelling deletes it. Closes with `true` once saved.
 */
@Component({
  selector: 'app-branding-dialog',
  templateUrl: './branding-dialog.component.html',
  styleUrls: ['./branding-dialog.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslateModule,
    FileUploadComponent,
  ],
})
export class BrandingDialogComponent {
  readonly nameMaxLength = CLINIC_NAME_MAX_LENGTH;
  readonly name: FormControl<string>;
  readonly logoFolder: string;
  logoFileName = newLogoFileName();
  saving = false;
  error = '';
  /** Uploaded in this dialog and not saved yet. */
  private uploaded: Attachment | null = null;
  private logoRemoved = false;

  @ViewChild(FileUploadComponent, { static: true }) private uploader!: FileUploadComponent;

  constructor(
    private dialogRef: MatDialogRef<BrandingDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) private brand: ClinicBrand,
    private clinicService: ClinicService,
    doctorService: DoctorService,
    private storage: FirebaseStorageService,
    private translate: TranslateService,
  ) {
    this.name = new FormControl(brand.name, {
      nonNullable: true,
      validators: Validators.maxLength(CLINIC_NAME_MAX_LENGTH),
    });
    this.logoFolder = `doctors/${doctorService.doctor.id}/clinic-logo`;
  }

  get logo(): string {
    if (this.uploaded) {
      return this.uploaded.url;
    }
    return this.logoRemoved ? '' : this.brand.logo;
  }

  get uploading(): boolean {
    return this.uploader.isBusy;
  }

  get changed(): boolean {
    return this.name.value.trim() !== this.brand.name || this.logoChanged;
  }

  onUploaded(attachment: Attachment): void {
    this.discardUpload();
    this.uploaded = attachment;
    this.logoFileName = newLogoFileName();
  }

  removeLogo(): void {
    this.discardUpload();
    this.logoRemoved = true;
  }

  async save(): Promise<void> {
    const logoChanged = this.logoChanged;
    const uploaded = this.uploaded;
    this.saving = true;
    this.error = '';
    try {
      await this.clinicService.saveBrand(
        this.name.value.trim(),
        logoChanged ? { url: uploaded?.url ?? '', size: uploaded?.size ?? 0 } : undefined,
      );
    } catch (err) {
      console.error('Failed to save the clinic name and logo', err);
      this.error = this.translate.instant('CLINIC.BRANDING.SAVE_FAILED');
      this.saving = false;
      return;
    }
    if (logoChanged && this.brand.logo) {
      this.deleteFile(this.brand.logo);
    }
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.discardUpload();
    this.dialogRef.close(false);
  }

  private get logoChanged(): boolean {
    return !!this.uploaded || (this.logoRemoved && !!this.brand.logo);
  }

  private discardUpload(): void {
    if (this.uploaded) {
      this.deleteFile(this.uploaded.url);
      this.uploaded = null;
    }
  }

  private deleteFile(url: string): void {
    try {
      this.storage.deleteFile(url, this.logoFolder).subscribe({
        error: (err) => console.error('Failed to delete a clinic logo file', err),
      });
    } catch (err) {
      console.error('Failed to delete a clinic logo file', err);
    }
  }
}
