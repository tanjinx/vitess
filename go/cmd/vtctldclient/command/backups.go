/*
Copyright 2021 The Vitess Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package command

import (
	"fmt"
	"io"
	"strings"

	"github.com/spf13/cobra"

	"vitess.io/vitess/go/cmd/vtctldclient/cli"
	"vitess.io/vitess/go/vt/topo/topoproto"

	vtctldatapb "vitess.io/vitess/go/vt/proto/vtctldata"
)

var (
	// Backup makes a Backup gRPC call to a vtctld.
	Backup = &cobra.Command{
		Use:                   "Backup [--concurrency <concurrency>] [--allow-primary] <tablet_alias>",
		Short:                 "Uses the BackupStorage service on the given tablet to create and store a new backup.",
		DisableFlagsInUseLine: true,
		Args:                  cobra.ExactArgs(1),
		RunE:                  commandBackup,
	}
	// GetBackups makes a GetBackups gRPC call to a vtctld.
	GetBackups = &cobra.Command{
		Use:  "GetBackups <keyspace/shard>",
		Args: cobra.ExactArgs(1),
		RunE: commandGetBackups,
	}
)

var backupOptions = struct {
	AllowPrimary bool
	Concurrency  uint64
}{}

func commandBackup(cmd *cobra.Command, args []string) error {
	tabletAlias, err := topoproto.ParseTabletAlias(cmd.Flags().Arg(0))
	if err != nil {
		return err
	}

	cli.FinishedParsing(cmd)

	stream, err := client.Backup(commandCtx, &vtctldatapb.BackupRequest{
		TabletAlias:  tabletAlias,
		AllowPrimary: backupOptions.AllowPrimary,
		Concurrency:  backupOptions.Concurrency,
	})
	if err != nil {
		return err
	}

	for {
		resp, err := stream.Recv()
		switch err {
		case nil:
			fmt.Printf("%s/%s (%s): %v\n", resp.Keyspace, resp.Shard, topoproto.TabletAliasString(resp.TabletAlias), resp.Event)
		case io.EOF:
			return nil
		default:
			return err
		}
	}
}

var getBackupsOptions = struct {
	Limit      uint32
	OutputJSON bool
}{}

func commandGetBackups(cmd *cobra.Command, args []string) error {
	keyspace, shard, err := topoproto.ParseKeyspaceShard(cmd.Flags().Arg(0))
	if err != nil {
		return err
	}

	cli.FinishedParsing(cmd)

	resp, err := client.GetBackups(commandCtx, &vtctldatapb.GetBackupsRequest{
		Keyspace: keyspace,
		Shard:    shard,
		Limit:    getBackupsOptions.Limit,
	})
	if err != nil {
		return err
	}

	if getBackupsOptions.OutputJSON {
		data, err := cli.MarshalJSON(resp)
		if err != nil {
			return err
		}

		fmt.Printf("%s\n", data)
		return nil
	}

	names := make([]string, len(resp.Backups))
	for i, b := range resp.Backups {
		names[i] = b.Name
	}

	fmt.Printf("%s\n", strings.Join(names, "\n"))

	return nil
}

func init() {
	Backup.Flags().BoolVar(&backupOptions.AllowPrimary, "allow-primary", false, "Allow the primary of a shard to be used for the backup. WARNING: If using the builtin backup engine, this will shutdown mysqld on the primary and stop writes for the duration of the backup.")
	Backup.Flags().Uint64Var(&backupOptions.Concurrency, "concurrency", 4, "Specifies the number of compression/checksum jobs to run simultaneously.")
	Root.AddCommand(Backup)

	GetBackups.Flags().Uint32VarP(&getBackupsOptions.Limit, "limit", "l", 0, "Retrieve only the most recent N backups")
	GetBackups.Flags().BoolVarP(&getBackupsOptions.OutputJSON, "json", "j", false, "Output backup info in JSON format rather than a list of backups")
	Root.AddCommand(GetBackups)
}