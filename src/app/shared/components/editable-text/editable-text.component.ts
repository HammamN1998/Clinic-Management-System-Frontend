import {Component, ElementRef, ViewChild, Input, Output, EventEmitter} from '@angular/core';
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-editable-text',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    FormsModule
  ],
  templateUrl: './editable-text.component.html',
  styleUrl: './editable-text.component.scss'
})
export class EditableTextComponent  {
  @ViewChild('bodyTxtElement') bodyTextElementRef!: ElementRef;

  @Input() headerText: string = '';
  @Input() bodyText: string = '';

  @Output() bodyTextEdited = new EventEmitter<string>(); // Custom event

  isEditable: boolean = false;

  constructor() {

  }

  makeEditable() {
    if (!this.isEditable) {
      this.isEditable = true;
      this.bodyTextElementRef.nativeElement.contentEditable = 'true';
      this.bodyTextElementRef.nativeElement.focus(); // Set focus for immediate editing
    }
  }

  // This method called when lose focus
  handleBlur() {
    this.isEditable = false;
    this.bodyTextElementRef.nativeElement.contentEditable = 'false';
    const editedText = this.bodyTextElementRef.nativeElement.innerText;
    this.bodyTextEdited.emit(editedText); // Emit the event with edited text
  }

}
