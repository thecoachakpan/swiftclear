# Project AI & Agent Rules

## Preferred LLM Model
- **Primary Model**: `gemini-3.1-flash`
- **Provider**: Google Gemini AI (`@google/genai` SDK)
- **Use Case**: Intelligent trade analysis, HS code estimation, tariff rate calculations, and AfCFTA cross-border transport corridor matching.

## Guidelines
1. All LLM calls in serverless functions (`api/gemini/analyze-trade.ts`) and express backend servers (`server.ts`) must specify `gemini-3.1-flash` as the default model.
2. Ensure structured JSON output schema is enforced via `responseMimeType: "application/json"` and `responseSchema`.
3. Provide robust fallback trade analysis so the application remains 100% operational even during network or credentials unavailability.
