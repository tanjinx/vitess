import { FormEventHandler, useState } from 'react';
import { useMutation } from 'react-query';
import { useHistory } from 'react-router';
import { Link } from 'react-router-dom';

import { createKeyspace } from '../../../api/http';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { Button } from '../../Button';
import { ContentContainer } from '../../layout/ContentContainer';
import { NavCrumbs } from '../../layout/NavCrumbs';
import { WorkspaceHeader } from '../../layout/WorkspaceHeader';
import { WorkspaceTitle } from '../../layout/WorkspaceTitle';
import { vtadmin as pb } from '../../../proto/vtadmin';
import { TextInput } from '../../TextInput';
import { Label } from '../../inputs/Label';

interface FormState {
    clusterID: string;
    name: string;
}

const DEFAULT_FORM_STATE: FormState = {
    clusterID: 'local',
    name: 'kitties',
};
// // Name is the name of the keyspace.
// string name = 1;
// // Force proceeds with the request even if the keyspace already exists.
// bool force = 2;
// // AllowEmptyVSchema allows a keyspace to be created with no vschema.
// bool allow_empty_v_schema = 3;

// // ShardingColumnName specifies the column to use for sharding operations.
// string sharding_column_name = 4;
// // ShardingColumnType specifies the type of the column to use for sharding
// // operations.
// topodata.KeyspaceIdType sharding_column_type = 5;

// // ServedFroms specifies a set of db_type:keyspace pairs used to serve
// // traffic for the keyspace.
// repeated topodata.Keyspace.ServedFrom served_froms = 6;

// // Type is the type of the keyspace to create.
// topodata.KeyspaceType type = 7;
// // BaseKeyspace specifies the base keyspace for SNAPSHOT keyspaces. It is
// // required to create a SNAPSHOT keyspace.
// string base_keyspace = 8;
// // SnapshotTime specifies the snapshot time for this keyspace. It is required
// // to create a SNAPSHOT keyspace.
// vttime.Time snapshot_time = 9;
export const CreateKeyspace = () => {
    const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);

    const history = useHistory();

    const updateFormState = (nextState: Partial<FormState>) =>
        setFormState({
            ...formState,
            ...nextState,
        });

    useDocumentTitle('Create Keyspace');

    const mutation = useMutation<any, any, any>((req) => createKeyspace(req), {
        onSuccess: (data) => {
            history.push(`/keyspace/${data.result.keyspace.cluster.id}/${data.result.keyspace.keyspace.name}`);
        },
    });

    const onSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        const req: pb.ICreateKeyspaceRequest = {
            cluster_id: formState.clusterID,
            options: {
                name: formState.name,
            },
        };
        mutation.mutate(req);
    };

    console.log(mutation);

    return (
        <div>
            <WorkspaceHeader>
                <NavCrumbs>
                    <Link to="/keyspaces">Keyspaces</Link>
                </NavCrumbs>

                <WorkspaceTitle>Create Keyspace</WorkspaceTitle>
            </WorkspaceHeader>

            <ContentContainer>
                <form className="max-w-screen-sm" onSubmit={onSubmit}>
                    <div className="grid grid-cols-3">
                        <Label className="col-span-2" label="Keyspace name">
                            <TextInput onChange={(e) => updateFormState({ name: e.target.value })} />
                        </Label>
                    </div>
                    <div className="my-12">
                        <Button disabled={mutation.isLoading} type="submit">
                            Create
                        </Button>
                    </div>
                </form>
            </ContentContainer>
        </div>
    );
};
