import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy endpoint for Paraguay RUC consultation (SET / DNIT via turuc)
  app.get("/api/ruc/:ruc", async (req, res) => {
    try {
      const rawRuc = (req.params.ruc || "").trim();
      const cleanRuc = rawRuc.replace(/[^\d-]/g, "");
      if (!cleanRuc) {
        return res.status(400).json({ success: false, message: "Debe proveer un RUC o C.I." });
      }

      const targetUrl = `https://turuc.com.py/api/contribuyente/${encodeURIComponent(cleanRuc)}`;
      const response = await fetch(targetUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "ControlDePagos/1.7.0"
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: `Servicio no disponible (${response.status})`
        });
      }

      const json = await response.json();
      if (json.data && json.data.razonSocial) {
        return res.json({
          success: true,
          ruc: json.data.ruc,
          doc: json.data.doc,
          dv: json.data.dv,
          razonSocial: json.data.razonSocial,
          estado: json.data.estado,
          esPersonaJuridica: json.data.esPersonaJuridica
        });
      } else {
        return res.json({
          success: false,
          message: json.message || "RUC no encontrado en la base tributaria"
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err?.message || "Error al consultar el RUC"
      });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

