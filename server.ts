import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  
  // Prioritize CLI argument --port, then port 3000
  const portArgIndex = process.argv.indexOf("--port");
  const cliPort = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : NaN;
  const PORT = !isNaN(cliPort) && cliPort > 0 ? cliPort : 3000;

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

    // SPA routing fallback in dev mode
    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const indexPath = path.resolve(process.cwd(), "index.html");
        let template = await fs.promises.readFile(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  process.on("SIGTERM", () => {
    server.close(() => {
      process.exit(0);
    });
  });
  process.on("SIGINT", () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

startServer();
