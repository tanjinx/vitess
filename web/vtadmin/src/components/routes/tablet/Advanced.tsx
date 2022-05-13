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

import React from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
    useDeleteTablet,
    useReparentTablet,
    useSetReadOnly,
    useSetReadWrite,
    useStartReplication,
    useStopReplication,
} from '../../../hooks/api';
import { vtadmin } from '../../../proto/vtadmin';
import { isPrimary } from '../../../util/tablets';
import { AdvancedAction } from '../../AdvancedAction';
import { success, warn } from '../../Snackbar';

interface AdvancedProps {
    tablet: vtadmin.Tablet | undefined;
}

interface RouteParams {
    alias: string;
    clusterID: string;
}

const Advanced: React.FC<AdvancedProps> = ({ tablet }) => {
    const { clusterID, alias } = useParams<RouteParams>();
    const history = useHistory();
    const primary = isPrimary(tablet);

    const deleteTabletMutation = useDeleteTablet(
        { alias, clusterID },
        {
            onSuccess: () => {
                success(`Successfully deleted tablet ${alias}`);
                history.push('/tablets');
            },
            onError: (error) => warn(`There was an error deleting tablet: ${error}`),
        }
    );

    const reparentTabletMutation = useReparentTablet(
        { alias, clusterID },
        {
            onSuccess: (result) => {
                success(`Successfully reparented tablet ${alias} under primary ${result.primary}`, { autoClose: 7000 });
            },
            onError: (error) => warn(`There was an error reparenting tablet: ${error}`),
        }
    );

    const setReadOnlyMutation = useSetReadOnly(
        { alias, clusterID },
        {
            onSuccess: () => {
                success(`Successfully set tablet ${alias} to read-only`);
            },
            onError: (error) => warn(`There was an error setting tablet ${alias} to read-only: ${error}`),
        }
    );

    const setReadWriteMutation = useSetReadWrite(
        { alias, clusterID },
        {
            onSuccess: () => {
                success(`Successfully set tablet ${alias} to read-write`);
            },
            onError: (error) => warn(`There was an error setting tablet ${alias} to read-write: ${error}`),
        }
    );

    const startReplicationMutation = useStartReplication(
        { alias, clusterID },
        {
            onSuccess: () => {
                success(`Successfully started replication on tablet ${alias}.`, { autoClose: 7000 });
            },
            onError: (error) => warn(`There was an error starting replication on tablet: ${error}`),
        }
    );

    const stopReplicationMutation = useStopReplication(
        { alias, clusterID },
        {
            onSuccess: () => success(`Successfully stopped replication on tablet ${alias}.`, { autoClose: 7000 }),
            onError: (error) => warn(`There was an error stopping replication on tablet: ${error}`),
        }
    );

    return (
        <div className="pt-4">
            <div className="my-8">
                <h3 className="mb-4">Replication</h3>
                <div>
                    <AdvancedAction
                        description={
                            <>
                                This will run the underlying database command to start replication on tablet{' '}
                                <span className="font-bold">{alias}</span>. For example, in mysql 8, this will be{' '}
                                <span className="font-mono text-sm p-1 bg-gray-100">start replication</span>.
                            </>
                        }
                        disabled={primary}
                        documentationHref="https://vitess.io/docs/reference/programs/vtctl/tablets/#startreplication"
                        mutation={startReplicationMutation}
                        title="Start Replication"
                        warnings={[primary && 'Command StartTablet cannot be run on the primary tablet.']}
                    />
                    <AdvancedAction
                        description={
                            <>
                                This will run the underlying database command to stop replication on tablet{' '}
                                <span className="font-bold">{alias}</span>. For example, in mysql 8, this will be{' '}
                                <span className="font-mono text-sm p-1 bg-gray-100">stop replication</span>.
                            </>
                        }
                        disabled={primary}
                        documentationHref="https://vitess.io/docs/reference/programs/vtctl/tablets/#stopreplication"
                        mutation={stopReplicationMutation}
                        title="Stop Replication"
                        warnings={[primary && 'Command StopTablet cannot be run on the primary tablet.']}
                    />
                </div>
            </div>

            <div className="my-8">
                <h3 className="mb-4">Reparent</h3>
                <div>
                    <AdvancedAction
                        description={
                            <>
                                Reconnect replication for tablet <span className="font-bold">{alias}</span> to the
                                current primary tablet. This only works if the current replication position matches the
                                last known reparent action.
                            </>
                        }
                        disabled={primary}
                        documentationHref="https://vitess.io/docs/reference/programs/vtctl/tablets/#reparenttablet"
                        mutation={reparentTabletMutation}
                        title="Reparent Tablet"
                        warnings={[primary && 'Command ReparentTablet cannot be run on the primary tablet.']}
                    />
                </div>
            </div>

            <div className="my-8">
                <h3 className="mb-4">Danger</h3>
                <div>
                    {!primary && (
                        <AdvancedAction
                            confirmationPlaceholder="zone-xxx"
                            confirmationPrompt="Please type the tablet's alias to set tablet to read-only:"
                            confirmationText={alias}
                            danger
                            description={
                                <>
                                    Set tablet <span className="font-bold">{alias}</span> to read-only.
                                </>
                            }
                            documentationHref="https://vitess.io/docs/reference/programs/vtctl/tablets/#setreadonly"
                            mutation={setReadOnlyMutation}
                            title="Set Read-Only"
                            warnings={[
                                primary && (
                                    <>This will disable writing on the primary tablet {alias}. Use with caution.</>
                                ),
                            ]}
                        />
                    )}

                    {!primary && (
                        <AdvancedAction
                            confirmationPlaceholder="zone-xxx"
                            confirmationPrompt="Please type the tablet's alias to set tablet to read-only"
                            confirmationText={alias}
                            danger
                            description={
                                <>
                                    Set tablet <span className="font-bold">{alias}</span> to read-write.
                                </>
                            }
                            documentationHref="https://vitess.io/docs/reference/programs/vtctl/tablets/#setreadwrite"
                            mutation={setReadWriteMutation}
                            title="Set Read-Write"
                            warnings={[
                                primary && (
                                    <>This will re-enable writing on the primary tablet {alias}. Use with caution.</>
                                ),
                            ]}
                        />
                    )}

                    <AdvancedAction
                        confirmationPlaceholder="zone-xxx"
                        confirmationPrompt="Please type the tablet's alias to delete the tablet:"
                        confirmationText={alias}
                        danger
                        description={
                            <>
                                Delete tablet <span className="font-bold">{alias}</span>. Doing so will remove it from
                                the topology, but vttablet and MySQL won't be touched.
                            </>
                        }
                        documentationHref="https://vitess.io/docs/reference/programs/vtctl/tablets/#deletetablet"
                        mutation={deleteTabletMutation}
                        title="Delete Tablet"
                        warnings={[
                            primary && (
                                <>
                                    Tablet {alias} is the primary tablet. Flag{' '}
                                    <span className="font-mono bg-red-100 p-1 text-sm">-allow_master=true</span> will be
                                    applied in order to delete the primary tablet.
                                </>
                            ),
                        ]}
                    />
                </div>
            </div>
        </div>
    );
};

export default Advanced;
