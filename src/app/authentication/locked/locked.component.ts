import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Role } from '@core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import {FirebaseAuthenticationService} from "../services/firebase-authentication.service";
@Component({
    selector: 'app-locked',
    templateUrl: './locked.component.html',
    styleUrls: ['./locked.component.scss'],
    standalone: true,
    imports: [
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        RouterLink,
    ],
})
export class LockedComponent implements OnInit {
  authForm!: UntypedFormGroup;
  submitted = false;
  userImg!: string;
  userFullName!: string;
  hide = true;
  constructor(
    private formBuilder: UntypedFormBuilder,
    private router: Router,
    private firebaseAuthenticationService: FirebaseAuthenticationService
  ) {
    // constuctor
  }
  ngOnInit() {
    this.authForm = this.formBuilder.group({
      password: ['', Validators.required],
    });
    this.userImg = this.firebaseAuthenticationService.currentUserValue.img;
    this.userFullName =
      this.firebaseAuthenticationService.currentUserValue.name
  }
  get f() {
    return this.authForm.controls;
  }
  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.authForm.invalid) {
      return;
    } else {
      const role = this.firebaseAuthenticationService.currentUserValue.role;
      if (role === Role.admin) {
        this.router.navigate(['/admin/dashboard/main']);
      } else if (role === Role.doctor) {
        this.router.navigate(['/doctor/dashboard']);
      } else if (role === Role.secretary) {
        this.router.navigate(['/patient/dashboard']);
      } else {
        this.router.navigate(['/authentication/signin']);
      }
    }
  }
}
