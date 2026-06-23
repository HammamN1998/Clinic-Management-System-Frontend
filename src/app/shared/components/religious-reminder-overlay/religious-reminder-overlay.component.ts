import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReligiousReminderService } from '@core/service/religious-reminder.service';

/** Subtle, auto-dismissing banner that shows the current dhikr phrase. */
@Component({
  selector: 'app-religious-reminder-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './religious-reminder-overlay.component.html',
  styleUrls: ['./religious-reminder-overlay.component.scss'],
})
export class ReligiousReminderOverlayComponent {
  constructor(public reminders: ReligiousReminderService) {}
}
