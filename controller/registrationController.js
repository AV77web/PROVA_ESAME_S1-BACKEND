//=================================================
// File: registrationController.js
// Script che gestisce la registrazione dell'utente
// @author: andrea.villari@allievi.itsdigitalacademy.com
// @version: 1.0.0 2026-01-14
// =================================================

const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();

const registrationController = (sql) => {
    // Registrazione utente
    // La rotta è POST / dato che il prefisso /register verrà usato in index.js
    router.post("/", async (req, res) => {
        console.log("[REGISTRAZIONE] Richiesta ricevuta");
        const { nome, cognome, email, password, ruolo } = req.body || {};

        // Validazione campi obbligatori
        if (!nome || !cognome || !email || !password) {
            return res.status(400).json({ 
                error: "Nome, cognome, email e password sono obbligatori" 
            });
        }

        // Validazione del ruolo (se fornito)
        if (ruolo && ruolo !== "Dipendente" && ruolo !== "Responsabile") {
            return res.status(400).json({ 
                error: "Il ruolo deve essere 'Dipendente' o 'Responsabile'" 
            });
        }

        // Validazione formato email (base)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: "Formato email non valido" 
            });
        }

        // Validazione lunghezza password
        if (password.length < 6) {
            return res.status(400).json({ 
                error: "La password deve essere di almeno 6 caratteri" 
            });
        }

        try {
            // Verifica se l'email esiste già
            console.log("[REGISTRAZIONE] Verifica email:", email);
            const checkResult = await sql`
                SELECT Email 
                FROM Utente 
                WHERE Email = ${email}
            `;

            if (checkResult.length > 0) {
                console.log("[REGISTRAZIONE] Email già registrata:", email);
                return res.status(409).json({ 
                    error: "Email già registrata" 
                });
            }

            // Hash della password
            console.log("[REGISTRAZIONE] Hashing password...");
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Inserisci il nuovo utente nel database
            // Se ruolo non è specificato, il database userà il default 'Dipendente'
            let result;
            
            if (ruolo) {
                console.log("[REGISTRAZIONE] Inserimento con ruolo:", ruolo);
                result = await sql`
                    INSERT INTO Utente (Nome, Cognome, Email, Password, Ruolo)
                    VALUES (${nome}, ${cognome}, ${email}, ${hashedPassword}, ${ruolo})
                    RETURNING UtenteID, Nome, Cognome, Email, Ruolo
                `;
            } else {
                console.log("[REGISTRAZIONE] Inserimento senza ruolo (usa default)");
                result = await sql`
                    INSERT INTO Utente (Nome, Cognome, Email, Password)
                    VALUES (${nome}, ${cognome}, ${email}, ${hashedPassword})
                    RETURNING UtenteID, Nome, Cognome, Email, Ruolo
                `;
            }

            const newUser = result[0];
            console.log("[REGISTRAZIONE] Utente creato con successo - ID:", newUser.utenteid);

            // Restituisci i dati dell'utente creato (senza password)
            return res.status(201).json({
                message: "Utente registrato con successo",
                user: {
                    id: newUser.utenteid,
                    nome: newUser.nome,
                    cognome: newUser.cognome,
                    email: newUser.email,
                    ruolo: newUser.ruolo
                }
            });

        } catch (err) {
            console.error("[REGISTRAZIONE] Errore durante la registrazione:", err);
            
            // Gestisci errori specifici di PostgreSQL
            if (err.code === '23505') { // Unique violation
                return res.status(409).json({ 
                    error: "Email già registrata" 
                });
            }

            if (err.code === '22001') { // String too long
                return res.status(400).json({ 
                    error: "Uno dei campi supera la lunghezza massima consentita" 
                });
            }

            return res.status(500).json({ 
                error: "Errore interno del server",
                details: err.message 
            });
        }
    });

    return router;
};

module.exports = registrationController;