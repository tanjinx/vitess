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

import { padStart } from 'lodash-es';
import { useShardReplicationPositions } from '../../../hooks/api';
import { vtadmin as pb } from '../../../proto/vtadmin';
import { Code } from '../../Code';
import { QueryLoadingPlaceholder } from '../../placeholders/QueryLoadingPlaceholder';

interface Props {
    tablet?: pb.Tablet;
}

export const TabletOverview: React.FC<Props> = ({ tablet }) => {
    const clusterID = tablet?.cluster?.id;
    const keyspace = tablet?.tablet?.keyspace;
    const shard = tablet?.tablet?.shard;

    const q = useShardReplicationPositions({
        clusterIDs: [clusterID],
        keyspaces: [keyspace],
        keyspaceShards: [`${keyspace}/${shard}`],
    });

    const tabletData = q.data?.replication_positions.find(
        (p) => p.cluster?.id === clusterID && p.keyspace === keyspace && p.shard === shard
    );

    if (!tablet && !q.isLoading) {
        // FIXME
        return <div>tablet not found</div>;
    }

    // FIXME
    const paddedUID = padStart(tablet?.tablet?.alias?.uid?.toString() || '', 10, '0');
    const paddedAlias = `${tablet?.tablet?.alias?.cell}-${paddedUID}`;

    const tabletMap = tabletData?.position_info?.tablet_map || {};
    const position = tabletMap[paddedAlias];

    const statuses = tabletData?.position_info?.replication_statuses || {};
    const replicationStatus = statuses[paddedAlias];

    console.log(position, replicationStatus);

    return (
        <div>
            <QueryLoadingPlaceholder query={q} />
            <Code code={JSON.stringify(tabletData, null, 2)} />;
        </div>
    );
};
