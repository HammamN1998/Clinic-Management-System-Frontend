import { Injectable } from '@angular/core';
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {Task} from "../../task/task.model";
import * as firestore from "firebase/firestore";
import {BehaviorSubject} from "rxjs";
import { DoctorService } from './doctor.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  private tasksSubject = new BehaviorSubject<Task[]>([]);
  tasks$ = this.tasksSubject.asObservable();

  constructor(
    private firestore: AngularFirestore,
    private doctorService: DoctorService,
  ) {}

  /** Empties the cached list before loading, so tasks from a previous sign-in never show. */
  async reloadTasks() {
    this.tasksSubject.next([]);
    return this.getTasks();
  }

  async addTask(task: Task) {
    try {

      task.doctorId = this.doctorService.activeDoctorId;
      const payload = this.taskToDoc(task);
      await this.firestore.collection('tasks').add(payload);

      this.getTasks();

    } catch (error) {
      // Handle error internally (log, set error state, show notification)
      console.error(error);
      throw error;
    }
  }

  async editTask(task: Task) {
    try {

      const payload = this.taskToDoc(task);
      await this.firestore.collection('tasks').doc(task.id).update(payload);

      this.getTasks();

    } catch (error) {
      // Handle error internally (log, set error state, show notification)
      console.error(error);
      throw error;
    }
  }

  async deleteTask(task: Task) {
    try {

      await this.firestore.collection('tasks').doc(task.id).delete()

      this.getTasks();

    } catch (error) {
      // Handle error internally (log, set error state, show notification)
      console.error(error);
      throw error;
    }
  }

  async getTasks() {
    const doctorId = this.doctorService.activeDoctorId;
    try {
      const snapshot = await this.firestore.collection('tasks').ref
        .where('doctorId', '==', doctorId)
        .orderBy('createdAt', 'desc')
        .get();

      const tasks: Task[] = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return new Task({
          id: doc.id,
          title: data.title,
          note: data.note,
          done: data.done,
          priority: data.priority,
          dueDate: data.dueDate.toDate(),
          createdAt: data.createdAt.toDate(),
          doctorId: data.doctorId,
        });
      });

      // A load started in an account the user has since left must not replace the current list.
      if (doctorId === this.doctorService.activeDoctorId) {
        this.tasksSubject.next(tasks);
      }
      return tasks;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  taskToDoc(task: Task) {
    return {
      title: task.title,
      note: task.note,
      done: task.done,
      priority: task.priority,
      dueDate:  firestore.Timestamp.fromDate(task.dueDate),
      createdAt: firestore.Timestamp.fromDate(task.createdAt),
      doctorId: task.doctorId,
    };
  }


}
