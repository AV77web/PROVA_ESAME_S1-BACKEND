//=================================================
// File: permessiController.js
// Script che gestisce le richieste di permesso
// @author: andrea.villari@allievi.itsdigitalacademy.com
// @version: 1.0.0 2026-01-14
// =================================================

const express = require("express");
const router = express.Router();

const permessiController = (sql) => {

    // GET - Ottieni tutte le richieste di permesso (con filtri opzionali)
    router.get("/", async (req, res) => {
        console.log("[PERMESSI] Richiesta lista permessi");
        const { utenteId, stato, categoriaId } = req.query;

        try {
            let result;

            // Se viene specificato un utente, mostra solo i suoi permessi
            if (utenteId) {
                result = await sql`
                    SELECT 
                        rp."RichiestaID", 
                        rp."DataRichiesta", 
                        rp."DataInizio", 
                        rp."DataFine",
                        rp."Motivazione", 
                        rp."Stato", 
                        rp."DataValutazione",
                        rp."UtenteID",
                        u."Nome" as richiedentenome,
                        u."Cognome" as richiedentecognome,
                        u."Email" as richiedenteemail,
                        cp."CategoriaID",
                        cp."Descrizione" as categoriadescrizione,
                        val."Nome" as valutatornome,
                        val."Cognome" as valutatorcognome
                    FROM "RichiestaPermesso" rp
                    INNER JOIN "Utente" u ON rp."UtenteID" = u."UtenteID"
                    INNER JOIN "CategoriaPermesso" cp ON rp."CategoriaID" = cp."CategoriaID"
                    LEFT JOIN "Utente" val ON rp."UtenteValutazioneID" = val."UtenteID"
                    WHERE rp."UtenteID" = ${utenteId}
                    ${stato ? sql`AND rp."Stato" = ${stato}::stato_richiesta_enum` : sql``}
                    ORDER BY rp."DataRichiesta" DESC
                `;
            } else {
                // Tutte le richieste (admin view)
                const filters = [];
                if (stato) filters.push(sql`rp."Stato" = ${stato}::stato_richiesta_enum`);
                if (categoriaId) filters.push(sql`rp."CategoriaID" = ${categoriaId}`);

                const whereClause = filters.length > 0
                    ? sql`WHERE ${sql(filters.reduce((acc, curr, i) =>
                        i === 0 ? curr : sql`${acc} AND ${curr}`))}`
                    : sql``;

                result = await sql`
                    SELECT 
                        rp."RichiestaID", 
                        rp."DataRichiesta", 
                        rp."DataInizio", 
                        rp."DataFine",
                        rp."Motivazione", 
                        rp."Stato", 
                        rp."DataValutazione",
                        rp."UtenteID",
                        u."Nome" as richiedentenome,
                        u."Cognome" as richiedentecognome,
                        u."Email" as richiedenteemail,
                        cp."CategoriaID",
                        cp."Descrizione" as categoriadescrizione,
                        val."Nome" as valutatornome,
                        val."Cognome" as valutatorcognome
                    FROM "RichiestaPermesso" rp
                    INNER JOIN "Utente" u ON rp."UtenteID" = u."UtenteID"
                    INNER JOIN "CategoriaPermesso" cp ON rp."CategoriaID" = cp."CategoriaID"
                    LEFT JOIN "Utente" val ON rp."UtenteValutazioneID" = val."UtenteID"
                    ${whereClause}
                    ORDER BY rp."DataRichiesta" DESC
                `;
            }

            console.log(`[PERMESSI] Trovate ${result.length} richieste`);

            return res.json({
                success: true,
                count: result.length,
                data: result
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nel recupero:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    // GET - Ottieni una singola richiesta per ID
    router.get("/:id", async (req, res) => {
        console.log("[PERMESSI] Richiesta permesso ID:", req.params.id);
        const { id } = req.params;

        try {
            const result = await sql`
                SELECT 
                    rp."RichiestaID", 
                    rp."DataRichiesta", 
                    rp."DataInizio", 
                    rp."DataFine",
                    rp."Motivazione", 
                    rp."Stato", 
                    rp."DataValutazione",
                    rp."UtenteID",
                    u."Nome" as richiedentenome,
                    u."Cognome" as richiedentecognome,
                    u."Email" as richiedenteemail,
                    cp."CategoriaID",
                    cp."Descrizione" as categoriadescrizione,
                    rp."UtenteValutazioneID",
                    val."Nome" as valutatornome,
                    val."Cognome" as valutatorcognome
                FROM "RichiestaPermesso" rp
                INNER JOIN "Utente" u ON rp."UtenteID" = u."UtenteID"
                INNER JOIN "CategoriaPermesso" cp ON rp."CategoriaID" = cp."CategoriaID"
                LEFT JOIN "Utente" val ON rp."UtenteValutazioneID" = val."UtenteID"
                WHERE rp."RichiestaID" = ${id}
            `;

            if (result.length === 0) {
                return res.status(404).json({
                    error: "Richiesta non trovata"
                });
            }

            return res.json({
                success: true,
                data: result[0]
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nel recupero singolo:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    // POST - Crea una nuova richiesta di permesso
    router.post("/", async (req, res) => {
        console.log("[PERMESSI] Nuova richiesta permesso");
        const { dataInizio, dataFine, categoriaId, motivazione, utenteId } = req.body || {};

        // Validazione campi obbligatori
        if (!dataInizio || !dataFine || !categoriaId || !utenteId) {
            return res.status(400).json({
                error: "DataInizio, DataFine, CategoriaID e UtenteID sono obbligatori"
            });
        }

        // Validazione date
        const inizio = new Date(dataInizio);
        const fine = new Date(dataFine);

        if (inizio >= fine) {
            return res.status(400).json({
                error: "La data di fine deve essere successiva alla data di inizio"
            });
        }

        if (inizio < new Date().setHours(0, 0, 0, 0)) {
            return res.status(400).json({
                error: "La data di inizio non può essere nel passato"
            });
        }

        try {
            // Verifica che la categoria esista
            const categoriaCheck = await sql`
                SELECT "CategoriaID" FROM "CategoriaPermesso" WHERE "CategoriaID" = ${categoriaId}
            `;

            if (categoriaCheck.length === 0) {
                return res.status(404).json({
                    error: "Categoria non trovata"
                });
            }

            // Verifica che l'utente esista
            const utenteCheck = await sql`
                SELECT "UtenteID" FROM "Utente" WHERE "UtenteID" = ${utenteId}
            `;

            if (utenteCheck.length === 0) {
                return res.status(404).json({
                    error: "Utente non trovato"
                });
            }

            // Inserisci la richiesta
            const result = await sql`
                INSERT INTO "RichiestaPermesso" 
                    ("DataInizio", "DataFine", "CategoriaID", "Motivazione", "UtenteID")
                VALUES 
                    (${dataInizio}, ${dataFine}, ${categoriaId}, ${motivazione || ''}, ${utenteId})
                RETURNING "RichiestaID", "DataRichiesta", "DataInizio", "DataFine", "CategoriaID", "Motivazione", "Stato", "UtenteID"
            `;

            const newRequest = result[0];
            console.log("[PERMESSI] Richiesta creata con ID:", newRequest.richiestaid);

            return res.status(201).json({
                success: true,
                message: "Richiesta di permesso creata con successo",
                data: {
                    id: newRequest.richiestaid,
                    dataRichiesta: newRequest.datarichiesta,
                    dataInizio: newRequest.datainizio,
                    dataFine: newRequest.datafine,
                    categoriaId: newRequest.categoriaid,
                    motivazione: newRequest.motivazione,
                    stato: newRequest.stato,
                    utenteId: newRequest.utenteid
                }
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nella creazione:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    // PUT - Valuta una richiesta (approva o rifiuta)
    router.put("/:id/valuta", async (req, res) => {
        console.log("[PERMESSI] Valutazione richiesta ID:", req.params.id);
        const { id } = req.params;
        const { stato, utenteValutazioneId } = req.body || {};

        // Validazione
        if (!stato || !utenteValutazioneId) {
            return res.status(400).json({
                error: "Stato e UtenteValutazioneID sono obbligatori"
            });
        }

        if (stato !== "Approvato" && stato !== "Rifiutato") {
            return res.status(400).json({
                error: "Lo stato deve essere 'Approvato' o 'Rifiutato'"
            });
        }

        try {
            // Verifica che la richiesta esista e sia in attesa
            const checkRequest = await sql`
                SELECT "RichiestaID", "Stato" FROM "RichiestaPermesso" WHERE "RichiestaID" = ${id}
            `;

            if (checkRequest.length === 0) {
                return res.status(404).json({
                    error: "Richiesta non trovata"
                });
            }

            if (checkRequest[0].stato !== "In attesa") {
                return res.status(400).json({
                    error: "La richiesta è già stata valutata"
                });
            }

            // Verifica che il valutatore sia un Responsabile
            const valutatore = await sql`
                SELECT "UtenteID", "Ruolo" FROM "Utente" WHERE "UtenteID" = ${utenteValutazioneId}
            `;

            if (valutatore.length === 0) {
                return res.status(404).json({
                    error: "Valutatore non trovato"
                });
            }

            if (valutatore[0].ruolo !== "Responsabile") {
                return res.status(403).json({
                    error: "Solo i Responsabili possono valutare le richieste"
                });
            }

            // Aggiorna la richiesta
            const result = await sql`
                UPDATE "RichiestaPermesso"
                SET 
                    "Stato" = ${stato}::stato_richiesta_enum,
                    "DataValutazione" = NOW(),
                    "UtenteValutazioneID" = ${utenteValutazioneId}
                WHERE "RichiestaID" = ${id}
                RETURNING "RichiestaID", "Stato", "DataValutazione", "UtenteValutazioneID"
            `;

            console.log(`[PERMESSI] Richiesta ${id} ${stato.toLowerCase()}`);

            return res.json({
                success: true,
                message: `Richiesta ${stato.toLowerCase()} con successo`,
                data: {
                    id: result[0].richiestaid,
                    stato: result[0].stato,
                    dataValutazione: result[0].datavalutazione,
                    utenteValutazioneId: result[0].utentevalutazioneid
                }
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nella valutazione:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    // DELETE - Elimina una richiesta (solo se in attesa)
    router.delete("/:id", async (req, res) => {
        console.log("[PERMESSI] Eliminazione richiesta ID:", req.params.id);
        const { id } = req.params;

        try {
            // Verifica che la richiesta esista e sia in attesa
            const checkRequest = await sql`
                SELECT "RichiestaID", "Stato" FROM "RichiestaPermesso" WHERE "RichiestaID" = ${id}
            `;

            if (checkRequest.length === 0) {
                return res.status(404).json({
                    error: "Richiesta non trovata"
                });
            }

            if (checkRequest[0].stato !== "In attesa") {
                return res.status(400).json({
                    error: "Non è possibile eliminare una richiesta già valutata"
                });
            }

            // Elimina la richiesta
            await sql`
                DELETE FROM "RichiestaPermesso" WHERE "RichiestaID" = ${id}
            `;

            console.log(`[PERMESSI] Richiesta ${id} eliminata`);

            return res.json({
                success: true,
                message: "Richiesta eliminata con successo"
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nell'eliminazione:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    return router;
};

module.exports = permessiController;