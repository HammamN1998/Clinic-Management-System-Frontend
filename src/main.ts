import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar';
import localeEn from '@angular/common/locales/en';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

registerLocaleData(localeAr);
registerLocaleData(localeEn);

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
