/**
 * Copyright 2021 The Vitess Authors.
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
import { useState } from 'react';
import { Switch, useLocation, useParams, useRouteMatch } from 'react-router';
import { Link, Redirect, Route } from 'react-router-dom';
import { useHistory } from 'react-router';

import { useKeyspace } from '../../../hooks/api';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { Code } from '../../Code';
import { Dropdown } from '../../Dropdown';
import { ContentContainer } from '../../layout/ContentContainer';
import { NavCrumbs } from '../../layout/NavCrumbs';
import { WorkspaceHeader } from '../../layout/WorkspaceHeader';
import { WorkspaceTitle } from '../../layout/WorkspaceTitle';
import { Tab } from '../../tabs/Tab';
import { TabContainer } from '../../tabs/TabContainer';
import style from './Keyspace.module.scss';
import { KeyspaceShards } from './KeyspaceShards';
import Modal from 'react-modal';
import { TextInput } from '../../TextInput';
import { Button } from '../../Button';
import { useMutation, useQueryClient } from 'react-query';
import { deleteKeyspace } from '../../../api/http';
import { vtadmin as pb } from '../../../proto/vtadmin';

Modal.setAppElement('#root');

interface RouteParams {
    clusterID: string;
    name: string;
}

export const Keyspace = () => {
    const { clusterID, name } = useParams<RouteParams>();
    const { path, url } = useRouteMatch();
    const { search } = useLocation();
    const history = useHistory();
    const queryClient = useQueryClient();

    useDocumentTitle(`${name} (${clusterID})`);

    const [showDeleteModal, setDeleteModal] = useState<boolean>(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string>('');

    const { data: keyspace, ...kq } = useKeyspace({ clusterID, name });

    const mutation = useMutation(
        (req: pb.IDeleteKeyspaceRequest) => {
            return deleteKeyspace(req);
        },
        {
            onSuccess: (data) => {
                queryClient.invalidateQueries('keyspaces');
                history.push(`/keyspaces`);
            },
        }
    );

    if (kq.error) {
        return (
            <div className={style.placeholder}>
                <span className={style.errorEmoji}>😰</span>
                <h1>An error occurred</h1>
                <code>{(kq.error as any).response?.error?.message || kq.error?.message}</code>
                <p>
                    <Link to="/keyspaces">← All keyspaces</Link>
                </p>
            </div>
        );
    }

    if (!kq.isLoading && !keyspace) {
        return (
            <div className={style.placeholder}>
                <span className={style.errorEmoji}>😖</span>
                <h1>Keyspace not found</h1>
                <p>
                    <Link to="/keyspaces">← All keyspaces</Link>
                </p>
            </div>
        );
    }

    const onDeleteKeyspace = (e: any) => {
        e.preventDefault();
        console.log('deleting...!');
        const clusterID = keyspace?.cluster?.id;
        const name = keyspace?.keyspace?.name;

        if (!clusterID || !name) return;

        mutation.mutate({
            cluster_id: clusterID,
            options: {
                keyspace: name,
            },
        } as pb.IDeleteKeyspaceRequest);
    };

    return (
        <div>
            <WorkspaceHeader>
                <NavCrumbs>
                    <Link to="/keyspaces">Keyspaces</Link>
                </NavCrumbs>

                <div className="flex justify-between max-w-screen-xl">
                    <div className="flex-1">
                        <WorkspaceTitle className="font-mono">{name}</WorkspaceTitle>

                        <div className={style.headingMeta}>
                            <span>
                                Cluster: <code>{clusterID}</code>
                            </span>
                        </div>
                    </div>
                    <div>
                        <Dropdown label="Actions">
                            <>
                                <div className="border-b border-grey-50 py-1" role="none">
                                    <Link
                                        to={`/keyspace/${clusterID}/name/shards/new`}
                                        className="text-gray-700 block px-8 py-4 hover:bg-gray-100"
                                    >
                                        <div className="text-gray-700">Add a shard</div>
                                        <div className="font-size-small text-secondary mt-1">
                                            Creates an empty shard.
                                        </div>
                                    </Link>
                                </div>
                                <div className="border-b border-grey-50 py-1" role="none">
                                    <a
                                        href="#"
                                        className="text-gray-700 block px-8 py-4 hover:bg-gray-100"
                                        role="menuitem"
                                        id="menu-item-1"
                                    >
                                        <div className="text-gray-700">Validate keyspace</div>
                                        <div className="font-size-small text-secondary mt-1">
                                            Validates that all reachable nodes are consistent.
                                        </div>
                                    </a>
                                    <a
                                        href="#"
                                        className="text-gray-700 block px-8 py-4 hover:bg-gray-100"
                                        role="menuitem"
                                        id="menu-item-1"
                                    >
                                        <div className="text-gray-700">Validate schema</div>
                                        <div className="font-size-small text-secondary mt-1">
                                            Validates that all tablets have the same schema as the primary tablet on
                                            shard 0.
                                        </div>
                                    </a>
                                    <a
                                        href="#"
                                        className="text-gray-700 block px-8 py-4 hover:bg-gray-100"
                                        role="menuitem"
                                        id="menu-item-1"
                                    >
                                        <div className="text-gray-700">Validate version</div>
                                        <div className="font-size-small text-secondary mt-1">
                                            Validates that all tablets have the same version as the primary tablet on
                                            shard 0.
                                        </div>
                                    </a>
                                </div>
                                <div className="border-b border-grey-50 py-1" role="none">
                                    <a
                                        href="#"
                                        className="text-gray-700 block px-8 py-4 hover:bg-gray-100"
                                        role="menuitem"
                                        id="menu-item-1"
                                    >
                                        <div className="text-gray-700">Rebuild keyspace graph</div>
                                        <div className="font-size-small text-secondary mt-1">
                                            Rebuilds the serving data for the keyspace.
                                        </div>
                                    </a>
                                    <a
                                        href="#"
                                        className="text-gray-700 block px-8 py-4 hover:bg-gray-100"
                                        role="menuitem"
                                        id="menu-item-1"
                                    >
                                        <div className="text-gray-700">Reload schema in keyspace</div>
                                        <div className="font-size-small text-secondary mt-1">
                                            Reloads the schema on all tablets.
                                        </div>
                                    </a>
                                </div>

                                <div className="py-1" role="none">
                                    <button
                                        type="button"
                                        className="text-gray-700 block px-8 py-4 hover:bg-gray-100 text-left"
                                        onClick={() => setDeleteModal(true)}
                                        role="menuitem"
                                    >
                                        <div className=" text-red-600">Delete keyspace</div>
                                        <div className="font-size-small text-secondary mt-1">
                                            Recursively deletes the keyspace and all of its shards.
                                        </div>
                                    </button>
                                </div>
                            </>
                        </Dropdown>
                    </div>
                </div>
            </WorkspaceHeader>

            <ContentContainer>
                <TabContainer>
                    <Tab text="Shards" to={`${url}/shards`} />
                    <Tab text="JSON" to={`${url}/json`} />
                </TabContainer>

                <Switch>
                    <Route exact path={`${path}/shards`}>
                        <KeyspaceShards keyspace={keyspace} />
                    </Route>

                    <Route path={`${path}/json`}>
                        <Code code={JSON.stringify(keyspace, null, 2)} />
                    </Route>

                    <Redirect exact from={path} to={{ pathname: `${path}/shards`, search }} />
                </Switch>

                {/* TODO skeleton placeholder */}
                {!!kq.isLoading && <div className={style.placeholder}>Loading</div>}
            </ContentContainer>

            <Modal
                overlayClassName="z-50 bg-gray-600 bg-opacity-60 fixed top-0 left-0 right-0 bottom-0"
                className="z-50 absolute top-1/3 left-1/2 transform -translate-x-1/2 sm:max-w-2xl sm:w-full"
                isOpen={showDeleteModal}
                onRequestClose={() => setDeleteModal(false)}
            >
                <div className="shadow-xl rounded-lg overflow-hidden">
                    <form onSubmit={onDeleteKeyspace}>
                        <div className="bg-white px-8 py-12">
                            <h3>
                                Delete <code>{keyspace?.keyspace?.name}</code>
                            </h3>

                            <div className="my-8">
                                This will permanently delete the <code>{keyspace?.keyspace?.name}</code> keyspace.{' '}
                                <span className="font-bold">This action cannot be undone.</span>
                            </div>

                            <div className="mt-8 mb-4">
                                Please type <code className="font-bold">{keyspace?.keyspace?.name}</code> to continue:
                            </div>

                            <TextInput
                                autoFocus
                                onChange={(e) => setDeleteConfirm(e.target.value)}
                                value={deleteConfirm}
                            />
                        </div>

                        <div className="bg-gray-50 px-8 py-8 flex flex-row-reverse">
                            <button
                                type="submit"
                                className={`font-bold font-sans w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-3 bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-6 sm:w-auto ${
                                    deleteConfirm !== keyspace?.keyspace?.name
                                        ? 'opacity-50 cursor-not-allowed hover:bg-red-600'
                                        : ''
                                }`}
                                disabled={deleteConfirm !== keyspace?.keyspace?.name}
                            >
                                Delete keyspace
                            </button>
                            <button
                                type="button"
                                className="font-bold font-sans mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-3 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-6 sm:w-auto"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
};
