export class Task {
  id: string;
  title: string;
  done: boolean;
  note: string;
  priority: string;
  createdAt: Date;
  dueDate: Date;
  doctorId: string;

  constructor(task: Partial<Task> = {}) {
    this.id = task.id ?? '';
    this.title = task.title ?? '';
    this.done = task.done ?? false;
    this.createdAt = task.createdAt ?? new Date();
    this.dueDate = task.dueDate ?? new Date();
    this.note = task.note ?? '';
    this.priority = task.priority ?? 'Low';
    this.doctorId = task.doctorId ?? '';
  }

}
