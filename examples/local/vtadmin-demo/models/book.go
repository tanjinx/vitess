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

type Book struct {
	ID                 int     `csv:"bookID"`
	Title              string  `csv:"title"`
	Author             string  `csv:"authors"`
	AverageRating      float64 `csv:"average_rating"`
	ISBN               string  `csv:"isbn"`
	ISBN13             string  `csv:"isbn13"`
	LanguageCode       string  `csv:"language_code"`
	Pages              int     `csv:"num_pages"`
	Ratings            int     `csv:"ratings_count"`
	TextReviews        int     `csv:"text_reviews_count"`
	PublicationDateStr string  `csv:"publication_date"`
	Publisher          string  `csv:"publisher"`
}

func (b *Book) binds() []interface{} {
	return []interface{}{
		b.ID,
		b.Title,
		b.Author,
		b.AverageRating,
		b.ISBN,
		b.ISBN13,
		b.LanguageCode,
		b.Pages,
		b.Ratings,
		b.TextReviews,
		b.PublicationDateStr,
		b.Publisher,
	}
}

type BookInserter struct {
	m     sync.Mutex
	buf   *bytes.Buffer
	books []*Book
	opts  InsertParams
}

func NewBookInserter(ctx context.Context, path string, opts InsertParams) (*BookInserter, error) {
	booksCh, errCh, err := LoadBooksFromCSV(ctx, path)
	if err != nil {
		return nil, err
	}

	bi := BookInserter{
		buf:   bytes.NewBuffer(nil),
		books: make([]*Book, 0, opts.BatchSize),
		opts:  opts,
	}

	go func() { // stream books from csv into internal buffer for later inserts
		for {
			select {
			case <-ctx.Done():
				log.Print("[INFO] book loader context done; no new books will be loaded")
				return
			case book, ok := <-booksCh:
				if !ok {
					log.Printf("[INFO]: streaming from CSV done")
					return
				}

				bi.m.Lock()
				bi.books = append(bi.books, book)
				bi.m.Unlock()
			case err, ok := <-errCh:
				if !ok {
					log.Printf("[INFO]: streaming from CSV done")
					return
				}

				log.Printf("[WARNING] while parsing book csv got: %v", err)
			}
		}
	}()

	return &bi, nil
}

func (bi *BookInserter) Insert(ctx context.Context, db *sql.DB) (int64, error) {
	bi.m.Lock()
	if len(bi.books) == 0 {
		bi.m.Unlock()
		if bi.opts.Debug {
			log.Print("no books available to insert; skipping this pass")
		}

		return 0, nil
	}

	bi.buf.WriteString("INSERT IGNORE INTO books (id, title, authors, average_rating, isbn, isbn13, language_code, num_pages, ratings_count, text_reviews_count, publication_date, publisher) VALUES ")

	batchSize := bi.opts.BatchSize
	if len(bi.books) < batchSize { // Insert min(opts.BatchSize, len(books))
		batchSize = len(bi.books)
	}

	binds := make([]interface{}, 0, batchSize*12)
	for i := 0; i < batchSize; i++ {
		bi.buf.WriteString("(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
		binds = append(binds, bi.books[i].binds()...)

		if i < batchSize-1 {
			bi.buf.WriteString(", ")
		}
	}

	bi.buf.WriteString(";")
	q := bi.buf.String()

	// clear out what we've used
	bi.books = bi.books[batchSize:]
	bi.buf.Reset()

	bi.m.Unlock() // free up bi.buf and bi.books for other insert calls

	if bi.opts.Debug {
		log.Printf("Executing query: %q", q)
	}

	r, err := db.ExecContext(ctx, q, binds...)
	if err != nil {
		return -1, err
	}

	return r.RowsAffected()
}

func LoadBooksFromCSV(ctx context.Context, path string) (chan *Book, chan error, error) {
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

	books := make(chan *Book)
	errs := make(chan error)

	go func() {
		defer f.Close()
		defer func() {
			close(books)
			close(errs)
		}()

		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			var b Book
			err := decoder.Decode(&b)
			switch err {
			case io.EOF:
				return
			case nil:
				books <- &b
			default:
				errs <- err
			}
		}
	}()

	return books, errs, nil
}
