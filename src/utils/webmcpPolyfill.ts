import { WebMCPTool, ModelContext } from '../types/webmcp';

// Module-level singleton: our own tool registry that always works,
// regardless of whether Chrome ships a native navigator.modelContext.
let _instance: LocalModelContext | null = null;

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

/**
 * Initialize and return SwiftClear's own ModelContext.
 * 
 * IMPORTANT: We always create our own LocalModelContext rather than
 * deferring to a native navigator.modelContext. Chrome's WebMCP flag
 * (chrome://flags/#enable-webmcp-testing) provides a native API whose
 * executeTool() expects a RegisteredTool object, not a string name.
 * Using our own context avoids that incompatibility while still
 * exposing tools for external agent discovery.
 */
export function initWebMCP(): ModelContext {
  if (typeof window === 'undefined') {
    return {} as ModelContext;
  }

  // Return existing singleton if already initialised
  if (_instance) {
    return _instance;
  }

  _instance = new LocalModelContext();

  // Attempt to set our context on navigator/document for external
  // agent discovery. If the native WebMCP flag has already claimed
  // navigator.modelContext as read-only, we silently skip — the app
  // always uses getSwiftClearContext() instead.
  try {
    Object.defineProperty(navigator, 'modelContext', {
      value: _instance,
      writable: true,
      configurable: true
    });
  } catch (e) {
    try { (navigator as any).modelContext = _instance; } catch (_) { /* native is non-writable, skip */ }
  }

  try {
    Object.defineProperty(document, 'modelContext', {
      value: _instance,
      writable: true,
      configurable: true
    });
  } catch (e) {
    try { (document as any).modelContext = _instance; } catch (_) { /* skip */ }
  }

  return _instance;
}

/**
 * Get the SwiftClear ModelContext singleton.
 * Always use this instead of navigator.modelContext to avoid
 * conflicts with Chrome's native WebMCP API.
 */
export function getSwiftClearContext(): ModelContext | null {
  return _instance;
}
