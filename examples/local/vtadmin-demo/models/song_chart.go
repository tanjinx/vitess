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

type SongChart struct {
	ID       int    `csv:"id"`
	Country  string `csv:"country"`
	Date     string `csv:"date"`
	Position string `csv:"position"`
	URI      string `csv:"uri"`
	Title    string `csv:"title"`
	Artist   string `csv:"artist"`
}

func (sc *SongChart) binds() []interface{} {
	return []interface{}{
		sc.ID,
		sc.Country,
		sc.Date,
		sc.Position,
		sc.URI,
		sc.Title,
		sc.Artist,
	}
}

type SongChartInserter struct {
	m          sync.Mutex
	buf        *bytes.Buffer
	songcharts []*SongChart
	opts       InsertParams
}

func NewSongChartInserter(ctx context.Context, path string, opts InsertParams) (*SongChartInserter, error) {
	songChartsCh, errCh, err := LoadSongChartsFromCSV(ctx, path)
	if err != nil {
		return nil, err
	}

	sci := SongChartInserter{
		buf:        bytes.NewBuffer(nil),
		songcharts: make([]*SongChart, 0, opts.BatchSize),
		opts:       opts,
	}

	go func() { // stream song charts from csv into internal buffer for later inserts
		for {
			select {
			case <-ctx.Done():
				log.Print("[INFO] songchart loader context done; no new songcharts will be loaded")
				return
			case songChart, ok := <-songChartsCh:
				if !ok {
					log.Printf("[INFO]: streaming from CSV done")
					return
				}

				sci.m.Lock()
				sci.songcharts = append(sci.songcharts, songChart)
				sci.m.Unlock()
			case err, ok := <-errCh:
				if !ok {
					log.Printf("[INFO]: streaming from CSV done")
					return
				}

				log.Printf("[WARNING] while parsing songchart csv got: %v", err)
			}
		}
	}()

	return &sci, nil
}

func (sci *SongChartInserter) Insert(ctx context.Context, db *sql.DB) (int64, error) {
	sci.m.Lock()
	if len(sci.songcharts) == 0 {
		sci.m.Unlock()
		if sci.opts.Debug {
			log.Print("no songcharts available to insert; skipping this pass")
		}

		return 0, nil
	}

	sci.buf.WriteString("INSERT IGNORE INTO song_charts (id, country, chart_date, chart_position, uri, title, artist) VALUES ")

	batchSize := sci.opts.BatchSize
	if len(sci.songcharts) < batchSize { // Insert min(opts.BatchSize, len(songcharts))
		batchSize = len(sci.songcharts)
	}

	binds := make([]interface{}, 0, batchSize*12)
	for i := 0; i < batchSize; i++ {
		sci.buf.WriteString("(?, ?, ?, ?, ?, ?, ?)")
		binds = append(binds, sci.songcharts[i].binds()...)

		if i < batchSize-1 {
			sci.buf.WriteString(", ")
		}
	}

	sci.buf.WriteString(";")
	q := sci.buf.String()

	// clear out what we've used
	sci.songcharts = sci.songcharts[batchSize:]
	sci.buf.Reset()

	sci.m.Unlock() // free up sci.buf and sci.songcharts for other insert calls

	if sci.opts.Debug {
		log.Printf("Executing query: %q", q)
	}

	r, err := db.ExecContext(ctx, q, binds...)
	if err != nil {
		return -1, err
	}

	return r.RowsAffected()
}

func LoadSongChartsFromCSV(ctx context.Context, path string) (chan *SongChart, chan error, error) {
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

	songCharts := make(chan *SongChart)
	errs := make(chan error)

	go func() {
		defer f.Close()
		defer func() {
			close(songCharts)
			close(errs)
		}()

		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			var sc SongChart
			err := decoder.Decode(&sc)
			switch err {
			case io.EOF:
				return
			case nil:
				songCharts <- &sc
			default:
				errs <- err
			}
		}
	}()

	return songCharts, errs, nil
}
