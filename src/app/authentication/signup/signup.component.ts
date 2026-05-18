import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import {FirebaseAuthenticationService} from "../services/firebase-authentication.service";
import {NgIf} from "@angular/common";
import { LegalPolicyFooterComponent } from '@shared/components/legal-policy-footer/legal-policy-footer.component';

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
    RouterLink,
    MatButtonModule,
    NgIf,
    LegalPolicyFooterComponent,
  ],
})
export class SignupComponent implements OnInit {
  authForm!: UntypedFormGroup;
  submitted = false;
  returnUrl!: string;
  hide = true;
  chide = true;
  loading = false;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private firebaseAuthenticationService: FirebaseAuthenticationService
  ) { }
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
