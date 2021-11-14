import { Link } from 'react-router-dom';
import { NavCrumbs } from '../../layout/NavCrumbs';
import { WorkspaceHeader } from '../../layout/WorkspaceHeader';
import { WorkspaceTitle } from '../../layout/WorkspaceTitle';

export const CreateKeyspace = () => {
    return (
        <div>
            <WorkspaceHeader>
                <NavCrumbs>
                    <Link to="/keyspaces">Keyspaces</Link>
                </NavCrumbs>

                <WorkspaceTitle>Create Keyspace</WorkspaceTitle>
            </WorkspaceHeader>
        </div>
    );
};
