export interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
  execute: (params: any) => Promise<any> | any;
}

export interface ModelContext {
  registerTool: (tool: WebMCPTool, options?: { signal?: AbortSignal }) => void;
  getTools?: () => Promise<WebMCPTool[]>;
  executeTool?: (name: string, params: any) => Promise<any>;
}

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
  interface Document {
    modelContext?: ModelContext;
  }
}
