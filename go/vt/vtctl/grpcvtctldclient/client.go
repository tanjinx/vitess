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

// Package grpcvtctldclient contains the gRPC version of the vtctld client
// protocol.
package grpcvtctldclient

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
	"vitess.io/vitess/go/vt/log"

	"vitess.io/vitess/go/vt/grpcclient"
	"vitess.io/vitess/go/vt/vtctl/grpcclientcommon"
	"vitess.io/vitess/go/vt/vtctl/vtctldclient"

	vtctlservicepb "vitess.io/vitess/go/vt/proto/vtctlservice"
)

const connClosedMsg = "grpc: the client connection is closed"

type gRPCVtctldClient struct {
	cc *grpc.ClientConn
	c  vtctlservicepb.VtctldClient
}

//go:generate -command grpcvtctldclient go run ../vtctldclient/codegen
//go:generate grpcvtctldclient -out client_gen.go

func gRPCVtctldClientFactory(addr string) (vtctldclient.VtctldClient, error) {
	opt, err := grpcclientcommon.SecureDialOption()
	if err != nil {
		return nil, err
	}

	conn, err := grpcclient.Dial(addr, grpcclient.FailFast(false), opt)
	if err != nil {
		return nil, err
	}

	return &gRPCVtctldClient{
		cc: conn,
		c:  vtctlservicepb.NewVtctldClient(conn),
	}, nil
}

// NewWithDialOpts returns a vtctldclient.VtctldClient configured with the given
// DialOptions. It is exported for use in vtadmin.
func NewWithDialOpts(addr string, failFast grpcclient.FailFast, opts ...grpc.DialOption) (vtctldclient.VtctldClient, error) {
	conn, err := grpcclient.Dial(addr, failFast, opts...)
	if err != nil {
		return nil, err
	}

	return &gRPCVtctldClient{
		cc: conn,
		c:  vtctlservicepb.NewVtctldClient(conn),
	}, nil
}

func (client *gRPCVtctldClient) Close() error {
	err := client.cc.Close()
	if err == nil {
		client.c = nil
	}

	return err
}

// WaitForReady waits until the gRPCVtctldClient's ClientConn is in a ready state,
// to a maximum wait time configurable with the TODO flag. This call will return
// an error if the client is not able to transition to the connectivity.Ready
// state within the given context timeout.
func (client *gRPCVtctldClient) WaitForReady(ctx context.Context) error {
	state := client.cc.GetState()
	log.Infof("gRPCVtctldClient ClientConn status: %v", state.String())

	switch state {
	case connectivity.Ready:
		return nil

	// Per https://github.com/grpc/grpc/blob/master/doc/connectivity-semantics-and-api.md,
	// any clients in the SHUTDOWN state never leave this state, and all new RPCs should
	// fail immediately. So, we don't need to waste time by continuing to poll and can
	// return an error immediately.
	case connectivity.Shutdown:
		return fmt.Errorf("gRPCVtctldClient in SHUTDOWN state")

	// If the connection is IDLE, CONNECTING, or in a TRANSIENT_FAILURE mode,
	// then we wait to see if it will transition to a ready state.
	default:
		// TODO make a flag for second parameter called connWaitTimeout
		ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()

		// https://pkg.go.dev/google.golang.org/grpc#ClientConn.WaitForStateChange
		if !client.cc.WaitForStateChange(ctx, state) {
			// failed to transition, close, and get a new connection
			return fmt.Errorf("failed to transition")
		}
	}

	// for {
	// 	select {
	// 	case <-ctx.Done():
	// 		return fmt.Errorf("connWaitTimeoutExceeded")

	// 	// Wait and check
	// 	default:
	// 		return nil
	// 	}
	// }

	// for {
	// 	select {
	// 	case <-ctx.Done():
	// 		return fmt.Errorf("connWaitTimeoutExceeded")

	// 	// wait and check
	// 	default:
	// 		// See https://github.com/grpc/grpc/blob/master/doc/connectivity-semantics-and-api.md
	// 		state := client.cc.GetState()
	// 		log.Infof("gRPCVtctldClient state: %s\n", state)
	// 		switch state {
	// 		case connectivity.Idle, connectivity.Ready:
	// 			return nil
	// 		default:
	// 			// TODO make a flag for second parameter called connWaitTimeout
	// 			ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	// 			defer cancel()

	// 			// https://pkg.go.dev/google.golang.org/grpc#ClientConn.WaitForStateChange
	// 			if !client.cc.WaitForStateChange(ctx, state) {
	// 				// failed to transition, close, and get a new connection
	// 				return fmt.Errorf("failed to transition")
	// 			}
	// 			// Check again that it is Idle/Ready and then return
	// 		}

	// 	}
	// }

	return nil

}

func init() {
	vtctldclient.Register("grpc", gRPCVtctldClientFactory)
}
