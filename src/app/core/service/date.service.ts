import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DateService {

  constructor() { }

  formatDateToISO8601(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Add leading zero for single-digit months
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatTimeToISO8601(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  addMinutesToDate(date: Date, minutes: number): Date {
    const newDate = new Date(date.getTime());
    let minutesToAdd: number = date.getMinutes() + minutes;
    let hoursToAdd: number = 0;
    if (minutesToAdd >= 60) {
      minutesToAdd = minutes % 60;
      // hoursToAdd++;
    }

    newDate.setHours(newDate.getHours() + hoursToAdd);
    newDate.setMinutes(newDate.getMinutes() + minutesToAdd);
    return newDate;
  }

}
