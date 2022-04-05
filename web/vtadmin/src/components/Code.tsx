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
import cx from 'classnames';
import { useEffect, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import style from './Code.module.scss';

interface Props {
    code?: string | null | undefined;
}

export const Code = ({ code }: Props) => {
    const ref = useRef(null);
    const history = useHistory();
    const { hash } = useLocation();

    const highlightRange = parseLines(hash);
    console.log(highlightRange);

    useEffect(() => {
        if (highlightRange?.start) {
            const el = document.getElementById(`L${highlightRange.start}`);
            if (el) {
                el.scrollIntoView();
            }
        }
    }, [highlightRange?.start, ref.current]);

    if (typeof code !== 'string') {
        return null;
    }

    const onClickLine = (e: React.MouseEvent<HTMLTableCellElement, MouseEvent>, line: number) => {
        console.log('clicked', line, 'shift?', e.shiftKey);
        history.push({ hash: `#L${line}` });
    };

    const codeLines = code.split('\n');
    return (
        <table className={style.table} ref={ref}>
            <tbody>
                {codeLines.map((line, idx) => {
                    const isHighlighted = highlightRange && idx >= highlightRange.start && idx <= highlightRange.end;

                    return (
                        <tr key={idx}>
                            <td
                                id={`L${idx}`}
                                className={style.lineNumber}
                                data-line-number={idx}
                                onClick={(e) => onClickLine(e, idx)}
                            />
                            <td className={cx(style.code, isHighlighted && style.highlighted)}>
                                <code>{line}</code>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

interface LineRange {
    start: number;
    end: number;
}

export const parseLines = (hash: string): LineRange | null => {
    if (hash.startsWith('#L')) {
        const re = Array.from(hash.matchAll(/\#L(\d+)(?:-L(\d+))?/g));
        if (re.length !== 1) {
            return null;
        }

        const matches = re[0];
        if (matches.length !== 3) {
            return null;
        }

        const start = matches[1];
        const end = matches[2] || matches[1];

        const nStart = parseInt(start, 10);
        const nEnd = parseInt(end, 10);

        if (isNaN(nStart) || isNaN(nEnd)) {
            return null;
        }

        const result = { start: nStart, end: nEnd };
        return result;
    }

    return null;
};
