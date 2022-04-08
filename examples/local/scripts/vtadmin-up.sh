#!/bin/bash

source ./env.sh

log_dir="${VTDATAROOT}/tmp"
web_dir="../../web/vtadmin"

vtadmin_api_port=14200
vtadmin_web_port=3000

vtadmin \
  --addr ":${vtadmin_api_port}" \
  --http-origin "http://localhost:3000" \
  --http-tablet-url-tmpl "http://{{ .Tablet.Hostname }}:15{{ .Tablet.Alias.Uid }}" \
  --tracer "opentracing-jaeger" \
  --grpc-tracing \
  --http-tracing \
  --logtostderr \
  --alsologtostderr \
  --rbac \
  --rbac-config="./vtadmin/rbac.yaml" \
  --cluster "id=local,name=local,discovery=staticfile,discovery-staticfile-path=./vtadmin/discovery.json,tablet-fqdn-tmpl={{ .Tablet.Hostname }}:15{{ .Tablet.Alias.Uid }}" \
  > "${log_dir}/vtadmin-api.out" 2>&1 &

vtadmin_pid=$!
echo ${vtadmin_pid} > "${log_dir}/vtadmin-api.pid"

echo "vtadmin-api is running on http://localhost:${vtadmin_api_port}. Logs are in ${log_dir}/vtadmin-api.out, and its PID is ${vtadmin_pid}"

npm --prefix $web_dir install

REACT_APP_VTADMIN_API_ADDRESS="http://localhost:14200" \
  REACT_APP_ENABLE_EXPERIMENTAL_TABLET_DEBUG_VARS="true" \
  npm run --prefix $web_dir build

"${web_dir}/node_modules/.bin/serve" --no-clipboard -l $vtadmin_web_port -s "${web_dir}/build" \
  > "${log_dir}/vtadmin-web.out" 2>&1 &

vtadmin_web_pid=$!
echo ${vtadmin_web_pid} > "${log_dir}/vtadmin-web.pid"

echo "vtadmin-web is running on http://localhost:${vtadmin_web_port}. Logs are in ${log_dir}/vtadmin-web.out, and its PID is ${vtadmin_web_pid}"
