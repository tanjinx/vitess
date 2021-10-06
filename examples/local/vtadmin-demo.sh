#!/bin/bash

VTDATAROOT=${VTDATAROOT:-'./vtdataroot'}
VTADMIN_DEMO_DIR=${VTADMIN_DEMO_DIR:-'./vtadmin-demo'}
VTADMIN_DEMO_DATADIR="${VTADMIN_DEMO_DIR}/data"

csv_files=(
    books
    song_charts
    song_data
    song_statwords
)

found_files="$(find "${VTADMIN_DEMO_DATADIR}" -type f -iname '*.csv' | xargs -I% basename % | cut -d. -f1)"
if ! diff -q <(echo "${csv_files[@]}" | tr ' ' '\n' | sort) <(echo $found_files | tr ' ' '\n' | sort) ; then
    echo "some csv files not found in ${VTADMIN_DEMO_DIR}:"
    diff <(echo $csv_files | tr ' ' '\n' | sort) <(echo $found_files | tr ' ' '\n' | sort)
    echo
    echo "re-unpacking ..."

    find "${VTADMIN_DEMO_DATADIR}" -type f -iname '*.zip' | xargs -I% unzip -o % -d "${VTADMIN_DEMO_DATADIR}"
fi

echo "done unpacking data"

export CELL=local1
export ETCD_SERVER=localhost:2379

ETCD_PEER_SERVER=localhost:2380 ./scripts/etcd-up.sh
CLUSTER=local1 VTCTLD_WEB_PORT=15000 GRPC_PORT=15999 ./scripts/vtctld-up.sh
CLUSTER=local1 VTCTLD_WEB_PORT=15001 GRPC_PORT=15998 ./scripts/vtctld-up.sh

for i in 100 101 102; do # media/-80
    CLUSTER=local1 TABLET_UID=$i ./scripts/mysqlctl-up.sh
    CLUSTER=local1 TABLET_UID=$i KEYSPACE=media SHARD="-80" ./scripts/vttablet-up.sh
done

for i in 200 201 202; do # media/80-
    CLUSTER=local1 TABLET_UID=$i ./scripts/mysqlctl-up.sh
    CLUSTER=local1 TABLET_UID=$i KEYSPACE=media SHARD="80-" ./scripts/vttablet-up.sh
done

vtctldclient --server ":15999" InitShardPrimary --force media/-80 local1-100
vtctldclient --server ":15999" InitShardPrimary --force media/80- local1-200

vtctlclient -server ":15999" ApplySchema -sql-file ./vtadmin-demo/media_schema.sql media
vtctlclient -server ":15999" ApplyVSchema -vschema_file ./vtadmin-demo/media_vschema.json media

# TODO: add script to spin these up and kick off split
# media/-40 => 300-302
# media/40-80 => 400-402
# media/80-c0 => 500-502
# media/c0- => 600-602

CLUSTER=local1 WEB_PORT=15011 GRPC_PORT=15991 ./scripts/vtgate-up.sh

# Add discovery for local1 cluster in vtadmin.
cat > "${VTDATAROOT}/vtadmin_discovery_local1.json" <<VTADMIN_DISCO
{
    "vtctlds": [
        {
            "host": {
                "hostname": "localhost:15999"
            }
        },
        {
            "host": {
                "hostname": "localhost:15998"
            }
        }
    ],
    "vtgates": [
        {
            "host": {
                "hostname": "localhost:15991"
            }
        }
    ]
}
VTADMIN_DISCO

# Cluster #2.
export CELL=local2
export ETCD_SERVER=localhost:2479

ETCD_PEER_SERVER=localhost:2480 ./scripts/etcd-up.sh
CLUSTER=local2 VTCTLD_WEB_PORT=16000 GRPC_PORT=16999 ./scripts/vtctld-up.sh

for i in 700 701 702; do
	TABLET_UID=$i ./scripts/mysqlctl-up.sh
	VTCTLD_WEB_PORT=16000 CLUSTER=local2 KEYSPACE=commerce TABLET_UID=$i ./scripts/vttablet-up.sh
done

vtctldclient --server ":16999" InitShardPrimary --force commerce/0 local2-700
vtctlclient -server ":16999" ApplySchema -sql-file create_commerce_schema.sql commerce
vtctlclient -server ":16999" ApplyVSchema -vschema_file vschema_commerce_initial.json commerce

CLUSTER=local2 WEB_PORT=15012 GRPC_PORT=15992 MYSQL_PORT=16306 ./scripts/vtgate-up.sh

# Add discovery for local2 vtadmin cluster.
cat > "${VTDATAROOT}/vtadmin_discovery_local2.json" <<VTADMIN_DISCO
{
    "vtctlds": [
        {
            "host": {
                "hostname": "localhost:16999"
            }
        }
    ],
    "vtgates": [
        {
            "host": {
                "hostname": "localhost:15992"
            }
        }
    ]
}
VTADMIN_DISCO

./scripts/vtadmin-up.sh
