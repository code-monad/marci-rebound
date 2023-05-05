import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { NZ_I18N } from 'ng-zorro-antd/i18n';
import { en_US } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


import {NzLayoutModule} from "ng-zorro-antd/layout";
import {NzTableModule} from "ng-zorro-antd/table";
import {NzCardModule} from "ng-zorro-antd/card";
import {NzButtonModule} from "ng-zorro-antd/button";
import {TimeElapsedPipe } from './time-elapsed.pipe';
import {NzAvatarModule} from "ng-zorro-antd/avatar";
import {NgxFlagIconCssModule } from 'ngx-flag-icon-css';


registerLocaleData(en);

@NgModule({
  declarations: [AppComponent, TimeElapsedPipe],
  imports: [BrowserModule, HttpClientModule, FormsModule, BrowserAnimationsModule, NzLayoutModule, NzTableModule, NzCardModule, NzButtonModule,NzAvatarModule, NgxFlagIconCssModule],
  providers: [
    { provide: NZ_I18N, useValue: en_US }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}