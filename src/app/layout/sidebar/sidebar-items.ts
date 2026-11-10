import { RouteInfo } from './sidebar.metadata';
export const ROUTES: RouteInfo[] = [
  {
    path: '',
    title: 'MENUITEMS.MAIN.TEXT',
    iconType: '',
    icon: '',
    class: '',
    groupTitle: true,
    badge: '',
    badgeClass: '',
    submenu: [],
  },

  // Dashboard
  {
    path: '/admin/dashboard/main',
    title: 'MENUITEMS.DASHBOARD.TEXT',
    iconType: 'material-icons-two-tone',
    icon: 'space_dashboard',
    class: '',
    groupTitle: false,
    badge: '',
    badgeClass: '',
    submenu: [],
  },
  // All Patients
  {
    path: '/admin/patients/all-patients',
    title: 'MENUITEMS.PATIENTS.LIST.ALL-PATIENT',
    iconType: 'material-icons-two-tone',
    icon: 'face',
    class: '',
    groupTitle: false,
    badge: '',
    badgeClass: '',
    submenu: [],
  },
  // Calendar
  {
    path: 'calendar',
    title: 'MENUITEMS.CALENDAR.TEXT',
    iconType: 'material-icons-two-tone',
    icon: 'event_note',
    class: '',
    groupTitle: false,
    badge: '',
    badgeClass: '',
    submenu: [],
  },
  // Task
  {
    path: 'task',
    title: 'MENUITEMS.TASK.TEXT',
    iconType: 'material-icons-two-tone',
    icon: 'event_note',
    class: '',
    groupTitle: false,
    badge: '',
    badgeClass: '',
    submenu: [],
  },
  // Plans
  {
    path: '/admin/doctors/doctor-plans',
    title: 'MENUITEMS.DOCTORS.LIST.PLANS',
    iconType: 'material-icons-two-tone',
    icon: 'card_membership',
    class: '',
    groupTitle: false,
    badge: '',
    badgeClass: '',
    submenu: [],
  },
   // Contact Us
   {
    path: '/admin/contact',
    title: 'MENUITEMS.CONTACT.TEXT',
    iconType: 'material-icons-two-tone',
    icon: 'contact_support',
    class: '',
    groupTitle: false,
    badge: '',
    badgeClass: '',
    submenu: [],
  },
];
