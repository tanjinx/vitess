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

import { UseMutationResult } from 'react-query';
import { useDeleteShards, useKeyspace } from '../../../hooks/api';
import { vtadmin as pb, vtctldata } from '../../../proto/vtadmin';
import { findShard, formatKeyspaceShard } from '../../../util/keyspaces';
import DangerAction from '../../DangerAction';

interface Props {
    clusterID: string;
    keyspace: string;
    shard: string;
}

export const Advanced: React.FC<Props> = ({ clusterID, ...props }) => {
    const { data: keyspace, ...kq } = useKeyspace({ clusterID, name: props.keyspace });

    const shard = findShard(keyspace, props.shard);
    const keyspaceShard = formatKeyspaceShard(keyspace?.keyspace?.name, props.shard);
    const keyspaceShards = [keyspaceShard];

    console.log(shard, keyspaceShards);

    const m = useDeleteShards(
        { clusterID, keyspaceShards, evenIfServing: true, recursive: true },
        {
            onSuccess: () => {
                console.log('success');
            },
            onError: (error) => {
                console.log('error', error);
            },
        }
    );

    return (
        <div className="pt-4">
            <div className="my-8">
                <h3 className="mb-4">Danger</h3>
                <div className="border border-danger rounded-lg">
                    <DangerAction
                        title="Delete Shard"
                        documentationLink="TODO"
                        primaryDescription="TODO"
                        description="TODO"
                        action=""
                        mutation={m as UseMutationResult}
                        loadingText="Deleting shard..."
                        loadedText="Delete Shard"
                        primary={false}
                        alias={keyspaceShard as string}
                    />
                </div>
            </div>
        </div>
    );
};
