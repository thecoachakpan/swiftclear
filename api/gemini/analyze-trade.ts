import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

// Standard active African trade corridors for matching
const TRADE_CORRIDORS = [
  { id: 'kano_cotonou', origin: 'Nigeria (Kano)', destination: 'Benin (Cotonou)', desc: 'Nigeria to Benin' },
  { id: 'accra_abidjan', origin: 'Ghana (Accra)', destination: 'Côte d\'Ivoire (Abidjan)', desc: 'Ghana to Côte d\'Ivoire' },
  { id: 'kigali_mombasa', origin: 'Rwanda (Kigali)', destination: 'Kenya (Mombasa Port)', desc: 'Rwanda to Kenya via EAC' },
  { id: 'kampala_daressalaam', origin: 'Uganda (Kampala)', destination: 'Tanzania (Dar es Salaam)', desc: 'Uganda to Tanzania via Central Corridor' },
  { id: 'johannesburg_harare', origin: 'South Africa (Johannesburg)', destination: 'Zimbabwe (Harare)', desc: 'South Africa to Zimbabwe' }
];

function fallbackTradeAnalysis(query: string) {
  const lower = query.toLowerCase();

  let commodity = 'Dried Hibiscus Flowers (Zobo)';
  let hsCode = '1211.90.00';
  let baseDutyRate = 20;
  let afcftaDutyRate = 0;
  let vatRate = 7.5;
  let unit = 'bag (25kg)';
  let averageWeightPerPackageKg = 25;

  if (lower.includes('shea') || lower.includes('butter')) {
    commodity = 'Unrefined Shea Butter';
    hsCode = '1515.90.80';
    baseDutyRate = 15;
    afcftaDutyRate = 0;
    vatRate = 18.0;
    unit = 'tub (50kg)';
    averageWeightPerPackageKg = 50;
  } else if (lower.includes('cashew') || lower.includes('nut')) {
    commodity = 'Raw Cashew Nuts (In Shell)';
    hsCode = '0801.31.00';
    baseDutyRate = 10;
    afcftaDutyRate = 0;
    vatRate = 16.0;
    unit = 'bag (80kg)';
    averageWeightPerPackageKg = 80;
  } else if (lower.includes('cocoa')) {
    commodity = 'Whole Cocoa Beans';
    hsCode = '1801.00.00';
    baseDutyRate = 30;
    afcftaDutyRate = 5;
    vatRate = 7.5;
    unit = 'bag (64kg)';
    averageWeightPerPackageKg = 64;
  } else if (lower.includes('coffee')) {
    commodity = 'Green Coffee Beans (Arabica)';
    hsCode = '0901.11.00';
    baseDutyRate = 25;
    afcftaDutyRate = 0;
    vatRate = 18.0;
    unit = 'bag (60kg)';
    averageWeightPerPackageKg = 60;
  }

  const qtyMatch = query.match(/(\d+)\s*(bags?|tubs?|boxes?|units?|kgs?|tons?|packages?)?/i);
  const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 100;

  const valMatch = query.match(/(\$?(\d+[\d,]*)\s*(usd|dollars?)?)/i);
  const declaredValueUsd = valMatch && valMatch[2] ? parseInt(valMatch[2].replace(/,/g, ''), 10) : 5000;

  const useAfCFTA = !lower.includes('mfn') && !lower.includes('standard');

  let origin = 'Ghana (Accra)';
  let destination = 'Côte d\'Ivoire (Abidjan)';

  if (lower.includes('lagos') || lower.includes('kano') || lower.includes('nigeria')) {
    origin = 'Nigeria (Kano)';
  } else if (lower.includes('kigali') || lower.includes('rwanda')) {
    origin = 'Rwanda (Kigali)';
  } else if (lower.includes('kampala') || lower.includes('uganda')) {
    origin = 'Uganda (Kampala)';
  } else if (lower.includes('johannesburg') || lower.includes('south africa')) {
    origin = 'South Africa (Johannesburg)';
  }

  if (lower.includes('cotonou') || lower.includes('benin')) {
    destination = 'Benin (Cotonou)';
  } else if (lower.includes('mombasa') || lower.includes('kenya')) {
    destination = 'Kenya (Mombasa Port)';
  } else if (lower.includes('dar') || lower.includes('tanzania')) {
    destination = 'Tanzania (Dar es Salaam)';
  } else if (lower.includes('harare') || lower.includes('zimbabwe')) {
    destination = 'Zimbabwe (Harare)';
  }

  const matchedCorridor = TRADE_CORRIDORS.find(c => 
    (c.origin.toLowerCase().includes(origin.toLowerCase()) || origin.toLowerCase().includes(c.origin.toLowerCase())) &&
    (c.destination.toLowerCase().includes(destination.toLowerCase()) || destination.toLowerCase().includes(c.destination.toLowerCase()))
  );

  let routeStatus: any;
  if (matchedCorridor) {
    routeStatus = {
      exists: true,
      recommendedCorridorId: matchedCorridor.id,
      recommendationReason: `Direct active corridor ${matchedCorridor.origin} -> ${matchedCorridor.destination}`
    };
  } else {
    const recCorridor = TRADE_CORRIDORS.find(c => c.origin.toLowerCase().includes(origin.split(' ')[0].toLowerCase())) || TRADE_CORRIDORS[0];
    routeStatus = {
      exists: false,
      recommendedCorridorId: recCorridor.id,
      recommendationReason: `Direct customs routing is not currently activated between ${origin} and ${destination}. Proposing ${recCorridor.origin} -> ${recCorridor.destination} as active hub.`
    };
  }

  return {
    extracted: {
      origin,
      destination,
      commodity,
      hsCode,
      baseDutyRate,
      afcftaDutyRate,
      vatRate,
      unit,
      averageWeightPerPackageKg,
      quantity,
      declaredValueUsd,
      useAfCFTA
    },
    routeStatus
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body || {};
  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found in environment, returning 200 OK with server-side trade analysis.");
      return res.status(200).json(fallbackTradeAnalysis(query));
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

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
      model: "gemini-2.0-flash",
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
    return res.status(200).json(parsed);

  } catch (error: any) {
    console.error("Gemini Analyze Error (falling back to 200 OK trade response):", error);
    return res.status(200).json(fallbackTradeAnalysis(query));
  }
}
