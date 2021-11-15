import { FormEventHandler, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
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
import { useClusters, useKeyspaces } from '../../../hooks/api';
import { Select } from '../../inputs/Select';

interface FormState {
    clusterID: string;
    name: string;
}

const DEFAULT_FORM_STATE: FormState = {
    clusterID: 'local',
    name: '',
};

export const CreateKeyspace = () => {
    const { data: clusters = [], ...cq } = useClusters();
    const queryClient = useQueryClient();
    const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);

    const history = useHistory();

    const updateFormState = (nextState: Partial<FormState>) =>
        setFormState({
            ...formState,
            ...nextState,
        });

    useDocumentTitle('Create Keyspace');

    const selectedCluster = clusters.find((c) => c.id === formState.clusterID);

    const mutation = useMutation<any, any, any>((req) => createKeyspace(req), {
        onSuccess: (data) => {
            queryClient.invalidateQueries('keyspaces');
            history.push(`/keyspace/${data.result.keyspace.cluster.id}/${data.result.keyspace.keyspace.name}`);
        },
    });

    const isValid = !!formState.clusterID && !!formState.name;
    const isDisabled = mutation.isLoading || !isValid;

    const onSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isDisabled) {
            return;
        }

        const req: pb.ICreateKeyspaceRequest = {
            cluster_id: formState.clusterID,
            options: {
                name: formState.name,
            },
        };
        mutation.mutate(req);
    };

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
                        <div className="col-span-2 mb-8">
                            <Select
                                itemToString={(cluster) => cluster?.name || ''}
                                items={clusters}
                                label="Cluster"
                                onChange={(cluster) => updateFormState({ clusterID: cluster?.id })}
                                placeholder="Cluster"
                                renderItem={(cluster) => `${cluster?.name}`}
                                selectedItem={selectedCluster}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3">
                        <Label className="col-span-2" label="Keyspace name">
                            <TextInput
                                onChange={(e) => updateFormState({ name: e.target.value })}
                                value={formState.name}
                            />
                        </Label>
                    </div>
                    <div className="my-12">
                        <Button disabled={isDisabled} type="submit">
                            Create
                        </Button>
                    </div>
                </form>
            </ContentContainer>
        </div>
    );
};
