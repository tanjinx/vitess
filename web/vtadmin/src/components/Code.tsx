/**
 * Copyright 2021 The Vitess Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as React from 'react';
import hljs from 'highlight.js/lib/common';
import hljsJSON from 'highlight.js/lib/languages/json';
import hljsSQL from 'highlight.js/lib/languages/sql';
import { lowlight } from 'lowlight';

import 'highlight.js/styles/default.css';

import style from './Code.module.scss';

enum Language {
    JSON = 'json',
    SQL = 'sql',
}

type Lang = 'json' | 'sql';

hljs.registerLanguage(Language.JSON, hljsJSON);
hljs.registerLanguage(Language.SQL, hljsSQL);
interface Props {
    code?: string | null | undefined;
    language?: Language | Lang | null | undefined;
}

export const Code = ({ code, language }: Props) => {
    if (typeof code !== 'string') {
        return null;
    }

    // Construct the AST from the code string
    const result = language ? lowlight.highlight(language, code) : lowlight.highlightAuto(code);
    const ast = result.children;

    const numbered = lineNumberify(ast).nodes;
    const wrapped = wrapLines(numbered, [], {});

    const lines = wrapped.reduce((acc: any[], l: any) => {
        const ln = l.lineNumber - 1;
        if (!Array.isArray(acc[ln])) {
            acc[ln] = [];
        }

        acc[ln].push(l);
        return acc;
    }, []);

    const codeLines = lines.map((l: any) => l.map(mapWithDepth(0)));

    return (
        <table className={style.table}>
            <tbody>
                {codeLines.map((l: any, i: number) => {
                    return (
                        <tr key={i}>
                            <td className={style.lineNumber} data-line-number={i} id={`L${i}`} />
                            <td className={style.code}>
                                <code>{l}</code>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

const mapWithDepth = (depth: number) => {
    const mapChildrenWithDepth = (child: any, i: any) => {
        return mapChild(child, i, depth);
    };

    return mapChildrenWithDepth;
};

const mapChild = (child: any, i: any, depth: any) => {
    if (child.tagName) {
        const props = Object.assign({ key: 'lo-' + depth + '-' + i }, child.properties);
        const children = child.children ? child.children.map(mapWithDepth(depth + 1)) : null;

        return React.createElement(child.tagName, props, children);
    }

    return child.value;
};

const lineNumberify = (ast: any, lineNumber = 1) => {
    return ast.reduce(
        function (result: any, node: any) {
            if (node.type === 'text') {
                if (node.value.indexOf('\n') === -1) {
                    node.lineNumber = lineNumber;
                    result.nodes.push(node);
                    return result;
                }

                const lines = node.value.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    result.nodes.push({
                        type: 'text',
                        value: i === lines.length - 1 ? lines[i] : lines[i] + '\n',
                        lineNumber: i === 0 ? lineNumber : ++lineNumber,
                    });
                }

                result.lineNumber = lineNumber;
                return result;
            }

            if (node.children) {
                node.lineNumber = lineNumber;
                const processed = lineNumberify(node.children, lineNumber);
                node.children = processed.nodes;
                result.lineNumber = processed.lineNumber;
                result.nodes.push(node);
                return result;
            }

            result.nodes.push(node);
            return result;
        },
        { nodes: [], lineNumber: lineNumber }
    );
};

const wrapLines = function wrapLines(ast: any, markers: any, options: any) {
    let i = 0;

    const wrapped = markers.reduce(function (nodes: any, marker: any) {
        const line = marker.line;
        const children = [];
        for (; i < ast.length; i++) {
            if (ast[i].lineNumber < line) {
                nodes.push(ast[i]);
                continue;
            }

            if (ast[i].lineNumber === line) {
                children.push(ast[i]);
                continue;
            }

            if (ast[i].lineNumber > line) {
                break;
            }
        }

        nodes.push({
            type: 'element',
            tagName: 'div',
            properties: { className: [marker.className || options.prefix + 'marker'] },
            children: children,
            lineNumber: line,
        });

        return nodes;
    }, []);

    for (; i < ast.length; i++) {
        wrapped.push(ast[i]);
    }

    return wrapped;
};
