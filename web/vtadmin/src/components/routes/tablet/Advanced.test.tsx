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

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { merge } from 'lodash-es';
import React from 'react';
import { QueryClient, QueryClientProvider, useMutation } from 'react-query';
import { Router } from 'react-router';

import { topodata, vtadmin } from '../../../proto/vtadmin';
import Advanced from './Advanced';

const makeTablet = (overrides: Partial<vtadmin.ITablet> = {}): vtadmin.Tablet => {
    const defaults: vtadmin.ITablet = {
        cluster: { id: 'some-cluster-id', name: 'some-cluster-name' },
        state: vtadmin.Tablet.ServingState.SERVING,
        tablet: {
            alias: {
                cell: 'zone1',
                uid: 101,
            },
            type: topodata.TabletType.REPLICA,
        },
    };
    return vtadmin.Tablet.create(merge(defaults, overrides));
};

const makePrimaryTablet = (overrides: Partial<vtadmin.ITablet> = {}): vtadmin.Tablet => {
    return makeTablet({
        ...overrides,
        tablet: {
            type: topodata.TabletType.PRIMARY,
        },
    });
};

const renderHelper = (children: React.ReactNode) => {
    const history = createMemoryHistory();
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    render(
        <Router history={history}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </Router>
    );
};

// Since vtadmin uses process.env variables quite a bit, we need to
// do a bit of a dance to clear them out between test runs.
const ORIGINAL_PROCESS_ENV = process.env;
const TEST_PROCESS_ENV = {
    ...process.env,
    REACT_APP_VTADMIN_API_ADDRESS: '',
};

