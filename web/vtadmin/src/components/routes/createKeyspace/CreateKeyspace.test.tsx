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
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Router } from 'react-router-dom';

import { CreateKeyspace } from './CreateKeyspace';

const ORIGINAL_PROCESS_ENV = process.env;
const TEST_PROCESS_ENV = {
    ...process.env,
    REACT_APP_VTADMIN_API_ADDRESS: '',
};

const server = setupServer();

describe('CreateKeyspace', () => {
    beforeAll(() => {
        // TypeScript can get a little cranky with the automatic
        // string/boolean type conversions, hence this cast.
        process.env = { ...TEST_PROCESS_ENV } as NodeJS.ProcessEnv;

        // Enable API mocking before tests.
        server.listen();
    });

    afterEach(() => {
        // Reset the process.env to clear out any changes made in the tests.
        process.env = { ...TEST_PROCESS_ENV } as NodeJS.ProcessEnv;

        // jest.restoreAllMocks();

        // Reset any runtime request handlers we may add during the tests.
        server.resetHandlers();
    });

    it('successfully creates a keyspace', async () => {
        jest.spyOn(global, 'fetch');

        const cluster = { id: 'local', name: 'local' };

        server.use(
            rest.get('/api/clusters', (req, res, ctx) => res(ctx.json({ result: { clusters: [cluster] }, ok: true })))
        );

        const history = createMemoryHistory();
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });

        const user = userEvent.setup();

        render(
            <Router history={history}>
                <QueryClientProvider client={queryClient}>
                    <CreateKeyspace />
                </QueryClientProvider>
            </Router>
        );

        // Wait for clusters to load
        await waitFor(() => {
            expect(screen.queryByText('No items')).toBeNull();
        });

        await userEvent.click(screen.getByText('local (local)'));
        await userEvent.type(screen.getByLabelText('Keyspace Name'), 'some-keyspace');

        (global.fetch as any).mockClear();
        const submitButton = screen.getByText('Create Keyspace', {
            selector: 'button[type="submit"]',
        });
        await userEvent.click(submitButton);

        console.log((global.fetch as any).mock.calls);

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith('/api/keyspace/local', {
            credentials: undefined,
            // TODO omit empty fields
            body: { name: 'some-keyspace', sharding_column_name: '' },
            method: 'post',
        });

        screen.debug();
    });

    // describe('preflight validation', () => {
    //     it('disables form submission if cluster missing', () => {});
    //     it('disables form submission if keyspace name missing', () => {});
    // });

    // describe('error handling', () => {
    //     it('displays the error message', () => {});
    // });
});
