import { FormEventHandler, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useKeyspace } from '../../../hooks/api';
import { Button } from '../../Button';
import { Label } from '../../inputs/Label';
import { ContentContainer } from '../../layout/ContentContainer';
import { NavCrumbs } from '../../layout/NavCrumbs';
import { WorkspaceHeader } from '../../layout/WorkspaceHeader';
import { WorkspaceTitle } from '../../layout/WorkspaceTitle';
import { TextInput } from '../../TextInput';

interface RouteParams {
    clusterID: string;
    keyspace: string;
}

interface FormState {
    shardCount: number;
}

const DEFAULT_FORM_DATA: FormState = {
    shardCount: 0,
};

export const CreateShards = () => {
    const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_DATA);
    const params = useParams<RouteParams>();
    const { data: keyspace, ...kq } = useKeyspace({ clusterID: params.clusterID, name: params.keyspace });

    const updateFormState = (nextState: Partial<FormState>) =>
        setFormState({
            ...formState,
            ...nextState,
        });

    const onSubmit: FormEventHandler = (e) => {
        e.preventDefault();
    };

    return (
        <div>
            <WorkspaceHeader>
                <NavCrumbs>
                    <Link to="/keyspaces">Keyspaces</Link>
                    <Link to="/keyspaces">{params.clusterID}</Link>
                    <Link to="/keyspaces">{params.keyspace}</Link>
                </NavCrumbs>

                <WorkspaceTitle>Create shards</WorkspaceTitle>
            </WorkspaceHeader>
            <ContentContainer>
                <form className="max-w-screen-sm" onSubmit={onSubmit}>
                    <div className="inline-grid grid-cols-3">
                        <Label label="Number of shards to create">
                            <TextInput
                                onChange={(e) => updateFormState({ shardCount: parseInt(e.target.value) })}
                                value={formState.shardCount}
                            />
                        </Label>
                    </div>

                    <div className="my-12">
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
