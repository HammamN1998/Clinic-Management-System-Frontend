import { Component } from '@angular/core';
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
import {from} from "rxjs";
import {NotificationService} from "@core/service/notification.service";
import {UntypedFormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import {SharedModule} from "@shared";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {FileUploadComponent} from "@shared/components/file-upload/file-upload.component";
import {FirebaseStorageService} from "@core/service/firebase-storage.service";
import {isNullOrUndefined} from "@swimlane/ngx-datatable";
import {sendEmailVerification} from "@angular/fire/auth";

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
  ],
})
export class DoctorProfileComponent {
  accountSettingsForm: UntypedFormGroup;
  doctorSecretaries: User[] = [];
  connectSecretaryEmail: string = '';
  showUploadProfilePicture: boolean = false;
  isEmailVerified: boolean = false

  constructor(
    private doctorService: DoctorService,
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private notificationService: NotificationService,
    private fb: UntypedFormBuilder,
    private auth: AngularFireAuth,
    private firebaseStorageService: FirebaseStorageService,
  ) {
    this.accountSettingsForm = this.createAccountSettingsForm();
    this.getDoctorSecretaries();
    this.checkIfEmailVerified();
  }

  get doctor () : User{
    return this.firebaseAuthenticationService.currentUserValue
  }

  editDoctorEducation($event: string) {
    from(this.doctorService.editDoctor({'education': $event}))
    .subscribe({
      next: () => {
        this.notificationService.showSnackBarNotification(
          'black',
          'Update Education Successfully...!!!',
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
          'Update Experience Successfully...!!!',
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
          'Update About Section Successfully...!!!',
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
      name: [this.doctor.name, [Validators.required, Validators.minLength(6)]],
      phoneNumber: [this.doctor.phoneNumber, [Validators.minLength(9)]],
      address: [this.doctor.address],
    });
  }

  editDoctorSettings() {
    from (this.auth.currentUser)
    .subscribe({
      next: (user) => {
        user!.updateProfile({
          displayName: this.accountSettingsForm.value.name,
        })
        this.doctorService.editDoctor({phoneNumber: this.accountSettingsForm.value.phoneNumber});
        this.doctorService.editDoctor({address: this.accountSettingsForm.value.address});
        this.doctorService.editDoctor({name: this.accountSettingsForm.value.name});
        // Update local instance
        this.doctor.name = this.accountSettingsForm.value.name;
        this.doctor.phoneNumber = this.accountSettingsForm.value.phoneNumber;
        this.doctor.address = this.accountSettingsForm.value.address;
        this.notificationService.showSnackBarNotification(
          'snackbar-success',
          'Update Settings Successfully...!!!',
          'bottom',
          'center'
        );
      },
      error: (error) => {
        console.log('error: ' + error)
      }
    })
  }

  getDoctorSecretaries() {
    this.doctorSecretaries = [];
    from(this.doctorService.getDoctorSecretaries())
    .subscribe({
      next: (secretaries) => {
        secretaries.docs.map((secretary) => {
          this.doctorSecretaries.push(secretary.data() as User);
        })
      }
    });
  }

  connectSecretary() {
    from(this.doctorService.connectSecretary(this.connectSecretaryEmail))
    .subscribe({
      next: () => {
        this.notificationService.showSnackBarNotification(
          'snackbar-success',
          'Connect Secretary Successfully...!!!',
          'bottom',
          'center'
        );
        this.getDoctorSecretaries();
        this.connectSecretaryEmail ='';
      }
    })
  }

  disconnectSecretary() {
    from(this.doctorService.disconnectSecretary(this.connectSecretaryEmail))
    .subscribe({
      next: () => {
        this.notificationService.showSnackBarNotification(
          'snackbar-danger',
          'Disconnect Secretary Successfully...!!!',
          'bottom',
          'center'
        );
        this.getDoctorSecretaries();
        this.connectSecretaryEmail ='';
      }
    })
  }

  updateDoctorProfilePicture(url: string) {
    if(!isNullOrUndefined(this.doctor.img)) this.firebaseStorageService.deleteFile(this.doctor.img);
    this.doctor.img = url;
    from (this.auth.currentUser)
    .subscribe({
      next: (user) => {
        user!.updateProfile({
          photoURL: url,
        })
        this.doctorService.editDoctor({img: url});
      },
      error: (error) => {
        console.log('error: ' + error)
      }
    })
    this.showUploadProfilePicture = !this.showUploadProfilePicture;
  }

  async checkIfEmailVerified() {
    this.isEmailVerified = await this.firebaseAuthenticationService.isEmailVerified();
  }
  sendEmailVerificationCode() {
    this.firebaseAuthenticationService.sendEmailVerificationCode();
  }

  protected readonly isNullOrUndefined = isNullOrUndefined;
}
