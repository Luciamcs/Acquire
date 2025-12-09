// controllers/acquireController.js
const PreparedSample = require("../models/acquire");
const { fetchKunna, ALIAS } = require("../services/kunnaService");

// Hora objetivo para la predicción (la hora que irá en features[3])
const PREDICTION_HOUR = 23;

// GET /health
function health(req, res) {
  res.json({
    status: "ok",
    service: "acquire"
  });
}

// Formatea una fecha como "YYYY-MM-DD"
function formatYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * POST /data
 * 1) Decide targetDate según la hora actual.
 * 2) Calcula timeEnd = targetDate - 1 día, timeStart = timeEnd - 3 días.
 * 3) Llama a Kunna con [timeStart, timeEnd].
 * 4) Construye dailyValues y daysUsed a partir de la respuesta.
 * 5) Construye features = [v0, v1, v2, hora, dia_semana, mes, dia_mes]
 * 6) Guarda en Mongo (PreparedSample) y devuelve el contrato del acquire.
 */
async function createData(req, res) {
  try {
    // -----------------------------
    // 1) targetDate según la hora
    // -----------------------------
    const now = new Date();
    const targetDate = new Date(now);

    // "Definimos si son más de las 23, predecimos mañana, sino predecimos hoy"
    if (now.getHours() >= 23) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // Si queremos fijar la hora del target (por ejemplo 22:00 o 23:00)
    targetDate.setHours(PREDICTION_HOUR, 0, 0, 0);

    // -----------------------------
    // 2) timeEnd y timeStart
    //    time_end = targetDate - 1 día
    //    time_start = time_end - 3 días
    // -----------------------------
    const timeEnd = new Date(targetDate);
    timeEnd.setDate(timeEnd.getDate() - 1);

    const timeStart = new Date(timeEnd);
    timeStart.setDate(timeStart.getDate() - 3);

    // -----------------------------
    // 3) Llamada a Kunna
    // -----------------------------
    const result = await fetchKunna(timeStart, timeEnd); //abre un socket con el http request hasta el http response
    const { columns, values } = result;

    // Buscamos índices de columnas relevantes
    const idxTimeStart = columns.indexOf("time");
    const idxValue = columns.indexOf("value");

    if (idxTimeStart === -1 || idxValue === -1) {
      console.error("[ACQUIRE] Columnas de Kunna:", columns);
      return res.status(500).json({
        error: "KUNNA_COLUMNS_MISSING"
      });
    }

    if (!Array.isArray(values) || values.length < 3) {
      return res.status(500).json({
        error: "Not enough daily values from Kunna (need at least 3)"
      });
    }

    // pedimos order: "DESC" → el más reciente primero.
    // Nos quedamos con los 3 primeros días.
    const latest3 = values.slice(0, 3);

    const dailyValues = latest3.map(row => row[idxValue]);

    const daysUsed = latest3.map(row => {
      const ts = new Date(row[idxTimeStart]);
      return formatYMD(ts);
    });

    if (dailyValues.length !== 3) {
      return res.status(500).json({
        error: "dailyValues must have length 3"
      });
    }

    // -----------------------------
    // 4) Construir features
    // features = [consumo_t, consumo_t-1, consumo_t-2, hora, dia_semana, mes, dia_mes]
    // -----------------------------
    const [v0, v1, v2] = dailyValues;

    const hour = PREDICTION_HOUR;              // 23
    const dayOfWeek = targetDate.getDay();     // 0..6
    const month = targetDate.getMonth() + 1;   // 1..12
    const dayOfMonth = targetDate.getDate();   // 1..31

    const features = [
      v0,
      v1,
      v2,
      hour,
      dayOfWeek,
      month,
      dayOfMonth
    ];

    const featureCount = features.length; // debería ser 7

    if (featureCount !== 7) {
      return res.status(500).json({
        error: "featureCount must be 7"
      });
    }

    // -----------------------------
    // 5) Guardar en Mongo
    // -----------------------------
    const doc = await PreparedSample.create({
      features,
      featureCount,
      scalerVersion: "v1",
      targetDate,
      dailyValues,
      kunnaMeta: {
        alias: ALIAS,
        name: "1d",
        daysUsed
      },
      fetchMeta: {
        timeStart,
        timeEnd,
        source: "acquire"
      }
    });

    // -----------------------------
    // 6) Responder contrato acquire
    // -----------------------------
    return res.status(201).json({
      dataId: doc._id.toString(),
      features: doc.features,
      featureCount: doc.featureCount,
      scalerVersion: doc.scalerVersion,
      createdAt: doc.createdAt.toISOString()
    });

  } catch (err) {
    console.error("[ACQUIRE] Error en POST /data:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}

module.exports = {
  health,
  createData
};
