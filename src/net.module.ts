import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { HttpService } from './service/http.service';

@NgModule({
    imports: [
        HttpModule,
    ],
    providers: [
        HttpService,
    ]
})
export class NetModule { }
