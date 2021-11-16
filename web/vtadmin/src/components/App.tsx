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
import * as React from 'react';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';

import style from './App.module.scss';
import { Tablets } from './routes/Tablets';
import { Debug } from './routes/Debug';
import { NavRail } from './NavRail';
import { Error404 } from './routes/Error404';
import { Clusters } from './routes/Clusters';
import { Gates } from './routes/Gates';
import { Keyspaces } from './routes/Keyspaces';
import { Schemas } from './routes/Schemas';
import { Schema } from './routes/schema/Schema';
import { Stream } from './routes/stream/Stream';
import { Workflows } from './routes/Workflows';
import { Workflow } from './routes/workflow/Workflow';
import { VTExplain } from './routes/VTExplain';
import { Keyspace } from './routes/keyspace/Keyspace';
import { Tablet } from './routes/tablet/Tablet';
import { Backups } from './routes/Backups';
import { Shard } from './routes/shard/Shard';
import { Vtctlds } from './routes/Vtctlds';
import { CreateKeyspace } from './routes/createKeyspace/CreateKeyspace';
import { Icon, Icons } from './Icon';
import { CreateShards } from './routes/createShards/CreateShards';

export const App = () => {
    return (
        <Router>
            <div className={style.container}>
                <div className={style.navContainer}>
                    <NavRail />
                </div>

                <div className={style.mainContainer}>
                    <div className="px-10 pt-4 pb-6 border-b border-gray-100 shadow-sm">
                        <div className="text-secondary text-1xl border-gray-200 border-2 rounded-lg max-w-6xl px-6 py-4 bg-gray-50">
                            <Icon className="fill-current inline-block mr-3 text-gray-400" icon={Icons.search} /> Search
                            for anything
                            <div className="bg-white border border-gray-200 text-lg px-4 py-2 ml-4 inline rounded-md">
                                ⌘K
                            </div>
                        </div>
                    </div>
                    <Switch>
                        <Route path="/backups">
                            <Backups />
                        </Route>

                        <Route path="/clusters">
                            <Clusters />
                        </Route>

                        <Route path="/gates">
                            <Gates />
                        </Route>

                        <Route exact path="/keyspaces/create">
                            <CreateKeyspace />
                        </Route>

                        <Route path="/keyspaces">
                            <Keyspaces />
                        </Route>

                        <Route exact path="/keyspace/:clusterID/:keyspace/shards/new">
                            <CreateShards />
                        </Route>

                        <Route path="/keyspace/:clusterID/:keyspace/shard/:shard">
                            <Shard />
                        </Route>

                        <Route path="/keyspace/:clusterID/:name">
                            <Keyspace />
                        </Route>

                        <Route path="/schemas">
                            <Schemas />
                        </Route>

                        <Route path="/schema/:clusterID/:keyspace/:table">
                            <Schema />
                        </Route>

                        <Route path="/tablets">
                            <Tablets />
                        </Route>

                        <Route path="/tablet/:clusterID/:alias">
                            <Tablet />
                        </Route>

                        <Route path="/vtctlds">
                            <Vtctlds />
                        </Route>

                        <Route path="/vtexplain">
                            <VTExplain />
                        </Route>

                        <Route path="/workflows">
                            <Workflows />
                        </Route>

                        <Route path="/workflow/:clusterID/:keyspace/:workflowName/stream/:tabletCell/:tabletUID/:streamID">
                            <Stream />
                        </Route>

                        <Route path="/workflow/:clusterID/:keyspace/:name">
                            <Workflow />
                        </Route>

                        <Route path="/debug">
                            <Debug />
                        </Route>

                        <Redirect exact from="/" to="/tablets" />

                        <Route>
                            <Error404 />
                        </Route>
                    </Switch>
                </div>
            </div>
        </Router>
    );
};
