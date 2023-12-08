import { Component } from '@angular/core';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { MatButtonModule } from '@angular/material/button';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
@Component({
  selector: 'app-compose',
  templateUrl: './compose.component.html',
  styleUrls: ['./compose.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    CKEditorModule,
    MatButtonModule,
  ],
})
export class ComposeComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public Editor: any = ClassicEditor;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() { }
}
