import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import {FirebaseAuthenticationService} from "../services/firebase-authentication.service";
import {NgIf} from "@angular/common";
import { LegalPolicyFooterComponent } from '@shared/components/legal-policy-footer/legal-policy-footer.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

const GOOGLE_AUTH_TIMEOUT_MS = 25000;

@Component({
    selector: 'app-signup',
    templateUrl: './signup.component.html',
    styleUrls: ['./signup.component.scss'],
    standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
    MatButtonModule,
    NgIf,
    LegalPolicyFooterComponent,
    TranslateModule,
  ],
})
export class SignupComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  authForm!: UntypedFormGroup;
  submitted = false;
  returnUrl!: string;
  hide = true;
  chide = true;
  loading = false;
  googleLoading = false;
  error = '';
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
      email: [
        '',
        [Validators.required, Validators.email, Validators.minLength(5)],
      ],
      password: ['', Validators.required],
      cpassword: ['', Validators.required],
    });
    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }
  get f() {
    return this.authForm.controls;
  }
  toggleEmailForm() {
    this.showEmailForm = !this.showEmailForm;
    this.error = '';
  }

  signUpWithGoogle() {
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

  async onSubmit() {
    this.submitted = true;
    this.loading = true;
    if (this.authForm.invalid) {
      this.loading = false;
      return;
    }
    try {
      await this.firebaseAuthenticationService.signup(
        this.f['email'].value,
        this.f['password'].value,
        this.f['username'].value,
      );
    } catch (error) {
      console.log('signup failed: ' + JSON.stringify(error));
    } finally {
      this.loading = false;
    }
  }
}
