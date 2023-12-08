import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-add-medicine',
  templateUrl: './add-medicine.component.html',
  styleUrls: ['./add-medicine.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    MatButtonModule,
  ],
})
export class AddMedicineComponent {
  medicineListForm: UntypedFormGroup;
  constructor(private fb: UntypedFormBuilder) {
    this.medicineListForm = this.fb.group({
      m_no: ['', [Validators.required]],
      m_name: ['', [Validators.required]],
      category: ['', [Validators.required]],
      company: ['', [Validators.required]],
      p_date: ['', [Validators.required]],
      price: ['', [Validators.required]],
      e_date: ['', [Validators.required]],
      stock: ['', [Validators.required]],
    });
  }
  onSubmit() {
    console.log('Form Value', this.medicineListForm.value);
  }
}
