CREATE TABLE books (
    id INT(11) NOT NULL,
    title TEXT NOT NULL,
    authors TEXT NOT NULL,
    average_rating FLOAT(3, 2) NOT NULL,
    isbn VARCHAR(11) NOT NULL,
    isbn13 VARCHAR(13) NOT NULL,
    language_code VARCHAR(20) NOT NULL,
    num_pages INT(11) NOT NULL,
    ratings_count INT(11) NOT NULL,
    text_reviews_count INT(11) NOT NULL,
    publication_date VARCHAR(10) NOT NULL, -- 'MM/DD/YYYY' because I'm lazy
    publisher VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPRESSED COMMENT="Source: https://www.kaggle.com/jealousleopard/goodreadsbooks";

CREATE TABLE song_charts (
    id INT(11) NOT NULL,
    country VARCHAR(255) NOT NULL,
    chart_date VARCHAR(10) NOT NULL, -- 'MM/DD/YYYY'
    chart_position INT(11) NOT NULL COMMENT "position in chart (1-200)",
    uri VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPRESSED COMMENT="Source: https://www.kaggle.com/pepepython/spotify-huge-database-daily-charts-over-3-years?select=Database+to+calculate+popularity.csv";

CREATE TABLE song_data (
    track_id VARCHAR(255) NOT NULL,
    tempo FLOAT(6, 3) NOT NULL,
    loudness FLOAT(6, 3) NOT NULL,
    mode TINYINT(2) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    PRIMARY KEY (`track_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPRESSED COMMENT="Source: https://www.kaggle.com/sandyhe/songs-emotion?select=songsdata.csv";

CREATE TABLE song_statwords (
    track_id VARCHAR(255) NOT NULL, -- song_data.track_id
    tags TEXT NOT NULL,
    PRIMARY KEY (`track_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPRESSED COMMENT="Source: https://www.kaggle.com/sandyhe/songs-emotion?statwords.csv";
