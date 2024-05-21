import { Injectable } from '@angular/core';
import {AngularFireStorage} from "@angular/fire/compat/storage";

@Injectable({
  providedIn: 'root'
})
export class FirebaseStorageService {

  constructor(private storage: AngularFireStorage) { }

  uploadFile(file: File, path: string) {
    const imageRef = this.storage.ref(path);
    const uploadTask = imageRef.put(file);

    return uploadTask.snapshotChanges();
  }

  deleteFile(url: string) {
    const existedFileRef = this.storage.refFromURL(url)
    existedFileRef.delete();
  }
}
