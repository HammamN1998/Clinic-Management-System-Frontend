import { Component, OnInit } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import {FirebaseAuthenticationService} from "../../../authentication/services/firebase-authentication.service";
import {MatTooltipModule} from "@angular/material/tooltip";
import {EditableTextComponent} from "@shared/components/editable-text/editable-text.component";
import {DoctorService} from "@core/service/doctor.service";
import {User} from "@core";
import {firstValueFrom, from} from "rxjs";
import {NotificationService} from "@core/service/notification.service";
import {UntypedFormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import {SharedModule} from "@shared";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {FileUploadComponent} from "@shared/components/file-upload/file-upload.component";
import {FirebaseStorageService} from "@core/service/firebase-storage.service";
import {isNullOrUndefined} from "@swimlane/ngx-datatable";
import { Attachment } from '@core/models/patient.model';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService } from '@core/service/patient.service';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import { OnboardingService } from '@core/service/onboarding.service';
import { getDoctorTitlePrefix } from '@core/util/doctor-title.util';

@Component({
  selector: 'app-doctor-profile',
  templateUrl: './doctor-profile.component.html',
  styleUrls: ['./doctor-profile.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatTabsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTooltipModule,
    EditableTextComponent,
    SharedModule,
    FileUploadComponent,
    TranslateModule,
  ],
})
export class DoctorProfileComponent implements OnInit {
  accountSettingsForm: UntypedFormGroup;
  showUploadProfilePicture: boolean = false;
  showUploadLogo: boolean = false;
  isEmailVerified: boolean = false;
  selectedTabIndex = 0;

