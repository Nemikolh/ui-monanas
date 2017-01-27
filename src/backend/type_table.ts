import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import {Type, Component, Components, Param} from './remote-data';
import * as keys from 'lodash/keys';
import * as reduce from 'lodash/reduce';
import {Observable} from 'rxjs/Observable';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

import IReadOnlyModel = monaco.editor.IReadOnlyModel;
import CancellationToken = monaco.CancellationToken;
import CompletionItem = monaco.languages.CompletionItem;

export interface ServerTypeTable {
    [varname: string]: Type;
}

@Injectable()
export class TypeTable {

    type_table: ServerTypeTable = {};
    comps: Observable<Components> = new BehaviorSubject({
        components: []
    });
    private components: Component[];

    constructor(private http: Http) {
        this.http.get('/banana/metadata')
            .map(res => res.json() as Components)
            .retry(2)
            .subscribe(res => {
                this.components = res.components;
                (this.comps as BehaviorSubject<Components>).next(res);
            });
    }

    updateTypeTable(new_content: string): Observable<any> {
        let observable = this.http.post('/banana/metadata', {
            content: new_content
        }).map(res => res.json() as ServerTypeTable)
          .retry(2)
          .share();
        observable
          .subscribe(new_type_table => {
              if (keys(new_type_table).length > 0) {
                  this.type_table = new_type_table;
              }
          }, err => console.log(`Error: ${err}`));
        return observable;
    }

    getCompletion(
        model: IReadOnlyModel,
        position: monaco.Position,
        token: CancellationToken
    ): CompletionItem[] {
        let textUntilPosition = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
        });
        // console.log(`GET COMPLETION: ${textUntilPosition}`);

        // try to match <path> = <comp> ( p, <..>, |
        let comp_param = /^(?:[^=])+\=\s*([a-zA-Z\_\$]+)(?: *)\(([^)]*)/;

        // try to match <..> a.b.c.|
        let dot_props = /^(\.[a-z\.A-Z\_\$ ]+)+(?: *)$/;

        let after_eq = /^[^=]+\=[^\(\n\r]+$/;

        let matches: string[];

        // try to match <..> a.b.c.|
        if (matches = dot_props.exec(textUntilPosition.split('').reverse().join(''))) {
            let path = matches[1].split('').reverse().join('');
            let path_iter = path.split('.');
            let type = this.type_table[path_iter[0]];
            for (let token of path_iter.slice(1, -1)) {
                if (type) {
                    type = this.inspect_type(type, token.trim());
                }
            }
            return this.collect_proposals(path, type);
        }

        // try to match <path> = <comp> ( p, <..>, |
        if (matches =  comp_param.exec(textUntilPosition)) {
            let comp_name = matches[1];
            let params = matches[2];
            let comp_type = this.components.find(c => c.name == comp_name);
            if (comp_type) {
                return this.convert_into_completion_items('', comp_type.params);
            }
        }
        // try to match <path> = ident_only|
        if (matches = after_eq.exec(textUntilPosition)) {
            return this.components.map(comp => ({
                label: comp.name,
                insertText: comp.name + '({{}})',
                documentation: comp.description,
                kind: monaco.languages.CompletionItemKind.Class,
            }));
        }
        return [];
    }

    private collect_proposals(prefix: string, type: Type): CompletionItem[] {
        if (type) {
            switch(type.id) {
                case 'any': return [];
                case 'string': return [];
                case 'number': return [];
                case 'enum': return [];
                case 'object': return reduce(type.props, (res, el, key) => {
                    return res.concat({
                        kind: monaco.languages.CompletionItemKind.Field,
                        label: prefix + key,
                        insertText: prefix + key,
                        documentation: el.id,
                    });
                }, [] as CompletionItem[]);
                case 'component': return this.convert_into_completion_items(
                    prefix,
                    type.args
                );
                // TODO: remove that once TypeScript 2.0.1 is out
                default: return [];
            }
        } else {
            return [];
        }
    }

    private convert_into_completion_items(prefix: string, params: Param[]): CompletionItem[] {
        return params.map(p => ({
            kind: monaco.languages.CompletionItemKind.Property,
            label: prefix + p.name,
            insertText: prefix + p.name,
            documentation: `${p.type.id} default_value: ${JSON.stringify(p.default_value)}`
        }));
    }

    private inspect_type(type: Type, token: string): Type {
        switch(type.id) {
            case 'any': return undefined;
            case 'string': return undefined;
            case 'number': return undefined;
            case 'enum': return undefined;
            case 'object': return type.props[token];
            case 'component': return type.args.find(
                p => p.name == token
            ).type;
        }
    }
}
