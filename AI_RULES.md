# AI Configuration & Model Rules

## Preferred LLM Model
- **Preferred Model**: `gemini-3.1-flash`
- **SDK**: `@google/genai`
- **Purpose**: Real-time cross-border trade analysis, Harmonized System (HS) code inference, tariff calculation, and AfCFTA transport route validation.

## Standard Configuration
- **Model Name**: `"gemini-3.1-flash"`
- **Environment Variable**: `GEMINI_API_KEY`
- **Server Endpoints**:
  - `api/gemini/analyze-trade.ts` (Vercel Serverless Function)
  - `server.ts` (Express Node Server)
