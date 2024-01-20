const express = require('express');

module.exports = function(db) {
    const router = express.Router();

    router.get('/boxes', (req, res) => {
        db.query('SELECT Box.BoxID, Box.Menge, Materialtyp.Bezeichnung, Materialtyp.MaterialtypID FROM Box INNER JOIN Materialtyp ON Box.MaterialtypID = Materialtyp.MaterialtypID', (err, results) => {
            if (err) {
                console.error('Fehler beim Abrufen der Box-Daten: ', err);
                res.status(500).send('Interner Serverfehler');
            } else {
                res.json(results);
            }
        });
    });
    router.get('/materialdaten/:BoxID', (req, res) => {
        const { BoxID } = req.params;
        db.query('SELECT Box.BoxID, Box.Menge, Materialtyp.Bezeichnung, Materialtyp.MaterialtypID FROM Box INNER JOIN Materialtyp ON Box.MaterialtypID = Materialtyp.MaterialtypID WHERE Box.BoxID= ?', [BoxID] , (err, results) => {
            if (err) {
                console.error('Fehler beim Abrufen der Box-Daten: ', err);
                res.status(500).send('Interner Serverfehler');
            } else {
                res.json(results);
            }
        });
    });
    return router;
};