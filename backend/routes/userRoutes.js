const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = function(db) {
    const router = express.Router();

    router.post('/login', (req, res) => {
        const {email, firstName, lastName} = req.body;
        db.query('SELECT NutzerID FROM Account WHERE Email = ?', [email], (err, result) => {
            if (err) {
                console.error('Fehler bei der Datenbankabfrage: ', err);
                res.status(500).send('Interner Serverfehler');
                return;
            }

            if (result.length === 0) {
                const insertNutzerQuery = 'INSERT INTO Nutzer (Vorname, Nachname) VALUES (?, ?)';
                db.query(insertNutzerQuery, [firstName, lastName], (err, result) => {
                    if (err) {
                        console.error('Fehler beim Einfügen des Nutzers: ', err);
                        res.status(500).send('Interner Serverfehler');
                        return;
                    }

                    const nutzerID = result.insertId;
                    const insertAccountQuery = 'INSERT INTO Account (Email, NutzerID, Zugabe, EntnahmeLimit) VALUES (?, ?, ?, ?)';
                    db.query(insertAccountQuery, [email, nutzerID, 0, 0], (err, result) => {
                        if (err) {
                            console.error('Fehler beim Einfügen des Accounts: ', err);
                            res.status(500).send('Interner Serverfehler');
                            return;
                        }
                        res.status(201).send('Neuer Benutzer und Account erfolgreich erstellt');
                    });
                });
            } else {
                res.status(200).send('Benutzer bereits vorhanden');
            }
        });
    });

    router.get('/class', async (req, res) => {
        const {email} = req.query;
        db.query('SELECT Nutzer.Schulklasse FROM Nutzer INNER JOIN Account ON Nutzer.NutzerID = Account.NutzerID WHERE Account.Email = ?', [email], (err, result) => {
            if (err) {
                console.error('Fehler bei der Datenbankabfrage: ', err);
                res.status(500).send('Interner Serverfehler');
                return;
            }
            if (result.length > 0) {
                const userPayload = {userClass: result[0].Schulklasse};
                const accessToken = jwt.sign(userPayload, process.env.ACCESS_TOKEN_SECRET);
                res.json({accessToken: accessToken});
            } else {
                res.status(404).send('Nutzer nicht gefunden');
            }
        });
    });
    return router;
};