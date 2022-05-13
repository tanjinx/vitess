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

import { UseMutationResult } from 'react-query';
import { Icon, Icons } from './Icon';

interface Props {
    description?: React.ReactNode;
    disabled?: boolean;
    documentationHref?: string;
    mutation: UseMutationResult<any, any, any, any>;
    title: React.ReactNode;
    warnings?: React.ReactNodeArray;
}

export const AdvancedAction: React.FC<Props> = ({
    description,
    disabled,
    documentationHref,
    mutation,
    title,
    warnings = [],
}) => {
    return (
        <div className="p-9 pb-12 last:border-b border border-gray-400 border-b-0 first:rounded-t-lg last:rounded-b-lg">
            <div className="flex justify-between items-start mb-2">
                <div className="font-bold m-0 text-gray-900">{title}</div>

                {documentationHref && (
                    <a href={documentationHref} rel="noreferrer" target="_blank">
                        <span className="text-sm font-semibold">Documentation</span>
                        <Icon icon={Icons.open} className="h-6 w-6 ml-1 inline-block fill-current" />
                    </a>
                )}
            </div>

            {description && <p>{description}</p>}

            {!!warnings.length && (
                <ul>
                    {warnings.map(
                        (warning, i) =>
                            warning && (
                                <div className="text-danger" key={i}>
                                    <Icon icon={Icons.alertFail} className="fill-current text-danger inline mr-2" />
                                    {warning}
                                </div>
                            )
                    )}
                </ul>
            )}

            <button
                onClick={mutation.mutate}
                className="btn btn-secondary mt-4"
                disabled={disabled || mutation.isLoading}
            >
                {title}
            </button>
        </div>
    );
};
