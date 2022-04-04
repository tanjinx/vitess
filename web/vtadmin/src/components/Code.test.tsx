/**
 * Copyright 2022 The Vitess Authors.
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

import { render, screen, within } from '@testing-library/react';
import { Code } from './Code';

describe('Code component', () => {
    it('renders SQL', async () => {
        const code = `CREATE TABLE \`product\` (
            \`sku\` varbinary(128) NOT NULL,
            \`description\` varbinary(128) DEFAULT NULL,
            \`price\` bigint(20) DEFAULT NULL,
            PRIMARY KEY (\`sku\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8`;

        const expected = [
            'CREATE TABLE `product`',
            '`sku` varbinary(128) NOT NULL,',
            '`description` varbinary(128) DEFAULT NULL,',
            '`price` bigint(20) DEFAULT NULL,',
            'PRIMARY KEY (`sku`)',
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8',
        ];

        render(<Code code={code} />);

        const table = screen.getByRole('table');
        const rows = within(table).getAllByRole('row');

        expect(rows).toHaveLength(expected.length);
        for (let i = 0; i < rows.length; i++) {
            expect(rows[i]).toHaveTextContent(expected[i]);
        }
    });
});
