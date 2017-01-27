import {Component, AfterViewInit, OnDestroy, OnChanges, Input} from '@angular/core';
import * as uniqueId from 'lodash/uniqueId';
import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';
import {Selection, select} from 'd3-selection';
import {scaleLinear} from 'd3-scale';
import {line, Line, curveBasis} from 'd3-shape';
import {axisLeft, axisBottom} from 'd3-axis';
import {easeLinear} from 'd3-ease'
import {active} from 'd3-transition';
import {graph_width, graph_height} from './variables';


export interface Datum {
    x: number,
    y: number,
    id: string;
}

const NB_SAMPLES = 10;

@Component({
    selector: 'graph',
    template: `<div class="graph" id="{{id}}"></div>`
})
export class Graph implements AfterViewInit, OnDestroy, OnChanges {

    @Input('values') values: Observable<Datum[]>;
    @Input('yDomain') y_domain: [number, number];

    private id = uniqueId('graph');

    private subscription: Subscription;
    private data: { [id: string]: Datum[] } = {};
    private buffer: { [id: string]: Datum[] } = {};
    private d3_svg: Selection<any, any, HTMLElement, any>;
    private create_curve: (id: string) => void;

    ngAfterViewInit() {
        let margin = {top: 20, right: 20, bottom: 20, left: 40};
        let width = parseInt(graph_width.substr(0, graph_width.indexOf('px')), 10) - margin.left - margin.right;
        let height = parseInt(graph_height.substr(0, graph_height.indexOf('px')), 10) - margin.top - margin.bottom;
        this.d3_svg = select(`#${this.id}`)
            .append('svg')
            .attr('width', graph_width)
            .attr('height', graph_height)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        let x_axis = scaleLinear()
            .domain([1, NB_SAMPLES - 2])
            .range([0, width]);
        let y_axis = scaleLinear()
            .domain(this.y_domain)
            .range([height, 0]);

        let tick = (id: string, curve: Line<Datum>) => (el, ticker) => {

            let buffer = this.buffer[id];
            let data = this.data[id];

            if (buffer.length > 0) {
                data.push(buffer.shift());
            }

            // Redraw the line.
            select(el).attr('d', curve)
                .attr('transform', null);

            if (data.length >= NB_SAMPLES) {
                // Slide it to the left.
                active(el)
                    .attr('transform', `translate(${x_axis(0)}, 0)`)
                    .transition()
                    .on('start', function() { ticker(this, ticker) });
                data.shift();
            } else {
                active(el)
                    .attr('transform', `translate(0, 0)`)
                    .transition()
                    .on('start', function() { ticker(this, ticker) });
            }
        };

        let curve_container = this.d3_svg.append('g')
                .attr('clip-path', 'url(#clip)');

        this.create_curve = (id) => {
            let curve = line<Datum>()
                .curve(curveBasis)
                .y((d, i) => y_axis(d.y))
                .x((d, i) => x_axis(i));
            let ticker = tick(id, curve);
            curve_container.append('path')
                .datum(this.data[id])
                .attr('class', 'line')
            .transition()
                .duration(700)
                .ease(easeLinear)
                .on('start', function () { ticker(this, ticker) })
        };

        this.d3_svg.append('defs').append('clipPath')
                .attr('id', 'clip')
                .append('rect')
                    .attr('width', width)
                    .attr('height', height);

        this.d3_svg.append('g')
                .attr('class', 'axis axis--x')
                .attr('transform', 'translate(0,' + y_axis(0) + ')')
                .call(axisBottom(x_axis));
        this.d3_svg.append('g')
                .attr('class', 'axis axis--y')
                .call(axisLeft(y_axis));

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
                        this.create_curve(datum.id);
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
