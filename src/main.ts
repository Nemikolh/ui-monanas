import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {AppModule} from './app.module';

declare var require: any;

require('./style.scss');

platformBrowserDynamic().bootstrapModule(AppModule);
