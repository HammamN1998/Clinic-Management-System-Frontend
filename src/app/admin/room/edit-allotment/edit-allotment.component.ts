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
  selector: 'app-edit-allotment',
  templateUrl: './edit-allotment.component.html',
  styleUrls: ['./edit-allotment.component.scss'],
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
export class EditAllotmentComponent {
  roomForm: UntypedFormGroup;
  formdata = {
    rNo: '105',
    rType: '2',
    pName: 'John Deo',
    aDate: '2020-02-17T14:22:18Z',
    dDate: '2020-02-19T14:22:18Z',
  };
  constructor(private fb: UntypedFormBuilder) {
    this.roomForm = this.createContactForm();
  }
  onSubmit() {
    console.log('Form Value', this.roomForm.value);
  }
  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      rNo: [this.formdata.rNo, [Validators.required]],
      rType: [this.formdata.rType, [Validators.required]],
      pName: [this.formdata.pName, [Validators.required]],
      aDate: [this.formdata.aDate, [Validators.required]],
      dDate: [this.formdata.dDate, [Validators.required]],
    });
  }
}
