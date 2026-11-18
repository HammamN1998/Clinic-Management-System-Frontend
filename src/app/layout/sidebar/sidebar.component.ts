/* eslint-disable @typescript-eslint/no-unused-vars */
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {DOCUMENT, NgClass} from '@angular/common';
import {Component, ElementRef, HostListener, Inject, OnDestroy, OnInit, Renderer2,} from '@angular/core';
import {CLINIC_ROUTE, DASHBOARD_PATH, MY_CLINIC_ROUTE, PLANS_PATH, ROUTES} from './sidebar-items';
import {RouteInfo} from './sidebar.metadata';
import {TranslateModule} from '@ngx-translate/core';
import {NgScrollbar} from 'ngx-scrollbar';
import {combineLatest} from 'rxjs';
import {UnsubscribeOnDestroyAdapter} from '@shared';
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";
import {isNullOrUndefined} from "@swimlane/ngx-datatable";
import { getDoctorTitlePrefix } from '@core/util/doctor-title.util';
import { ClinicService } from '@core/service/clinic.service';
import { ClinicContextService } from '@core/service/clinic-context.service';
import { ClinicMembership } from '@core/models/clinic.model';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [
    NgScrollbar,
    RouterLinkActive,
    RouterLink,
    NgClass,
    TranslateModule,
  ],
})
export class SidebarComponent extends UnsubscribeOnDestroyAdapter implements OnInit, OnDestroy {
  public sidebarItems!: RouteInfo[];
  public innerHeight?: number;
  public bodyTag!: HTMLElement;
  listMaxHeight?: string;
  listMaxWidth?: string;
  userFullName?: string;
  userImg?: string;
  headerHeight = 60;
  /** Height of the banner shown under the header inside the clinic account. */
  actingBannerHeight = 40;
  isActing = false;
  currentRoute?: string;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
    public elementRef: ElementRef,
    public firebaseAuthenticationService: FirebaseAuthenticationService,
    private router: Router,
    private clinicService: ClinicService,
    private clinicContext: ClinicContextService,
  ) {
    super();
    this.elementRef.nativeElement.closest('body');
    this.subs.sink = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // close sidebar on phoneNumber screen after menu select
        this.renderer.removeClass(this.document.body, 'overlay-open');
      }
    });
  }

  get doctor() {
    return this.firebaseAuthenticationService.currentUserValue
  }

  get doctorTitlePrefix(): string {
    return getDoctorTitlePrefix(this.userFullName ?? '');
  }

  get userImageUrl(): string {
    const img = this.firebaseAuthenticationService.currentUserValue.img;
    return isNullOrUndefined(img) || img === '' ? 'assets/images/patient/patient-default-profile.png' : img;
  }
  @HostListener('window:resize', ['$event'])
  windowResizecall() {
    this.setMenuHeight();
    this.checkStatuForResize(false);
  }
  @HostListener('document:mousedown', ['$event'])
  onGlobalClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.renderer.removeClass(this.document.body, 'overlay-open');
    }
  }

  callToggleMenu(event: Event, length: number) {
    if (length > 0) {
      const parentElement = (event.target as HTMLInputElement).closest('li');
      const activeClass = parentElement?.classList.contains('active');

      if (activeClass) {
        this.renderer.removeClass(parentElement, 'active');
      } else {
        this.renderer.addClass(parentElement, 'active');
      }
    }
  }
  ngOnInit() {
    if (this.doctor) {
      this.userFullName = this.doctor.name
      this.userImg = this.doctor.img;

      this.isActing = this.clinicContext.isActing;
      this.sidebarItems = this.withClinicRoutes(null, false);
      this.subs.sink = combineLatest([
        this.clinicService.membership$,
        this.clinicService.pendingInvites$,
        this.clinicContext.acting$,
      ]).subscribe(([membership, invites, acting]) => {
        this.isActing = acting !== null;
        this.sidebarItems = this.withClinicRoutes(membership, invites.length > 0);
        this.setMenuHeight();
      });
    }

    this.initLeftSidebar();
    this.bodyTag = this.document.body;
  }
  private withClinicRoutes(membership: ClinicMembership | null, hasOpenInvite: boolean): RouteInfo[] {
    const clinicRoutes: RouteInfo[] = [];
    if (membership?.isAdmin) {
      clinicRoutes.push(CLINIC_ROUTE);
    }
    // My clinic belongs to the doctor's own account, so the clinic account's menu leaves it out.
    if (!this.isActing && (membership?.clinicAdminId || hasOpenInvite)) {
      clinicRoutes.push(MY_CLINIC_ROUTE);
    }
    const accountRoutes = this.isActing
      ? ROUTES.filter((route) => route.path !== PLANS_PATH && !(membership?.isSecretary && route.path === DASHBOARD_PATH))
      : ROUTES;
    const afterTask = accountRoutes.findIndex((route) => route.path === 'task') + 1;
    return [...accountRoutes.slice(0, afterTask), ...clinicRoutes, ...accountRoutes.slice(afterTask)];
  }
  initLeftSidebar() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    // Set menu height
    _this.setMenuHeight();
    _this.checkStatuForResize(true);
  }
  setMenuHeight() {
    this.innerHeight = window.innerHeight;
    const height = this.innerHeight - this.headerHeight - (this.isActing ? this.actingBannerHeight : 0);
    this.listMaxHeight = height + '';
    this.listMaxWidth = '500px';
  }
  isOpen() {
    return this.bodyTag.classList.contains('overlay-open');
  }

  checkStatuForResize(firstTime: boolean) {
    if (window.innerWidth < 1025) {
      this.renderer.addClass(this.document.body, 'ls-closed');
    } else {
      this.renderer.removeClass(this.document.body, 'ls-closed');
    }
  }
  mouseHover() {
    const body = this.elementRef.nativeElement.closest('body');
    if (body.classList.contains('submenu-closed')) {
      this.renderer.addClass(this.document.body, 'side-closed-hover');
      this.renderer.removeClass(this.document.body, 'submenu-closed');
    }
  }
  mouseOut() {
    const body = this.elementRef.nativeElement.closest('body');
    if (body.classList.contains('side-closed-hover')) {
      this.renderer.removeClass(this.document.body, 'side-closed-hover');
      this.renderer.addClass(this.document.body, 'submenu-closed');
    }
  }
  logout() {
    this.subs.sink = this.firebaseAuthenticationService.logout().subscribe((res) => {
      if (!res.success) {
        this.router.navigate(['/authentication/signin']);
      }
    });
  }
}
