# SwiftClear — WebMCP Agent-Native AfCFTA Cross-Border Trade Assistant

[![Live App](https://img.shields.io/badge/Live%20App-swiftclearapp.vercel.app-blueviolet?style=for-the-badge&logo=vercel)](https://swiftclearapp.vercel.app)
[![WebMCP Standard](https://img.shields.io/badge/WebMCP-Agent--Native-007ACC?style=for-the-badge)](https://webmcp.devpost.com)
[![AI Engine](https://img.shields.io/badge/LLM-Gemini%203.1%20Flash%20Lite-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**SwiftClear** is an agent-native, browser-embedded cross-border trade & customs compliance workspace for African intra-continental trade under the **African Continental Free Trade Area (AfCFTA)** agreement.

Built for **The WebMCP Challenge**, SwiftClear exposes standard WebMCP client tools directly onto `navigator.modelContext` (and `document.modelContext`), enabling AI web agents (e.g. ChatGPT browser agent, Claude, Gemini, in-browser agent bridges) to natively inspect HS tariff codes, calculate preferential AfCFTA duty rates vs. MFN tariffs, match transport corridors, and dynamically populate complex customs declarations.

---

## 🚀 Recent Updates & AI Engine

- **Upgraded AI Engine**: Powered by Google's **`gemini-3.1-flash-lite`** via the `@google/genai` SDK for lightning-fast, structured JSON trade intelligence, commodity classification, HS tariff estimation, and AfCFTA transport corridor matching.
- **Robust Fallback Operations**: Includes comprehensive fallback data models ensuring 100% operational uptime and zero UI breakdown even during network timeouts or missing credentials.
- **Dynamic Corridor & Form Auto-Sync**: Seamless tool form synchronization (`populate_customs_manifest`) automatically matches origin/destination countries to official AfCFTA trade corridors (e.g., Abidjan-Lagos, Northern Corridor), calculates transit distances/durations, assigns cargo classifications, and updates full UI state.
- **Clean Default & Reset State**: Resets to clean unpopulated form inputs upon page reload or clicking **Reset Form**, giving agents and users a predictable state.

---

## 🌟 Core WebMCP Tools Registered (`navigator.modelContext`)

SwiftClear registers 3 core WebMCP client-side tools available to browser agents:

1. **`lookup_hs_code`**:
   - **Description**: Searches Harmonized System (HS) 6-digit tariff codes, official descriptions, and AfCFTA preferential tariff eligibility.
   - **Powered By**: Google **`gemini-3.1-flash-lite`** (`api/gemini/analyze-trade.ts` & `server.ts`).
   - **Schema**: `{ commodity: string, origin?: string, destination?: string }`

2. **`calculate_duties`**:
   - **Description**: Computes exact import tariffs, MFN base duty rates, AfCFTA preferential rates, VAT, port handling fees, security clearance fees, and net AfCFTA cost savings.
   - **Schema**: `{ hsCode: string, declaredValueUsd: number, quantity: number, origin: string, destination: string, useAfCFTA: boolean }`

3. **`populate_customs_manifest`**:
   - **Description**: Surgically updates reactive form state and DOM UI components directly on the live page. Automatically handles custom commodities, route matching, cargo class selection, and tariff re-calculation.
   - **Schema**: `{ origin: string, destination: string, commodity: string, hsCode: string, quantity: number, declaredValueUsd: number, useAfCFTA: boolean }`

---

## 🛠️ Tech Stack & Architecture

- **AI Model**: Google Gemini 3.1 Flash Lite (`gemini-3.1-flash-lite`) using `@google/genai` SDK with `responseMimeType: "application/json"`.
- **WebMCP Standard**: `navigator.modelContext` client-side tool registration with full browser polyfill (`src/utils/webmcpPolyfill.ts`) and built-in Agent Activity Stream log panel.
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Framer Motion.
- **Backend API**: Serverless API handler (`api/gemini/analyze-trade.ts`) & Express server (`server.ts`).
- **Live Deployment**: Hosted on Vercel at [https://swiftclearapp.vercel.app](https://swiftclearapp.vercel.app).

---

## 💻 Run Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/thecoachakpan/swiftclear.git
   cd swiftclear
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser. Enable WebMCP testing in Chrome via `chrome://flags/#enable-webmcp-testing` or inspect tool calls in the embedded WebMCP Activity Stream panel.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
