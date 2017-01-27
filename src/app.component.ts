import {Component, ViewChild} from '@angular/core';
import {Http, Response} from '@angular/http';
import {Observable} from 'rxjs/Observable';
import {BananaReport} from './backend';
import {Datum} from './graph.component';
import {MonacoEditor} from './monaco.component';
import {randomNormal} from 'd3-random';

@Component({
    selector: 'app',
    template: `
    <div class="container-fluid">
        <h1>Monanas Editor</h1>
        <div style="display: flex; flex-wrap: wrap;">
            <div style="display: flex; justify-content: flex-start;">
                <div style="position: relative;">
                    <monaco-editor>
                    </monaco-editor>
                    <button class="btn btn-primary"
                            (click)="submitContent()"
                            style="position: absolute; right: 20px; top: 5px;">
                            Submit
                    </button>
                </div>
            </div>
            <div style="flex-grow: 1; display: flex; align-items: flex-start; justify-content: space-around;">
                <div>
                    <h3>Input metrics</h3>
                    <grapha [values]="input_metric"></grapha>
                </div>
                <div>
                    <h3>Generated metrics</h3>
                    <grapha [values]="output_metric"></grapha>
                </div>
            </div>
            <div style="flex-grow: 1; display: flex; align-items: flex-start; justify-content: space-around;">
                <div>
                    <h3>Input events</h3>
                    <anomalygraph [values]="input_event"></anomalygraph>
                </div>
                <div>
                    <h3>Anomalies found in events</h3>
                    <anomalygraph [values]="output_event"></anomalygraph>
                </div>
            </div>
        </div>
    </div>
    `
})
export class App {

    @ViewChild(MonacoEditor)
    private editor: MonacoEditor;

    private input_metric: Observable<Datum[]>;
    private output_metric: Observable<Datum[]>;
    private input_event: Observable<Datum[]>;
    private output_event: Observable<Datum[]>;

    constructor(private http: Http) {
        // this.input = this.fakeLocalData();
        // this.output = this.fakeLocalData();
        let input = this.fetchHttpSinkData('/input');
        let output = this.fetchHttpSinkData('/output');

        function hasMetric(val) {
            return val.values.length && val.values[0].metric;
        }

        function hasEvent(val) {
            return val.values.length && ((val.values[0].msg !== undefined) || val.values[0].event);
        }

        this.input_metric = input.filter(hasMetric).map(val => (val as SinkData).values.map(x => ({
            x: 0, y: x.metric.value, id: x.metric.name + ' ' + x.metric.dimensions.hostname
        })));
        this.output_metric = output.filter(hasMetric).map(val => (val as SinkData).values.map(x => ({
            x: 0, y: x.metric.value, id: x.metric.name + ' ' + x.metric.dimensions.hostname
        })));

        this.input_event = input.filter(hasEvent).map(val => (val as AnomalyData).values.map((x: any) => ({
            x: 0, y: 2, id: x.msg || x.event.msg
        })));
        this.output_event = output.filter(hasEvent).map(val => (val as AnomalyData).values.map((x: any) => {
            if (x.anomalous !== undefined) {
                return { x: 0, y: x.anomalous? 1: 0, id: x.msg};
            } else {
                return { x: 0, y: x.event.anomalous? 1: 0, id: x.event.msg};
            }
        })));

    }

    private fakeLocalData(): Observable<Datum[]> {
        let gen = randomNormal(0, 0.2);
        return Observable
            .interval(500)
            .map(val => [
                { x: val, y: gen(), id: 'fake' } as Datum,
            ]).share();
    }

    private fetchHttpSinkData(path: string): Observable<(SinkData | AnomalyData)> {
        let gen = randomNormal(0, 0.2);
        return Observable
            .interval(1500)
            .switchMap(
                () => this.http.get(path)
                    .catch(() => Observable.never<Response>())
                    .map(val => val.json() as SinkData | AnomalyData)
            )
            .share();
            // .do(val => console.log(val.values.length, val.values[0] && val.values[0].metric.value))
            // .s
            // .map(val => val.values.map(x => (
            //     { x: 0, y: x.metric.value, id: x.metric.name + x.metric.dimensions.hostname } as Datum
            // ))).share();
    }

    submitContent() {
        this.http.post('/banana', {
            content: this.editor.editor.getValue()
        }).map(res => res.json() as BananaReport)
          .subscribe(json => console.log(json));
    }
}

interface SinkData {
    values: {
        metric: { value: number; name: string; dimensions: { hostname: string }; };
        meta: any;
    }[];
}

interface AnomalyData {
    values: ({
        msg: string;
        anomalous: boolean;
    } | {
        event: {
            msg: string;
            anomalous: boolean;
        }
    })[];
}
