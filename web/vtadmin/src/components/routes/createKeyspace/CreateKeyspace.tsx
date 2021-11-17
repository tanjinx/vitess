import { FormEventHandler, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useHistory } from 'react-router';
import { Link } from 'react-router-dom';
import cx from 'classnames';
import Sugar from 'sugar';

import style from './CreateKeyspace.module.scss';
import { createKeyspace } from '../../../api/http';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { Button } from '../../Button';
import { ContentContainer } from '../../layout/ContentContainer';
import { NavCrumbs } from '../../layout/NavCrumbs';
import { WorkspaceHeader } from '../../layout/WorkspaceHeader';
import { WorkspaceTitle } from '../../layout/WorkspaceTitle';
import { vtadmin as pb, topodata, vtctldata } from '../../../proto/vtadmin';
import { TextInput } from '../../TextInput';
import { Label } from '../../inputs/Label';
import { useClusters, useKeyspaces } from '../../../hooks/api';
import { Select } from '../../inputs/Select';

interface FormState {
    baseKeyspace: string;
    clusterID: string;
    keyspaceType: topodata.KeyspaceType;
    name: string;
    snapshotTime: string;
    nameDirty: boolean;
}

const DEFAULT_FORM_STATE: FormState = {
    baseKeyspace: '',
    clusterID: 'local',
    keyspaceType: topodata.KeyspaceType.NORMAL,
    name: '',
    snapshotTime: '',
    nameDirty: false,
};

export const CreateKeyspace = () => {
    const { data: clusters = [], ...cq } = useClusters();
    const { data: keyspaces = [], ...kq } = useKeyspaces();

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
    const clusterKeyspaces = keyspaces.filter((k) => k.cluster?.id === selectedCluster?.id);
    const baseKeyspace = keyspaces.find(
        (k) => k.cluster?.id === selectedCluster?.id && k.keyspace?.name === formState.baseKeyspace
    );

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

    let sugarDate = null;
    if (formState.snapshotTime) {
        const d = isNaN(parseInt(formState.snapshotTime))
            ? new Sugar.Date(formState.snapshotTime)
            : new Sugar.Date(parseInt(formState.snapshotTime));

        if (d.isValid().raw) {
            sugarDate = `${d.long().raw} ${Intl.DateTimeFormat().resolvedOptions().timeZone} (${d.relative().raw})`;
        }
    }

    const onChangeBaseKeyspace = (ks: any) => {
        if (formState.nameDirty) {
            updateFormState({ baseKeyspace: ks?.keyspace?.name || '' });
        } else {
            const d = new Sugar.Date(formState.snapshotTime);
            let ds = d.isValid().raw ? d.toUTCString().raw : '';
            updateFormState({
                baseKeyspace: ks?.keyspace?.name || '',
                name: `${ks?.keyspace?.name}SNAPSHOT${ds}`,
            });
        }
    };

    const onChangeTime = (e: any) => {
        if (formState.nameDirty || !formState.baseKeyspace) {
            updateFormState({ snapshotTime: e.target.value });
        } else {
            const d = new Sugar.Date(e.target.value);
            let ds = d.isValid().raw ? d.format('{x}').raw : '';
            updateFormState({
                baseKeyspace: baseKeyspace?.keyspace?.name || '',
                name: `${baseKeyspace?.keyspace?.name}SNAPSHOT${ds}`,
                snapshotTime: e.target.value,
            });
        }
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
                    <div className="">
                        <div className="font-bold mb-4">Keyspace type</div>
                        <div className="grid grid-cols-2 gap-6">
                            <label
                                className={cx(
                                    style.radio,
                                    formState.keyspaceType === topodata.KeyspaceType.NORMAL ? style.active : ''
                                )}
                            >
                                <input
                                    type="radio"
                                    id="normal"
                                    name="keyspace-type"
                                    defaultChecked={formState.keyspaceType === topodata.KeyspaceType.NORMAL}
                                    onChange={() => {
                                        updateFormState({ keyspaceType: topodata.KeyspaceType.NORMAL });
                                    }}
                                />
                                <span className="font-bold ml-4">Normal</span>
                                <div className="font-size-small ml-10 mt-2 text-gray-500">
                                    A logical database that distributes rows into different shards.
                                </div>
                            </label>

                            <label
                                className={cx(
                                    style.radio,
                                    formState.keyspaceType === topodata.KeyspaceType.SNAPSHOT ? style.active : ''
                                )}
                            >
                                <input
                                    type="radio"
                                    id="normal"
                                    name="keyspace-type"
                                    defaultChecked={formState.keyspaceType === topodata.KeyspaceType.SNAPSHOT}
                                    onChange={() => {
                                        updateFormState({ keyspaceType: topodata.KeyspaceType.SNAPSHOT });
                                    }}
                                />
                                <span className="font-bold ml-4">Snapshot</span>
                                <div className="font-size-small ml-10 mt-2 text-gray-500">
                                    Recover the last backup before a specific timestamp.
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 my-8">
                        <div className="col-span-2">
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

                    {formState.keyspaceType === topodata.KeyspaceType.SNAPSHOT && (
                        <>
                            <div className="grid grid-cols-3 my-8">
                                <div className="col-span-2">
                                    <Select
                                        itemToString={(ks) => ks?.keyspace?.name || ''}
                                        items={clusterKeyspaces}
                                        label="Base keyspace"
                                        selectedItem={baseKeyspace}
                                        placeholder=""
                                        renderItem={(ks) => `${ks?.keyspace?.name}`}
                                        onChange={onChangeBaseKeyspace}
                                    />
                                    <p className="font-size-small text-gray-500 mb-0 mt-2 block">
                                        The snapshot keyspace will be created from the base keyspace at the given point
                                        in time.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 my-8">
                                <Label className="col-span-2" label="Snapshot time">
                                    <TextInput onChange={onChangeTime} value={formState.snapshotTime} />
                                    {typeof formState.snapshotTime === 'string' && (
                                        <p className="font-size-small text-gray-500 mb-0 mt-2 block">{sugarDate}</p>
                                    )}
                                </Label>
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-3 my-8">
                        <Label className="col-span-2" label="Keyspace name">
                            <TextInput
                                onChange={(e) => updateFormState({ name: e.target.value, nameDirty: true })}
                                value={formState.name}
                            />
                        </Label>
                    </div>

                    <div className="my-12 inline-grid gap-3 grid-cols-2">
                        <Button disabled={isDisabled} type="submit">
                            Create Keyspace
                        </Button>
                        <Button onClick={() => setFormState(DEFAULT_FORM_STATE)} secondary>
                            Start Over
                        </Button>
                    </div>
                </form>
            </ContentContainer>
        </div>
    );
};
