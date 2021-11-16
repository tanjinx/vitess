import { FormEventHandler, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { useKeyspace } from '../../../hooks/api';
import { Button } from '../../Button';
import { Label } from '../../inputs/Label';
import { ContentContainer } from '../../layout/ContentContainer';
import { NavCrumbs } from '../../layout/NavCrumbs';
import { WorkspaceHeader } from '../../layout/WorkspaceHeader';
import { WorkspaceTitle } from '../../layout/WorkspaceTitle';
import { TextInput } from '../../TextInput';
import { vtadmin as pb } from '../../../proto/vtadmin';
import { useMutation, useQueryClient } from 'react-query';
import { createShard } from '../../../api/http';

interface RouteParams {
    clusterID: string;
    keyspace: string;
}

interface ShardRange {
    start: string; // hex string
    end: string; // hex string
}
interface FormState {
    shardCount: string;
    shards: ShardRange[];
}

const formatShardRanges = (count: number): ShardRange[] => {
    const maxShards = 256;
    const size = maxShards / count;

    let start = 0;
    let end = 0;
    let realEnd = 0;

    const shards: ShardRange[] = [];

    for (let i = 1; i <= count; i++) {
        realEnd = i * size;
        end = Math.round(realEnd);
        shards.push({
            start: start === 0 ? '' : start.toString(16),
            end: end === maxShards ? '' : end.toString(16),
        });
        start = end;
    }

    return shards;
};

const DEFAULT_FORM_DATA: FormState = {
    shardCount: '4',
    shards: formatShardRanges(4),
};

export const CreateShards = () => {
    const history = useHistory();
    const queryClient = useQueryClient();
    const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_DATA);
    const params = useParams<RouteParams>();
    const { data: keyspace, ...kq } = useKeyspace({ clusterID: params.clusterID, name: params.keyspace });

    const updateFormState = (nextState: Partial<FormState>) =>
        setFormState({
            ...formState,
            ...nextState,
        });

    const onUpdateCount: React.ChangeEventHandler<any> = (e) => {
        const count = parseInt(e.target.value);
        const shards = formatShardRanges(count);
        console.log(shards);

        updateFormState({
            // use the string representation so we don't overwrite with NaN
            shardCount: e.target.value,
            shards,
        });
    };

    const mutation = useMutation<any, any, FormState>(
        (fs) => {
            console.log(fs);
            return Promise.all(
                fs.shards.map((s) => {
                    return createShard({
                        cluster_id: keyspace?.cluster?.id,
                        options: {
                            keyspace: keyspace?.keyspace?.name,
                            shard_name: `${s.start}-${s.end}`,
                        },
                    });
                })
            );
        },
        {
            onSuccess: (data) => {
                queryClient.invalidateQueries('keyspaces');
                history.push(`/keyspace/${params.clusterID}/${params.keyspace}`);
            },
        }
    );

    const onSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        mutation.mutate(formState);
    };

    return (
        <div>
            <WorkspaceHeader>
                <NavCrumbs>
                    <Link to="/keyspaces">Keyspaces</Link>
                    <Link to="/keyspaces">{params.clusterID}</Link>
                    <Link to="/keyspaces">{params.keyspace}</Link>
                </NavCrumbs>

                <WorkspaceTitle className="mt-4">
                    Create shards in <code>{params.keyspace}</code>
                </WorkspaceTitle>
            </WorkspaceHeader>
            <ContentContainer>
                <form className="max-w-screen-sm" onSubmit={onSubmit}>
                    <div className="inline-grid grid-cols-3">
                        <Label label="Number of shards to create">
                            <TextInput onChange={onUpdateCount} value={formState.shardCount} />
                        </Label>
                    </div>

                    <div className="font-bold mt-12 mb-8">Shards</div>
                    <div className="inline-grid grid-cols-4 gap-4">
                        {formState.shards.map((s, sdx) => (
                            <div key={sdx}>
                                <input
                                    type="text"
                                    className="border-2 rounded-lg font-mono px-6 py-4 w-full"
                                    readOnly
                                    value={`${s.start}-${s.end}`}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="my-16">
                        <Button type="submit">Create shards</Button>
                        <Button className="ml-4" secondary type="submit">
                            Reset
                        </Button>
                    </div>
                </form>
            </ContentContainer>
        </div>
    );
};
