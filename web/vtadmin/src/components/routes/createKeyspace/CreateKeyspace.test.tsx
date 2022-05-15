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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Router } from 'react-router-dom';

import { CreateKeyspace } from './CreateKeyspace';
import { vtadmin } from '../../../proto/vtadmin';
import * as Snackbar from '../../Snackbar';
import { MemoryHistory } from 'history';

const ORIGINAL_PROCESS_ENV = process.env;
const TEST_PROCESS_ENV = {
    ...process.env,
    REACT_APP_VTADMIN_API_ADDRESS: '',
};

const server = setupServer();

describe('CreateKeyspace', () => {
    beforeAll(() => {
        process.env = { ...TEST_PROCESS_ENV } as NodeJS.ProcessEnv;
        server.listen();
    });

    afterEach(() => {
        process.env = { ...TEST_PROCESS_ENV } as NodeJS.ProcessEnv;
        server.resetHandlers();
    });

    afterAll(() => {
        process.env = { ...ORIGINAL_PROCESS_ENV };
    });

    it('successfully creates a keyspace', async () => {
        jest.spyOn(global, 'fetch');
        jest.spyOn(Snackbar, 'success');

        const cluster = { id: 'local', name: 'local' };

        const handlers = [
            rest.get('/api/clusters', (req, res, ctx) => res(ctx.json({ result: { clusters: [cluster] }, ok: true }))),
            rest.post('/api/keyspace/:clusterID', (req, res, ctx) => {
                const data: vtadmin.ICreateKeyspaceResponse = {
                    keyspace: {
                        cluster: { id: cluster.id, name: cluster.name },
                        keyspace: { name: 'some-keyspace' },
                    },
                };
                return res(ctx.json({ result: data, ok: true }));
            }),
        ];
        server.use(...handlers);

        const user = userEvent.setup();

        const { history } = renderHelper();

        await waitForFormReady();

        await user.click(screen.getByText('local (local)'));
        await user.type(screen.getByLabelText('Keyspace Name'), 'some-keyspace');

        (global.fetch as any).mockClear();

        const submitButton = screen.getByText('Create Keyspace', {
            selector: 'button[type="submit"]',
        });
        await user.click(submitButton);

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith('/api/keyspace/local', {
            credentials: undefined,
            // TODO omit empty fields
            body: JSON.stringify({ name: 'some-keyspace', sharding_column_name: '' }),
            method: 'post',
        });

        expect(submitButton).toHaveTextContent('Creating Keyspace...');

        await waitFor(() => {
            expect(submitButton).toHaveTextContent('Create Keyspace');
        });

        expect(history.push).toHaveBeenCalledTimes(1);
        expect(history.push).toHaveBeenCalledWith('/keyspace/local/some-keyspace');

        expect(Snackbar.success).toHaveBeenCalledTimes(1);
        expect(Snackbar.success).toHaveBeenCalledWith('Created keyspace some-keyspace', { autoClose: 1600 });
    });

    // describe('preflight validation', () => {
    //     it('disables form submission if cluster missing', () => {});
    //     it('disables form submission if keyspace name missing', () => {});
    // });

    // describe('error handling', () => {
    //     it('displays the error message', () => {});
    // });
});

const renderHelper = (): { history: MemoryHistory } => {
    const history = createMemoryHistory();
    jest.spyOn(history, 'push');

    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    render(
        <Router history={history}>
            <QueryClientProvider client={queryClient}>
                <CreateKeyspace />
            </QueryClientProvider>
        </Router>
    );

    return { history };
};

/**
 * waitForFormReady waits until all of the initial queries that populate
 * the form (e.g., the list of clusters) have completed.
 */
const waitForFormReady = () =>
    waitFor(() => {
        expect(screen.queryByText('No items')).toBeNull();
    });
