import { WebMCPTool, ModelContext } from '../types/webmcp';

class LocalModelContext implements ModelContext {
  private tools: Map<string, WebMCPTool> = new Map();

  registerTool(tool: WebMCPTool, options?: { signal?: AbortSignal }): void {
    this.tools.set(tool.name, tool);
    console.log(`[WebMCP] Registered tool: ${tool.name}`);
    
    // Dispatch custom event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('webmcp:register', { detail: tool }));
    }

    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        this.tools.delete(tool.name);
        console.log(`[WebMCP] Unregistered tool: ${tool.name}`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('webmcp:unregister', { detail: { name: tool.name } }));
        }
      });
    }
  }

  async getTools(): Promise<WebMCPTool[]> {
    return Array.from(this.tools.values());
  }

  async executeTool(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      const errorMsg = `WebMCP Tool "${name}" not found.`;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('webmcp:execute-error', { 
          detail: { name, params, error: errorMsg } 
        }));
      }
      throw new Error(errorMsg);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('webmcp:execute-start', { 
        detail: { name, params } 
      }));
    }

    try {
      const result = await tool.execute(params);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('webmcp:execute-success', { 
          detail: { name, params, result } 
        }));
      }
      return result;
    } catch (error: any) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('webmcp:execute-error', { 
          detail: { name, params, error: error?.message || String(error) } 
        }));
      }
      throw error;
    }
  }
}

export function initWebMCP(): ModelContext {
  if (typeof window === 'undefined') {
    return {} as ModelContext;
  }

  const existingContext = navigator.modelContext || document.modelContext;
  if (existingContext) {
    return existingContext;
  }

  const contextInstance = new LocalModelContext();

  try {
    Object.defineProperty(navigator, 'modelContext', {
      value: contextInstance,
      writable: true,
      configurable: true
    });
  } catch (e) {
    (navigator as any).modelContext = contextInstance;
  }

  try {
    Object.defineProperty(document, 'modelContext', {
      value: contextInstance,
      writable: true,
      configurable: true
    });
  } catch (e) {
    (document as any).modelContext = contextInstance;
  }

  return contextInstance;
}