  constructor(
    private doctorService: DoctorService,
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private notificationService: NotificationService,
    private fb: UntypedFormBuilder,
    private auth: AngularFireAuth,
    private firebaseStorageService: FirebaseStorageService,
    private router: Router,
    private route: ActivatedRoute,
    private patientService: PatientService,
    private translate: TranslateService,
    private onboardingService: OnboardingService,
  ) {
    this.accountSettingsForm = this.createAccountSettingsForm();
    this.checkIfEmailVerified();
  }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('tab') === 'settings') {
      this.selectedTabIndex = 1;
    }
  }

  get doctor () : User{
    return this.firebaseAuthenticationService.currentUserValue
  }

  get doctorTitlePrefix(): string {
    return getDoctorTitlePrefix(this.doctor.name);
  }

  editDoctorEducation($event: string) {
    from(this.doctorService.editDoctor({'education': $event}))
    .subscribe({
      next: () => {
        this.notificationService.showSnackBarNotification(
          'black',
          this.translate.instant('DOCTORS.PROFILE.MESSAGES.UPDATE_EDUCATION_SUCCESS'),
          'bottom',
          'center'
        );
      },
      error: (error) => {
        console.log('error: ' + error)
      }
    })
  }

  editDoctorExperience($event: string) {
    from(this.doctorService.editDoctor({'experience': $event}))
    .subscribe({
      next: () => {
        this.notificationService.showSnackBarNotification(
          'black',
          this.translate.instant('DOCTORS.PROFILE.MESSAGES.UPDATE_EXPERIENCE_SUCCESS'),
          'bottom',
          'center'
        );
      },
      error: (error) => {
        console.log('error: ' + error)
      }
    })
  }

  editDoctorAbout($event: string) {
    from(this.doctorService.editDoctor({'about': $event}))
    .subscribe({
      next: () => {
        this.notificationService.showSnackBarNotification(
          'black',
          this.translate.instant('DOCTORS.PROFILE.MESSAGES.UPDATE_ABOUT_SUCCESS'),
          'bottom',
          'center'
        );
      },
      error: (error) => {
        console.log('error: ' + error)
      }
    })
  }

  private createAccountSettingsForm() {
    return this.fb.group({
      name: [this.doctor.name, [Validators.required]],
      phoneNumber: [this.doctor.phoneNumber, [Validators.minLength(9)]],
      address: [this.doctor.address],
    });
  }

  editDoctorSettings() {
    from (this.auth.currentUser)
    .subscribe({
      next: (user) => {
        try {
          user!.updateProfile({
            displayName: this.accountSettingsForm.value.name,
          })
          this.doctorService.editDoctor({phoneNumber: this.accountSettingsForm.value.phoneNumber, name: this.accountSettingsForm.value.name, address: this.accountSettingsForm.value.address});
          firstValueFrom(this.firebaseAuthenticationService.updateStripeCustomerName(this.doctor.id, this.accountSettingsForm.value.name));
          // Update local instance
          this.doctor.name = this.accountSettingsForm.value.name;
          this.doctor.phoneNumber = this.accountSettingsForm.value.phoneNumber;
          this.doctor.address = this.accountSettingsForm.value.address;
          this.onboardingService.recordProfileIfComplete();
          this.notificationService.showSnackBarNotification(
            'snackbar-success',
            this.translate.instant('DOCTORS.PROFILE.MESSAGES.UPDATE_SETTINGS_SUCCESS'),
            'bottom',
            'center'
          );
        } catch (error) {
          console.log('error: ' + error)
        }
      },
      error: (error) => {
        console.log('error: ' + error)
      }
    })
  }

  updateDoctorProfilePicture(attachment: Attachment) {
    if (!this.hasStorageQuotaFor(attachment.size)) {
      return;
    }
    if (isNullOrUndefined(this.doctor.img) || this.doctor.img === '') {
      this.doctor.img = attachment.url;
      this.doctor.imgSize = attachment.size;
      this.doctorService.editDoctor({ img: attachment.url, imgSize: attachment.size });
      this.doctor.subscription.storageBytesUsed += attachment.size;
      this.showUploadProfilePicture = false;
    } else {
      const oldImgSize = this.doctor.imgSize;
      const oldImgUrl = this.doctor.img;
      this.firebaseStorageService.deleteFile(oldImgUrl).subscribe({
        next: () => {
          this.doctor.img = attachment.url;
          this.doctor.imgSize = attachment.size;
          this.doctorService.editDoctor({
            img: attachment.url,
            imgSize: attachment.size,
          });
          this.doctor.subscription.storageBytesUsed += attachment.size - oldImgSize;
          this.showUploadProfilePicture = false;
        },
        error: (error) => {
          console.log('error: ' + error);
          this.notificationService.showSwalOkDialog(
            this.translate.instant('DOCTORS.PROFILE.MESSAGES.REPLACE_IMAGE_ERROR'),
            'error',
          );
        },
      });
    }
  }

  private hasStorageQuotaFor(size: number): boolean {
    if (
      this.doctor.subscription.storageBytesUsed + size >
        this.doctor.subscription.maxStorageLimitBytes ||
      this.doctor.subscription.status !== 'active'
    ) {
      this.notificationService.showSwalDialogWithFunction(
        this.doctor.subscription.status !== 'active'
          ? this.translate.instant('PATIENTS.MESSAGES.PLAN_INACTIVE_TITLE')
          : this.translate.instant('PATIENTS.PROFILE.MESSAGES.UPGRADE_STORAGE_TITLE'),
        this.doctor.subscription.status !== 'active'
          ? this.translate.instant('PATIENTS.MESSAGES.PLAN_INACTIVE_TEXT')
          : this.translate.instant('PATIENTS.PROFILE.MESSAGES.UPGRADE_STORAGE_TEXT', {
              bytes: this.doctor.subscription.maxStorageLimitBytes,
            }),
        'error',
        true,
        this.translate.instant('PATIENTS.MESSAGES.GO_TO_PLAN'),
        () => {
          this.router.navigate(['/admin/doctors/doctor-plans']);
        },
      );
      return false;
    }
    return true;
  }

  updateDoctorLogo(attachment: Attachment) {
    if (!this.hasStorageQuotaFor(attachment.size)) {
      return;
    }
    if (isNullOrUndefined(this.doctor.logo) || this.doctor.logo === '') {
      this.doctor.logo = attachment.url;
      this.doctor.logoSize = attachment.size;
      this.doctorService.editDoctor({ logo: attachment.url, logoSize: attachment.size });
      this.doctor.subscription.storageBytesUsed += attachment.size;
      this.notificationService.showSnackBarNotification(
        'snackbar-success',
        this.translate.instant('DOCTORS.PROFILE.MESSAGES.UPDATE_LOGO_SUCCESS'),
        'bottom',
        'center',
      );
      this.showUploadLogo = false;
      this.onboardingService.recordProfileIfComplete();
    } else {
      const oldLogoSize = this.doctor.logoSize;
      const oldLogoUrl = this.doctor.logo;
      this.firebaseStorageService.deleteFile(oldLogoUrl).subscribe({
        next: () => {
          this.doctor.logo = attachment.url;
          this.doctor.logoSize = attachment.size;
          this.doctorService.editDoctor({
            logo: attachment.url,
            logoSize: attachment.size,
          });
          this.doctor.subscription.storageBytesUsed += attachment.size - oldLogoSize;
          this.notificationService.showSnackBarNotification(
            'snackbar-success',
            this.translate.instant('DOCTORS.PROFILE.MESSAGES.UPDATE_LOGO_SUCCESS'),
            'bottom',
            'center',
          );
          this.showUploadLogo = false;
          this.onboardingService.recordProfileIfComplete();
        },
        error: (error) => {
          console.log('error: ' + error);
          this.notificationService.showSwalOkDialog(
            this.translate.instant('DOCTORS.PROFILE.MESSAGES.REPLACE_IMAGE_ERROR'),
            'error',
          );
        },
      });
    }
  }

  deleteDoctorProfilePicture() {
    if (isNullOrUndefined(this.doctor.img) || this.doctor.img === '') {
      return;
    }
    this.notificationService.showSwalDialogWithFunction(
      this.translate.instant('DOCTORS.PROFILE.DELETE_IMAGE_CONFIRM_TITLE'),
      this.translate.instant('DOCTORS.PROFILE.DELETE_IMAGE_CONFIRM_TEXT'),
      'warning',
      true,
      this.translate.instant('COMMON.DELETE'),
      () => {
        const oldImgSize = this.doctor.imgSize;
        const oldImgUrl = this.doctor.img;
        this.firebaseStorageService.deleteFile(oldImgUrl).subscribe({
          next: () => {
            this.doctor.img = '';
            this.doctor.imgSize = 0;
            this.doctorService.editDoctor({ img: '', imgSize: 0 });
            this.doctor.subscription.storageBytesUsed -= oldImgSize;
            this.showUploadProfilePicture = false;
            this.notificationService.showSnackBarNotification(
              'snackbar-success',
              this.translate.instant('DOCTORS.PROFILE.MESSAGES.DELETE_IMAGE_SUCCESS'),
              'bottom',
              'center',
            );
          },
          error: (error) => {
            console.log('error: ' + error);
            this.notificationService.showSwalOkDialog(
              this.translate.instant('DOCTORS.PROFILE.MESSAGES.REPLACE_IMAGE_ERROR'),
              'error',
            );
          },
        });
      },
    );
  }

  deleteDoctorLogo() {
    if (isNullOrUndefined(this.doctor.logo) || this.doctor.logo === '') {
      return;
    }
    this.notificationService.showSwalDialogWithFunction(
      this.translate.instant('DOCTORS.PROFILE.DELETE_LOGO_CONFIRM_TITLE'),
      this.translate.instant('DOCTORS.PROFILE.DELETE_LOGO_CONFIRM_TEXT'),
      'warning',
      true,
      this.translate.instant('COMMON.DELETE'),
      () => {
        const oldLogoSize = this.doctor.logoSize;
        const oldLogoUrl = this.doctor.logo;
        this.firebaseStorageService.deleteFile(oldLogoUrl).subscribe({
          next: () => {
            this.doctor.logo = '';
            this.doctor.logoSize = 0;
            this.doctorService.editDoctor({ logo: '', logoSize: 0 });
            this.doctor.subscription.storageBytesUsed -= oldLogoSize;
            this.showUploadLogo = false;
            this.notificationService.showSnackBarNotification(
              'snackbar-success',
              this.translate.instant('DOCTORS.PROFILE.MESSAGES.DELETE_LOGO_SUCCESS'),
              'bottom',
              'center',
            );
          },
          error: (error) => {
            console.log('error: ' + error);
            this.notificationService.showSwalOkDialog(
              this.translate.instant('DOCTORS.PROFILE.MESSAGES.REPLACE_IMAGE_ERROR'),
              'error',
            );
          },
        });
      },
    );
  }

  async checkIfEmailVerified() {
    this.isEmailVerified = await this.firebaseAuthenticationService.isEmailVerified();
  }
  sendEmailVerificationCode() {
    this.firebaseAuthenticationService.sendEmailVerificationCode();
  }

  get needsPhoneForSetup(): boolean {
    return !this.doctor.phoneNumber?.trim();
  }

  get needsLogoForSetup(): boolean {
    return isNullOrUndefined(this.doctor.logo) || this.doctor.logo === '';
  }

  get showSetupEncouragement(): boolean {
    return this.needsPhoneForSetup || this.needsLogoForSetup;
  }

  protected readonly isNullOrUndefined = isNullOrUndefined;
}
