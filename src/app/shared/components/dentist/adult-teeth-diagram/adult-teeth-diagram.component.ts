import { Component } from '@angular/core';
import {BreadcrumbComponent} from "@shared/components/breadcrumb/breadcrumb.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatOptionModule} from "@angular/material/core";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {FileUploadComponent} from "@shared/components/file-upload/file-upload.component";
import {MatButtonModule} from "@angular/material/button";
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-adult-teeth-diagram',
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
    FileUploadComponent,
    MatButtonModule,
    NgIf,
  ],
  templateUrl: './adult-teeth-diagram.component.html',
  styleUrl: './adult-teeth-diagram.component.scss'
})
export class AdultTeethDiagramComponent {

  selectedTooth: string | null = null;
  toothNotes: string = '';

  selectTooth(toothId: string) {
    console.log('id: ', toothId);
    this.selectedTooth = toothId;
    this.toothNotes = ''; // Clear notes on new selection
  }

  saveNotes() {
    // Implement logic to save notes for the selected tooth (e.g., backend API call)
    console.log('Saved notes for tooth:', this.selectedTooth, this.toothNotes);
    // Optionally, clear notes after saving
  }
}