// These tests check that initiating an action in the "Advanced" tablet UI
// maps to the correct API request.
describe('Advanced', () => {
    beforeAll(() => {
        process.env = { ...TEST_PROCESS_ENV } as NodeJS.ProcessEnv;
        jest.spyOn(global, 'fetch');
    });

    beforeEach(() => {
        process.env = { ...TEST_PROCESS_ENV } as NodeJS.ProcessEnv;
        jest.clearAllMocks();
    });

    afterAll(() => {
        process.env = { ...ORIGINAL_PROCESS_ENV };
    });

    describe('Start replication', () => {
        it('triggers the action', async () => {
            const tablet = makeTablet();
            renderHelper(<Advanced tablet={tablet} />);

            const container = screen.getByTestId('start-replication');
            const button = within(container).getByRole('button');
            const input = within(container).queryByRole('textbox');

            expect(input).toBeNull();
            expect(button).not.toHaveAttribute('disabled');

            fireEvent.click(button);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledTimes(1);
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/tablet/zone1-101/start_replication?cluster=some-cluster-id',
                    {
                        credentials: undefined,
                        method: 'put',
                    }
                );
            });
        });

        it('disables the action if primary', () => {
            const tablet = makePrimaryTablet();
            renderHelper(<Advanced tablet={tablet} />);

            const container = screen.getByTestId('start-replication');
            const button = within(container).getByRole('button');
            const input = within(container).queryByRole('textbox');

            expect(input).toBeNull();
            expect(button).toHaveAttribute('disabled');
        });
    });

    describe('Stop replication', () => {
        it('triggers the action', async () => {
            const tablet = makeTablet();
            renderHelper(<Advanced tablet={tablet} />);

            const container = screen.getByTestId('stop-replication');
            const button = within(container).getByRole('button');
            const input = within(container).queryByRole('textbox');

            expect(input).toBeNull();
            expect(button).not.toHaveAttribute('disabled');

            fireEvent.click(button);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledTimes(1);
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/tablet/zone1-101/stop_replication?cluster=some-cluster-id',
                    {
                        credentials: undefined,
                        method: 'put',
                    }
                );
            });
        });

        it('disables the action if primary', () => {
            const tablet = makePrimaryTablet();
            renderHelper(<Advanced tablet={tablet} />);

            const container = screen.getByTestId('stop-replication');
            const button = within(container).getByRole('button');
            const input = within(container).queryByRole('textbox');

            expect(input).toBeNull();
            expect(button).toHaveAttribute('disabled');
        });
    });

    describe('Reparent', () => {
        it('triggers the action', async () => {
            const tablet = makeTablet();
            renderHelper(<Advanced tablet={tablet} />);

            const container = screen.getByTestId('reparent');
            const button = within(container).getByRole('button');
            const input = within(container).queryByRole('textbox');

            expect(input).toBeNull();
            expect(button).not.toHaveAttribute('disabled');

            fireEvent.click(button);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledTimes(1);
                // TODO this should pass cluster id
                expect(global.fetch).toHaveBeenCalledWith('/api/tablet/zone1-101/reparent', {
                    credentials: undefined,
                    method: 'put',
                });
            });
        });

        it('disables the action if primary', () => {
            const tablet = makePrimaryTablet();
            renderHelper(<Advanced tablet={tablet} />);

            const container = screen.getByTestId('reparent');
            const button = within(container).getByRole('button');
            const input = within(container).queryByRole('textbox');

            expect(input).toBeNull();
            expect(button).toHaveAttribute('disabled');
        });
    });

    describe('Set read-only', () => {
        it('triggers the action', async () => {
            const tablet = makePrimaryTablet();
            renderHelper(<Advanced tablet={tablet} />);

            const container = screen.getByTestId('set-read-only');
            const button = within(container).getByRole('button');
            const input = within(container).getByRole('textbox');

            expect(button).toHaveAttribute('disabled');

            fireEvent.change(input, { target: { value: 'zone1-101' } });
            expect(button).not.toHaveAttribute('disabled');

            fireEvent.click(button);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledTimes(1);
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/tablet/zone1-101/set_read_only?cluster=some-cluster-id',
                    {
                        credentials: undefined,
                        method: 'put',
                    }
                );
            });
        });

        it('does not render if not primary', async () => {
            const tablet = makeTablet();
            renderHelper(<Advanced tablet={tablet} />);

            const container = screen.queryByTestId('set-read-only');
            expect(container).toBeNull();
        });
    });

    describe('Set read-write', () => {
        it('triggers the action', async () => {
            const tablet = makePrimaryTablet();
            renderHelper(<Advanced tablet={tablet} />);

            const container = screen.getByTestId('set-read-write');
            const button = within(container).getByRole('button');
            const input = within(container).getByRole('textbox');

            expect(button).toHaveAttribute('disabled');

            fireEvent.change(input, { target: { value: 'zone1-101' } });
            expect(button).not.toHaveAttribute('disabled');

            fireEvent.click(button);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledTimes(1);
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/tablet/zone1-101/set_read_write?cluster=some-cluster-id',
                    {
                        credentials: undefined,
                        method: 'put',
                    }
                );
            });
        });

        it('does not render if not primary', async () => {
            const tablet = makeTablet();
            renderHelper(<Advanced tablet={tablet} />);

            const container = screen.queryByTestId('set-read-write');
            expect(container).toBeNull();
        });
    });

    describe('Delete', () => {
        it('deletes the tablet', async () => {
            const tablet = makeTablet();
            renderHelper(<Advanced tablet={tablet} />);

            const container = screen.getByTestId('delete-tablet');
            const button = within(container).getByRole('button');
            const input = within(container).getByRole('textbox');

            expect(button).toHaveAttribute('disabled');

            fireEvent.change(input, { target: { value: 'zone1-101' } });
            expect(button).not.toHaveAttribute('disabled');

            fireEvent.click(button);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledTimes(1);
                expect(global.fetch).toHaveBeenCalledWith('/api/tablet/zone1-101?cluster=some-cluster-id', {
                    credentials: undefined,
                    method: 'delete',
                });
            });
        });

        it('deletes the tablet with allow_master=true if primary', () => {
            // TODO
        });
    });
});
