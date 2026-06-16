import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PatientService } from '@core/service/patient.service';
import { NotificationService } from '@core/service/notification.service';
import { SharedModule } from '@shared';
import { DentalNotation, SpecialDiagrams } from '@core/models/patient.model';
import { OdontogramDiagramBase } from '../odontogram-diagram.base';

@Component({
  selector: 'app-palmer-teeth-diagram',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    SharedModule,
    TranslateModule,
  ],
  templateUrl: './palmer-teeth-diagram.component.html',
  styleUrl: './palmer-teeth-diagram.component.scss'
})
export class PalmerTeethDiagramComponent extends OdontogramDiagramBase {
  readonly notation: DentalNotation = 'palmer';
  readonly legacyArrayKey: keyof SpecialDiagrams = 'palmerTeethDiagram';

  constructor(
    patientService: PatientService,
    notificationService: NotificationService,
    translate: TranslateService,
  ) {
    super(patientService, notificationService, translate);
  }
}
