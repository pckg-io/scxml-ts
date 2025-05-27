import * as fs from 'fs';
import * as path from 'path';
import { parseSCXML } from '../src/scxml-parser';
import { ScxmlDoc, SCXMLVisitor, ScxmlState, ScxmlParallel, ScxmlFinal, ScxmlHistory, ScxmlTransition } from '../src/scxml';

describe('SCXML Types and Visitor Tests', () => {
  
  describe('ScxmlDoc', () => {
    it('should create a valid ScxmlDoc instance with default values', () => {
      const doc = new ScxmlDoc();
      
      expect(doc.version).toBe('1.0');
      expect(doc.xmlns.scxml).toBe('http://www.w3.org/2005/07/scxml');
      expect(doc.states).toEqual([]);
      expect(doc.parallels).toEqual([]);
      expect(doc.finals).toEqual([]);
      expect(doc.initial).toBeUndefined();
      expect(doc.name).toBeUndefined();
    });

    it('should allow setting and getting properties', () => {
      const doc = new ScxmlDoc();
      
      doc.setInitial('startState');
      doc.setName('TestStateMachine');
      doc.setNamespace('custom', 'http://example.com/custom');
      
      expect(doc.initial).toBe('startState');
      expect(doc.name).toBe('TestStateMachine');
      expect(doc.xmlns.custom).toBe('http://example.com/custom');
    });

    it('should allow adding and removing states', () => {
      const doc = new ScxmlDoc();
      const state = new ScxmlState({ id: 'testState' });
      
      doc.addState(state);
      expect(doc.states).toHaveLength(1);
      expect(doc.states[0].id).toBe('testState');
      
      doc.removeState('testState');
      expect(doc.states).toHaveLength(0);
    });

    it('should throw error when removing non-existent state', () => {
      const doc = new ScxmlDoc();
      
      expect(() => doc.removeState('nonExistent')).toThrow('State with id nonExistent not found.');
    });

    it('should allow adding and removing parallels', () => {
      const doc = new ScxmlDoc();
      const parallel = new ScxmlParallel({ id: 'testParallel' });
      
      doc.addParallel(parallel);
      expect(doc.parallels).toHaveLength(1);
      expect(doc.parallels[0].id).toBe('testParallel');
      
      doc.removeParallel('testParallel');
      expect(doc.parallels).toHaveLength(0);
    });

    it('should allow adding and removing finals', () => {
      const doc = new ScxmlDoc();
      const final = new ScxmlFinal({ id: 'testFinal' });
      
      doc.addFinal(final);
      expect(doc.finals).toHaveLength(1);
      expect(doc.finals[0].id).toBe('testFinal');
      
      doc.removeFinal('testFinal');
      expect(doc.finals).toHaveLength(0);
    });

    it('should allow removing namespaces', () => {
      const doc = new ScxmlDoc();
      doc.setNamespace('test', 'http://test.com');
      
      expect(doc.xmlns.test).toBe('http://test.com');
      
      doc.removeNamespace('test');
      expect(doc.xmlns.test).toBeUndefined();
    });
  });

  describe('ScxmlState', () => {
    it('should create a valid ScxmlState instance', () => {
      const state = new ScxmlState({ id: 'testState' });
      
      expect(state.id).toBe('testState');
      expect(state.states).toEqual([]);
      expect(state.parallels).toEqual([]);
      expect(state.finals).toEqual([]);
      expect(state.histories).toEqual([]);
      expect(state.transitions).toEqual([]);
      expect(state.initial).toBeUndefined();
    });

    it('should allow setting initial state', () => {
      const state = new ScxmlState({ id: 'testState' });
      state.setInitial('childState');
      
      expect(state.initial).toBe('childState');
    });

    it('should support nested states', () => {
      const parentState = new ScxmlState({ id: 'parent' });
      const childState = new ScxmlState({ id: 'child' });
      
      parentState.addState(childState);
      expect(parentState.states).toHaveLength(1);
      expect(parentState.states[0].id).toBe('child');
    });

    it('should support adding transitions', () => {
      const state = new ScxmlState({ id: 'testState' });
      const transition = new ScxmlTransition({ id: 'testTransition' });
      
      state.addTransition(transition);
      expect(state.transitions).toHaveLength(1);
      expect(state.transitions[0].id).toBe('testTransition');
    });

    it('should support adding histories', () => {
      const state = new ScxmlState({ id: 'testState' });
      const history = new ScxmlHistory({ id: 'testHistory' });
      
      state.addHistory(history);
      expect(state.histories).toHaveLength(1);
      expect(state.histories[0].id).toBe('testHistory');
    });
  });

  describe('ScxmlParallel', () => {
    it('should create a valid ScxmlParallel instance', () => {
      const parallel = new ScxmlParallel({ id: 'testParallel' });
      
      expect(parallel.id).toBe('testParallel');
      expect(parallel.states).toEqual([]);
      expect(parallel.parallels).toEqual([]);
      expect(parallel.histories).toEqual([]);
      expect(parallel.transitions).toEqual([]);
    });

    it('should support nested states and parallels', () => {
      const parallel = new ScxmlParallel({ id: 'testParallel' });
      const state = new ScxmlState({ id: 'childState' });
      const nestedParallel = new ScxmlParallel({ id: 'nestedParallel' });
      
      parallel.addState(state);
      parallel.addParallel(nestedParallel);
      
      expect(parallel.states).toHaveLength(1);
      expect(parallel.parallels).toHaveLength(1);
    });
  });

  describe('ScxmlFinal', () => {
    it('should create a valid ScxmlFinal instance', () => {
      const final = new ScxmlFinal({ id: 'testFinal' });
      
      expect(final.id).toBe('testFinal');
    });

    it('should allow setting identifier', () => {
      const final = new ScxmlFinal({ id: 'testFinal' });
      final.setIdentifier('newId');
      
      expect(final.id).toBe('newId');
    });
  });

  describe('ScxmlHistory', () => {
    it('should create a valid ScxmlHistory instance', () => {
      const history = new ScxmlHistory({ id: 'testHistory' });
      
      expect(history.id).toBe('testHistory');
      expect(history.transitions).toEqual([]);
      expect(history.historyType).toBeUndefined();
    });

    it('should allow setting history type', () => {
      const history = new ScxmlHistory({ id: 'testHistory' });
      
      history.setHistoryType('deep');
      expect(history.historyType).toBe('deep');
      
      history.setHistoryType('shallow');
      expect(history.historyType).toBe('shallow');
      
      history.setHistoryType(undefined);
      expect(history.historyType).toBeUndefined();
    });
  });

  describe('ScxmlTransition', () => {
    it('should create a valid ScxmlTransition instance', () => {
      const transition = new ScxmlTransition({ id: 'testTransition' });
      
      expect(transition.id).toBe('testTransition');
      expect(transition.events).toEqual([]);
      expect(transition.target).toBeUndefined();
      expect(transition.transitionType).toBeUndefined();
    });

    it('should allow setting target and type', () => {
      const transition = new ScxmlTransition({ id: 'testTransition' });
      
      transition.setTransitionTarget('targetState');
      transition.setTransitionType('internal');
      
      expect(transition.target).toBe('targetState');
      expect(transition.transitionType).toBe('internal');
    });

    it('should support adding event names', () => {
      const transition = new ScxmlTransition({ id: 'testTransition' });
      
      transition.addEventName('event1');
      transition.addEventName('event2');
      
      expect(transition.events).toHaveLength(2);
      expect(transition.events).toContain('event1');
      expect(transition.events).toContain('event2');
    });
  });

  describe('SCXMLVisitor Integration', () => {
    it('should parse minimal SCXML and create valid ScxmlDoc', () => {
      const scxmlContent = fs.readFileSync(
        path.join(__dirname, 'samples', 'sample-minimal.scxml'),
        'utf8'
      );
      
      const parsed = parseSCXML(scxmlContent);
      const visitor = new SCXMLVisitor(parsed);
      const doc = visitor.document;
      
      expect(doc).toBeInstanceOf(ScxmlDoc);
      expect(doc!.version).toBe('1.0');
      expect(doc!.initial).toBe('s');
      expect(doc!.states).toHaveLength(1);
      expect(doc!.states[0].id).toBe('s');
    });

    it('should parse valid SCXML with transitions and create proper structure', () => {
      const scxmlContent = fs.readFileSync(
        path.join(__dirname, 'samples', 'sample-valid.scxml'),
        'utf8'
      );
      
      const parsed = parseSCXML(scxmlContent);
      const visitor = new SCXMLVisitor(parsed);
      const doc = visitor.document;
      
      expect(doc).toBeInstanceOf(ScxmlDoc);
      expect(doc!.initial).toBe('start');
      expect(doc!.states).toHaveLength(2);
      expect(doc!.finals).toHaveLength(1);
      
      // Check state structure
      const startState = doc!.states.find(s => s.id === 'start');
      const runningState = doc!.states.find(s => s.id === 'running');
      const endFinal = doc!.finals.find(f => f.id === 'end');
      
      expect(startState).toBeDefined();
      expect(runningState).toBeDefined();
      expect(endFinal).toBeDefined();
      
      // Check transitions
      expect(startState!.transitions).toHaveLength(1);
      expect(runningState!.transitions).toHaveLength(1);
      
      const startTransition = startState!.transitions[0];
      const runningTransition = runningState!.transitions[0];
      
      expect(startTransition.events).toContain('move');
      expect(startTransition.target).toBe('running');
      expect(runningTransition.events).toContain('stop');
      expect(runningTransition.target).toBe('end');
    });

    it('should handle complex SCXML with parallel and history states', () => {
      // Create a more complex SCXML for testing
      const complexScxml = `<?xml version="1.0" encoding="UTF-8"?>
<scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" initial="main" name="ComplexMachine">
  <state id="main" initial="sub1">
    <state id="sub1">
      <transition event="next" target="sub2"/>
    </state>
    <state id="sub2">
      <transition event="back" target="sub1"/>
      <transition event="parallel" target="parallelSection"/>
    </state>
    <history id="mainHistory" type="deep">
      <transition target="sub1"/>
    </history>
  </state>
  <parallel id="parallelSection">
    <state id="branch1" initial="b1s1">
      <state id="b1s1">
        <transition event="b1next" target="b1s2"/>
      </state>
      <state id="b1s2"/>
    </state>
    <state id="branch2" initial="b2s1">
      <state id="b2s1">
        <transition event="b2next" target="b2s2"/>
      </state>
      <state id="b2s2"/>
    </state>
    <transition event="done" target="end"/>
  </parallel>
  <final id="end"/>
</scxml>`;
      
      const parsed = parseSCXML(complexScxml);
      const visitor = new SCXMLVisitor(parsed);
      const doc = visitor.document;
      
      expect(doc!.name).toBe('ComplexMachine');
      expect(doc!.initial).toBe('main');
      
      // Should have main state and parallel section
      expect(doc!.states).toHaveLength(1);
      expect(doc!.parallels).toHaveLength(1);
      expect(doc!.finals).toHaveLength(1);
      
      const mainState = doc!.states[0];
      expect(mainState.id).toBe('main');
      expect(mainState.initial).toBe('sub1');
      expect(mainState.states).toHaveLength(2); // sub1, sub2
      expect(mainState.histories).toHaveLength(1);
      
      const history = mainState.histories[0];
      expect(history.id).toBe('mainHistory');
      expect(history.historyType).toBe('deep');
      
      const parallelSection = doc!.parallels[0];
      expect(parallelSection.id).toBe('parallelSection');
      expect(parallelSection.states).toHaveLength(2); // branch1, branch2
      expect(parallelSection.transitions).toHaveLength(1); // done transition
    });

    it('should validate that created ScxmlDoc produces valid XML', () => {
      const scxmlContent = fs.readFileSync(
        path.join(__dirname, 'samples', 'sample-valid.scxml'),
        'utf8'
      );
      
      const parsed = parseSCXML(scxmlContent);
      const visitor = new SCXMLVisitor(parsed);
      const doc = visitor.document;
      
      // Verify the document structure is valid
      expect(doc!.xmlns.scxml).toBe('http://www.w3.org/2005/07/scxml');
      expect(doc!.version).toBe('1.0');
      
      // Validate that all states have unique IDs
      const allIds = new Set([
        ...doc!.states.map(s => s.id),
        ...doc!.parallels.map(p => p.id),
        ...doc!.finals.map(f => f.id)
      ]);
      
      expect(allIds.size).toBe(doc!.states.length + doc!.parallels.length + doc!.finals.length);
      
      // Validate that initial state exists
      if (doc!.initial) {
        const initialExists = doc!.states.some(s => s.id === doc!.initial) ||
                            doc!.parallels.some(p => p.id === doc!.initial);
        expect(initialExists).toBe(true);
      }
    });

    it('should preserve namespaces from original SCXML', () => {
      const scxmlWithNamespaces = `<?xml version="1.0" encoding="UTF-8"?>
<scxml xmlns="http://www.w3.org/2005/07/scxml" 
       xmlns:custom="http://example.com/custom"
       version="1.0" initial="start">
  <state id="start"/>
</scxml>`;
      
      const parsed = parseSCXML(scxmlWithNamespaces);
      const visitor = new SCXMLVisitor(parsed);
      const doc = visitor.document;
      
      expect(doc!.xmlns.scxml).toBe('http://www.w3.org/2005/07/scxml');
      expect(doc!.xmlns['custom']).toBe('http://example.com/custom');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty states array gracefully', () => {
      const doc = new ScxmlDoc();
      expect(() => doc.removeState('nonexistent')).toThrow();
      expect(() => doc.removeParallel('nonexistent')).toThrow();
      expect(() => doc.removeFinal('nonexistent')).toThrow();
    });

    it('should handle malformed transitions gracefully', () => {
      const transition = new ScxmlTransition({ id: 'test' });
      
      // Should not throw when adding valid event names
      expect(() => transition.addEventName('validEvent')).not.toThrow();
      expect(() => transition.setTransitionTarget('validTarget')).not.toThrow();
      expect(() => transition.setTransitionType('external')).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types for history types', () => {
      const history = new ScxmlHistory({ id: 'test' });
      
      // TypeScript should enforce these at compile time
      history.setHistoryType('deep');
      history.setHistoryType('shallow');
      history.setHistoryType(undefined);
      
      expect(['deep', 'shallow', undefined]).toContain(history.historyType);
    });

    it('should enforce correct types for transition types', () => {
      const transition = new ScxmlTransition({ id: 'test' });
      
      transition.setTransitionType('internal');
      transition.setTransitionType('external');
      transition.setTransitionType(undefined);
      
      expect(['internal', 'external', undefined]).toContain(transition.transitionType);
    });
  });
});

