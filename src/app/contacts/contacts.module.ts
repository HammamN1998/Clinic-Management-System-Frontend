import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdvanceTableRoutingModule } from './contacts-routing.module';
import { ContactsComponent } from './contacts.component';
import { FormComponent as contactForm } from './form/form.component';
import { DeleteComponent } from './delete/delete.component';
import { ContactsService } from './contacts.service';
import { SharedModule } from '@shared';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        AdvanceTableRoutingModule,
        SharedModule,
        ContactsComponent, contactForm, DeleteComponent,
    ],
    providers: [ContactsService],
})
export class ContactsModule { }
