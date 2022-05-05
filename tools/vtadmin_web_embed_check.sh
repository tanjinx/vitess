#!/bin/bash

# Copyright 2022 The Vitess Authors.
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -e

ignores=":!*.css.map"

# TODO: this "breaks" when run twice in succession since, after the first run,
# if the directory is dirty then the result of first_output and second_output
# will be the same. 
first_output=$(git status --porcelain -- "$ignores")

make vtadmin_web_embed

second_output=$(git status --porcelain -- "$ignores")

diff=$(diff <( echo "$first_output") <( echo "$second_output"))

if [[ "$diff" != "" ]]; then
    echo "ERROR: Embedded front-end build does not match the generated build."
    echo "Please run 'make vtadmin_web_embed' and commit the changes."
    echo -e "List of files containing differences:\n$diff"
    exit 1
fi
