import { NgModule } from '@angular/core';
import { CoreModule } from './core/core.module';
import { SharedModule } from '@shared/shared.module';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './layout/header/header.component';
import { PageLoaderComponent } from './layout/page-loader/page-loader.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { RightSidebarComponent } from './layout/right-sidebar/right-sidebar.component';
import { AuthLayoutComponent } from './layout/app-layout/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layout/app-layout/main-layout/main-layout.component';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import {
    TranslateModule,
    TranslateLoader,
    MissingTranslationHandler,
    MissingTranslationHandlerParams,
} from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AngularFireModule } from "@angular/fire/compat";
import { AngularFireAuthModule } from "@angular/fire/compat/auth";
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireFunctionsModule, REGION } from '@angular/fire/compat/functions';

import {
    HttpClientModule,
    HttpClient,
} from '@angular/common/http';

import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
import { NgScrollbarModule } from 'ngx-scrollbar';
import {environment} from "../environments/environment";

export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, 'assets/i18n/', '.json');
}

export class WarnMissingTranslationHandler implements MissingTranslationHandler {
    handle(params: MissingTranslationHandlerParams): string {
        console.warn(`[i18n] Missing translation key: ${params.key}`);
        return params.key;
    }
}

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        HttpClientModule,
        NgScrollbarModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: createTranslateLoader,
                deps: [HttpClient],
            },
            missingTranslationHandler: {
                provide: MissingTranslationHandler,
                useClass: WarnMissingTranslationHandler,
            },
        }),
        LoadingBarRouterModule,
        // core & shared
        CoreModule,
        SharedModule,
        HeaderComponent,
        PageLoaderComponent,
        SidebarComponent,
        RightSidebarComponent,
        AuthLayoutComponent,
        MainLayoutComponent,
        AngularFireModule.initializeApp(environment.firebase),
        AngularFireAuthModule,
        AngularFirestoreModule ,
        AngularFireFunctionsModule,
    ],
    providers: [
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        { provide: REGION, useValue: 'europe-west1' },
    ],
    bootstrap: [AppComponent],
})
export class AppModule { }
