import { Component } from '@angular/core';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { UntypedFormGroup, UntypedFormControl, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { Task } from './task.model';
import {NgClass, DatePipe, NgIf, NgForOf} from '@angular/common';
import { NgScrollbar } from 'ngx-scrollbar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import {TaskService} from "@core/service/task.service";

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatButtonModule,
    MatSidenavModule,
    MatTooltipModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    NgScrollbar,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    NgClass,
    DatePipe,
    NgIf,
    NgForOf,
  ],
})
export class TaskComponent {
  mode = new UntypedFormControl('side');
  taskForm: UntypedFormGroup;
  showFiller = false;
  isNewEvent = false;
  dialogTitle?: string;
  tasks: Task[] = [];

  constructor(
    private fb: UntypedFormBuilder,
    private taskService: TaskService,
  ){

    this.taskForm = this.createFormGroup(new Task());

    this.taskService.tasks$.subscribe(tasks => this.tasks = tasks);
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.tasks, event.previousIndex, event.currentIndex);
  }
  async toggle(task: Task, nav: MatSidenav) {
    nav.close();
    task.done = !task.done;
    this.taskForm = this.createFormGroup(task);
    this.editTask();
  }
  addNewTask(nav: MatSidenav) {
    this.isNewEvent = true;
    this.dialogTitle = 'New Task';
    this.taskForm.reset();
    nav.open();
  }
  taskClick(task: Task, nav: MatSidenav): void {
    this.isNewEvent = false;
    this.dialogTitle = 'Edit Task';
    nav.open();
    this.taskForm = this.createFormGroup(task);
  }
  closeSlider(nav: MatSidenav) {
    nav.close();
  }
  createFormGroup(task: Task) {
    return this.fb.group(task);
  }
  saveOrEdit() {
    if (this.isNewEvent) {
      this.saveTask();
    } else {
      this.editTask();
    }
  }
  async saveTask() {

    const task: Task = new Task({...this.taskForm.value});
    await this.taskService.addTask(task);
    this.taskForm.reset();
  }
  async editTask() {
    const task: Task = new Task({...this.taskForm.value});
    await this.taskService.editTask(task);
  }
  async deleteTask(nav: MatSidenav) {
    const task: Task = new Task({...this.taskForm.value});
    await this.taskService.deleteTask(task);
    nav.close();
  }
}
