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

type SongData struct {
	TrackID  string  `csv:"track_id"`
	Tempo    float64 `csv:"tempo"`
	Loudness float64 `csv:"loudness"`
	Mode     int     `csv:"mode"`
	Artist   string  `csv:"artist_name"`
	Title    string  `csv:"title"`
}

func (sd *SongData) binds() []interface{} {
	return []interface{}{
		sd.TrackID,
		sd.Tempo,
		sd.Loudness,
		sd.Mode,
		sd.Artist,
		sd.Title,
	}
}

type SongDataInserter struct {
	m        sync.Mutex
	buf      *bytes.Buffer
	songdata []*SongData
	opts     InsertParams
}

func NewSongDataInserter(ctx context.Context, path string, opts InsertParams) (*SongDataInserter, error) {
	songdataCh, errCh, err := LoadSongDataFromCSV(ctx, path)
	if err != nil {
		return nil, err
	}

	sdi := SongDataInserter{
		buf:      bytes.NewBuffer(nil),
		songdata: make([]*SongData, 0, opts.BatchSize),
		opts:     opts,
	}

	go func() { // stream song charts from csv into internal buffer for later inserts
		for {
			select {
			case <-ctx.Done():
				log.Print("[INFO] song_data loader context done; no new song_data will be loaded")
				return
			case songData, ok := <-songdataCh:
				if !ok {
					log.Printf("[INFO]: streaming from CSV done")
					return
				}

				sdi.m.Lock()
				sdi.songdata = append(sdi.songdata, songData)
				sdi.m.Unlock()
			case err, ok := <-errCh:
				if !ok {
					log.Printf("[INFO]: streaming from CSV done")
					return
				}

				log.Printf("[WARNING] while parsing song data csv got: %v", err)
			}
		}
	}()

	return &sdi, nil
}

func (sdi *SongDataInserter) Insert(ctx context.Context, db *sql.DB) (int64, error) {
	sdi.m.Lock()
	if len(sdi.songdata) == 0 {
		sdi.m.Unlock()
		if sdi.opts.Debug {
			log.Print("no songdatas available to insert; skipping this pass")
		}

		return 0, nil
	}

	sdi.buf.WriteString("INSERT IGNORE INTO song_data (track_id, tempo, loudness, mode, artist, title) VALUES ")

	batchSize := sdi.opts.BatchSize
	if len(sdi.songdata) < batchSize { // Insert min(opts.BatchSize, len(songdata))
		batchSize = len(sdi.songdata)
	}

	binds := make([]interface{}, 0, batchSize*12)
	for i := 0; i < batchSize; i++ {
		sdi.buf.WriteString("(?, ?, ?, ?, ?, ?)")
		binds = append(binds, sdi.songdata[i].binds()...)

		if i < batchSize-1 {
			sdi.buf.WriteString(", ")
		}
	}

	sdi.buf.WriteString(";")
	q := sdi.buf.String()

	// clear out what we've used
	sdi.songdata = sdi.songdata[batchSize:]
	sdi.buf.Reset()

	sdi.m.Unlock() // free up sdi.buf and sdi.songdata for other insert calls

	if sdi.opts.Debug {
		log.Printf("Executing query: %q", q)
	}

	r, err := db.ExecContext(ctx, q, binds...)
	if err != nil {
		return -1, err
	}

	return r.RowsAffected()
}

func LoadSongDataFromCSV(ctx context.Context, path string) (chan *SongData, chan error, error) {
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

	songdataCh := make(chan *SongData)
	errs := make(chan error)

	go func() {
		defer f.Close()
		defer func() {
			close(songdataCh)
			close(errs)
		}()

		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			var sd SongData
			err := decoder.Decode(&sd)
			switch err {
			case io.EOF:
				return
			case nil:
				songdataCh <- &sd
			default:
				errs <- err
			}
		}
	}()

	return songdataCh, errs, nil
}
