import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DirectionService } from './direction.service';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  public languages: string[] = ['en', 'ar'];

  constructor(
    public translate: TranslateService,
    private directionService: DirectionService
  ) {
    let browserLang: string;
    translate.addLangs(this.languages);
    translate.setDefaultLang('en');

    if (localStorage.getItem('lang')) {
      browserLang = localStorage.getItem('lang') as string;
    } else {
      browserLang = translate.getBrowserLang() as string;
    }
    const lang = browserLang?.match(/en|ar/) ? browserLang : 'en';
    translate.use(lang);
    this.applyDirection(lang);
  }

  public setLanguage(lang: string) {
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
    this.applyDirection(lang);
  }

  private applyDirection(lang: string) {
    const html = document.getElementsByTagName('html')[0];
    if (lang === 'ar') {
      html.setAttribute('dir', 'rtl');
      document.body.classList.add('rtl');
      localStorage.setItem('isRtl', 'true');
      this.directionService.updateDirection('rtl');
    } else {
      html.removeAttribute('dir');
      document.body.classList.remove('rtl');
      localStorage.setItem('isRtl', 'false');
      this.directionService.updateDirection('ltr');
    }
  }
}
