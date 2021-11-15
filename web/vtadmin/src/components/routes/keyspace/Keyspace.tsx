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
import { Switch, useLocation, useParams, useRouteMatch } from 'react-router';
import { Link, Redirect, Route } from 'react-router-dom';

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

interface RouteParams {
    clusterID: string;
    name: string;
}

export const Keyspace = () => {
    const { clusterID, name } = useParams<RouteParams>();
    const { path, url } = useRouteMatch();
    const { search } = useLocation();

    useDocumentTitle(`${name} (${clusterID})`);

    const { data: keyspace, ...kq } = useKeyspace({ clusterID, name });

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
                                    <a
                                        href="#"
                                        className="text-gray-700 block px-8 py-4 hover:bg-gray-100"
                                        role="menuitem"
                                        id="menu-item-1"
                                    >
                                        <div className="">Add a shard</div>
                                        <div className="font-size-small text-secondary mt-1">
                                            Creates an empty shard.
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
                                        <div className="">Validate keyspace</div>
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
                                        <div className="">Validate schema</div>
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
                                        <div className="">Validate version</div>
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
                                        <div className="">Rebuild keyspace graph</div>
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
                                        <div className="">Reload schema in keyspace</div>
                                        <div className="font-size-small text-secondary mt-1">
                                            Reloads the schema on all tablets.
                                        </div>
                                    </a>
                                </div>

                                <div className="py-1" role="none">
                                    <a
                                        href="#"
                                        className="text-gray-700 block px-8 py-4 hover:bg-gray-100"
                                        role="menuitem"
                                        id="menu-item-2"
                                    >
                                        <div className=" text-red-600">Delete keyspace</div>
                                        <div className="font-size-small text-secondary mt-1">
                                            Recursively deletes the keyspace and all of its shards.
                                        </div>
                                    </a>
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
                    <Route path={`${path}/shards`}>
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
        </div>
    );
};
