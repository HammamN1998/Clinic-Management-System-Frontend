import { Injectable } from '@angular/core';
import {AngularFireStorage} from "@angular/fire/compat/storage";
import { Observable } from 'rxjs';

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

  deleteFile(url: string): Observable<void> {
    return this.storage.refFromURL(url).delete();
  }
}
