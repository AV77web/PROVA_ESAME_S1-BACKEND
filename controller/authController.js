//=================================================
// File: authController.js
// Script che gestisce la verifica dell'autenticazione e il logout
// @author: Full Stack Senior Developer
// @version: 1.0.0 2026-01-14
// =================================================

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const authController = (sql) => {
    // sql è opzionale, non viene usato in questo controller
    // ma lo accettiamo per consistenza con gli altri controller

    // Verifica lo stato di autenticazione (protetto dal middleware)
    // GET /me - Restituisce i dati dell'utente autenticato
    router.get("/me", authMiddleware, (req, res) => {
        console.log("[AUTH] Verifica autenticazione richiesta");

        // req.user è stato popolato dal middleware authMiddleware
        // che ha decodificato il JWT dal cookie HttpOnly
        return res.json({
            authenticated: true,
            user: {
                id: req.user.id,
                nome: req.user.nome,
                cognome: req.user.cognome,
                email: req.user.email,
                ruolo: req.user.ruolo
            }
        });
    });

    // Logout - Cancella il cookie di autenticazione
    // POST /logout
    router.post("/logout", (req, res) => {
        console.log("[AUTH] Logout richiesto");

        // Cancella il cookie impostandolo con maxAge 0
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
        });

        console.log("[AUTH] Cookie rimosso con successo");

        return res.json({
            message: "Logout effettuato con successo"
        });
    });

    return router;
};

module.exports = authController;
