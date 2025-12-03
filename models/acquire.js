"use strict";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PreparedSampleSchema = new Schema({
  // Vector de features finales para el modelo de PREDICT
  features: {
    type: [Number],
    required: true
  },

  featureCount: {
    type: Number,
    required: true
  },

  scalerVersion: {
    type: String,
    default: "v1"
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  // Fecha objetivo a la que corresponde la predicción (ej: 2025-11-26T22:00:00.000Z)
  targetDate: {
    type: Date,
    required: true
  },

  // Valores diarios originales usados para construir el vector de features
  dailyValues: {
    type: [Number],
    required: true
  },

  // Metadatos específicos de Kunna
  kunnaMeta: {
    alias: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    // Fechas (string) de los días usados para el histórico
    daysUsed: {
      type: [String],
      required: true
    }
  },

  // Metadatos del fetch desde la fuente externa
  fetchMeta: {
    timeStart: {
      type: Date,
      required: true
    },
    timeEnd: {
      type: Date,
      required: true
    },
    source: {
      type: String,
      default: "acquire"
    }
  }
});

module.exports = mongoose.model("PreparedSample", PreparedSampleSchema);
