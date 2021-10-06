package models

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/csv"
	"io"
	"log"
	"os"
	"sync"

	"github.com/jszwec/csvutil"
)

type SongStatword struct {
	TrackID string `csv:"track_id"`
	Tags    string `csv:"tags"`
}

func (ssw *SongStatword) binds() []interface{} {
	return []interface{}{
		ssw.TrackID,
		ssw.Tags,
	}
}

type SongStatwordInserter struct {
	m         sync.Mutex
	buf       *bytes.Buffer
	songwords []*SongStatword
	opts      InsertParams
}

func NewSongStatwordInserter(ctx context.Context, path string, opts InsertParams) (*SongStatwordInserter, error) {
	songstatwordsCh, errCh, err := LoadSongStatwordsFromCSV(ctx, path)
	if err != nil {
		return nil, err
	}

	sswi := SongStatwordInserter{
		buf:       bytes.NewBuffer(nil),
		songwords: make([]*SongStatword, 0, opts.BatchSize),
		opts:      opts,
	}

	go func() { // stream song statwords from csv into internal buffer for later inserts
		for {
			select {
			case <-ctx.Done():
				log.Print("[INFO] song_statwords loader context done; no new song statwords will be loaded")
				return
			case ssw, ok := <-songstatwordsCh:
				if !ok {
					log.Printf("[INFO]: streaming from CSV done")
					return
				}

				sswi.m.Lock()
				sswi.songwords = append(sswi.songwords, ssw)
				sswi.m.Unlock()
			case err, ok := <-errCh:
				if !ok {
					log.Printf("[INFO]: streaming from CSV done")
					return
				}

				log.Printf("[WARNING] while parsing song statwords csv got: %v", err)
			}
		}
	}()

	return &sswi, nil
}

func (sdi *SongStatwordInserter) Insert(ctx context.Context, db *sql.DB) (int64, error) {
	sdi.m.Lock()
	if len(sdi.songwords) == 0 {
		sdi.m.Unlock()
		if sdi.opts.Debug {
			log.Print("no songwords available to insert; skipping this pass")
		}

		return 0, nil
	}

	sdi.buf.WriteString("INSERT IGNORE INTO song_statwords (track_id, tags) VALUES ")

	batchSize := sdi.opts.BatchSize
	if len(sdi.songwords) < batchSize { // Insert min(opts.BatchSize, len(songwords))
		batchSize = len(sdi.songwords)
	}

	binds := make([]interface{}, 0, batchSize*2)
	for i := 0; i < batchSize; i++ {
		sdi.buf.WriteString("(?, ?)")
		binds = append(binds, sdi.songwords[i].binds()...)

		if i < batchSize-1 {
			sdi.buf.WriteString(", ")
		}
	}

	sdi.buf.WriteString(";")
	q := sdi.buf.String()

	// clear out what we've used
	sdi.songwords = sdi.songwords[batchSize:]
	sdi.buf.Reset()

	sdi.m.Unlock() // free up sdi.buf and sdi.songwords for other insert calls

	if sdi.opts.Debug {
		log.Printf("Executing query: %q", q)
	}

	r, err := db.ExecContext(ctx, q, binds...)
	if err != nil {
		return -1, err
	}

	return r.RowsAffected()
}

func LoadSongStatwordsFromCSV(ctx context.Context, path string) (chan *SongStatword, chan error, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}

	reader := csv.NewReader(f)
	reader.LazyQuotes = true
	decoder, err := csvutil.NewDecoder(reader)
	if err != nil {
		f.Close()
		return nil, nil, err
	}

	songstatwordCh := make(chan *SongStatword)
	errs := make(chan error)

	go func() {
		defer f.Close()
		defer func() {
			close(songstatwordCh)
			close(errs)
		}()

		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			var ssw SongStatword
			err := decoder.Decode(&ssw)
			switch err {
			case io.EOF:
				return
			case nil:
				songstatwordCh <- &ssw
			default:
				errs <- err
			}
		}
	}()

	return songstatwordCh, errs, nil
}
