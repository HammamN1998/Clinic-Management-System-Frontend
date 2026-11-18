import { Injectable } from '@angular/core';
import {AngularFireStorage} from "@angular/fire/compat/storage";
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseStorageService {

  constructor(private storage: AngularFireStorage) { }

  uploadFile(file: File, path: string, contentType: string) {
    const imageRef = this.storage.ref(path);
    const uploadTask = imageRef.put(file, { contentType });

    return uploadTask.snapshotChanges();
  }

  /**
   * Deletes the file at the link only when it lies inside the folder, such as the patient's own.
   * A stored link is written by whoever saved the record, so one pointing elsewhere is left alone.
   */
  deleteFile(url: string, folder: string): Observable<void> {
    let path: string;
    try {
      path = this.storage.storage.refFromURL(url).fullPath;
    } catch {
      return of(undefined);
    }
    return path.startsWith(`${folder}/`) ? this.storage.ref(path).delete() : of(undefined);
  }
}
