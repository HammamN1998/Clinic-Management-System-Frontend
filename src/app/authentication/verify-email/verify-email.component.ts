import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { FirebaseAuthenticationService } from '../services/firebase-authentication.service';
import { FormsModule } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, FormsModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
})
export class VerifyEmailComponent {
  loading = false;
  resendLoading = false;
  changeEmailLoading = false;
  error = '';
  info = '';
  email = '';
  newEmail = '';
  currentPassword = '';
  showChangeEmailForm = false;

  constructor(
    private auth: AngularFireAuth,
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private firestore: AngularFirestore,
    private router: Router
  ) {
    void this.loadEmail();
  }

  private async loadEmail() {
    const user = this.firebaseAuthenticationService.currentUserValue;
    this.email = user?.email ?? '';
  }

  async resendVerificationEmail() {
    this.resendLoading = true;
    this.error = '';
    this.info = '';
    try {
      await this.firebaseAuthenticationService.sendEmailVerificationCode();
      this.info = 'Verification email sent. Please check your inbox.';
    } catch (e) {
      this.error = 'Failed to resend verification email. ' + e;
    } finally {
      this.resendLoading = false;
    }
  }

  async continueIfVerified() {
    this.loading = true;
    this.error = '';
    this.info = '';
    try {
      const user = await this.auth.currentUser;
      if (!user) {
        await this.router.navigate(['/authentication/signin']);
        return;
      }
      await user.reload();
      if (user.emailVerified) {
        // Sync Firestore email with Firebase Auth email after verification.
        // (Needed because some projects require verifying new email before email is changed.)
        if (user.email) {
          await this.firestore.collection('doctors').doc(user.uid).update({ email: user.email });
          this.email = user.email;
        }
        await this.router.navigate(['/admin/dashboard/main']);
      } else {
        this.info = 'Still not verified. Please check your inbox and click the verification link.';
      }
    } catch (e) {
      this.error = 'Could not confirm verification status. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async logout() {
    this.firebaseAuthenticationService.logout();
  }

  async changeEmail() {
    this.changeEmailLoading = true;
    this.error = '';
    this.info = '';

    const newEmail = this.newEmail.trim();
    const password = this.currentPassword;

    if (!newEmail) {
      this.error = 'Please enter a new email address.';
      this.changeEmailLoading = false;
      return;
    }
    if (!password) {
      this.error = 'Please enter your current password.';
      this.changeEmailLoading = false;
      return;
    }

    try {
      const user = await this.auth.currentUser;
      if (!user || !user.email) {
        await this.router.navigate(['/authentication/signin']);
        return;
      }

      const cred = firebase.auth.EmailAuthProvider.credential(user.email, password);
      await user.reauthenticateWithCredential(cred);
      if (typeof (user as any).verifyBeforeUpdateEmail !== 'function') {
        throw new Error('verifyBeforeUpdateEmail is not available.');
      }

      await (user as any).verifyBeforeUpdateEmail(newEmail);
      this.info = 'We sent a verification link to your new email address. Click it to finish updating your email.';

      this.newEmail = '';
      this.currentPassword = '';
      this.showChangeEmailForm = false;
    } catch (e: any) {
      this.error = this.mapChangeEmailError(e);
    } finally {
      this.changeEmailLoading = false;
    }
  }

  toggleChangeEmailForm() {
    this.showChangeEmailForm = !this.showChangeEmailForm;
    this.error = '';
    this.info = '';
    if (!this.showChangeEmailForm) {
      this.newEmail = '';
      this.currentPassword = '';
    }
  }

  private mapChangeEmailError(error: any): string {
    const code = error?.code as string | undefined;
    switch (code) {
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/requires-recent-login':
        return 'Please sign in again and retry updating your email.';
      case 'auth/email-already-in-use':
        return 'This email is already in use.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/operation-not-allowed':
        return 'Email update is not allowed until the new email is verified. Please use the verification link sent to your new email.';
      default:
        return `Failed to update email. ${error?.message ?? ''}`.trim();
    }
  }
}

