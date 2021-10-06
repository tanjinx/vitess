package models

import (
	"context"
	"database/sql"
	"time"
)

type Inserter interface {
	Insert(ctx context.Context, db *sql.DB) (int64, error)
}

type InsertParams struct {
	BatchSize int
	Delay     time.Duration
	Debug     bool
}
