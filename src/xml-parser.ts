/*!
 * xml-parser.ts
 * ------------------------------------------------------------------------
 * Environment-aware XML parser that works in both Node.js and browser environments.
 * Uses native browser DOM when available, falls back to @xmldom/xmldom in Node.js.
 */

/**
 * Determines if code is running in a browser environment
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
};

/**
 * Environment-agnostic DOM parser
 */
export class EnvAwareDOMParser {
  /**
   * Parse XML string into a DOM document
   */
  parseFromString(xmlText: string, mimeType: string = 'application/xml'): Document {
    if (isBrowser()) {
      // Use native browser DOM parser
      const parser = new window.DOMParser();
      // The browser's DOMParser accepts specific MIME types, but we're always using XML
      return parser.parseFromString(xmlText, 'text/xml');
    } else {
      try {
        // Dynamic import in Node.js environment
        const { DOMParser } = require('@xmldom/xmldom');
        
        // Create parser with error handlers to be more lenient with namespace issues
        const parser = new DOMParser({
          errorHandler: {
            warning: function(msg: string) {
              // Suppress warnings for now, especially namespace-related ones
              if (!msg.includes('invalid attribute:xmlns:xmlns:')) {
                console.warn('[xmldom warning]', msg);
              }
            },
            error: function(msg: string) {
              // Convert namespace duplication errors to warnings
              if (msg.includes('invalid attribute:xmlns:xmlns:')) {
                console.warn('[xmldom namespace warning]', msg);
                return; // Don't throw for this specific error
              }
              console.error('[xmldom error]', msg);
            },
            fatalError: function(msg: string) {
              // Only throw for truly fatal errors, not namespace issues
              if (!msg.includes('invalid attribute:xmlns:xmlns:')) {
                console.error('[xmldom fatal error]', msg);
                throw new Error(msg);
              }
            }
          }
        });
        
        return parser.parseFromString(xmlText, mimeType);
      } catch (e) {
        console.error('Failed to load @xmldom/xmldom:', e instanceof Error ? e.message : String(e));
        throw new Error('XML DOM parser not available in this environment');
      }
    }
  }
}

/**
 * Create and return a DOM parser instance appropriate for the current environment
 */
export function createDOMParser(): EnvAwareDOMParser {
  return new EnvAwareDOMParser();
}
