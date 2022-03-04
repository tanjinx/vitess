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

package vtctldclient

import (
	"context"
	"fmt"
	"net"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"

	vtadminpb "vitess.io/vitess/go/vt/proto/vtadmin"
	vtctlservicepb "vitess.io/vitess/go/vt/proto/vtctlservice"
	"vitess.io/vitess/go/vt/vtadmin/cluster/discovery/fakediscovery"
)

type fakeVtctld struct {
	vtctlservicepb.VtctlServer
}

func TestDial(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)

	defer listener.Close()

	vtctld := &fakeVtctld{}
	server := grpc.NewServer()
	vtctlservicepb.RegisterVtctlServer(server, vtctld)

	go server.Serve(listener)
	defer server.Stop()

	disco := fakediscovery.New()
	disco.AddTaggedVtctlds(nil, &vtadminpb.Vtctld{
		Hostname: listener.Addr().String(),
	})

	proxy := New(&Config{
		Cluster: &vtadminpb.Cluster{
			Id:   "test",
			Name: "testcluster",
		},
		Discovery: disco,
	})

	// We don't have a vtctld host until we call Dial
	require.Empty(t, proxy.host)

	err = proxy.Dial(context.Background())
	assert.NoError(t, err)
	assert.Equal(t, listener.Addr().String(), proxy.host)
}

func TestClose(t *testing.T) {
	// Initialize the gRPC vtctld server
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)

	defer listener.Close()

	vtctld := &fakeVtctld{}
	server := grpc.NewServer()
	vtctlservicepb.RegisterVtctlServer(server, vtctld)

	go server.Serve(listener)
	defer server.Stop()

	disco := fakediscovery.New()
	disco.AddTaggedVtctlds(nil, &vtadminpb.Vtctld{
		Hostname: listener.Addr().String(),
	})

	proxy := New(&Config{
		Cluster: &vtadminpb.Cluster{
			Id:   "test",
			Name: "testcluster",
		},
		Discovery: disco,
	})

	// We don't have a vtctld host until we call Dial
	require.Empty(t, proxy.host)

	err = proxy.Dial(context.Background())
	assert.NoError(t, err)
	assert.Equal(t, listener.Addr().String(), proxy.host)

	err = proxy.Close()
	assert.NoError(t, err)
	assert.True(t, proxy.closed)
}

func TestRedial(t *testing.T) {
	// Initialize vtctld #1
	listener1, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	defer listener1.Close()

	vtctld1 := &fakeVtctld{}
	server1 := grpc.NewServer()
	vtctlservicepb.RegisterVtctlServer(server1, vtctld1)

	// Initialize vtctld #2
	listener2, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	defer listener2.Close()

	vtctld2 := &fakeVtctld{}
	server2 := grpc.NewServer()
	vtctlservicepb.RegisterVtctlServer(server2, vtctld2)

	result := make(chan error, 1)

	go func() {
		res := server1.Serve(listener1)
		fmt.Printf("listener1 shut down")
		result <- res
	}()

	defer server1.Stop()

	go func() {
		res := server2.Serve(listener2)
		fmt.Printf("listener2 shut down")
		result <- res
	}()

	defer server2.Stop()

	// Register both vtctlds with VTAdmin
	disco := fakediscovery.New()
	disco.AddTaggedVtctlds(nil, &vtadminpb.Vtctld{
		Hostname: listener1.Addr().String(),
	}, &vtadminpb.Vtctld{
		Hostname: listener2.Addr().String(),
	})

	// Initialize our gRPC vtctld client proxy
	proxy := New(&Config{
		Cluster: &vtadminpb.Cluster{
			Id:   "test",
			Name: "testcluster",
		},
		Discovery: disco,
	})

	// We don't have a vtctld host until we call Dial
	require.Empty(t, proxy.host)

	// Check for a successful connection to whichever vtctld we discover first.
	err = proxy.Dial(context.Background())
	assert.NoError(t, err)

	// vtadmin's fakediscovery package discovers vtctlds in random order. Rather
	// than force some cumbersome sequential logic, we can just do a switcheroo
	// here in the test.
	var currentVtctld *grpc.Server
	var nextAddr string

	switch proxy.host {
	case listener1.Addr().String():
		fmt.Println("closing listener1")
		currentVtctld = server1
		nextAddr = listener2.Addr().String()

	case listener2.Addr().String():
		fmt.Println("closing listener2")
		currentVtctld = server2
		nextAddr = listener1.Addr().String()
	default:
		t.Fatalf("invalid proxy host %s", proxy.host)
	}

	// Remove the shut down vtctld from VTAdmin's service discovery (clumsily).
	// Otherwise, when redialing, we may redial the vtctld that we just shut down.
	disco.Clear()
	disco.AddTaggedVtctlds(nil, &vtadminpb.Vtctld{
		Hostname: nextAddr,
	})

	// Force an ungraceful shutdown of the gRPC server to which we're connected
	currentVtctld.Stop()

	// Give the client connection (and socket) a chance to propagate; if we redial too quickly,
	// the client connection to the vtctld still registers as READY.
	// TODO can we use the connectivity API here as well?? I think we can actually check that
	// the server started with serve returns
	// time.Sleep(500 * time.Millisecond)
	// select {
	// case <-result:
	// 	fmt.Printf("done\n\n\n\n")
	// default:
	// 	fmt.Printf("sleeping\n\n")
	// 	time.Sleep(500 * time.Millisecond)
	// }

	// Block until we receive a shutdown from the server
	fmt.Printf("\n\nblocking......\n\n")
	<-result

	fmt.Printf("result: %+v", result)

	// Finally, check that dial + establish a connection to the remaining vtctld.
	err = proxy.Dial(context.Background())
	assert.NoError(t, err)
	assert.Equal(t, nextAddr, proxy.host)
}
