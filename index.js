//=====================================================
// File: index.js
// Script che gestisce la logica del backend
//@author: andrea.villari@allievi.itsdigitalacademy.com
//@version "1.0.0 2026-01-14"
//=====================================================

const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
