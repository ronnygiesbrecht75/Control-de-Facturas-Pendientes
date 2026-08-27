import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({ apiKey });
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", aiAvailable: !!process.env.GEMINI_API_KEY });
  });

  // AI Voice Payment Parser endpoint
  app.post("/api/ai/parse-voice-payment", async (req, res) => {
    try {
      const { transcript, audioBase64, audioMimeType, invoiceCandidates, systemDate } = req.body;

      if (!transcript && !audioBase64) {
        return res.status(400).json({ error: "Se requiere texto o audio para procesar el pago por voz." });
      }

      const ai = getAI();
      if (!ai) {
        return res.status(503).json({ 
          error: "Clave GEMINI_API_KEY no configurada en el servidor.",
          useClientFallback: true 
        });
      }

      const currentDate = systemDate || new Date().toISOString().split("T")[0];

      // Prepare context about pending invoices for high precision matching
      const candidatesPrompt = Array.isArray(invoiceCandidates) && invoiceCandidates.length > 0
        ? `\nLista de Facturas Pendientes disponibles en el sistema para vincular:\n${JSON.stringify(
            invoiceCandidates.slice(0, 50).map((inv: any) => ({
              id: inv.id,
              clientName: inv.clientName,
              sucursal: inv.sucursal,
              caja: inv.caja,
              numero: inv.numero,
              amount: inv.amount,
              invoiceDate: inv.invoiceDate,
              category: inv.category
            })),
            null,
            2
          )}`
        : "";

      const systemInstruction = `Eres un asistente de inteligencia artificial experto en contabilidad y facturación paraguaya para la empresa "Comercial Walter".
Tu tarea es interpretar la voz o transcripción dictada por un repartidor móvil al cobrar mercaderías y extraer con máxima precisión los datos del pago.

Reglas del negocio paraguayo:
1. Moneda: Guaraníes (PYG). En Paraguay "mil" = 1.000, "cien mil" = 100.000, "un millón" / "un palo" = 1.000.000, "un millón y medio" = 1.500.000, "quinientos mil" = 500.000. Convierte siempre a número entero en guaraníes sin decimales.
2. Factura paraguaya: Sucursal (3 dígitos, por defecto '001'), Caja (3 dígitos, por defecto '009'), Número (hasta 7 dígitos). Si el repartidor dice "factura 6493" o "factura 0006493", el número es '0006493'. Si no especifica sucursal o caja, usa sucursal '001' y caja '009'.
3. Métodos de pago permitidos: 'Efectivo', 'Transferencia', 'Cheque al día', 'Cheque diferido'.
   - Si menciona transferencia y un banco (Itaú, Continental, Sudameris, Familiar, Atlas, GNB, BNF, Ueno, Basa, Bancop), extrae el nombre del banco y el número de comprobante si lo menciona.
   - Si menciona cheque y fecha diferida/adelantada o "al día", clasifica correspondientemente.
4. Vinculación con facturas: Si el nombre del cliente o número coincide con una factura de la lista, extrae su ID exacto y asigna el monto pendiente si el repartidor no especificó un monto diferente.
5. Fecha del pago: Usa la fecha del sistema actual (${currentDate}) a menos que el repartidor mencione otra fecha explícita (ej. "ayer", "el 25 de agosto").
6. Proporciona una explicación breve y clara de lo interpretado.`;

      let contents: any[] = [];

      if (audioBase64) {
        contents.push({
          inlineData: {
            data: audioBase64,
            mimeType: audioMimeType || "audio/webm"
          }
        });
        contents.push({
          text: `Escucha este audio del repartidor móvil y extrae los datos del cobro.${candidatesPrompt}`
        });
      } else {
        contents.push({
          text: `Texto dictado por el repartidor: "${transcript}"\n${candidatesPrompt}`
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sucursal: { type: Type.STRING, description: "Código de sucursal de 3 dígitos (ej: '001')" },
              caja: { type: Type.STRING, description: "Código de caja de 3 dígitos (ej: '009')" },
              numero: { type: Type.STRING, description: "Número de factura de hasta 7 dígitos (ej: '0006493')" },
              clientName: { type: Type.STRING, description: "Nombre del cliente o negocio" },
              matchedInvoiceId: { type: Type.STRING, description: "ID de la factura existente si coincide, o null" },
              amount: { type: Type.NUMBER, description: "Monto cobrado en Guaraníes enteros" },
              paymentMethod: { 
                type: Type.STRING, 
                enum: ["Efectivo", "Transferencia", "Cheque al día", "Cheque diferido"],
                description: "Método de pago utilizado" 
              },
              paymentDate: { type: Type.STRING, description: "Fecha del pago en formato YYYY-MM-DD" },
              bankName: { type: Type.STRING, description: "Nombre del banco si aplica" },
              transferReceipt: { type: Type.STRING, description: "Comprobante de transferencia si aplica" },
              checkNumber: { type: Type.STRING, description: "Número de cheque si aplica" },
              checkIssueDate: { type: Type.STRING, description: "Fecha de emisión del cheque YYYY-MM-DD" },
              checkDepositDate: { type: Type.STRING, description: "Fecha de depósito / cobro del cheque diferido YYYY-MM-DD" },
              confidence: { type: Type.NUMBER, description: "Nivel de confianza de 0 a 1" },
              explanation: { type: Type.STRING, description: "Resumen amigable de lo que se extrajo del dictado" }
            },
            required: ["amount", "paymentMethod", "paymentDate", "explanation"]
          }
        }
      });

      const parsedText = response.text || "{}";
      const result = JSON.parse(parsedText);

      return res.json({
        success: true,
        data: result
      });
    } catch (err: any) {
      console.error("Error in /api/ai/parse-voice-payment:", err);
      return res.status(500).json({
        error: err.message || "Error al procesar el audio con IA.",
        useClientFallback: true
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
