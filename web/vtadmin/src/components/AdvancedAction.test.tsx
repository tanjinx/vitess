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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import React from 'react';
import { QueryClient, QueryClientProvider, useMutation } from 'react-query';

import { AdvancedAction } from './AdvancedAction';

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

const renderHelper = (children: React.ReactNode) => {
    return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
};

describe('AdvancedAction', () => {
    let server = setupServer();

    beforeAll(() => {
        server.use(rest.get('/api/test', (req, res, ctx) => res(ctx.json({ ok: true }))));
        server.listen();

        jest.spyOn(global, 'fetch');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        server.resetHandlers();
    });

    afterAll(() => {
        server.close();
    });

    it('does anything', async () => {
        const Wrapper: React.FC = () => {
            const m = useMutation(() => fetch('/api/test'));
            return <AdvancedAction mutation={m} title="Do a thing" />;
        };

        renderHelper(<Wrapper />);

        expect(global.fetch).toHaveBeenCalledTimes(0);

        const button = screen.getByRole('button');
        expect(button).not.toHaveAttribute('disabled');
        fireEvent.click(button);

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    });

    describe('with confirmation', () => {
        it('only calls mutation if confirmation matches', async () => {
            const Wrapper: React.FC = () => {
                const m = useMutation(() => fetch('/api/test'));
                return <AdvancedAction confirmationText="hello-world" mutation={m} title="Do a thing" />;
            };

            renderHelper(<Wrapper />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('disabled');

            const input = screen.getByLabelText('confirm');
            fireEvent.change(input, { target: { value: 'hello-world' } });

            expect(button).not.toHaveAttribute('disabled');
            fireEvent.click(button);

            await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        });
    });
});
