import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {HttpModule} from '@angular/http';
import {App} from './app.component';
import {MonacoEditor} from './monaco.component';
import {Graph} from './graph.component';
import {Graph2} from './graph2.component';
import {AnomalyGraph} from './graph-anomaly.component';
import {TypeTable} from './backend/type_table';

@NgModule({
    imports: [BrowserModule, HttpModule],
    declarations: [
        App,
        MonacoEditor,
        Graph2,
        Graph,
        AnomalyGraph,
    ],
    providers: [
        TypeTable
    ],
    bootstrap: [App],
})
export class AppModule {}
