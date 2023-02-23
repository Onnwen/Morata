const express = require("express");
const app = express();
const pool = require("./config");

var allowCrossDomain = function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
}

app.use(allowCrossDomain);

app.listen(3036, () => {
    console.log("Application started and Listening on port 3036");
});

app.get("/tracks", async (req, res) => {
    pool.getConnection()
        .then(conn => {
            conn.query("SELECT GaramanteID.users.first_name, tracks.track_name, track_artwork, track_artist, AVG(simh_updates.idf) as average_idf, AVG(simh_updates.idf) * COUNT(simh_updates.idf) as gdf, MAX(simh_updates.date) as last_update FROM tracks INNER JOIN simh ON tracks.id = simh.track_id INNER JOIN GaramanteID.users ON simh.user_id = users.id INNER JOIN simh_updates ON simh.id = simh_updates.simh_id;")
                .then((tracks) => {
                    conn.end();
                    res.send(tracks);
                })
                .catch(err => {
                    console.log(err);
                    conn.end();
                })
        }).catch(err => {
            console.log("Errore durante la connessione al database: " + err);
        });
});

app.get("/tracks/itunes/:id", async (req, res) => {
    pool.getConnection()
        .then(conn => {
            conn.query("SELECT * tracks WHERE itunes_track_id = " + req.params.id + ";")
                .then((track) => {
                    conn.end();
                    res.send(track);
                })
                .catch(err => {
                    console.log(err);
                    conn.end();
                });
        })
        .catch(err => {
            console.log("Errore durante la connessione al database: " + err);
        });
});

app.get("/tracks", async (req, res) => {
    pool.getConnection()
        .then(conn => {
            conn.query("SELECT * tracks WHERE id = " + req.params.id + ";")
                .then((track) => {
                    conn.end();
                    res.send(track);
                })
                .catch(err => {
                    console.log(err);
                    conn.end();
                });
        })
        .catch(err => {
            console.log("Errore durante la connessione al database: " + err);
        });
});

app.post("/simh", async (req, res) => {
    console.log(req.body);
    pool.getConnection()
        .then(conn => {
            conn.query("SELECT * FROM SIMH_Analyzer.tracks WHERE itunes_track_id = " + req.body.track_id + ";")
                .then((track) => {
                    if (track.length == 0) {
                        conn.query("INSERT INTO SIMH_Analyzer.tracks (track_name, track_artwork, track_artist, track_collection, track_release_date, track_genre, itunes_track_id, itunes_track_artist_id, itunes_track_collection_id, itunes_track_preview_url) VALUES (" + req.params.track_name + ", " + req.params.track_artwork + ", " + req.params.track_artist + ", " + req.params.track_collection + ", " + req.params.track_release_date + ", " + req.params.track_genre + ", " + req.params.itunes_track_id + ", " + req.params.itunes_track_artist_id + ", " + req.params.itunes_track_collection_id + ", " + req.params.itunes_track_preview_url + ");")
                            .then(() => {
                                conn.query("INSERT INTO SIMH_Analyzer.simh (user_id, track_id) VALUES (" + req.params.user_id + ", LAST_INSERT_ID());")
                                    .then(() => {
                                        conn.query("INSERT INTO SIMH_Analyzer.simh_updates (simh_id, idf) VALUES (LAST_INSERT_ID(), " + req.params.idf + ");")
                                            .then((track) => {
                                                conn.end();
                                                res.send(track);
                                            })
                                            .catch(err => {
                                                console.log(err);
                                                conn.end();
                                                res.send({ "error": "Errore durante l'inserimento dell'IDF della fissa." })
                                            })
                                    })
                                    .catch(err => {
                                        console.log(err);
                                        conn.end();
                                        res.send({ "error": "Errore durante l'inserimento della fissa." })
                                    })
                            })
                            .catch(err => {
                                console.log(err);
                                conn.end();
                                res.send({ "error": "Errore durante l'inserimento della canzone." })
                            });
                    }
                    else {
                        conn.query("INSERT INTO SIMH_Analyzer.simh (user_id, track_id) VALUES (" + req.params.user_id + ", LAST_INSERT_ID());")
                            .then(() => {
                                conn.query("INSERT INTO SIMH_Analyzer.simh_updates (simh_id, idf) VALUES (LAST_INSERT_ID(), " + req.params.idf + ");")
                                    .then((track) => {
                                        conn.end();
                                        res.send(track);
                                    })
                                    .catch(err => {
                                        console.log(err);
                                        conn.end();
                                        res.send({ "error": "Errore durante l'inserimento dell'IDF della fissa." })
                                    })
                            })
                            .catch(err => {
                                console.log(err);
                                conn.end();
                                res.send({ "error": "Errore durante l'inserimento della fissa." })
                            })
                    }
                })
                .catch(err => {
                    console.log(err);
                    conn.end();
                    res.send({ "error": "Errore durante la ricerca della canzone." })
                })
        })
        .catch(err => {
            console.log("Errore durante la connessione al database: " + err);
        });
});

app.post("/track", async (req, res) => {
    pool.getConnection()
        .then(conn => {
            conn.query("SELECT * tracks WHERE id = " + req.params.id + ";")
                .then((track) => {
                    conn.end();
                    res.send(track);
                })
                .catch(err => {
                    console.log(err);
                    conn.end();
                });
        })
        .catch(err => {
            console.log("Errore durante la connessione al database: " + err);
        });
});