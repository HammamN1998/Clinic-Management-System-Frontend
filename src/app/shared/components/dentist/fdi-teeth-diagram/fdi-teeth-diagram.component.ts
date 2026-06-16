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
  selector: 'app-fdi-teeth-diagram',
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
  templateUrl: './fdi-teeth-diagram.component.html',
  styleUrl: './fdi-teeth-diagram.component.scss'
})
export class FdiTeethDiagramComponent extends OdontogramDiagramBase {
  readonly notation: DentalNotation = 'fdi';
  readonly legacyArrayKey: keyof SpecialDiagrams = 'fdiTeethDiagram';

  constructor(
    patientService: PatientService,
    notificationService: NotificationService,
    translate: TranslateService,
  ) {
    super(patientService, notificationService, translate);
  }
}
