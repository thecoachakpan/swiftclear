import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Standard active African trade corridors for matching
const TRADE_CORRIDORS = [
  { id: 'kano_cotonou', origin: 'Nigeria (Kano)', destination: 'Benin (Cotonou)', desc: 'Nigeria to Benin' },
  { id: 'accra_abidjan', origin: 'Ghana (Accra)', destination: 'Côte d\'Ivoire (Abidjan)', desc: 'Ghana to Côte d\'Ivoire' },
  { id: 'kigali_mombasa', origin: 'Rwanda (Kigali)', destination: 'Kenya (Mombasa Port)', desc: 'Rwanda to Kenya via EAC' },
  { id: 'kampala_daressalaam', origin: 'Uganda (Kampala)', destination: 'Tanzania (Dar es Salaam)', desc: 'Uganda to Tanzania via Central Corridor' },
  { id: 'johannesburg_harare', origin: 'South Africa (Johannesburg)', destination: 'Zimbabwe (Harare)', desc: 'South Africa to Zimbabwe' }
];

// 1. Intelligent Trade & Route Analysis API
app.post("/api/gemini/analyze-trade", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const systemInstruction = `You are a professional customs compliance officer and cross-border trade route planning assistant for the AfCFTA (African Continental Free Trade Area).
Analyze the user's natural language shipping inquiry, extract all consignment details, and validate the transport route against active trade corridors.

Our 5 active, established transport corridors are:
1. "kano_cotonou" (Nigeria (Kano) to Benin (Cotonou)) - ECOWAS Region (West Africa)
2. "accra_abidjan" (Ghana (Accra) to Côte d'Ivoire (Abidjan)) - ECOWAS Region (West Africa)
3. "kigali_mombasa" (Rwanda (Kigali) to Kenya (Mombasa Port)) - EAC Region (East Africa)
4. "kampala_daressalaam" (Uganda (Kampala) to Tanzania (Dar es Salaam)) - EAC Region (East Africa)
5. "johannesburg_harare" (South Africa (Johannesburg) to Zimbabwe (Harare)) - SADC Region (Southern Africa)

Determine if the requested route exists directly among our 5 active corridors.
If the route does NOT exist directly (e.g. Lagos to Kampala, or Lagos to Abidjan), set routeStatus.exists = false.
CRITICAL: When selecting the alternative recommended corridor, you MUST select the active corridor that starts at or is geographically/regionally closest to the merchant's requested export origin (e.g., if they are exporting from Lagos, Nigeria, recommend the 'kano_cotonou' corridor because it also starts in Nigeria, allowing them to route out of their home region, rather than recommending an East or Southern African corridor).
Provide a helpful, professional recommendation proposing this closest originating corridor as the initial transit leg for their shipment, detailing the transit distance and border port name.

If the route matches one of our 5 active corridors (even with slight variance in city naming), set routeStatus.exists = true and recommendedCorridorId to that corridor ID.

For commodity and tariffs:
Estimate the standard 8-digit Harmonized System (HS) Code if not provided.
Also estimate standard duty rates (MFN), preferential duty rates (AfCFTA), and VAT rates typical for the commodity and regional blocks (ECOWAS, EAC, SADC). Values should be numerical percentages (e.g. 20 for 20%, 7.5 for 7.5%).
Standard package unit must be provided (e.g. "bag (60kg)", "box (10kg)").
Set default quantity to 100 and default value to 5000 if not specified.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash",
      contents: `Query: "${query}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["extracted", "routeStatus"],
          properties: {
            extracted: {
              type: Type.OBJECT,
              required: ["origin", "destination", "commodity", "hsCode", "baseDutyRate", "afcftaDutyRate", "vatRate", "unit", "averageWeightPerPackageKg", "quantity", "declaredValueUsd", "useAfCFTA"],
              properties: {
                origin: { type: Type.STRING, description: "City and Country of export, e.g. Lagos, Nigeria" },
                destination: { type: Type.STRING, description: "City and Country of import, e.g. Kampala, Uganda" },
                commodity: { type: Type.STRING, description: "Proper commodity name, e.g. Raw Cashew Nuts" },
                hsCode: { type: Type.STRING, description: "8-digit HS Code, e.g. 1801.00.00" },
                baseDutyRate: { type: Type.NUMBER, description: "Standard MFN duty percentage (e.g. 30)" },
                afcftaDutyRate: { type: Type.NUMBER, description: "AfCFTA preferential duty percentage (e.g. 5)" },
                vatRate: { type: Type.NUMBER, description: "VAT percentage (e.g. 7.5)" },
                unit: { type: Type.STRING, description: "Single package descriptor, e.g. bag (60kg)" },
                averageWeightPerPackageKg: { type: Type.NUMBER, description: "Weight of a single unit package in kg (e.g. 60)" },
                quantity: { type: Type.NUMBER, description: "Shipped unit count (default 100 if unspecified)" },
                declaredValueUsd: { type: Type.NUMBER, description: "Declared FOB customs value in USD (default 5000 if unspecified)" },
                useAfCFTA: { type: Type.BOOLEAN, description: "Whether the query requests or implies AfCFTA rules" }
              }
            },
            routeStatus: {
              type: Type.OBJECT,
              required: ["exists", "recommendedCorridorId", "recommendationReason"],
              properties: {
                exists: { type: Type.BOOLEAN, description: "Whether the route matches one of our 5 active trade corridors" },
                recommendedCorridorId: { type: Type.STRING, description: "ID of the recommended corridor: 'kano_cotonou', 'accra_abidjan', 'kigali_mombasa', 'kampala_daressalaam', 'johannesburg_harare'" },
                recommendationReason: { type: Type.STRING, description: "Detailed, helpful advice explaining that the requested corridor is not active/available, and proposing the recommended alternative with transit details." }
              }
            }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsed = JSON.parse(resultText);
    res.json(parsed);

  } catch (error: any) {
    console.error("Gemini Analyze Error:", error);
    res.status(500).json({ error: error?.message || "Failed to analyze trade request via Gemini" });
  }
});

// Vite Middleware & SPA Fallback setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
