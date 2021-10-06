package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"vitess.io/vitess/examples/local/vtadmin-demo/models"
)

var (
	debug = flag.Bool("debug", false, "")

	dsn       = flag.String("dsn", "vt_app@tcp(localhost:15306)/media", "Full DSN spec: `[username[:password]@][protocol[(address)]]/dbname[?param1=value1&...&paramN=valueN]`")
	threads   = flag.Int("threads", 4, "")
	batchSize = flag.Int("batch_size", 100, "")
	sleep     = flag.Duration("sleep_interval", time.Millisecond*10, "sleep `sleep-interval` +/- 0.1*`sleep-interval` between insert batches")

	model = flag.String("model", "", "model to insert (options: books)")
	path  = flag.String("csv_path", "", "path to CSV file containing data to insert")

	statsReportRate = flag.Duration("stats_report_rate", time.Second, "")
)

func getInserter(ctx context.Context, model string, path string) (models.Inserter, error) {
	params := models.InsertParams{
		BatchSize: *batchSize,
		Debug:     *debug,
	}

	switch model {
	case "books":
		return models.NewBookInserter(ctx, path, params)
	case "song_charts", "songcharts":
		return models.NewSongChartInserter(ctx, path, params)
	case "song_data":
		return models.NewSongDataInserter(ctx, path, params)
	}

	return nil, nil /* TODO: error */
}

func main() {
	flag.Parse()

	if *threads < 1 {
		log.Fatalf("-threads must be > 0, got: %d", *threads)
	}

	if *batchSize < 1 {
		log.Fatalf("-batch_size must be > 0, got: %d", *batchSize)
	}

	if *model == "" {
		log.Fatal("-model is required")
	}

	if *path == "" {
		log.Fatal("-csv_path is required")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	inserter, err := getInserter(ctx, *model, *path)
	if err != nil {
		log.Fatal(err)
	}

	db, err := sql.Open("mysql", *dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	signals := make(chan os.Signal, 8)
	signal.Notify(signals, os.Interrupt)

	shutdown := make(chan error)
	go func() {
		sig := <-signals
		shutdown <- fmt.Errorf("got signal %v, shutting down", sig)
	}()

	if *debug {
		log.Printf("spawning %d insert threads", *threads)
	}

	Stats.startTime = time.Now()

	go func() {
		ticker := time.NewTicker(*statsReportRate)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				ReportStats()
			case <-ctx.Done():
				return
			}
		}
	}()

	for i := 0; i < *threads; i++ {
		go func() {
			var (
				rowsAffected int64
				err          error
			)

			for {
				select {
				case <-ctx.Done():
					log.Printf("context finished: %v, stopping insert thread", ctx.Err())
					return
				default:
					rowsAffected, err = inserter.Insert(ctx, db)
					switch err {
					case nil:
						Stats.RowsInserted.Inc(int(rowsAffected))
					default:
						if *debug {
							log.Printf("error inserting batch: %v", err)
						}
						Stats.Errors.Inc(1)
					}
				}

				delay := *sleep + 0 // TODO: add jitter
				if *debug {
					msg := "sleeping for %s between insert batches"
					params := []interface{}{delay}
					if err == nil {
						msg = "rows affected: %d; " + msg
						params = append([]interface{}{rowsAffected}, params...)
					}

					log.Printf(msg, params...)
				}
				time.Sleep(delay)
			}
		}()
	}

	err = <-shutdown
	if err != nil {
		log.Println(err)
	}
}
