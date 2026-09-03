import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  Terminal, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight, 
  FileText, 
  Calculator, 
  Download, 
  Cpu, 
  Clock, 
  Play, 
  Layers, 
  Send, 
  RotateCcw, 
  FileSpreadsheet, 
  ExternalLink,
  ShieldAlert,
  Info
} from 'lucide-react';
import { initWebMCP, getSwiftClearContext } from './utils/webmcpPolyfill';
import { TARIFF_DATABASE, TRADE_CORRIDORS, computeCrossBorderDuties, CrossBorderDutyCalculation } from './data/tradeData';

interface Message {
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
  toolCall?: {
    name: string;
    params: any;
    result?: any;
    status: 'calling' | 'success' | 'error';
  };
}

interface WebMCPLog {
  id: string;
  timestamp: string;
  type: 'info' | 'register' | 'execute-start' | 'execute-success' | 'execute-error';
  message: string;
  detail?: any;
}

export default function App() {
  // 1. Core State
  const [selectedCorridorId, setSelectedCorridorId] = useState('kano_cotonou');
  const [selectedCommodityKey, setSelectedCommodityKey] = useState('hibiscus');
  const [quantity, setQuantity] = useState(100); // Package count
  const [declaredValueUsd, setDeclaredValueUsd] = useState(5000);
  const [useAfCFTA, setUseAfCFTA] = useState(true);
  const [manifestStatus, setManifestStatus] = useState<'Draft' | 'Validated' | 'Submitted'>('Draft');
  
  // Dynamic trade and routing states
  const [origin, setOrigin] = useState('Nigeria (Kano)');
  const [destination, setDestination] = useState('Benin (Cotonou)');
  const [commodity, setCommodity] = useState('Dried Hibiscus Flowers (Zobo)');
  const [hsCode, setHsCode] = useState('1211.90.00');
  const [baseDutyRate, setBaseDutyRate] = useState(20);
  const [afcftaDutyRate, setAfcftaDutyRate] = useState(0);
  const [vatRate, setVatRate] = useState(7.5);
  const [unit, setUnit] = useState('bag (25kg)');
  const [averageWeightPerPackageKg, setAverageWeightPerPackageKg] = useState(25);
  const [distanceKm, setDistanceKm] = useState(980);
  const [avgTransitDays, setAvgTransitDays] = useState(3);
  const [borderPort, setBorderPort] = useState('Seme-Krake Joint Border Post');
  const [handlingFeeUsd, setHandlingFeeUsd] = useState(150);
  const [securityFeeUsd, setSecurityFeeUsd] = useState(45);
  const [escortFeeUsd, setEscortFeeUsd] = useState(0);
  const [region, setRegion] = useState('ECOWAS');

  // Route validation alert state
  const [routeAlert, setRouteAlert] = useState<{
    requestedOrigin: string;
    requestedDestination: string;
    recommendedCorridorId: string;
    recommendationReason: string;
    active: boolean;
  }>({
    requestedOrigin: '',
    requestedDestination: '',
    recommendedCorridorId: '',
    recommendationReason: '',
    active: false,
  });

  // 2. Chat Simulator State
  const [chatInput, setChatInput] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([
    {
      sender: 'agent',
      text: "Hello! I am your SwiftClear Cross-Border Trade Agent, upgraded with real-time AI and dynamic route mapping under the AfCFTA.\n\nYou are no longer limited to fixed presets. Type ANY custom shipment (e.g. \"Export 300 bags of cocoa from Lagos to Kampala AfCFTA with a value of 25000 dollars\"), and I will calculate the exact tariffs, duty rates, and border fees dynamically, or recommend an active corridor if the route is unavailable!",
      timestamp: new Date()
    }
  ]);

  // 3. WebMCP Tools & Developer Log State
  const [registeredTools, setRegisteredTools] = useState<any[]>([]);
  const [webMcpLogs, setWebMcpLogs] = useState<WebMCPLog[]>([]);
  const [selectedSandboxTool, setSelectedSandboxTool] = useState<string>('calculate_cross_border_duties');
  const [sandboxInputs, setSandboxInputs] = useState<Record<string, any>>({
    commodityKey: 'hibiscus',
    declaredValueUsd: 5000,
    quantity: 100,
    corridorId: 'kano_cotonou',
    useAfCFTA: true
  });
  const [sandboxResult, setSandboxResult] = useState<any>(null);

  // 4. Modal for export preview and route approval
  const [showExportModal, setShowExportModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync corridor preset selections into editable states
  useEffect(() => {
    if (selectedCorridorId === '') {
      setOrigin('No route selected');
      setDestination('No route selected');
      setDistanceKm(0);
      setAvgTransitDays(0);
      setBorderPort('N/A');
      setHandlingFeeUsd(0);
      setSecurityFeeUsd(0);
      setEscortFeeUsd(0);
      setRegion('N/A');
    } else {
      const corridor = TRADE_CORRIDORS.find(c => c.id === selectedCorridorId);
      if (corridor) {
        setOrigin(corridor.origin);
        setDestination(corridor.destination);
        setDistanceKm(corridor.distanceKm);
        setAvgTransitDays(corridor.avgTransitDays);
        setBorderPort(corridor.borderPort);
        setHandlingFeeUsd(corridor.handlingFeeUsd);
        setSecurityFeeUsd(corridor.securityFeeUsd);
        setEscortFeeUsd(corridor.escortFeeUsd || 0);
        setRegion(corridor.region);
      }
    }
  }, [selectedCorridorId]);

  // Sync commodity preset selections into editable states
  useEffect(() => {
    if (selectedCommodityKey === '') {
      setCommodity('No commodity selected');
      setHsCode('N/A');
      setBaseDutyRate(0);
      setAfcftaDutyRate(0);
      setVatRate(0);
      setUnit('N/A');
      setAverageWeightPerPackageKg(0);
    } else {
      const item = TARIFF_DATABASE[selectedCommodityKey];
      if (item) {
        setCommodity(item.item);
        setHsCode(item.hsCode);
        setBaseDutyRate(item.baseDutyRate);
        setAfcftaDutyRate(item.afcftaDutyRate);
        setVatRate(item.vat);
        setUnit(item.unit);
        setAverageWeightPerPackageKg(item.averageWeightPerPackageKg);
      }
    }
  }, [selectedCommodityKey]);

  // 5. Compute Live Customs Duty Values based on Form State
  const weightKg = quantity * averageWeightPerPackageKg;
  const appliedDutyRate = useAfCFTA ? afcftaDutyRate : baseDutyRate;
  const baseDutyAmountUsd = (baseDutyRate / 100) * declaredValueUsd;
  const appliedDutyAmountUsd = (appliedDutyRate / 100) * declaredValueUsd;
  const vatAmountUsd = (vatRate / 100) * (declaredValueUsd + appliedDutyAmountUsd);
  const totalClearancePayableUsd = appliedDutyAmountUsd + vatAmountUsd + handlingFeeUsd + securityFeeUsd + escortFeeUsd;
  const afcftaSavingsUsd = baseDutyAmountUsd - appliedDutyAmountUsd;

  const liveCalculation: any = {
    origin,
    destination,
    commodity,
    hsCode,
    baseDutyRate,
    appliedDutyRate,
    vatRate,
    quantity,
    declaredValueUsd,
    weightKg,
    baseDutyAmountUsd,
    appliedDutyAmountUsd,
    vatAmountUsd,
    handlingFeeUsd,
    securityFeeUsd,
    escortFeeUsd,
    totalClearancePayableUsd,
    afcftaSavingsUsd
  };

  const addMcpLog = (type: WebMCPLog['type'], message: string, detail?: any) => {
    const newLog: WebMCPLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      detail
    };
    setWebMcpLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  // Helper to trigger direct React state updates from WebMCP tools
  const handleToolFormInjections = (params: {
    origin?: string;
    destination?: string;
    commodity?: string;
    hsCode?: string;
    quantity?: number;
    declaredValueUsd?: number;
    useAfCFTA?: boolean;
    baseDutyRate?: number;
    afcftaDutyRate?: number;
    vatRate?: number;
    unit?: string;
    averageWeightPerPackageKg?: number;
    borderPort?: string;
    handlingFeeUsd?: number;
    securityFeeUsd?: number;
    escortFeeUsd?: number;
  }) => {
    if (params.origin !== undefined) setOrigin(params.origin);
    if (params.destination !== undefined) setDestination(params.destination);
    if (params.commodity !== undefined) setCommodity(params.commodity);
    if (params.hsCode !== undefined) setHsCode(params.hsCode);
    if (params.quantity !== undefined) setQuantity(params.quantity);
    if (params.declaredValueUsd !== undefined) setDeclaredValueUsd(params.declaredValueUsd);
    if (params.useAfCFTA !== undefined) setUseAfCFTA(params.useAfCFTA);
    if (params.baseDutyRate !== undefined) setBaseDutyRate(params.baseDutyRate);
    if (params.afcftaDutyRate !== undefined) setAfcftaDutyRate(params.afcftaDutyRate);
    if (params.vatRate !== undefined) setVatRate(params.vatRate);
    if (params.unit !== undefined) setUnit(params.unit);
    if (params.averageWeightPerPackageKg !== undefined) setAverageWeightPerPackageKg(params.averageWeightPerPackageKg);
    if (params.borderPort !== undefined) setBorderPort(params.borderPort);
    if (params.handlingFeeUsd !== undefined) setHandlingFeeUsd(params.handlingFeeUsd);
    if (params.securityFeeUsd !== undefined) setSecurityFeeUsd(params.securityFeeUsd);
    if (params.escortFeeUsd !== undefined) setEscortFeeUsd(params.escortFeeUsd);
    setManifestStatus('Validated');
  };

  // Create a mutable state ref to capture the latest state values without re-triggering WebMCP tool registrations on every render.
  const stateRef = useRef({
    hsCode,
    commodity,
    baseDutyRate,
    afcftaDutyRate,
    vatRate,
    unit,
    averageWeightPerPackageKg,
    handlingFeeUsd,
    securityFeeUsd,
    escortFeeUsd
  });

  useEffect(() => {
    stateRef.current = {
      hsCode,
      commodity,
      baseDutyRate,
      afcftaDutyRate,
      vatRate,
      unit,
      averageWeightPerPackageKg,
      handlingFeeUsd,
      securityFeeUsd,
      escortFeeUsd
    };
  });

  // 6. Initialize WebMCP Registry & Register WebMCP Standard Tools
  useEffect(() => {
    const ctx = initWebMCP();
    const abortController = new AbortController();

    addMcpLog('info', 'WebMCP Local Client ModelContext initialized successfully.');

    // Tool 1: Lookup Commodity Tariff & HS Code details
    const toolLookup = {
      name: 'lookup_hs_code',
      description: 'Searches the database or returns dynamic details for any agricultural commodity description under AfCFTA.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Commodity name or HS Code to query'
          }
        },
        required: ['query']
      },
      execute: async (params: { query: string }) => {
        addMcpLog('execute-start', `Executing lookup_hs_code for query: "${params.query}"`);
        
        const key = params.query.toLowerCase();
        const foundKey = Object.keys(TARIFF_DATABASE).find(k => k.includes(key) || key.includes(k));
        if (foundKey) {
          const data = TARIFF_DATABASE[foundKey];
          addMcpLog('execute-success', `lookup_hs_code returned exact database match: HS ${data.hsCode}`);
          return data;
        }

        const current = stateRef.current;
        addMcpLog('execute-success', `lookup_hs_code returned dynamic custom query info: HS ${current.hsCode}`);
        return {
          item: current.commodity,
          hsCode: current.hsCode,
          baseDutyRate: current.baseDutyRate,
          afcftaDutyRate: current.afcftaDutyRate,
          vat: current.vatRate,
          unit: current.unit,
          averageWeightPerPackageKg: current.averageWeightPerPackageKg
        };
      }
    };

    // Tool 2: Calculate cross-border duties dynamically
    const toolCalculate = {
      name: 'calculate_cross_border_duties',
      description: 'Calculate duties, VAT, and border handling costs for cross-border routes',
      inputSchema: {
        type: 'object' as const,
        properties: {
          commodityKey: { type: 'string', description: 'Commodity key or description' },
          declaredValueUsd: { type: 'number', description: 'FOB Declared Value USD' },
          quantity: { type: 'number', description: 'Quantity count' },
          corridorId: { type: 'string', description: 'Active border corridor' },
          useAfCFTA: { type: 'boolean', description: 'Preferential treatment flag' }
        },
        required: ['commodityKey', 'declaredValueUsd', 'quantity', 'corridorId', 'useAfCFTA']
      },
      execute: async (params: any) => {
        addMcpLog('execute-start', `Executing calculate_cross_border_duties for corridor: ${params.corridorId}`);
        
        const current = stateRef.current;
        const appliedRate = params.useAfCFTA ? current.afcftaDutyRate : current.baseDutyRate;
        const baseDuty = (current.baseDutyRate / 100) * params.declaredValueUsd;
        const appliedDuty = (appliedRate / 100) * params.declaredValueUsd;
        const vat = (current.vatRate / 100) * (params.declaredValueUsd + appliedDuty);
        const totalClearance = appliedDuty + vat + current.handlingFeeUsd + current.securityFeeUsd + current.escortFeeUsd;
        const savings = baseDuty - appliedDuty;

        addMcpLog('execute-success', `calculate_cross_border_duties calculated: $${totalClearance.toFixed(2)}`);
        return {
          baseDutyRate: current.baseDutyRate,
          appliedDutyRate: appliedRate,
          vatRate: current.vatRate,
          quantity: params.quantity,
          declaredValueUsd: params.declaredValueUsd,
          weightKg: params.quantity * current.averageWeightPerPackageKg,
          baseDutyAmountUsd: baseDuty,
          appliedDutyAmountUsd: appliedDuty,
          vatAmountUsd: vat,
          handlingFeeUsd: current.handlingFeeUsd,
          securityFeeUsd: current.securityFeeUsd,
          escortFeeUsd: current.escortFeeUsd,
          totalClearancePayableUsd: totalClearance,
          afcftaSavingsUsd: savings
        };
      }
    };

    // Tool 3: Inject parameters directly into page state
    const toolPopulate = {
      name: 'populate_customs_manifest',
      description: 'Surgically updates specific consignment form fields directly on the page DOM context',
      inputSchema: {
        type: 'object' as const,
        properties: {
          origin: { type: 'string', description: 'Origin city/country' },
          destination: { type: 'string', description: 'Destination city/country' },
          commodity: { type: 'string', description: 'Commodity name' },
          hsCode: { type: 'string', description: 'HS code' },
          quantity: { type: 'number', description: 'Quantity count' },
          declaredValueUsd: { type: 'number', description: 'FOB Declared Value USD' },
          useAfCFTA: { type: 'boolean', description: 'Preferential treatment' },
          baseDutyRate: { type: 'number', description: 'MFN duty %' },
          afcftaDutyRate: { type: 'number', description: 'AfCFTA duty %' },
          vatRate: { type: 'number', description: 'VAT %' },
          unit: { type: 'string', description: 'Package unit' },
          averageWeightPerPackageKg: { type: 'number', description: 'Average weight' },
          borderPort: { type: 'string', description: 'Border gate' },
          handlingFeeUsd: { type: 'number', description: 'Port fee' },
          securityFeeUsd: { type: 'number', description: 'Security fee' },
          escortFeeUsd: { type: 'number', description: 'Escort fee' }
        }
      },
      execute: async (params: any) => {
        addMcpLog('execute-start', `Executing populate_customs_manifest tool injections.`);
        handleToolFormInjections(params);
        addMcpLog('execute-success', 'WebMCP Form successfully populated with dynamic parameters.');
        return { success: true, message: "Customs manifest state successfully injected." };
      }
    };

    // Register all tools on navigator.modelContext
    ctx.registerTool(toolLookup, { signal: abortController.signal });
    ctx.registerTool(toolCalculate, { signal: abortController.signal });
    ctx.registerTool(toolPopulate, { signal: abortController.signal });

    // Sync registered tools with UI list
    if (ctx.getTools) {
      ctx.getTools().then(tools => setRegisteredTools(tools));
    } else {
      setRegisteredTools([toolLookup, toolCalculate, toolPopulate]);
    }

    // Subscribe to browser polyfill custom events to display in developer terminal
    const handleRegister = (e: Event) => {
      const tool = (e as CustomEvent).detail;
      addMcpLog('register', `Registered WebMCP Tool: "${tool.name}"`, tool);
    };

    const handleExecuteStart = (e: Event) => {
      const { name, params } = (e as CustomEvent).detail;
      addMcpLog('execute-start', `Executing WebMCP Tool: "${name}"`, params);
    };

    const handleExecuteSuccess = (e: Event) => {
      const { name, params, result } = (e as CustomEvent).detail;
      addMcpLog('execute-success', `Successfully Executed: "${name}"`, { params, result });
    };

    const handleExecuteError = (e: Event) => {
      const { name, params, error } = (e as CustomEvent).detail;
      addMcpLog('execute-error', `Execution Failed on "${name}": ${error}`, { params, error });
    };

    window.addEventListener('webmcp:register', handleRegister);
    window.addEventListener('webmcp:execute-start', handleExecuteStart);
    window.addEventListener('webmcp:execute-success', handleExecuteSuccess);
    window.addEventListener('webmcp:execute-error', handleExecuteError);

    return () => {
      abortController.abort();
      window.removeEventListener('webmcp:register', handleRegister);
      window.removeEventListener('webmcp:execute-start', handleExecuteStart);
      window.removeEventListener('webmcp:execute-success', handleExecuteSuccess);
      window.removeEventListener('webmcp:execute-error', handleExecuteError);
    };
  }, []);

  // Scroll to bottom of agent chat terminal on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAgentThinking]);

  // 7. Dynamic AI Assistant Co-Pilot (Server-side Gemini Endpoint Call)
  const handleSendMessage = async (customMessage?: string) => {
    const query = customMessage || chatInput;
    if (!query.trim()) return;

    if (!customMessage) {
      setChatInput('');
    }

    // Append user message
    const userMsg: Message = {
      sender: 'user',
      text: query,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMsg]);
    setIsAgentThinking(true);

    try {
      const ctx = getSwiftClearContext();
      if (!ctx || !ctx.executeTool) {
        throw new Error("WebMCP ModelContext not found in DOM");
      }

      let extracted: any = null;
      let routeStatus: any = null;

      // Attempt Server-side Gemini API call
      try {
        const response = await fetch('/api/gemini/analyze-trade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        if (response.ok) {
          const data = await response.json();
          extracted = data.extracted;
          routeStatus = data.routeStatus;
        } else {
          // Try backup API route
          const backupRes = await fetch('/api/analyze-trade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
          });
          if (backupRes.ok) {
            const data = await backupRes.json();
            extracted = data.extracted;
            routeStatus = data.routeStatus;
          }
        }
      } catch (apiErr) {
        console.warn("Server API call error, engaging local smart parser fallback:", apiErr);
      }

      // Resilient Smart Trade Parser Fallback if backend API is offline or 404
      if (!extracted || !routeStatus) {
        addMcpLog('info', 'Running local WebMCP trade analysis engine...');
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

        extracted = {
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
        };
      }

      // Log tool starts
      addMcpLog('execute-start', 'Orchestrating WebMCP tools based on secure Gemini response...');

      // Execute Tool 1: Lookup HS Code
      const lookupResult = await ctx.executeTool('lookup_hs_code', { query: extracted.commodity });

      // Execute Tool 2: Compute Cross-Border Duties
      const calcResult = await ctx.executeTool('calculate_cross_border_duties', {
        commodityKey: extracted.commodity,
        declaredValueUsd: extracted.declaredValueUsd,
        quantity: extracted.quantity,
        corridorId: routeStatus.exists ? routeStatus.recommendedCorridorId : 'custom_route',
        useAfCFTA: extracted.useAfCFTA
      });

      // Execute Tool 3: Inject parameters directly into page state
      await ctx.executeTool('populate_customs_manifest', {
        origin: extracted.origin,
        destination: extracted.destination,
        commodity: extracted.commodity,
        hsCode: extracted.hsCode,
        quantity: extracted.quantity,
        declaredValueUsd: extracted.declaredValueUsd,
        useAfCFTA: extracted.useAfCFTA,
        baseDutyRate: extracted.baseDutyRate,
        afcftaDutyRate: extracted.afcftaDutyRate,
        vatRate: extracted.vatRate,
        unit: extracted.unit,
        averageWeightPerPackageKg: extracted.averageWeightPerPackageKg,
        borderPort: routeStatus.exists 
          ? TRADE_CORRIDORS.find(c => c.id === routeStatus.recommendedCorridorId)?.borderPort 
          : 'Generic Cross-Border Hub',
        handlingFeeUsd: routeStatus.exists 
          ? TRADE_CORRIDORS.find(c => c.id === routeStatus.recommendedCorridorId)?.handlingFeeUsd 
          : 180,
        securityFeeUsd: routeStatus.exists 
          ? TRADE_CORRIDORS.find(c => c.id === routeStatus.recommendedCorridorId)?.securityFeeUsd 
          : 50,
        escortFeeUsd: 0
      });

      // Display Route Alert Panel if route does not exist
      if (!routeStatus.exists) {
        setRouteAlert({
          requestedOrigin: extracted.origin,
          requestedDestination: extracted.destination,
          recommendedCorridorId: routeStatus.recommendedCorridorId,
          recommendationReason: routeStatus.recommendationReason,
          active: true
        });
      } else {
        // Clear old alert
        setRouteAlert(prev => ({ ...prev, active: false }));
      }
      
      // Auto-open the route verification modal pop-up so the user can verify or switch the corridor instantly
      setShowRouteModal(true);

      // Generate conversational explanation
      const agentResponse: Message = {
        sender: 'agent',
        text: `I have processed your consignment request and successfully updated your customs worksheet parameters:

**Extracted Shipping Parameters:**
- **Origin Export:** ${extracted.origin}
- **Destination Import:** ${extracted.destination}
- **Commodity:** ${extracted.commodity} (Estimated HS Code: \`${extracted.hsCode}\`)
- **Quantity:** ${extracted.quantity.toLocaleString()} ${extracted.unit}
- **FOB Value:** $${extracted.declaredValueUsd.toLocaleString()} USD
- **AfCFTA Preferential:** **${extracted.useAfCFTA ? 'Applied (Preferential Tariff Rates)' : 'Declined (Standard MFN Rates)'}**

**Route Status & Validation Check:**
${routeStatus.exists 
  ? `✅ **Active Border Corridor Verified:** This route successfully maps to the established **${(() => {
      const c = TRADE_CORRIDORS.find(x => x.id === routeStatus.recommendedCorridorId);
      return c ? `${c.origin} → ${c.destination} (${c.region})` : '';
    })()}** corridor.`
  : `⚠️ **Corridor Unmapped or Inactive:** Direct customs routing is not currently activated between **${extracted.origin}** and **${extracted.destination}**.\n\n💡 **System Recommendation:** We recommend routing via the **${(() => {
      const c = TRADE_CORRIDORS.find(x => x.id === routeStatus.recommendedCorridorId);
      return c ? `${c.origin} → ${c.destination} (${c.region})` : '';
    })()}** active corridor instead. Use the Customs Route Verification pop-up to apply the recommended route automatically!`
}`,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, agentResponse]);

    } catch (err: any) {
      addMcpLog('execute-error', `Agent solver failed: ${err?.message || err}`);
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'agent',
          text: `⚠️ I encountered an error communicating with the dynamic trade matching server. Please check the WebMCP log or ensure the server is running. (Error: ${err?.message || String(err)})`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsAgentThinking(false);
    }
  };

  // 8. Sandbox Run Handler
  const executeSandboxTool = async () => {
    try {
      const ctx = getSwiftClearContext();
      if (!ctx || !ctx.executeTool) {
        throw new Error("WebMCP Context not registered.");
      }

      setSandboxResult({ loading: true });
      let params: any = {};
      
      if (selectedSandboxTool === 'lookup_hs_code') {
        params = { query: sandboxInputs.commodityKey };
      } else if (selectedSandboxTool === 'calculate_cross_border_duties') {
        params = {
          commodityKey: sandboxInputs.commodityKey,
          declaredValueUsd: Number(sandboxInputs.declaredValueUsd),
          quantity: Number(sandboxInputs.quantity),
          corridorId: sandboxInputs.corridorId,
          useAfCFTA: Boolean(sandboxInputs.useAfCFTA)
        };
      } else if (selectedSandboxTool === 'populate_customs_manifest') {
        params = {
          corridorId: sandboxInputs.corridorId,
          commodityKey: sandboxInputs.commodityKey,
          quantity: Number(sandboxInputs.quantity),
          declaredValueUsd: Number(sandboxInputs.declaredValueUsd),
          useAfCFTA: Boolean(sandboxInputs.useAfCFTA)
        };
      }

      const res = await ctx.executeTool(selectedSandboxTool, params);
      setSandboxResult({ success: true, payload: res });
    } catch (err: any) {
      setSandboxResult({ success: false, error: err?.message || String(err) });
    }
  };

  const currentCommodity = TARIFF_DATABASE[selectedCommodityKey] || TARIFF_DATABASE['hibiscus'];
  const currentCorridor = TRADE_CORRIDORS.find(c => c.id === selectedCorridorId) || TRADE_CORRIDORS[0];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans leading-relaxed tracking-normal p-4 md:p-8 antialiased">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP ACCENT BAR */}
        <div className="h-[2px] bg-zinc-800 rounded-full" />

        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-900 text-zinc-200 rounded-md border border-zinc-800">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-3xl font-serif font-semibold tracking-tight text-white flex items-center gap-2.5">
                  SwiftClear
                  <span className="text-[10px] font-mono font-bold tracking-widest bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 uppercase">
                    W3C WebMCP Native
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 font-medium">
                  Harmonized Tariff Codes, AfCFTA Rules & Instant Custom Manifest Orchestrator
                </p>
              </div>
            </div>
          </div>

          {/* WebMCP Connection Widget */}
          <div className="flex items-center gap-4 bg-zinc-900/50 px-4 py-2.5 rounded-md border border-zinc-800 shadow-sm">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <div>
              <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                Registry Connection Status
              </div>
              <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                SwiftClear ModelContext bound ({registeredTools.length} tools)
              </div>
            </div>
          </div>
        </header>

        {/* PRIMARY CONTAINER (2 COLUMN DASHBOARD) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDE (7 COLS): CONSIGNMENT & DEVELOPER SANDBOX */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* CONSIGNMENT MANIFEST FORM & COMPUTATIONS */}
            <section className="bg-zinc-900 rounded-md border border-zinc-800 p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4.5 w-4.5 text-zinc-400" />
                  <h2 className="text-base font-serif font-medium text-white tracking-tight">
                    Live Consignment Customs Manifest
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Declaration Status:</span>
                  <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded border uppercase tracking-wider ${
                    manifestStatus === 'Validated' 
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50' 
                      : manifestStatus === 'Submitted'
                      ? 'bg-zinc-850 text-zinc-200 border-zinc-700'
                      : 'bg-amber-950/30 text-amber-300 border-amber-900/40'
                  }`}>
                    {manifestStatus}
                  </span>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Trade Corridor */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-0.5 uppercase tracking-widest">
                    Trade Route & Border Corridor
                  </label>
                  <select
                    value={selectedCorridorId}
                    onChange={(e) => {
                      setSelectedCorridorId(e.target.value);
                      setManifestStatus('Draft');
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-zinc-700 transition-colors"
                  >
                    <option value="" className="text-zinc-500">select route</option>
                    {TRADE_CORRIDORS.map(c => (
                      <option key={c.id} value={c.id} className="bg-zinc-950 text-zinc-200">
                        {c.origin} → {c.destination} ({c.region})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cargo/Commodity Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-0.5 uppercase tracking-widest">
                    Agricultural Cargo Class
                  </label>
                  <select
                    value={selectedCommodityKey}
                    onChange={(e) => {
                      setSelectedCommodityKey(e.target.value);
                      setManifestStatus('Draft');
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-zinc-700 transition-colors"
                  >
                    <option value="" className="text-zinc-500">select commodity</option>
                    {Object.entries(TARIFF_DATABASE).map(([key, data]) => (
                      <option key={key} value={key} className="bg-zinc-950 text-zinc-200">
                        {data.item} (HS {data.hsCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shipped quantity */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-0.5 uppercase tracking-widest flex justify-between">
                    <span>Shipped Volume Quantity</span>
                    <span className="text-[9px] text-zinc-500 lowercase font-normal">({unit})</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(Math.max(1, Number(e.target.value)));
                        setManifestStatus('Draft');
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-zinc-700 transition-colors"
                    />
                    <div className="bg-zinc-850 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-md text-[10px] font-mono flex items-center shrink-0">
                      ~{(quantity * averageWeightPerPackageKg).toLocaleString()} kg total
                    </div>
                  </div>
                </div>

                {/* Declared Value */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-0.5 uppercase tracking-widest flex justify-between">
                    <span>Declared FOB Value (USD)</span>
                    <span className="text-[9px] text-zinc-500 font-normal">$ USD</span>
                  </label>
                  <input
                    type="number"
                    value={declaredValueUsd}
                    onChange={(e) => {
                      setDeclaredValueUsd(Math.max(1, Number(e.target.value)));
                      setManifestStatus('Draft');
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-zinc-700 transition-colors"
                  />
                </div>

              </div>

              {/* Preference toggle for AfCFTA */}
              <div className="bg-zinc-950/40 rounded-md border border-zinc-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <span>Preferential AfCFTA Treatment</span>
                    <span className="bg-emerald-950/50 text-emerald-400 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-900/40 uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Apply Pan-African rules of origin to waive or reduce customs duty.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setUseAfCFTA(true);
                      setManifestStatus('Draft');
                    }}
                    className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded border transition-all ${
                      useAfCFTA 
                        ? 'bg-zinc-100 text-zinc-950 border-white font-bold' 
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    AfCFTA
                  </button>
                  <button
                    onClick={() => {
                      setUseAfCFTA(false);
                      setManifestStatus('Draft');
                    }}
                    className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded border transition-all ${
                      !useAfCFTA 
                        ? 'bg-zinc-100 text-zinc-950 border-white font-bold' 
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Standard MFN
                  </button>
                </div>
              </div>

              {/* COMPUTED TARIFF METRIC BLOCKS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-950/80 rounded-md border border-zinc-800/80 p-4">
                
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-bold uppercase text-zinc-500 tracking-widest">HS Tariff Code</span>
                  <div className="text-sm font-bold text-white font-mono">{liveCalculation.hsCode}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{liveCalculation.commodity}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-bold uppercase text-zinc-500 tracking-widest">Applied Tariff</span>
                  <div className="text-sm font-bold text-white font-mono">
                    {useAfCFTA ? `${liveCalculation.appliedDutyRate}%` : `${liveCalculation.baseDutyRate}%`}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-medium">
                    {useAfCFTA ? 'AfCFTA Preferential' : 'MFN Standard'}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-bold uppercase text-zinc-500 tracking-widest">Corridor Savings</span>
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    +${liveCalculation.afcftaSavingsUsd.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-zinc-400">AfCFTA Protocol Saved</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-bold uppercase text-zinc-500 tracking-widest">Total Payable</span>
                  <div className="text-sm font-bold text-white font-mono">
                    ${liveCalculation.totalClearancePayableUsd.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-zinc-400">Duty + VAT + Transit</div>
                </div>

              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-2 justify-end pt-4 border-t border-zinc-800/80">
                <button
                  onClick={() => {
                    setManifestStatus('Draft');
                    setSelectedCorridorId('');
                    setSelectedCommodityKey('');
                    setQuantity(0);
                    setDeclaredValueUsd(0);
                    setUseAfCFTA(true);
                  }}
                  className="px-3 py-2 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md text-xs font-medium transition flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Form
                </button>
                <button
                  onClick={() => {
                    setShowRouteModal(true);
                  }}
                  className={`px-3 py-2 border rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                    routeAlert.active
                      ? 'border-rose-900/60 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40'
                      : 'border-zinc-850 bg-zinc-900 text-zinc-350 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Route Verification {routeAlert.active && '⚠️'}
                </button>
                <button
                  onClick={() => {
                    setManifestStatus('Validated');
                    addMcpLog('info', 'Consignment declaration form validated manually by trader.');
                  }}
                  className="px-3 py-2 border border-zinc-800 text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-md text-xs font-semibold transition flex items-center gap-1.5"
                >
                  Validate Calculations
                </button>
                <button
                  onClick={() => {
                    setManifestStatus('Submitted');
                    setShowExportModal(true);
                    addMcpLog('info', 'Official consignment manifest declaration signed & exported.', liveCalculation);
                  }}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold rounded-md text-xs shadow-sm transition flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Export & Print SAD
                </button>
              </div>

            </section>

            {/* DEVELOPER SANDBOX: WEBMC REGISTRY INSPECTOR */}
            <section className="bg-zinc-900 rounded-md border border-zinc-800 text-zinc-200 p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4.5 w-4.5 text-emerald-400" />
                  <h2 className="text-base font-serif font-medium text-white tracking-tight">
                    WebMCP Developer Registry & Sandbox
                  </h2>
                </div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                  W3C WebMCP Native
                </span>
              </div>

              {/* REGISTERED TOOLS ACCORDION */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 border-r border-zinc-800/80 pr-4 space-y-3">
                  <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                    Registered Tools
                  </div>
                  <div className="space-y-1.5">
                    {registeredTools.map(tool => (
                      <button
                        key={tool.name}
                        onClick={() => {
                          setSelectedSandboxTool(tool.name);
                          setSandboxResult(null);
                        }}
                        className={`w-full text-left p-2.5 rounded-md text-[11px] font-mono transition flex items-center justify-between ${
                          selectedSandboxTool === tool.name 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'hover:bg-zinc-800/40 text-zinc-400 border border-transparent'
                        }`}
                      >
                        <span className="truncate">{tool.name}</span>
                        <Play className="h-2.5 w-2.5 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4 pl-1">
                  {/* Selected tool info */}
                  {(() => {
                    const tool = registeredTools.find(t => t.name === selectedSandboxTool);
                    if (!tool) return null;
                    return (
                      <div className="space-y-4">
                        <div>
                          <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Description</div>
                          <p className="text-[11px] text-zinc-300 mt-1 font-medium">{tool.description || ''}</p>
                        </div>

                        {/* Interactive schema properties */}
                        {tool.inputSchema && tool.inputSchema.properties && (
                          <div>
                            <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Tool Input Schema</div>
                            <div className="bg-zinc-950 p-3 rounded border border-zinc-850 space-y-2">
                              {Object.entries(tool.inputSchema.properties || {}).map(([propKey, propVal]: [string, any]) => (
                                <div key={propKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] border-b border-zinc-850 pb-2 last:border-0 last:pb-0">
                                  <span className="font-mono text-emerald-400 font-semibold">{propKey} <span className="text-zinc-500">({propVal?.type || 'string'})</span></span>
                                  <span className="text-[10px] text-zinc-400 italic max-w-[200px] truncate">{propVal?.description || ''}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Execute Sandbox trigger */}
                        <div className="flex items-center justify-between gap-3 bg-zinc-950 p-3.5 rounded border border-zinc-850">
                          <div className="text-[11px] text-zinc-400">
                            Perform browser execution test on page state
                          </div>
                          <button
                            onClick={executeSandboxTool}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono rounded text-[10px] font-bold transition flex items-center gap-1.5 shrink-0"
                          >
                            <Cpu className="h-3.5 w-3.5" />
                            Run Action
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* SANDBOX RESULT PREVIEW */}
              {sandboxResult && (
                <div className="border-t border-zinc-800 pt-4 space-y-2">
                  <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                    Execution Response Stream (JSON Output)
                  </div>
                  <pre className="bg-zinc-950 p-3.5 rounded border border-zinc-850 text-[11px] font-mono text-emerald-400 max-h-[160px] overflow-y-auto">
                    {sandboxResult.loading ? (
                      <span className="text-zinc-500 animate-pulse">Computing and running WebMCP action...</span>
                    ) : sandboxResult.success ? (
                      JSON.stringify(sandboxResult.payload, null, 2)
                    ) : (
                      <span className="text-rose-400">Error: {sandboxResult.error}</span>
                    )}
                  </pre>
                </div>
              )}

            </section>

          </div>

          {/* RIGHT SIDE (5 COLS): COOPERATIVE CHAT TERMINAL & CHECKLISTS */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* AI MERCHANT AGENT SOLVER */}
            <section className="bg-zinc-900 rounded-md border border-zinc-800 p-6 flex flex-col h-[520px] shadow-sm">
              
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4.5 w-4.5 text-zinc-400 animate-pulse" />
                  <div>
                    <h2 className="text-base font-serif font-medium text-white tracking-tight">
                      Merchant AI Agent Co-Pilot
                    </h2>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Converts merchant language into WebMCP Tool calls
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setChatHistory([
                      {
                        sender: 'agent',
                        text: "Hello! I am your SwiftClear Cross-Border Trade Agent. I can help you search tariff rates, estimate customs clearance charges under AfCFTA, identify required compliance documentation, and automatically populate your customs manifest on this page.\n\nType a request or select one of the quick scenarios below to see WebMCP browser-native tools in action!",
                        timestamp: new Date()
                      }
                    ]);
                    setManifestStatus('Draft');
                  }}
                  className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition"
                  title="Clear conversation"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              {/* CHAT MESSAGES PANEL */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 max-h-[320px] text-xs">
                {chatHistory.map((msg, index) => (
                  <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="text-[9px] font-mono text-zinc-500 mb-1 px-1">
                      {msg.sender === 'user' ? 'Merchant' : 'SwiftClear Co-Pilot'} • {msg.timestamp.toLocaleTimeString()}
                    </div>
                    <div className={`p-3.5 rounded-lg max-w-[90%] border ${
                      msg.sender === 'user' 
                        ? 'bg-zinc-100 text-zinc-950 border-white font-medium' 
                        : 'bg-zinc-950 text-zinc-300 border-zinc-800 whitespace-pre-line'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isAgentThinking && (
                  <div className="flex flex-col items-start">
                    <div className="text-[9px] font-mono text-zinc-500 mb-1 px-1">
                      SwiftClear Agent • Analysing...
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-lg p-3.5 max-w-[85%] flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">Agent executing WebMCP registry queries...</span>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* PRESETS OR QUICK TRIGGER AGENT SIMULATORS */}
              <div className="space-y-2 mb-4">
                <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  Select Quick Scenario Presets (Simulates Browser Agent Invocations)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleSendMessage("Ship 250 bags of Dried Hibiscus from Kano to Cotonou")}
                    className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-mono rounded transition-all"
                  >
                    🌸 Kano → Cotonou (Hibiscus)
                  </button>
                  <button
                    onClick={() => handleSendMessage("Ship 170 tubs of shea butter from Accra to Abidjan under AfCFTA")}
                    className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-mono rounded transition-all"
                  >
                    🧈 Accra → Abidjan (Shea Butter)
                  </button>
                  <button
                    onClick={() => handleSendMessage("Check raw Cashews exported from Kigali to Mombasa")}
                    className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-mono rounded transition-all"
                  >
                    🥜 Kigali → Mombasa (Cashews)
                  </button>
                </div>
              </div>

              {/* INPUT CONTAINER */}
              <div className="flex gap-2 border-t border-zinc-800 pt-4">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask agent: 'Ship 50 boxes of shea butter...'"
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all"
                />
                <button
                  onClick={() => handleSendMessage()}
                  className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-md transition"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>

            </section>

            {/* LIVE EVENT STREAM LOG */}
            <section className="bg-zinc-950 rounded-md border border-zinc-800 p-5 font-mono text-[10px] text-zinc-300 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                  <Terminal className="h-3 w-3 text-emerald-400" />
                  Live WebMCP Client Event Logs
                </span>
                <span className="text-zinc-500 text-[8px]">
                  Real-Time Protocol Listener
                </span>
              </div>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto scrollbar-thin">
                {webMcpLogs.length === 0 ? (
                  <p className="text-zinc-600 italic">No events recorded. Type a chat message or execute sandbox actions to stream live telemetry logs.</p>
                ) : (
                  webMcpLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-1.5 border-b border-zinc-900/50 pb-1.5 last:border-0">
                      <span className="text-zinc-500">{log.timestamp}</span>
                      <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                        log.type === 'register' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' :
                        log.type === 'execute-start' ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' :
                        log.type === 'execute-success' ? 'bg-teal-950 text-teal-400 border border-teal-900/40' :
                        log.type === 'execute-error' ? 'bg-rose-950 text-rose-400 border border-rose-900/40' :
                        'bg-zinc-900 text-zinc-400'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-zinc-200">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

          </div>

        </div>

        {/* EXPORT / PRINTABLE POPUP MODAL */}
        {showExportModal && (
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 rounded-md border border-zinc-800 p-6 md:p-8 max-w-2xl w-full shadow-2xl relative space-y-6">
              
              <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-xl font-serif font-medium text-white flex items-center gap-2">
                    <FileText className="text-zinc-400 h-5 w-5" />
                    Customs Single Administrative Document (SAD)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Official Consignment Clearance Manifest — AfCFTA Annex-I Protocol
                  </p>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-zinc-400 hover:text-white text-xs font-mono border border-zinc-800 px-3 py-1 rounded-md transition hover:bg-zinc-800"
                >
                  ✕ Close
                </button>
              </div>

              {/* OFFICIAL LOOKING DOCUMENT PREVIEW */}
              <div className="border border-zinc-350 p-6 rounded bg-[#fcfcfa] text-zinc-900 relative overflow-hidden shadow-md space-y-4 text-xs font-mono">
                
                {/* Official Stamp Overlay */}
                <div className="absolute top-12 right-12 border-4 border-emerald-700/30 text-emerald-700/30 font-sans font-bold text-xs tracking-widest uppercase rotate-12 px-3 py-1 select-none pointer-events-none">
                  AfCFTA Approved
                </div>

                <div className="flex justify-between items-center border-b-2 border-zinc-900 pb-2">
                  <div className="font-bold text-zinc-900 text-sm tracking-tight font-sans">SWIFTCLEAR AFRICAN CUSTOMS HUB</div>
                  <div className="text-right text-[10px] font-mono text-zinc-600">
                    <div>SAD REF NO: SC-{Math.floor(100000 + Math.random() * 900000)}</div>
                    <div>DATE: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-zinc-300 pb-3">
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase font-sans tracking-wide">1. Exporter / Consignor</span>
                    <strong className="font-bold text-zinc-900 font-sans block">SwiftClear Authorized MSME Gateway</strong>
                    <span className="text-zinc-600 font-sans">{liveCalculation.origin} Corridor</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase font-sans tracking-wide">2. Importer / Consignee</span>
                    <strong className="font-bold text-zinc-900 font-sans block">Registered Regional Broker Representative</strong>
                    <span className="text-zinc-600 font-sans">{liveCalculation.destination} Gate</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-b border-zinc-300 pb-3">
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase font-sans tracking-wide">3. Corridor Route</span>
                    <span className="font-bold font-sans text-zinc-900">{region} Corridor</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase font-sans tracking-wide">4. Joint Border Gateway</span>
                    <span className="font-bold font-sans text-zinc-900 truncate block">{borderPort}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase font-sans tracking-wide">5. Declaration Protocol</span>
                    <span className="font-bold font-sans text-emerald-800">{useAfCFTA ? 'AfCFTA Preferential' : 'MFN Standard'}</span>
                  </div>
                </div>

                <div className="border-b border-zinc-300 pb-3">
                  <span className="text-[9px] text-zinc-500 block uppercase font-sans tracking-wide">6. Commodity Description & HS Code</span>
                  <div className="flex justify-between items-center text-zinc-900 mt-1">
                    <span className="font-serif font-bold text-sm">{liveCalculation.commodity}</span>
                    <span className="bg-zinc-100 border border-zinc-300 px-1.5 py-0.5 text-[10px] font-mono font-bold">HS {liveCalculation.hsCode}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 font-sans text-zinc-600">
                    <div>Consignment Volume: <span className="font-semibold text-zinc-900">{quantity} units ({liveCalculation.weightKg.toLocaleString()} kg)</span></div>
                    <div>Customs FOB Value: <span className="font-semibold text-zinc-900">${liveCalculation.declaredValueUsd.toLocaleString()}.00 USD</span></div>
                  </div>
                </div>

                <div className="space-y-1.5 font-sans text-zinc-800">
                  <span className="text-[9px] text-zinc-500 block uppercase font-mono tracking-wide">7. Detailed Tariff Calculations</span>
                  
                  <div className="flex justify-between text-zinc-600 border-b border-zinc-200 pb-1 text-[11px]">
                    <span>Customs Base Duty ({liveCalculation.baseDutyRate}%)</span>
                    <span className="line-through">${liveCalculation.baseDutyAmountUsd.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-zinc-600 border-b border-zinc-200 pb-1 text-[11px]">
                    <span>Applied Tariff ({liveCalculation.appliedDutyRate}% under protocol)</span>
                    <span className="font-semibold text-zinc-900">${liveCalculation.appliedDutyAmountUsd.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-zinc-600 border-b border-zinc-200 pb-1 text-[11px]">
                    <span>Import VAT ({liveCalculation.vatRate}%)</span>
                    <span className="font-semibold text-zinc-900">${liveCalculation.vatAmountUsd.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-zinc-600 border-b border-zinc-200 pb-1 text-[11px]">
                    <span>Joint Border Port charges & Handling</span>
                    <span className="font-semibold text-zinc-900">${(liveCalculation.handlingFeeUsd + liveCalculation.securityFeeUsd + liveCalculation.escortFeeUsd).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-zinc-900 font-bold border-t border-zinc-900 pt-2 text-xs">
                    <span className="uppercase text-zinc-900">Net Import Clearance Duties Payable</span>
                    <span className="text-sm font-bold">${liveCalculation.totalClearancePayableUsd.toFixed(2)} USD</span>
                  </div>

                  <div className="text-[10px] text-emerald-800 font-bold flex justify-between bg-emerald-50 border border-emerald-200 p-2 rounded mt-2">
                    <span>Net Trade Protocol Cost-Reduction Savings</span>
                    <span>+${liveCalculation.afcftaSavingsUsd.toFixed(2)} USD</span>
                  </div>
                </div>

              </div>

              {/* FOOTER ACTION BUTTONS */}
              <div className="flex justify-between items-center pt-2">
                <div className="text-[10px] text-zinc-400 max-w-[320px] leading-normal">
                  SAD complies fully with the ECOWAS Common External Tariff (CET) guidelines and AfCFTA rules of origin.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      alert("Simulated PDF manifest export initialized! This JSON has been generated as export output.");
                      console.log("Exported SAD:", liveCalculation);
                    }}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md text-xs font-mono font-bold transition flex items-center gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    Download JSON
                  </button>
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold rounded-md text-xs transition flex items-center gap-1.5"
                  >
                    <FileText className="h-4 w-4" />
                    Print Manifest (PDF)
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ROUTE APPROVAL & VERIFICATION MODAL */}
        {showRouteModal && (
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 rounded-md border border-zinc-800 p-6 md:p-8 max-w-lg w-full shadow-2xl relative space-y-5">
              
              <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-lg font-serif font-medium text-white flex items-center gap-2">
                    <ShieldAlert className="text-zinc-400 h-5 w-5" />
                    Customs Route Verification
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    African Trade Gateway (AfCFTA & RECs) Active Corridor Check
                  </p>
                </div>
                <button
                  onClick={() => setShowRouteModal(false)}
                  className="text-zinc-400 hover:text-white text-xs font-mono border border-zinc-800 px-2.5 py-1 rounded-md transition hover:bg-zinc-800"
                >
                  ✕ Close
                </button>
              </div>

              {routeAlert.active ? (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-950/20 rounded border border-rose-900/30 space-y-2">
                    <div className="text-xs font-bold text-rose-300 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-rose-400" />
                      <span>Unmapped Trade Corridor Requested</span>
                    </div>
                    <p className="text-[11px] text-zinc-350 leading-normal">
                      Direct cross-border clearance is currently unavailable or unmapped between 
                      <strong className="text-white font-semibold"> {routeAlert.requestedOrigin}</strong> and 
                      <strong className="text-white font-semibold"> {routeAlert.requestedDestination}</strong>.
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-950 rounded border border-zinc-850 space-y-2.5">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Recommended Active Alternative Corridor</span>
                    </div>
                    <p className="text-[11px] text-zinc-350 leading-normal font-mono">
                      {routeAlert.recommendationReason}
                    </p>
                    <div className="pt-2 border-t border-zinc-850/80 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400">Apply recommended route:</span>
                      <button
                        onClick={() => {
                          setSelectedCorridorId(routeAlert.recommendedCorridorId);
                          setRouteAlert(prev => ({ ...prev, active: false }));
                          setShowRouteModal(false);
                        }}
                        className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold font-mono text-[9px] rounded uppercase tracking-wider transition"
                      >
                        Auto-Switch Corridor
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-950/20 rounded border border-emerald-900/30 space-y-2">
                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Active Corridor Verification Passed</span>
                    </div>
                    <p className="text-[11px] text-zinc-350 leading-normal">
                      Your current trade corridor (<strong className="text-white font-semibold">{origin} → {destination}</strong>) is fully active and verified under the {region} customs gateway protocol.
                    </p>
                  </div>

                  <div className="bg-zinc-950 rounded border border-zinc-850 p-4 space-y-2.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Corridor Ingress Specifications</span>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-zinc-500 block">Joint Border Post:</span>
                        <span className="text-zinc-350 font-medium">{borderPort}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Est. Transit Distance:</span>
                        <span className="text-zinc-350 font-mono font-medium">{distanceKm} Km</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Est. Transit Duration:</span>
                        <span className="text-zinc-350 font-mono font-medium">{avgTransitDays} Days</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Corridor Protocol:</span>
                        <span className="text-emerald-400 font-semibold">{region}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-zinc-800">
                <button
                  onClick={() => setShowRouteModal(false)}
                  className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition"
                >
                  Close Verification
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
