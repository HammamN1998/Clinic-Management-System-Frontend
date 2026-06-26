import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SharedModule } from '@shared';
import { DentalNotation } from '@core/models/patient.model';
import { OdontogramDiagramBase } from '../odontogram-diagram.base';

@Component({
  selector: 'app-fdi-teeth-diagram',
  standalone: true,
  imports: [
    CommonModule,
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

  constructor(translate: TranslateService) {
    super(translate);
  }
}
