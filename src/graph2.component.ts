import {ViewChild, ElementRef, Component, Input} from '@angular/core';
import {AfterViewInit, OnDestroy} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';
import {graph_width_number, graph_height_number} from './variables';

const moment = require<any>("moment");

export interface Datum {
    x: number,
    y: number,
    id: string;
}

const NUM_OF_DATA = 20;
const ANIMATION = false;
const X_GRIDLINES = true;
const Y_GRIDLINES = true;
const FILL_AREA = false;
const POINT_RADIUS = 0;


function getInitialDataForChart(initialDataArray) {
  let labels = [];
  for (let i = 0; i < NUM_OF_DATA; i++) {
    labels.push("");
  }
  return {
    labels: labels,
    datasets: initialDataArray
  };
}

const colors = [
    { borderColor: "rgba(1,169,130,1)", backgroundColor: "rgba(1,169,130,0.2)"},
    { borderColor: "rgba(97,71,103,1)", backgroundColor: "rgba(97,71,103,0.2)"},
    { borderColor: "rgba(253,154,105,1)", backgroundColor: "rgba(253,154,105,0.2)"},
    { borderColor: "rgba(255,69,79,1)", backgroundColor: "rgba(255,69,79,0.2)"},
    { borderColor: "rgba(255,208,66,1)",backgroundColor: "rgba(255,208,66,0.2)"},
    { borderColor: "rgba(128,116,110,1)", backgroundColor: "rgba(128,116,110,0.2)" },
    { borderColor: "rgba(95,112,118,1)", backgroundColor: "rgba(95,112,118,0.2)"},
    { borderColor: "rgba(41,210,201,1)", backgroundColor: "rgba(41,210,201,0.2)"},
];

@Component({
    selector: 'grapha',
    template: `<div width="${graph_width_number}" height="${graph_height_number}"><canvas #canvas width="${graph_width_number}" height="${graph_height_number}"></canvas></div>`
})
export class Graph2 implements AfterViewInit, OnDestroy {

    @Input('values') values: Observable<Datum[]>;

    @ViewChild('canvas') canvas: ElementRef;

    chart: ChartJs.Instance;
    private subscription: Subscription;
    private buffer: { [id: string]: Datum[] } = {};
    private mapping: { [id: string]: number } = {};
    private nb_metrics = 0;
    private latest_label = 0;

    private last_color = 0;

    private getNewColorSet(): {backgroundColor: string, borderColor: string} {
        let color = this.last_color;
        this.last_color = (this.last_color + 1) % colors.length;
        return colors[color];
    }

    private createNewDataSet(label: string) {
        let {backgroundColor, borderColor} = this.getNewColorSet();
        return {
            label,
            data: [],
            backgroundColor,
            borderColor,
            fill: FILL_AREA,
            pointRadius: POINT_RADIUS,
        };
    }

    constructor() {}

    ngAfterViewInit() {
        const canvas = this.canvas.nativeElement as HTMLCanvasElement;
        console.log(canvas.clientHeight);
        console.log(canvas.clientWidth);
        const derivativeCtx = canvas.getContext('2d');
        let options = {
            animation: ANIMATION,
            scales: {
                xAxes: [{gridLines: {display: X_GRIDLINES}}],
                yAxes: [{gridLines: {display: Y_GRIDLINES}}]
            }
        };

        this.chart = new Chart(derivativeCtx, {
            type: "line",
            data: getInitialDataForChart([
            // {
            //     label: "Metric1",
            //     data: [],
            //     fill: FILL_AREA,
            //     pointRadius: POINT_RADIUS
            // }, {
            //     label: "Metric2",
            //     data: [],
            //     fill: FILL_AREA,
            //     pointRadius: POINT_RADIUS
            // }, {
            //     label: "Metric3",
            //     data: [],
            //     fill: FILL_AREA,
            //     pointRadius: POINT_RADIUS
            // }, {
            //     label: "Metric4",
            //     data: [],
            //     fill: FILL_AREA,
            //     pointRadius: POINT_RADIUS
            // }, {
            //     label: "Metric5",
            //     data: [],
            //     fill: FILL_AREA,
            //     pointRadius: POINT_RADIUS
            // }, {
            //     label: "Metric6",
            //     data: [],
            //     fill: FILL_AREA,
            //     pointRadius: POINT_RADIUS
            // }, {
            //     label: "Metric7",
            //     data: [],
            //     fill: FILL_AREA,
            //     pointRadius: POINT_RADIUS
            // }, {
            //     label: "Metric8",
            //     data: [],
            //     fill: FILL_AREA,
            //     pointRadius: POINT_RADIUS
            // }
            ]),
            options: options
        });

        setInterval(() => {
            let nextDate = getNextDate();

            let anyUpdate = false;
            let maxSize = 0;

            for (let id in this.buffer) {
                let buffer = this.buffer[id];
                let index = this.mapping[id];
                let dataset = this.chart.data.datasets[index];
                if (buffer.length > 0) {
                    anyUpdate = true;
                    maxSize = Math.min(Math.max(maxSize, dataset.data.length), NUM_OF_DATA);
                    if (dataset.data.length >= NUM_OF_DATA) {
                        this.chart.data.datasets[index].data.shift();
                    }
                    this.chart.data.datasets[index].data.push(buffer.shift().y);
                }
            }

            if (anyUpdate) {
                if (maxSize === NUM_OF_DATA) {
                    this.chart.data.labels.shift();
                    this.chart.data.labels.push(nextDate);
                } else {
                    this.chart.data.labels[maxSize] = nextDate;
                }
            }
            this.chart.update();
        }, 500);

        let nextDate = moment("2016-01-01");
        function getNextDate() {
            let currentUsedDate = nextDate;
            let strDate = currentUsedDate.format("DD-MMM-YY").toString();
            nextDate = nextDate.add(1, "day");
            return strDate;
        }
    }

    ngOnChanges() {
        console.log("Input has changed!");
        this.subscribeToInput();
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    private subscribeToInput() {
        if (this.values) {
            this.ngOnDestroy();
            this.subscription = this.values
                .switchMap(ds => Observable.of(...ds.map((v, i) => [v, i] as [Datum, number]))
                    .delayWhen(([d, i]) => Observable.of(1).delay(i * 20))
                    .map(([d, i]) => d)
                )
                .subscribe((datum) => {
                    if (!this.buffer[datum.id]) {
                        this.nb_metrics += 1;
                        this.buffer[datum.id] = [];
                        this.mapping[datum.id] = this.chart.data.datasets.length;
                        this.chart.data.datasets.push(this.createNewDataSet(datum.id));
                    }
                    if (this.buffer[datum.id].length > 2000) {
                        console.log("Pushing too much to the consumer!!");
                    } else {
                        // Push a new data point in the buffer.
                        this.buffer[datum.id].push(datum);
                    }
                },
                (err) => console.log(`Error: ${err}`)
            );
        }
    }
}