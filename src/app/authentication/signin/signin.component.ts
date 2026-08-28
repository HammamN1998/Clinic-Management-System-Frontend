import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FirebaseAuthenticationService } from "../services/firebase-authentication.service";
import {NgIf} from "@angular/common";
import { LegalPolicyFooterComponent } from '@shared/components/legal-policy-footer/legal-policy-footer.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

const GOOGLE_AUTH_TIMEOUT_MS = 25000;

@Component({
    selector: 'app-signin',
    templateUrl: './signin.component.html',
    styleUrls: ['./signin.component.scss'],
    standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NgIf,
    LegalPolicyFooterComponent,
    TranslateModule,
  ],
})
export class SigninComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  authForm!: UntypedFormGroup;
  submitted = false;
  loading = false;
  googleLoading = false;
  error = '';
  hide = true;
  showEmailForm = false;
  private googleAuthTimer?: ReturnType<typeof setTimeout>;
  constructor(
    private formBuilder: UntypedFormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private translate: TranslateService
  ) {
    super();
  }

  ngOnInit() {
    this.authForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }
  get f() {
    return this.authForm.controls;
  }
  adminSet() {
    this.authForm.get('username')?.setValue('admin@hospital.org');
    this.authForm.get('password')?.setValue('admin@123');
  }
  doctorSet() {
    this.authForm.get('username')?.setValue('doctor@hospital.org');
    this.authForm.get('password')?.setValue('doctor@123');
  }
  patientSet() {
    this.authForm.get('username')?.setValue('patient@hospital.org');
    this.authForm.get('password')?.setValue('patient@123');
  }
  toggleEmailForm() {
    this.showEmailForm = !this.showEmailForm;
    this.error = '';
  }

  signInWithGoogle() {
    this.googleLoading = true;
    this.error = '';
    // A successful sign-in navigates away and destroys this component, so the
    // timer only ever fires when the flow stalls and would otherwise leave the
    // button disabled forever.
    this.googleAuthTimer = setTimeout(() => {
      this.googleLoading = false;
      this.error = this.translate.instant('AUTH.GOOGLE.TIMEOUT');
    }, GOOGLE_AUTH_TIMEOUT_MS);
    this.subs.sink = this.firebaseAuthenticationService.loginWithGoogle().subscribe({
      next: () => {
        // Navigation is handled by the auth state listener.
      },
      error: (error) => {
        this.clearGoogleAuthTimer();
        this.error = this.firebaseAuthenticationService.googleSignInErrorMessage(error) ?? '';
        this.googleLoading = false;
      },
    });
  }

  private clearGoogleAuthTimer() {
    if (this.googleAuthTimer !== undefined) {
      clearTimeout(this.googleAuthTimer);
      this.googleAuthTimer = undefined;
    }
  }

  override ngOnDestroy() {
    this.clearGoogleAuthTimer();
    super.ngOnDestroy();
  }

  onSubmit() {
    this.submitted = true;
    this.loading = true;
    this.error = '';
    if (this.authForm.invalid) {
      this.error = 'Username and Password not valid !';
      return;
    } else {
      this.subs.sink = this.firebaseAuthenticationService
      .login(this.f['username'].value, this.f['password'].value)
      .subscribe({
        next: () => {

        },
        error: (error) => {
          console.log('login failed: '+ error);
          this.error = error;
          this.submitted = false;
          this.loading = false;
        },
      });
    }
  }
}
