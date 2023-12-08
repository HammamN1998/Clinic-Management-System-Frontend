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
  selector: 'app-add-bill',
  templateUrl: './add-bill.component.html',
  styleUrls: ['./add-bill.component.scss'],
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
export class AddBillComponent {
  billForm: UntypedFormGroup;
  constructor(private fb: UntypedFormBuilder) {
    this.billForm = this.fb.group({
      bNo: ['', [Validators.required]],
      admissionID: ['', [Validators.required]],
      pName: ['', [Validators.required]],
      dName: ['', [Validators.required]],
      aDate: ['', [Validators.required]],
      dDate: ['', [Validators.required]],
      discount: [''],
      total: [''],
      pMethod: ['', [Validators.required]],
      pStatus: ['', [Validators.required]],
    });
  }
  onSubmit() {
    console.log('Form Value', this.billForm.value);
  }
}
