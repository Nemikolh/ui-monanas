/// <reference path="../node_modules/monaco-editor/monaco.d.ts"/>
import IMonarchLanguage = monaco.languages.IMonarchLanguage;
import {Components} from './backend/remote-data';

interface Groups {
    keywords: string[];
    typeKeywords: string[];
    operators: string[];
    escapes: RegExp;
    symbols: RegExp;
}

interface IntoBanana {
    (components: Components): IMonarchLanguage & Groups;
}

export const into_banana: IntoBanana = components => ({

    defaultToken: 'invalid',

    operators: [
        '=', '>', '<', '+', '-', '*', '/', '->', ','
    ],

    keywords: [],

    symbols:  /[=><!~?:&|+\-*\/\^%]+/,

    brackets: [
        { open: '(', close: ')', token: 'delimiter.parenthesis'},
        { open: '[', close: ']', token: 'delimiter.array'},
        { open: '{', close: '}', token: 'delimiter.bracket'},
    ],

    typeKeywords: components.components.map(c => c.name),

    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
        root: [
            // identifiers and keywords
            [/[A-Z][\w$]*/, { cases: { '@typeKeywords': 'keyword.type.identifier',
                                       '@default': 'identifier' } }],
            [/[a-z_$][\.\w$]*(?:[ \t\r\n]*)/, 'identifier.type'],
            [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
            [/\d+/, 'number.integer'],

            { include: '@whitespace' },

            [/[{}()\[\]]/, '@brackets'],
            [/[<>](?!@symbols)/, '@brackets'],
            [/@symbols/, { cases: { '@operators': 'operator', '@default': '' }}],

            [/"([^"\\]|\\.)*$/, 'string.invalid' ],  // non-teminated string
            [/"/,  { token: 'string.quote', bracket: '@open', next: '@string' } ],
            // characters
            [/'[^\\']'/, 'string'],
            [/(')(@escapes)(')/, ['string','string.escape','string']],
            [/'/, 'string.invalid']
        ],
        whitespace: [
            [/[ \t\r\n]+/, 'white'],
            [/\#.*$/,    'comment'],
        ],
        // variable: [
        //     []
        // ],
        string: [
            [/[^\\"]+/,  'string'],
            [/@escapes/, 'string.escape'],
            [/\\./,      'string.escape.invalid'],
            [/"/,        { token: 'string.quote', bracket: '@close', next: '@pop' } ]
        ],
    },
    tokenPostfix: '',
});
