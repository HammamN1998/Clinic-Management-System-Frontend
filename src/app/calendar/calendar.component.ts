import {Component, OnInit, ViewChild} from '@angular/core';
import {CalendarOptions, DateSelectArg, EventApi, EventClickArg, EventInput,} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';

import {MatDialog} from '@angular/material/dialog';
import {UntypedFormBuilder, UntypedFormGroup, Validators,} from '@angular/forms';
import {Calendar} from './calendar.model';
import {FormDialogComponent} from './dialogs/form-dialog/form-dialog.component';
import {CalendarService} from './calendar.service';
import {MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition,} from '@angular/material/snack-bar';
import {MatCheckboxChange, MatCheckboxModule} from '@angular/material/checkbox';
import {UnsubscribeOnDestroyAdapter} from '@shared/UnsubscribeOnDestroyAdapter';
import {Direction} from '@angular/cdk/bidi';
import {FullCalendarModule} from '@fullcalendar/angular';
import {MatButtonModule} from '@angular/material/button';
import {BreadcrumbComponent} from '@shared/components/breadcrumb/breadcrumb.component';
import {DoctorService} from "@core/service/doctor.service";
import {from} from "rxjs";
import {AppointmentModel} from "@core/models/appointment.model";
import {DateService} from "@core/service/date.service";
import {PatientService} from "@core/service/patient.service";
import {Patient} from "@core/models/patient.model";
import {Router} from "@angular/router";

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatButtonModule,
    MatCheckboxModule,
    FullCalendarModule,
  ],
})
export class CalendarComponent  extends UnsubscribeOnDestroyAdapter  implements OnInit {
  @ViewChild('calendar', { static: false })
  calendar: Calendar | null;
  public addCusForm: UntypedFormGroup;
  dialogTitle: string;
  filterOptions = 'All';
  calendarData!: Calendar;
  filterItems: string[] = [
    'work',
    'personal',
    'important',
    'travel',
    'friends',
  ];

  calendarEvents: EventInput[] = [];
  tempEvents?: EventInput[];

  calendarOptions: CalendarOptions = this.getInitialCalendarOptions();

  constructor(
    private fb: UntypedFormBuilder,
    private dialog: MatDialog,
    public calendarService: CalendarService,
    private snackBar: MatSnackBar,
    private doctorService: DoctorService,
    private patientService: PatientService,
    private dateService: DateService,
    private router: Router,
  ) {
    super();
    this.dialogTitle = 'Add New Event';
    const blankObject = {} as Calendar;
    this.calendar = new Calendar(blankObject);
    this.addCusForm = this.createCalendarForm(this.calendar);
  }

  public ngOnInit(): void {
    this.getAppointmentsData();
    this.tempEvents = this.calendarEvents;
    this.calendarOptions.initialEvents = this.calendarEvents;
  }

  private getAppointmentsData() {
    from(this.doctorService.getCurrentMonthAppointments())
      .subscribe({
        next: (appointments) => {
          appointments.docs.forEach((appointment) => {
            const appointmentData = appointment.data() as AppointmentModel;
            if (appointmentData.attended) return;
            from(this.patientService.getPatientInfo(appointmentData.patientId))
              .subscribe({
                next: (patient) => {
                  const patientData = patient.data() as Patient;
                  // const startTime: Date = new Date (appointmentData.date.toDate().getFullYear(), appointmentData.date.toDate().getMonth(), appointmentData.date.toDate().getDay(), appointmentData.time.toDate().getHours(), appointmentData.time.toDate().getMinutes(), appointmentData.time.toDate().getSeconds());
                  const startTime: Date = new Date(appointmentData.date.toDate().getTime());
                  startTime.setHours(appointmentData.time.toDate().getHours());
                  startTime.setMinutes(appointmentData.time.toDate().getMinutes());
                  const endTime= this.dateService.addMinutesToDate(startTime, 30);
                  this.calendarEvents.push(
                    {
                      id: appointmentData.id,
                      title: `${patientData.firstName} ${patientData.lastName}`,
                      start: startTime,
                      end: endTime,
                      className: "fc-event-success",
                      groupId: "work",
                      details: appointmentData.details,
                      patient: patientData,
                    }
                  )
                  this.calendarOptions.events = [...this.calendarEvents];
                },
                error: (error) => {
                  console.log('error: ' + error)
                }
              })
          });
        },
        error: (error) => {
          console.log('error: ' + error)
        }
      })
  }



  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleDateSelect(selectInfo: DateSelectArg) {
    this.addNewEvent();
  }

