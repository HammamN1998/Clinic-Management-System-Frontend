import { Component } from '@angular/core';
import { Event, Router, NavigationStart, NavigationEnd } from '@angular/router';
import { LanguageService } from '@core';
import { MetaPixelService } from '@core/service/meta-pixel.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  currentUrl!: string;
  constructor(
    public _router: Router,
    private languageService: LanguageService,
    private metaPixel: MetaPixelService
  ) {
    // Once per session, at entry. Deliberately not inside the NavigationEnd
    // branch below: reporting every route would tell Meta which patient
    // screens a doctor opened.
    this.metaPixel.init();

    this._router.events.subscribe((routerEvent: Event) => {
      if (routerEvent instanceof NavigationStart) {
        this.currentUrl = routerEvent.url.substring(
          routerEvent.url.lastIndexOf('/') + 1
        );
      }
      if (routerEvent instanceof NavigationEnd) {
        /* empty */
      }
      window.scrollTo(0, 0);
    });
  }
}
