// routes/acquireRoutes.js
const express = require("express");
const router = express.Router();

const acquireController = require("../Controllers/acquireController");

// Contrato del servicio ACQUIRE
router.get("/health", acquireController.health);
router.post("/data", acquireController.createData);

module.exports = router;