  addNewEvent() {
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        calendar: this.calendar,
        action: 'add',
      },
      direction: tempDirection,
    });

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 'submit') {
        this.calendarData = this.calendarService.getDialogData();
        console.log(this.calendarData.startDate);
        this.calendarEvents = this.calendarEvents?.concat({
          // add new event data. must create new array
          id: this.calendarData.id,
          title: this.calendarData.title,
          start: this.calendarData.startDate,
          end: this.calendarData.endDate,
          className: this.getClassNameValue(this.calendarData.category),
          groupId: this.calendarData.category,
          details: this.calendarData.details,
        });
        this.calendarOptions.events = this.calendarEvents;
        this.addCusForm.reset();
        this.showNotification(
          'snackbar-success',
          'Add Record Successfully...!!!',
          'bottom',
          'center'
        );
      }
    });
  }

  changeCategory(event: MatCheckboxChange, filter: { name: string }) {
    if (event.checked) {
      this.filterItems.push(filter.name);
    } else {
      this.filterItems.splice(this.filterItems.indexOf(filter.name), 1);
    }
    this.filterEvent(this.filterItems);
  }

  filterEvent(element: string[]) {
    const list = this.calendarEvents?.filter((x) =>
      element.map((y?: string) => y).includes(x.groupId)
    );

    this.calendarOptions.events = list;
  }

  handleEventClick(clickInfo: EventClickArg) {
    this.eventClick(clickInfo);
  }

  eventClick(row: EventClickArg) {
    const calendarData = {
      id: row.event.id,
      title: row.event.title,
      category: row.event.groupId,
      startDate: row.event.start,
      endDate: row.event.end,
      details: row.event.extendedProps['details'],
      cost: row.event.extendedProps['cost'],
      costPaid: row.event.extendedProps['costPaid'],
    };
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        calendar: calendarData,
        action: 'edit',
      },
      direction: tempDirection,
    });

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 'submit') {
        this.calendarData = this.calendarService.getDialogData();
        this.calendarEvents?.forEach((element, index) => {
          if (this.calendarData.id === element.id) {
            this.editEvent(index, this.calendarData);
          }
        }, this);
        this.showNotification(
          'black',
          'Edit Record Successfully...!!!',
          'bottom',
          'center'
        );
        this.addCusForm.reset();
      } else if (result === 'delete') {
        this.calendarData = this.calendarService.getDialogData();
        this.calendarEvents?.forEach((element) => {
          if (this.calendarData.id === element.id) {
            row.event.remove();
          }
        }, this);

        this.showNotification(
          'snackbar-danger',
          'Delete Record Successfully...!!!',
          'bottom',
          'center'
        );
      }
    });
  }

  editEvent(eventIndex: number, calendarData: Calendar) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const calendarEvents = this.calendarEvents!.slice();
    const singleEvent = Object.assign({}, calendarEvents[eventIndex]);
    singleEvent.id = calendarData.id;
    singleEvent.title = calendarData.title;
    singleEvent.start = calendarData.startDate;
    singleEvent.end = calendarData.endDate;
    singleEvent.className = this.getClassNameValue(calendarData.category);
    singleEvent.groupId = calendarData.category;
    singleEvent['details'] = calendarData.details;
    calendarEvents[eventIndex] = singleEvent;
    this.calendarEvents = calendarEvents; // reassign the array

    this.calendarOptions.events = calendarEvents;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleEvents(events: EventApi[]) {
    // this.currentEvents = events;
  }

  createCalendarForm(calendar: Calendar): UntypedFormGroup {
    return this.fb.group({
      id: [calendar.id],
      title: [
        calendar.title,
        [Validators.required, Validators.pattern('[a-zA-Z]+([a-zA-Z ]+)*')],
      ],
      category: [calendar.category],
      startDate: [calendar.startDate, [Validators.required]],
      endDate: [calendar.endDate, [Validators.required]],
      details: [
        calendar.details,
        [Validators.required, Validators.pattern('[a-zA-Z]+([a-zA-Z ]+)*')],
      ],
    });
  }

  showNotification(
    colorName: string,
    text: string,
    placementFrom: MatSnackBarVerticalPosition,
    placementAlign: MatSnackBarHorizontalPosition
  ) {
    this.snackBar.open(text, '', {
      duration: 2000,
      verticalPosition: placementFrom,
      horizontalPosition: placementAlign,
      panelClass: colorName,
    });
  }

  getClassNameValue(category: string) {
    let className;

    if (category === 'work') className = 'fc-event-success';
    else if (category === 'personal') className = 'fc-event-warning';
    else if (category === 'important') className = 'fc-event-primary';
    else if (category === 'travel') className = 'fc-event-danger';
    else if (category === 'friends') className = 'fc-event-info';

    return className;
  }

  private getInitialCalendarOptions() {
    return {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
      },
      initialView: 'timeGridWeek',
      weekends: true,
      editable: true,
      selectable: false,
      selectMirror: true,
      dayMaxEvents: true,
      allDaySlot: false,
      slotMinTime: '07:00:00',
      slotMaxTime: '22:00:00',
      firstDay: 0,
      select: this.handleDateSelect.bind(this),
      eventClick: this.goToProfilePage.bind(this),
      eventsSet: this.handleEvents.bind(this),
    };
  }

  goToProfilePage(clickInfo: EventClickArg) {
    this.patientService.dialogData = {...(clickInfo.event.extendedProps['patient'] as Patient)};
    this.router.navigate(['/admin/patients/patient-profile']);
  }
}
