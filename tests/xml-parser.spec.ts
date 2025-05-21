/**
 * Test to verify that our XML parser works in both Node.js and browser environments
 */

import { createDOMParser, isBrowser } from '../src/xml-parser';

describe('xml-parser', () => {
  it('should detect environment correctly', () => {
    // This is just a smoke test - it will have different results based on where tests run
    // but should not throw errors
    expect(typeof isBrowser()).toBe('boolean');
  });

  it('should parse XML in the current environment', () => {
    const parser = createDOMParser();
    const xmlString = '<root><child attr="value">content</child></root>';
    
    const doc = parser.parseFromString(xmlString, 'text/xml');
    
    // Basic validation that parsing worked
    expect(doc.documentElement.nodeName).toBe('root');
    expect(doc.documentElement.childNodes.length).toBeGreaterThan(0);
    
    // Find the child node (may have text nodes in between)
    let childNode: Element | null = null;
    for (let i = 0; i < doc.documentElement.childNodes.length; i++) {
      const node = doc.documentElement.childNodes[i];
      if (node.nodeName === 'child') {
        childNode = node as Element;
        break;
      }
    }
    
    expect(childNode).not.toBeNull();
    expect(childNode!.nodeName).toBe('child');
    expect(childNode!.getAttribute('attr')).toBe('value');
    
    // Test content - might be in a text node
    let content = '';
    if (childNode!.childNodes.length > 0) {
      for (let i = 0; i < childNode!.childNodes.length; i++) {
        content += childNode!.childNodes[i].nodeValue || '';
      }
    }
    expect(content).toContain('content');
  });
});
