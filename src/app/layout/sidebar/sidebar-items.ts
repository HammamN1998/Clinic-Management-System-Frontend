import { RouteInfo } from './sidebar.metadata';

/** The doctor's own billing, left out of the menu inside another doctor's account. */
export const PLANS_PATH = '/admin/doctors/doctor-plans';

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
    path: PLANS_PATH,
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

/** Shown after Task to clinic admins. */
export const CLINIC_ROUTE: RouteInfo = {
  path: '',
  title: 'MENUITEMS.CLINIC.TEXT',
  iconType: 'material-icons-two-tone',
  icon: 'domain',
  class: 'menu-toggle',
  groupTitle: false,
  badge: '',
  badgeClass: '',
  submenu: [
    {
      path: '/clinic/dashboard',
      title: 'MENUITEMS.CLINIC.LIST.DASHBOARD',
      iconType: '',
      icon: '',
      class: 'ml-menu',
      groupTitle: false,
      badge: '',
      badgeClass: '',
      submenu: [],
    },
    {
      path: '/clinic/calendar',
      title: 'MENUITEMS.CLINIC.LIST.CALENDAR',
      iconType: '',
      icon: '',
      class: 'ml-menu',
      groupTitle: false,
      badge: '',
      badgeClass: '',
      submenu: [],
    },
    {
      path: '/clinic/patients',
      title: 'MENUITEMS.CLINIC.LIST.PATIENTS',
      iconType: '',
      icon: '',
      class: 'ml-menu',
      groupTitle: false,
      badge: '',
      badgeClass: '',
      submenu: [],
    },
    {
      path: '/clinic/doctors',
      title: 'MENUITEMS.CLINIC.LIST.DOCTORS',
      iconType: '',
      icon: '',
      class: 'ml-menu',
      groupTitle: false,
      badge: '',
      badgeClass: '',
      submenu: [],
    },
  ],
};

/** Shown after Task to linked doctors, doctors with an open invitation, and doctors with history from a clinic they left. */
export const MY_CLINIC_ROUTE: RouteInfo = {
  path: '/admin/doctors/my-clinic',
  title: 'MENUITEMS.MY_CLINIC.TEXT',
  iconType: 'material-icons-two-tone',
  icon: 'apartment',
  class: '',
  groupTitle: false,
  badge: '',
  badgeClass: '',
  submenu: [],
};
