import {CommonModule} from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';

@Component({
  selector: 'editable-text-compacted',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './editable-text-compacted.component.html',
  styleUrl: './editable-text-compacted.component.scss',
})
export class EditableTextCompactedComponent implements AfterViewInit, OnChanges {
  @ViewChild('bodyTxtElement') bodyTextElementRef!: ElementRef<HTMLElement>;

  @Input() headerText = '';
  @Input() bodyText = '';

  @Output() bodyTextEdited = new EventEmitter<string>();

  isEditing = false;

  ngAfterViewInit(): void {
    this.applyBodyTextFromInput();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bodyText'] && !this.isEditing) {
      this.applyBodyTextFromInput();
    }
  }

  onBodyClick(): void {
    if (this.isEditing) {
      return;
    }
    this.isEditing = true;
    const el = this.bodyTextElementRef.nativeElement;
    el.contentEditable = 'true';
    el.focus();
  }

  onSave(event: Event): void {
    event.stopPropagation();
    const text = this.bodyTextElementRef.nativeElement.innerText;
    this.bodyTextEdited.emit(text);
    this.exitEditMode();
  }

  onCancel(event: Event): void {
    event.stopPropagation();
    this.applyBodyTextFromInput();
    this.exitEditMode();
  }

  private applyBodyTextFromInput(): void {
    if (!this.bodyTextElementRef) {
      return;
    }
    this.bodyTextElementRef.nativeElement.innerText = this.bodyText ?? '';
  }

  private exitEditMode(): void {
    this.isEditing = false;
    const el = this.bodyTextElementRef.nativeElement;
    el.contentEditable = 'false';
    el.blur();
  }
}
