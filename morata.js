const express = require("express");
const bodyParser = require('body-parser');
const JSONbig = require('json-bigint');
const path = require('path');
const pool = require("./config");
const {promisify} = require('util');
const handlebars = require('handlebars');
const fs = require("fs");
const app = express();

const urlencodedParser = bodyParser.urlencoded({extended: false})

const allowCrossDomain = function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
}

app.use(express.static(path.join(__dirname, '/')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

app.use(allowCrossDomain);

app.listen(3001, () => {
    console.log("Morata started and Listening on port 3001");
});

app.get("/simh", async (req, res) => {
    pool.getConnection()
        .then(conn => {
            conn.query("SELECT GaramanteID.users.first_name, tracks.itunes_track_id, tracks.track_name, track_artwork, itunes_track_preview_url, track_artist, AVG(simh_updates.idf) as average_idf, MAX(simh_updates.date) AS last_update, AVG(simh_updates.idf) * COUNT(simh_updates.idf) AS gdf, IF((SELECT MAX(simh_updates.date) FROM simh_updates WHERE simh_updates.simh_id = simh.id) < (DATE_SUB(NOW(), INTERVAL 2 DAY)), 1, 0) as status, COUNT(simh_updates.idf) * 1 as total_days FROM tracks INNER JOIN simh ON tracks.itunes_track_id = simh.track_id INNER JOIN GaramanteID.users ON simh.user_id = users.id INNER JOIN simh_updates ON simh.id = simh_updates.simh_id GROUP BY simh.id ORDER BY last_update DESC;")
                .then((tracks) => {
                    conn.end();
                    tracks.forEach(track => {
                        track.total_days = parseInt(JSONbig().stringify(track.total_days));
                    });
                    console.log(tracks);
                    res.send(tracks);
                })
                .catch(err => {
                    console.log("Errore durante la lettura delle fisse: " + err);
                    conn.end();
                })
        }).catch(err => {
        console.log("Errore durante la connessione al database: " + err);
    });
});

app.get("/tracks/itunes", urlencodedParser, (req, res) => {
    pool.getConnection()
        .then(conn => {
            conn.query("SELECT * FROM tracks WHERE itunes_track_id = " + req.params.id + ";")
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

app.get("/:id", urlencodedParser, (req, res) => {
    pool.getConnection()
        .then(conn => {
            conn.query("SELECT * FROM tracks WHERE itunes_track_id = ?;", [req.params.id])
                .then(async (track) => {
                    await conn.end();
                    const readFile = promisify(fs.readFile);
                    let html = await readFile('fissa.html', 'utf8');
                    let template = handlebars.compile(html);
                    let data = {
                        track_name: track[0].track_name,
                        track_artwork_url: track[0].track_artwork,
                        track_artist: track[0].track_artist,
                        track_collection: track[0].track_collection,
                        release_date: track[0].track_release_date,
                        track_genre: track[0].track_genre,
                        track_id: track[0].itunes_track_id,
                    };

                    let release_date = new Date(data.release_date);
                    let month = release_date.toLocaleString('it-IT', {month: 'long'});
                    month = month.charAt(0).toUpperCase() + month.slice(1);
                    let year = release_date.getFullYear();
                    data.release_date = month + " " + year;

                    let htmlToSend = template(data);
                    res.send(htmlToSend);
                    res.sendFile(path.join(__dirname, 'public', 'tracks.html'));
                })
                .catch(err => {
                    console.log(err);
                    res.send("Errore durante la lettura della fisse: " + err);
                    conn.end();
                });
        })
        .catch(err => {
            console.log("Errore durante la connessione al database: " + err);
        });
});

app.get("/tracks/:id/simh", urlencodedParser, (req, res) => {
    pool.getConnection()
        .then(conn => {
            conn.query("SELECT GaramanteID.users.first_name, tracks.itunes_track_id, tracks.track_name, track_artwork, itunes_track_preview_url, track_artist, AVG(simh_updates.idf) as average_idf, MAX(simh_updates.date) AS last_update, MIN(simh_updates.date) AS first_update, AVG(simh_updates.idf) * COUNT(simh_updates.idf) AS gdf, IF((SELECT MAX(simh_updates.date) FROM simh_updates WHERE simh_updates.simh_id = simh.id) < (DATE_SUB(NOW(), INTERVAL 2 DAY)), 1, 0) as status, COUNT(simh_updates.idf) * 1 as total_days FROM tracks INNER JOIN simh ON tracks.itunes_track_id = simh.track_id INNER JOIN GaramanteID.users ON simh.user_id = users.id INNER JOIN simh_updates ON simh.id = simh_updates.simh_id WHERE itunes_track_id = ? GROUP BY simh.id ORDER BY last_update DESC;", [req.params.id])
                .then((simh) => {
                    conn.end();
                    simh.forEach(s => {
                        s.total_days = parseInt(JSONbig().stringify(s.total_days));

                        let date = new Date(s.first_update);
                        let month = date.toLocaleString('it-IT', {month: 'long'});
                        month = month.charAt(0).toUpperCase() + month.slice(1);
                        let year = date.getFullYear();
                        s.date = date.getDay() + " " + month + " " + year;

                        s.gdf = parseFloat(s.gdf).toFixed(0);
                        s.average_idf = parseFloat(s.average_idf).toFixed(1);
                    });
                    res.send(simh);
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

app.post("/simh", urlencodedParser, (req, res) => {
    pool.getConnection()
        .then(conn => {
            const selectTrackQuery = "SELECT * FROM SIMH_Analyzer.tracks WHERE itunes_track_id = ?";
            const insertTrackQuery = "INSERT INTO SIMH_Analyzer.tracks (track_name, track_artwork, track_artist, track_collection, track_release_date, track_genre, itunes_track_id, itunes_track_artist_id, itunes_track_collection_id, itunes_track_preview_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            const insertSimhQuery = "INSERT INTO SIMH_Analyzer.simh (user_id, track_id) VALUES (?, ?)";
            const insertSimhUpdatesQuery = "INSERT INTO SIMH_Analyzer.simh_updates (simh_id, idf) VALUES (?, ?)";

            conn.query(selectTrackQuery, [req.body.itunes_track_id])
                .then((track) => {
                    if (track.length === 0) {
                        conn.query(insertTrackQuery, [
                            req.body.track_name,
                            req.body.track_artwork,
                            req.body.track_artist,
                            req.body.track_collection,
                            new Date(req.body.track_release_date),
                            req.body.track_genre,
                            req.body.itunes_track_id,
                            req.body.itunes_track_artist_id,
                            req.body.itunes_track_collection_id,
                            req.body.itunes_track_preview_url
                        ])
                            .then(() => {
                                return conn.query(insertSimhQuery, [req.body.user_id, req.body.itunes_track_id]);
                            })
                            .then((result) => {
                                const simhId = result.insertId;
                                return conn.query(insertSimhUpdatesQuery, [simhId, req.body.idf]);
                            })
                            .then(() => {
                                conn.commit();
                                conn.release();
                                res.send("Fissa inserita correttamente.");
                            })
                            .catch(err => {
                                console.log(err);
                                conn.rollback();
                                conn.release();
                                res.status(500).send({"error": "Errore riscontrato inserendo la fissa."});
                            });
                    } else {
                        conn.query(insertSimhQuery, [req.body.user_id, req.body.itunes_track_id])
                            .then((result) => {
                                const simhId = result.insertId;
                                return conn.query(insertSimhUpdatesQuery, [simhId, req.body.idf]);
                            })
                            .then(() => {
                                conn.commit();
                                conn.release();
                                res.send("Fissa inserita correttamente.");
                            })
                            .catch(err => {
                                console.log(err);
                                conn.rollback();
                                conn.release();
                                res.status(500).send({"error": "Errore riscontrato inserendo la fissa."});
                            });
                    }
                })
                .catch(err => {
                    console.log(err);
                    conn.end();
                })
        }).catch(err => {
        console.log("Errore durante la connessione al database: " + err);
    });
});