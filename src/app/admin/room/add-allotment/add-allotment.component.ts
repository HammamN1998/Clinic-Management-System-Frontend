import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
@Component({
  selector: 'app-add-allotment',
  templateUrl: './add-allotment.component.html',
  styleUrls: ['./add-allotment.component.scss'],
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
  ],
})
export class AddAllotmentComponent {
  roomForm: UntypedFormGroup;
  constructor(private fb: UntypedFormBuilder) {
    this.roomForm = this.fb.group({
      rNo: ['', [Validators.required]],
      rType: ['', [Validators.required]],
      pName: ['', [Validators.required]],
      aDate: ['', [Validators.required]],
      dDate: ['', [Validators.required]],
    });
  }
  onSubmit() {
    console.log('Form Value', this.roomForm.value);
  }
}
