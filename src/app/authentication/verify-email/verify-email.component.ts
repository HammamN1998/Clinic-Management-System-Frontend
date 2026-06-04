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
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, FormsModule, TranslateModule],
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
    private router: Router,
    private translate: TranslateService
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
      this.info = this.translate.instant('AUTH.VERIFY.MESSAGES.RESEND_SUCCESS');
    } catch (e) {
      this.error = this.translate.instant('AUTH.VERIFY.MESSAGES.RESEND_ERROR', { error: e });
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
        
        // refresh the page
        window.location.reload();
      } else {
        this.info = this.translate.instant('AUTH.VERIFY.MESSAGES.STILL_NOT_VERIFIED');
      }
    } catch (e) {
      this.error = this.translate.instant('AUTH.VERIFY.MESSAGES.CONFIRM_ERROR');
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
      this.error = this.translate.instant('AUTH.VERIFY.MESSAGES.ENTER_NEW_EMAIL');
      this.changeEmailLoading = false;
      return;
    }
    if (!password) {
      this.error = this.translate.instant('AUTH.VERIFY.MESSAGES.ENTER_PASSWORD');
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
      this.info = this.translate.instant('AUTH.VERIFY.MESSAGES.CHANGE_EMAIL_SENT');

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
        return this.translate.instant('AUTH.VERIFY.MESSAGES.WRONG_PASSWORD');
      case 'auth/requires-recent-login':
        return this.translate.instant('AUTH.VERIFY.MESSAGES.REQUIRES_RECENT_LOGIN');
      case 'auth/email-already-in-use':
        return this.translate.instant('AUTH.VERIFY.MESSAGES.EMAIL_IN_USE');
      case 'auth/invalid-email':
        return this.translate.instant('AUTH.VERIFY.MESSAGES.INVALID_EMAIL');
      case 'auth/operation-not-allowed':
        return this.translate.instant('AUTH.VERIFY.MESSAGES.OPERATION_NOT_ALLOWED');
      default:
        return this.translate.instant('AUTH.VERIFY.MESSAGES.UPDATE_EMAIL_ERROR', { error: error?.message ?? '' }).trim();
    }
  }
}

