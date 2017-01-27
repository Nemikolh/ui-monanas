/// <reference path="../node_modules/monaco-editor/monaco.d.ts"/>

import {Component, ViewChild, ElementRef} from '@angular/core';
import {Http, Response} from '@angular/http';
import {Observable} from 'rxjs/Observable';
import {Subscriber} from 'rxjs/Subscriber';
import {BananaReport} from './backend';
import {into_banana} from './syntax';
import {TypeTable} from './backend/type_table';

import IMarkerData = monaco.editor.IMarkerData;

@Component({
    selector: 'monaco-editor',
    template: `
    <div id="{{id}}" #editor class="monaco-editor"
         style="width: 600px; height: 606px"></div>
    `
})
export class MonacoEditor {
    @ViewChild('editor') editor_content: ElementRef;

    editor: monaco.editor.IStandaloneCodeEditor;

    constructor(
        private http: Http,
        private type_table: TypeTable
    ) {}

    ngAfterViewInit() {
        const amd_loader_is_ready = () => {
            (window as any).require(['vs/editor/editor.main'], () => {
                this.init_monaco();
            });
        };
        if (!(window as any).require) {
            let loader_script = document.createElement('script');
            loader_script.type = 'text/javascript';
            loader_script.src = 'vs/loader.js';
            loader_script.onload = amd_loader_is_ready;
            document.body.appendChild(loader_script);
        } else {
            amd_loader_is_ready();
        }
    }

    private init_monaco() {
        let div: HTMLDivElement = this.editor_content.nativeElement;
        // Register banana
        monaco.languages.register({
            id: 'banana'
        });
        // Add the token later, once we got the response from
        // the server.
        this.type_table.comps.subscribe(val => {
            let banana = into_banana(val);
            // Set banana highlighter
            monaco.languages.setMonarchTokensProvider('banana', banana);
            monaco.languages.setLanguageConfiguration('banana', {
                comments: { lineComment: '#' },
                wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\<\>\/\?\s]+)/g,
                autoClosingPairs: [{open: '(', close: ')'}],
            });

            let default_text = [
                'src = MonascaMarkovChainSource(sleep=0.8)',
                'input_sink = HttpSink()',
                'output_sink = HttpSink(port=9091)',
                '',
                'ldp1 = MonascaDerivativeLDP()',
                'ldp2 = JsonLDP()',
                '',
                'src -> ldp1 -> output_sink',
                'src -> ldp2 -> input_sink',
            ].join('\n');

            this.type_table.updateTypeTable(default_text).subscribe(() => {
                // Register completion service.
                monaco.languages.registerCompletionItemProvider('banana', {
                    provideCompletionItems: (model, position, token) => {
                        return this.type_table.getCompletion(model, position, token);
                    },
                });
            });

            // Create the editor
            this.editor = monaco.editor.create(div, {
                value: default_text,
                language: 'banana',
                wordSeparators: '~!@#$%^&*()-=+[{]}\\|;:\'",<>/?',
                wordWrapBreakObtrusiveCharacters: '',
            });

        });

        // Listen for changes.
        let observable = new Observable<string>((subscriber: Subscriber<string>) => {
            this.editor.onDidChangeModelContent(e => {
                subscriber.next(e.text);
            });
            return () => {};
        }).share();

        // Update the type table.
        observable
            .subscribe(() => this.type_table.updateTypeTable(
                this.editor.getValue()
            ));

        // Typeck the body
        observable
            .mergeMap(() => this.http.post('/banana/typeck', {
                content: this.editor.getValue()
            }).catch(() => Observable.never<Response>()))
            .map(res => res.json() as BananaReport)
            .subscribe(ev => {
                let model = this.editor.getModel();
                let errors: IMarkerData[] = ev.errors
                    .map(({message, startLineNumber, startColumn, endColumn, endLineNumber}) => ({
                        message,
                        severity: monaco.Severity.Error,
                        startLineNumber,
                        startColumn,
                        endLineNumber,
                        endColumn
                    }));
                let warnings = ev.warnings
                    .map(({message, startLineNumber, startColumn, endColumn, endLineNumber}) => ({
                        message,
                        severity: monaco.Severity.Warning,
                        startLineNumber,
                        startColumn,
                        endLineNumber,
                        endColumn
                    }));
                monaco.editor.setModelMarkers(model, '', [
                    ...warnings, ...errors
                ]);
            }, err => console.log(err));
    }
}
