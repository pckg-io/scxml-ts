import * as fs from 'fs';
import * as path from 'path';
import { parseSCXML } from '../src/scxml-parser';
import { SCXML, toSCXML, State } from '../src/scxml-model';
import { validateXML } from './custom-xml-validator';

describe('SCXML parser', () => {
  const samplesDir = path.join(__dirname, 'samples');
  
  // Get all .scxml files from the samples directory
  const sampleFiles = fs.readdirSync(samplesDir)
    .filter(file => file.endsWith('.scxml'))
    .map(file => ({
      name: file,
      path: path.join(samplesDir, file),
    }));
    
  // Test each sample file
  it.each(sampleFiles)('should successfully parse $name', async ({ name, path }) => {
    const xml = fs.readFileSync(path, 'utf-8');
    
    // Should parse without throwing an error
    let parsedModel: SCXML;
    expect(() => {
      parsedModel = parseSCXML(xml);
    }).not.toThrow();
    
    // The parsed model should be a valid SCXML instance
    expect(parsedModel!).toBeInstanceOf(SCXML);
    
    // Should have correct structure based on file
    if (name === 'sample-minimal.scxml') {
      expect(parsedModel!.children.length).toBe(1);
      expect(parsedModel!.initial).toBe('s');
      expect(parsedModel!.children[0].id).toBe('s');
    }
    
    if (name === 'sample-valid.scxml') {
      expect(parsedModel!.initial).toBe('start');
      expect(parsedModel!.children.length).toBe(3);
      
      // Check the state IDs
      const stateIds = parsedModel!.children.map(child => child.id);
      expect(stateIds).toContain('start');
      expect(stateIds).toContain('running');
      expect(stateIds).toContain('end');
      
      // Check transitions
      const startState = parsedModel!.children.find(state => state.id === 'start') as State;
      const runningState = parsedModel!.children.find(state => state.id === 'running') as State;
      
      expect(startState.transitions.length).toBe(1);
      expect(startState.transitions[0].event).toBe('move');
      // The target can be a string or an array of strings
      if (Array.isArray(startState.transitions[0].target)) {
        expect(startState.transitions[0].target).toContain('running');
      } else {
        expect(startState.transitions[0].target).toBe('running');
      }
      
      expect(runningState.transitions.length).toBe(1);
      expect(runningState.transitions[0].event).toBe('stop');
      // The target can be a string or an array of strings
      if (Array.isArray(runningState.transitions[0].target)) {
        expect(runningState.transitions[0].target).toContain('end');
      } else {
        expect(runningState.transitions[0].target).toBe('end');
      }
    }
  });

  it.each(sampleFiles)('should round-trip serialize and parse $name correctly', async ({ path }) => {
    const originalXml = fs.readFileSync(path, 'utf-8');
    
    // Parse the original XML
    const parsedModel = parseSCXML(originalXml);
    
    // Serialize back to XML
    const serializedXml = toSCXML(parsedModel);
    
    // Reparse the serialized XML
    const reparsedModel = parseSCXML(serializedXml);
    
    // Validate the XML against schema
    const result = await validateXML(serializedXml);
    if(!result.valid) {
        console.error(`Validation errors for ${path}:`, result.errors);
    }
    expect(result.valid).toBe(true);
    
    // Compare key structural elements between first and second parse
    // This is a deeper test than just string comparison because formatting might differ
    expect(reparsedModel.version).toBe(parsedModel.version);
    expect(reparsedModel.initial).toBe(parsedModel.initial);
    expect(reparsedModel.children.length).toBe(parsedModel.children.length);
    
    // For sample-complex.scxml, perform additional checks on the complex structure
    if (path.endsWith('sample-complex.scxml')) {
      // Check the datamodel
      expect(reparsedModel.children[0].id).toBe('wrapper');
      
      // Check nested state structure is preserved
      const wrapperState = parsedModel.children.find(s => s.id === 'wrapper') as State;
      const rewrapperState = reparsedModel.children.find(s => s.id === 'wrapper') as State;
      
      expect(wrapperState.children.length).toBe(rewrapperState.children.length);
      
      // Check onentry handlers are preserved
      const onState = wrapperState.children.find((s: any) => s.id === 'on') as State;
      const reonState = rewrapperState.children.find((s: any) => s.id === 'on') as State;
      
      expect(onState.onentry).toBeDefined();
      expect(reonState.onentry).toBeDefined();
    }
  });

  // Test that validation against XSD works for all samples
  it.each(sampleFiles)('should validate $name against the SCXML schema', async ({ path }) => {
    
    const xml = fs.readFileSync(path, 'utf-8');
    const result = await validateXML(xml);
    
    if (!result.valid) {
      console.error(`Validation errors for ${path}:`, result.errors);
    }
    
    expect(result.valid).toBe(true);
  });
});
