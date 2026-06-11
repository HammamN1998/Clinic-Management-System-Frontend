import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { OnboardingService, OnboardingStatus } from '@core/service/onboarding.service';

interface ChecklistStep {
  titleKey: string;
  descriptionKey: string;
  link: string[];
  queryParams?: Record<string, string>;
  done: boolean;
}

/**
 * Dashboard first-run checklist that nudges a new clinic through the three
 * activation milestones. Hidden once every step is complete, snoozed, or
 * permanently dismissed.
 */
@Component({
  selector: 'app-onboarding-checklist',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './onboarding-checklist.component.html',
  styleUrls: ['./onboarding-checklist.component.scss'],
})
export class OnboardingChecklistComponent implements OnInit {
  status?: OnboardingStatus;
  steps: ChecklistStep[] = [];
  visible = false;

  constructor(private readonly onboarding: OnboardingService) {}

  async ngOnInit(): Promise<void> {
    const status = await this.onboarding.getStatus();
    this.status = status;
    this.visible = !status.dismissed && !status.allComplete;
    this.steps = [
      {
        titleKey: 'ONBOARDING.STEPS.PROFILE.TITLE',
        descriptionKey: 'ONBOARDING.STEPS.PROFILE.DESC',
        link: ['/admin/doctors/doctor-profile'],
        queryParams: { tab: 'settings' },
        done: status.profileCompleted,
      },
      {
        titleKey: 'ONBOARDING.STEPS.PATIENT.TITLE',
        descriptionKey: 'ONBOARDING.STEPS.PATIENT.DESC',
        link: ['/admin/patients/add-patient'],
        done: status.patientAdded,
      },
      {
        titleKey: 'ONBOARDING.STEPS.APPOINTMENT.TITLE',
        descriptionKey: 'ONBOARDING.STEPS.APPOINTMENT.DESC',
        link: ['/admin/patients/all-patients'],
        done: status.appointmentCreated,
      },
    ];
  }

  remindLater(): void {
    this.onboarding.remindLater();
    this.visible = false;
  }

  dontShowAgain(): void {
    this.onboarding.dismissPermanently();
    this.visible = false;
  }
}
