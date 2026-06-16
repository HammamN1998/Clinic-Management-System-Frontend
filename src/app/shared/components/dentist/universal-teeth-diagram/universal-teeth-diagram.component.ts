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
  selector: 'app-universal-teeth-diagram',
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
  templateUrl: './universal-teeth-diagram.component.html',
  styleUrl: './universal-teeth-diagram.component.scss'
})
export class UniversalTeethDiagramComponent extends OdontogramDiagramBase {
  readonly notation: DentalNotation = 'universal';
  readonly legacyArrayKey: keyof SpecialDiagrams = 'universalTeethDiagram';

  constructor(
    patientService: PatientService,
    notificationService: NotificationService,
    translate: TranslateService,
  ) {
    super(patientService, notificationService, translate);
  }
}
