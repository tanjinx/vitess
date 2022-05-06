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
#

set -ex

# This script checks that the vtadmin front-end build committed to
# (and embedded by) the 'go/vt/vtadmin/web/**' directory matches 
# the build produced by running 'make vtadmin_web_embed' given 
# the current 'web/vtadmin' working tree. 
#
# The goal is to ensure that the built/embedded files are always in sync
# with the source code; that is, to make sure developers run
# `make vtadmin_web_embed` when submitting PRs that change the front-end
# source code.
#
# This script is intended to be run in CI and makes the following assumptions:
#
#   1. The working directory is clean. This script uses git operations for diffing,
#      and allowing uncommitted changes to 'go/vt/vtadmin/web/**' would complicate this.
#
#   2. It is fine to overwrite (but not commit) the current build files in 'go/vt/vtadmin/web/**'.
# 
#   3. Certain file paths are okay to ignore _for the purposes of this check_.
#      Some built files will produce a (functionally) meaningless diff every time
#      `make vtadmin_web_embed` is run; for example, CSS/JS source maps are quiet environment
#      dependent and are expected to change on every build. Since a meaningful change
#      in a css.map file would be accompanied by a corresponding change in the .css source file, 
#      ignoring changes to _just_ the css.map files is acceptable for this check.
#

ignores=":!*.css.map :!*.js.map"

if [[ $(git status --porcelain) != '' ]]; then
  echo 'ERROR: Working directory is dirty.'
  exit 1
fi

make vtadmin_web_embed

if [[ $(git status --porcelain -- "$ignores") != '' ]]; then
  echo 'ERROR: Working directory is after build.'

  git diff 

  exit 1
fi

echo "ok!"
exit 0