import {ViewChild, ElementRef, Component, Input} from '@angular/core';
import {AfterViewInit, OnDestroy} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';
import {graph_width_number, graph_height_number} from './variables';


const moment = require<any>("moment");

const NUM_OF_DATA = 20;
const ANIMATION = false;
const BORDER_WIDTH = 0;
const BAR_PERCENTAGE = 1;
const BAR_SPACING = 0;
const X_GRIDLINES = false;
const Y_GRIDLINES = true;

function getColorArray(colorString) {
  let colorArray = [];
  for (let i = 0; i < NUM_OF_DATA; i++) {
    colorArray.push(colorString);
  }
  return colorArray;
}

function getInitialDataForChart(label, backgroundColor, borderColor, borderWidth, initialDataArray) {
  let labels = [];
  for (let i = 0; i < NUM_OF_DATA; i++) {
    labels.push("");
  }
  return {
    labels: labels,
    datasets: [{
      label: label,
      backgroundColor: backgroundColor,
      borderColor: borderColor,
      borderWidth: borderWidth,
      data: initialDataArray
    }]
  }
}

export interface Datum {
    x: number,
    y: number,
    id: string;
}



@Component({
    selector: 'anomalygraph',
    template:
    `<div width="${graph_width_number}" height="${graph_height_number/4}"><canvas #canvas1 width="${graph_width_number}" height="${graph_height_number/4}"></canvas></div>
    <div width="${graph_width_number}" height="${graph_height_number/4}"><canvas #canvas2 width="${graph_width_number}" height="${graph_height_number/4}"></canvas></div>
    <div width="${graph_width_number}" height="${graph_height_number/4}"><canvas #canvas3 width="${graph_width_number}" height="${graph_height_number/4}"></canvas></div>
    <div width="${graph_width_number}" height="${graph_height_number/4}"><canvas #canvas4 width="${graph_width_number}" height="${graph_height_number/4}"></canvas></div>
    `
})
export class AnomalyGraph {

    @Input('values') values: Observable<Datum[]>;

    @ViewChild('canvas1') canvas1: ElementRef;
    @ViewChild('canvas2') canvas2: ElementRef;
    @ViewChild('canvas3') canvas3: ElementRef;
    @ViewChild('canvas4') canvas4: ElementRef;

    private subscription: Subscription;
    private data: { [id: string]: number[] } = {};
    private buffer: { [id: string]: Datum[] } = {};
    private mapping: { [id: number]: string } = {};
    private available_slot = 0;

    ngAfterViewInit() {
        let anomaly1ctx = this.canvas1.nativeElement.getContext('2d');
        let anomaly2ctx = this.canvas2.nativeElement.getContext('2d');
        let anomaly3ctx = this.canvas3.nativeElement.getContext('2d');
        let anomaly4ctx = this.canvas4.nativeElement.getContext('2d');

        let options = {
            scales: {
                xAxes: [{
                barPercentage: BAR_PERCENTAGE,
                categorySpacing: BAR_SPACING,
                gridLines: {display: X_GRIDLINES}
                }],
                yAxes: [{
                // Using 1/0 is probably simpler depending on he use case.
                // ticks: {min: 0, max: 1, stepSize: 1.0},
                ticks: {
                    min: 0, max: 1, stepSize: 1.0,
                    callback: (value) => {
                    if (value > 0) {
                        return "Event occurred"
                    } else {
                        return "No event";
                    }
                    }
                },
                gridLines: {display: Y_GRIDLINES}
                }]
            },
            animation: ANIMATION
        };

        let data1 = getInitialDataForChart(
            "",
            getColorArray("rgba(1, 169, 130, 0.2)"),
            getColorArray("rgba(1, 169, 130, 1)"),
            BORDER_WIDTH,
            []
        );

        let data2 = getInitialDataForChart(
            "",
            getColorArray("rgba(91, 71, 103, 0.2)"),
            getColorArray("rgba(91, 71, 103, 1)"),
            BORDER_WIDTH,
            []
        );

        let data3 = getInitialDataForChart(
            "",
            getColorArray("rgba(253, 154, 105, 0.2)"),
            getColorArray("rgba(253, 154, 105, 1)"),
            BORDER_WIDTH,
            []
        );

        let data4 = getInitialDataForChart(
            "",
            getColorArray("rgba(255, 69, 79, 0.2)"),
            getColorArray("rgba(255, 69, 79, 1)"),
            1,
            []
        );

        let anomaly1Chart = new Chart(anomaly1ctx, {
            type: "bar",
            data: data1,
            options: options
        });
        let anomaly2Chart = new Chart(anomaly2ctx, {
            type: "bar",
            data: data2,
            options: options
        });
        let anomaly3Chart = new Chart(anomaly3ctx, {
            type: "bar",
            data: data3,
            options: options
        });
        let anomaly4Chart = new Chart(anomaly4ctx, {
            type: "bar",
            data: data4,
            options: options
        });

        let charts = [anomaly1Chart, anomaly2Chart, anomaly3Chart, anomaly4Chart];

        let nextDate = moment("2016-01-01");

        function getNextDate() {
            let currentUsedDate = nextDate;
            let strDate = currentUsedDate.format("DD-MMM-YY").toString();
            nextDate = nextDate.add(1, "day");
            return strDate;
        }

        setInterval(() => {
            let nextDate = getNextDate();

            for (let i = 0; i < charts.length; i++) {
                if (charts[i].data.datasets[0].data.length >= NUM_OF_DATA) {
                    charts[i].data.datasets[0].data.shift();
                    charts[i].data.labels.shift();
                    charts[i].data.labels.push(nextDate);
                } else {
                    charts[i].data.labels[charts[i].data.datasets[0].data.length] = nextDate;
                }
            }

            for (let i = 0; i < charts.length; i++) {
                let buffer = this.buffer[this.mapping[i]];
                if (buffer && buffer.length > 0) {
                    // TODO data ignored for now.
                    let elem = buffer.shift();
                    charts[i].data.datasets[0].label = elem.id;
                    charts[i].data.datasets[0].data.push(elem.y);
                } else {
                    charts[i].data.datasets[0].data.push(0);
                }
                charts[i].update();
            }
        }, 500);

        this.subscribeToInput();
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
                        this.buffer[datum.id] = [];
                        this.data[datum.id] = [];
                        this.mapping[this.available_slot++] = datum.id;
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