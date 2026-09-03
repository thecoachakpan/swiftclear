# SwiftClear — WebMCP Agent-Native AfCFTA Cross-Border Trade Assistant

**SwiftClear** is an agent-native, browser-embedded cross-border trade & customs compliance workspace for African intra-continental trade under the **African Continental Free Trade Area (AfCFTA)** agreement. 

Built for **The WebMCP Challenge**, SwiftClear exposes standard WebMCP tools directly onto `navigator.modelContext` (and `document.modelContext`), enabling AI web agents (e.g. ChatGPT browser agent, Claude, Gemini, in-browser agent bridges) to natively inspect HS tariff codes, calculate preferential AfCFTA duty rates vs. MFN tariffs, and dynamically populate complex customs declarations.

---

## 🌟 Key WebMCP Tools Registered (`navigator.modelContext`)

SwiftClear registers 3 core WebMCP client-side tools:

1. **`lookup_hs_code`**:
   - **Description**: Searches Harmonized System (HS) tariff codes, official descriptions, and AfCFTA preferential eligibility. Powered by Google **Gemini 3.1 Flash** (`api/gemini/analyze-trade.ts`) for intelligent commodity classification and fallback matching.
   - **Schema**: `{ commodity: string, origin?: string, destination?: string }`

2. **`calculate_duties`**:
   - **Description**: Computes exact import tariffs, MFN base duties, AfCFTA preferential rates, VAT, port handling fees, security clearance fees, and net AfCFTA cost savings.
   - **Schema**: `{ hsCode: string, declaredValueUsd: number, quantity: number, origin: string, destination: string, useAfCFTA: boolean }`

3. **`populate_customs_manifest`**:
   - **Description**: Surgically updates reactive form state and DOM UI components directly on the live page.
   - **Schema**: Dynamic consignment fields (`origin`, `destination`, `commodity`, `hsCode`, `quantity`, `declaredValueUsd`, `useAfCFTA`, etc.)

---

## 🚀 WebMCP Architecture & Stack

- **AI Engine**: Google Gemini API (`@google/genai` using `gemini-3.1-flash`) with structured JSON schema responses.
- **WebMCP Standard**: `navigator.modelContext` client-side tool registration with full browser polyfill (`src/utils/webmcpPolyfill.ts`) and live agent event stream logger.
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Framer Motion.
- **Backend API**: Express server (`server.ts`) & Serverless Function Handler (`api/gemini/analyze-trade.ts`) designed for Vercel deployment.

---

## 🛠️ Run Locally

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
   Open `http://localhost:3000` in your browser. Enable WebMCP testing in Chrome via `chrome://flags/#enable-webmcp-testing` or use the embedded WebMCP Inspector panel inside SwiftClear.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
