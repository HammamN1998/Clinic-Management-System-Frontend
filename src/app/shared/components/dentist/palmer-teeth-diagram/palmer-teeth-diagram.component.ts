import { Component } from '@angular/core';
import {BreadcrumbComponent} from "@shared/components/breadcrumb/breadcrumb.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatOptionModule} from "@angular/material/core";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {MatButtonModule} from "@angular/material/button";
import {NgIf} from "@angular/common";
import {PatientService} from "@core/service/patient.service";
import {isNullOrUndefined} from "@swimlane/ngx-datatable";
import {from} from "rxjs";
import {NotificationService} from "@core/service/notification.service";
import {SharedModule} from "@shared";

@Component({
  selector: 'app-palmer-teeth-diagram',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    MatButtonModule,
    NgIf,
    SharedModule,
  ],
  templateUrl: './palmer-teeth-diagram.component.html',
  styleUrl: './palmer-teeth-diagram.component.scss'
})
export class PalmerTeethDiagramComponent {

  selectedTooth!: string;
  toothNote: string = '';

  constructor(
    private patientService: PatientService,
    private notificationService: NotificationService,
  ) {
  }
  selectTooth(toothId: string) {
    this.selectedTooth = toothId;
    const foundToothIndex = this.patientService.getDialogData().specialDiagrams.palmerTeethDiagram.findIndex((tooth) => !isNullOrUndefined(tooth[toothId]));
    if (!isNullOrUndefined(foundToothIndex) && foundToothIndex != -1) {
      this.toothNote = this.patientService.getDialogData().specialDiagrams.palmerTeethDiagram[foundToothIndex][toothId];
    } else {
      this.toothNote = '';
    }
  }

  saveToothNote() {
    from( this.patientService.updatePalmerTeethDiagramToothNote(this.selectedTooth, this.toothNote))
    .subscribe({
      next: () => {
        this.notificationService.showSnackBarNotification(
          'black',
          'Edit Note Successfully...!!!',
          'bottom',
          'center'
        );
      },
      error: (error) => {
        console.log('error: ' + error);
      }
    })
  }

  protected readonly isNullOrUndefined = isNullOrUndefined;

  isToothExist(toothId: string) {
    const foundToothIndex = this.patientService.getDialogData().specialDiagrams.palmerTeethDiagram.findIndex((tooth) => !isNullOrUndefined(tooth[toothId]) && tooth[toothId].trim() !== '')
    if (!isNullOrUndefined(foundToothIndex ) && foundToothIndex != -1) return true;
    return false;
  }
}
