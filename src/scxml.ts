import {
  SCXML, State, Parallel, Final, History, Transition, Data, Datamodel, EventName,
  OnEntry, OnExit, Invoke, Finalize, SCXMLStructureVisitor, Namespaces,
  TransitionTarget
} from "./scxml-model";

export type identifier = string;

export interface HasStates {
  states: ScxmlState[];
  addState(state: ScxmlState): void;
  removeState(stateId: identifier): void;
}

export interface HasParallels {
  parallels: ScxmlParallel[];
  addParallel(parallel: ScxmlParallel): void;
  removeParallel(parallelId: identifier): void;
}

export interface HasFinals {
  finals: ScxmlFinal[];
  addFinal(final: ScxmlFinal): void;
  removeFinal(finalId: identifier): void;
}

export interface HasHistories {
  histories: ScxmlHistory[];
  addHistory(history: ScxmlHistory): void;
  removeHistory(historyId: identifier): void;
}

export interface TransitionSource {
  transitions: ScxmlTransition[];
  addTransition(transition: ScxmlTransition): void;
  removeTransition(transitionId: identifier): void;
}

export interface HasNamespaces {
  xmlns: Namespaces; // TODO: Dont' expose this type
  setNamespace(prefix: string, ns: string): void;
  removeNamespace(prefix: string): void;
}

export interface HasInitial {
  initial?: identifier;
  setInitial(initial: identifier): void;
}

export interface HasIdentifier {
  id: identifier;
  setIdentifier(id: identifier): void;
}

export interface HasName {
  name?: string;
  setName(name: string): void;
}

export interface HasHistoryType {
  historyType?: "shallow" | "deep";
  setHistoryType(name: "shallow" | "deep" | undefined): void;
}

export interface HasTransitionType {
  transitionType?: "internal" | "external";
  setTransitionType(name: "internal" | "external" | undefined): void;
}

export interface HasEventNames {
  events: EventName[]; // TODO: Don't expose this type
  addEventName(event: EventName): void;
  removeEventName(event: EventName): void;
}

export interface HasTarget {
  target?: identifier;
  setTransitionTarget(target: identifier): void;
}

// The top-level wrapper element, which carries version information. The actual state machine consists of its children. Note 
// that only one of the children is active at any one time. See 3.11 Legal State Configurations and Specifications for details.
export class ScxmlDoc implements HasInitial, HasName, HasNamespaces, HasStates, HasParallels, HasFinals
{
  // initial    false	none	IDREFS	none	A legal state specification. See 3.11 Legal State Configurations and Specifications for details.	
  //    The id of the initial state(s) for the document. If not specified, the default initial state is the first child state in document order.
  public initial?: identifier;

  // name       false	none	NMTOKEN	none	Any valid NMTOKEN	The name of this state machine. It is for purely informational purposes.
  public name?: string;

  // xmlns      true	none	URI	none	The value MUST be "http://www.w3.org/2005/07/scxml".
  public readonly xmlns: Namespaces = { scxml: "http://www.w3.org/2005/07/scxml" };

  // version    true	none	decimal	none	The value MUST be "1.0"	
  public readonly version: string = "1.0";

  // <state> A compound or atomic state. Occurs zero or more times.
  public readonly states: ScxmlState[] = [] as ScxmlState[];

  // <parallel> A parallel state. Occurs zero or more times.
  public readonly parallels: ScxmlParallel[] = [] as ScxmlParallel[];

  // <final> A top-level final state in the state machine. Occurs zero or more times.
  public readonly finals: ScxmlFinal[] = [] as ScxmlFinal[];
  
  // binding    false	none	enum	"early"	"early", "late"	The data binding to use. See 5.3.3 Data Binding for details.
  // datamodel  false	none	NMTOKEN	platform-specific	"null", "ecmascript", "xpath" or other platform-defined values.	The datamodel 
  //    that this document requires. "null" denotes the Null datamodel, "ecmascript" the ECMAScript datamodel, and "xpath" the XPath 
  //    datamodel, as defined in B Data Models.
  // <datamodel> Defines part or all of the data model. Occurs 0 or 1 times.
  // <script> Provides scripting capability. Occurs 0 or 1 times.

  public setInitial(initial: identifier): void {
    this.initial = initial;
  }

  public setName(name: string): void {
    this.name = name;
  }

  public setNamespace(prefix: string, ns: string): void {
    this.xmlns[prefix] = ns;
  }
  
  public removeNamespace(prefix: string): void {
    this.xmlns[prefix] = undefined;
    delete this.xmlns[prefix];
  }

  public addState(state: ScxmlState): void {
    this.states.push(state);
  }

  public removeState(stateId: identifier): void {
    const index = this.states.findIndex(x => x.id === stateId);
    if (index !== -1) {
      this.states.splice(index, 1);
    } else {
      throw new Error(`State with id ${stateId} not found.`);
    }
  }

  public addParallel(parallel: ScxmlParallel): void {
    this.parallels.push(parallel);
  }

  public removeParallel(parallelId: identifier): void {
    const index = this.parallels.findIndex(x => x.id === parallelId);
    if (index !== -1) {
      this.parallels.splice(index, 1);
    } else {
      throw new Error(`Parallel with id ${parallelId} not found.`);
    }
  }

  public addFinal(final: ScxmlFinal): void {
    this.finals.push(final);
  }

  public removeFinal(finalId: identifier): void {
    const index = this.finals.findIndex(x => x.id === finalId);
    if (index !== -1) {
      this.finals.splice(index, 1);
    } else {
      throw new Error(`Final with id ${finalId} not found.`);
    }
  }
}

// Holds the representation of a state.
export class ScxmlState implements HasIdentifier, HasInitial, TransitionSource, HasStates, HasParallels, HasFinals, HasHistories
{
  // id	false	none	ID	none	A valid id as defined in [XML Schema]	The identifier for this state. See 3.14 IDs for details.
  public id: identifier;
  
  // initial	false	MUST NOT be specified in conjunction with the <initial> element. MUST NOT occur in atomic states.	
  //    IDREFS	none	A legal state specification. See 3.11 Legal State Configurations and Specifications for details.	The id of the 
  //    default initial state (or states) for this state.
  // <initial> In states that have substates, an optional child which identifies the default initial state. Any transition which 
  //    takes the parent state as its target will result in the state machine also taking the transition contained inside the <initial> 
  //    element.
  public initial?: identifier;

  // <transition> Defines an outgoing transition from this state. Occurs 0 or more times. See 3.5 <transition>
  public readonly transitions: ScxmlTransition[] = [] as ScxmlTransition[];

  // <state> Defines a sequential substate of the parent state. Occurs 0 or more times.
  public readonly states: ScxmlState[] = [] as ScxmlState[];

  // <parallel> Defines a parallel substate. Occurs 0 or more times. See 3.4 <parallel>
  public readonly parallels: ScxmlParallel[] = [] as ScxmlParallel[];

  // <final>. Defines a final substate. Occurs 0 or more times. See 3.7 <final>.
  public readonly finals: ScxmlFinal[] = [] as ScxmlFinal[];
  
  // <history> A child pseudo-state which records the descendant state(s) that the parent state was in the last time the system 
  //    transitioned from the parent. May occur 0 or more times.
  public readonly histories: ScxmlHistory[] = [] as ScxmlHistory[];

  // <onentry> Optional element holding executable content to be run upon entering this <state>. Occurs 0 or more times.
  // <onexit> Optional element holding executable content to be run when exiting this <state>. Occurs 0 or more times.
  // <datamodel> Defines part or all of the data model. Occurs 0 or 1 times. See 5.2 <datamodel>
  // <invoke> Invokes an external service. Occurs 0 or more times. See 6.4 <invoke> for details.

  constructor(options: {
    id: string
  }) {
    this.id = options.id;
  }

  public setIdentifier(id: identifier): void {
    this.id = id;
  }

  public setInitial(initial: identifier): void {
    this.initial = initial;
  }

  public addTransition(transition: ScxmlTransition): void {
    this.transitions.push(transition);
  }

  public removeTransition(transitionId: identifier): void {
    const index = this.transitions.findIndex(x => x.id === transitionId);
    if (index !== -1) {
      this.transitions.splice(index, 1);
    } else {
      throw new Error(`Transition with id ${transitionId} not found.`);
    }
  }

  public addState(state: ScxmlState): void {
    this.states.push(state);
  }

  public removeState(stateId: identifier): void {
    const index = this.states.findIndex(x => x.id === stateId);
    if (index !== -1) {
      this.states.splice(index, 1);
    } else {
      throw new Error(`State with id ${stateId} not found.`);
    }
  }

  public addParallel(parallel: ScxmlParallel): void {
    this.parallels.push(parallel);
  }

  public removeParallel(parallelId: identifier): void {
    const index = this.parallels.findIndex(x => x.id === parallelId);
    if (index !== -1) {
      this.parallels.splice(index, 1);
    } else {
      throw new Error(`Parallel with id ${parallelId} not found.`);
    }
  }

  public addFinal(final: ScxmlFinal): void {
    this.finals.push(final);
  }

  public removeFinal(finalId: identifier): void {
    const index = this.finals.findIndex(x => x.id === finalId);
    if (index !== -1) {
      this.finals.splice(index, 1);
    } else {
      throw new Error(`Final with id ${finalId} not found.`);
    }
  }

  public addHistory(history: ScxmlHistory): void {
    this.histories.push(history);
  }

  public removeHistory(historyId: identifier): void {
    const index = this.histories.findIndex(x => x.id === historyId);
    if (index !== -1) {
      this.histories.splice(index, 1);
    } else {
      throw new Error(`History with id ${historyId} not found.`);
    }
  }
}

// The <parallel> element encapsulates a set of child states which are simultaneously active when the parent element is active.
export class ScxmlParallel implements HasIdentifier, TransitionSource, HasStates, HasParallels, HasHistories
{
  // id	false		ID	none	A valid id as defined in [XML Schema]	The identifier for this state.
  public id: identifier;
  
  // <transition> Defines an outgoing transition from this state. Occurs 0 or more times.
  public readonly transitions: ScxmlTransition[] = [] as ScxmlTransition[];

  // <state> Defines a parallel substate region. Occurs 0 or more times.
  public readonly states: ScxmlState[] = [] as ScxmlState[];

  // <parallel> Defines a nested set of parallel regions. Occurs 0 or more times.
  public readonly parallels: ScxmlParallel[] = [] as ScxmlParallel[];
  
  // <history> A child which represents the state configuration that this state was in the last time the system transitioned from it. 
  //    A transition with this history pseudo-state as its target is in fact a transition to the set of descendant states that were 
  //    active the last time this state was exited. Occurs 0 or more times.
  public readonly histories: ScxmlHistory[] = [] as ScxmlHistory[];
  
  // <onentry> Holds executable content to be run upon entering the <parallel> element. Occurs 0 or more times.
  // <onexit> Holds executable content to be run when exiting this element. Occurs 0 or more times.
  // <datamodel> Defines part or all of the data model. Occurs 0 or 1 times.
  // <invoke> Invokes an external service. Occurs 0 or more times.

  constructor(options: {
    id: string
  }) {
    this.id = options.id;
  }

  public setIdentifier(id: identifier): void {
    this.id = id;
  }

  addTransition(transition: ScxmlTransition): void {
    this.transitions.push(transition);
  }
  removeTransition(transitionId: identifier): void {
    const index = this.transitions.findIndex(x => x.id === transitionId);
    if (index !== -1) {
      this.transitions.splice(index, 1);
    } else {
      throw new Error(`Transition with id ${transitionId} not found.`);
    }
  }

  public addState(state: ScxmlState): void {
    this.states.push(state);
  }

  public removeState(stateId: identifier): void {
    const index = this.states.findIndex(x => x.id === stateId);
    if (index !== -1) {
      this.states.splice(index, 1);
    } else {
      throw new Error(`State with id ${stateId} not found.`);
    }
  }

  public addParallel(parallel: ScxmlParallel): void {
    this.parallels.push(parallel);
  }

  public removeParallel(parallelId: identifier): void {
    const index = this.parallels.findIndex(x => x.id === parallelId);
    if (index !== -1) {
      this.parallels.splice(index, 1);
    } else {
      throw new Error(`Parallel with id ${parallelId} not found.`);
    }
  }

  public addHistory(history: ScxmlHistory): void {
    this.histories.push(history);
  }

  public removeHistory(historyId: identifier): void {
    const index = this.histories.findIndex(x => x.id === historyId);
    if (index !== -1) {
      this.histories.splice(index, 1);
    } else {
      throw new Error(`History with id ${historyId} not found.`);
    }
  }
}

// <final> represents a final state of an <scxml> or compound <state> element.
export class ScxmlFinal implements HasIdentifier
{
  // id	false		ID	none	A valid id as defined in [XML Schema]	The identifier for this state.
  public id: identifier;

  // <onentry> Optional element holding executable content to be run upon entering this state. Occurs 0 or more times.
  // <onexit> Optional element holding executable content to be run when exiting this state. Occurs 0 or more times. 
  // <donedata> Optional element specifying data to be included in the done.state.id or done.invoke.id event.

  constructor(options: {
    id: string
  }) {
    this.id = options.id;
  }

  public setIdentifier(id: identifier): void {
    this.id = id;
  }
}

// The <history> pseudo-state allows a state machine to remember its state configuration. A <transition> taking the <history> state 
// as its target will return the state machine to this recorded configuration.
export class ScxmlHistory implements HasIdentifier, TransitionSource, HasHistoryType
{
  // id	false		ID	none	A valid id as defined in [XML Schema]	Identifier for this pseudo-state. See 3.14 IDs for details.
  public id: identifier;

  // type	false		enum	"shallow"	"deep" or "shallow"	Determines whether the active atomic substate(s) of the current state or only 
  //    its immediate active substate(s) are recorded.
  public historyType?: ("shallow" | "deep");

  // <transition> A transition whose 'target' specifies the default history configuration. Occurs once. In a conformant SCXML document, 
  //    this transition MUST NOT contain 'cond' or 'event' attributes, and MUST specify a non-null 'target' whose value is a valid state 
  //    specification (see 3.11 Legal State Configurations and Specifications). This transition MAY contain executable content. If 'type' 
  //    is "shallow", then the 'target' of this <transition> MUST contain only immediate children of the parent state. Otherwise it MUST 
  //    contain only descendants of the parent. Occurs once. (Note that under the definition of a legal state specification, if the parent 
  //    of the history element is <state> and the default state specification contains a multiple states, then, in a conformant SCXML 
  //    document, the 'type' of the history element MUST be "deep" and the states MUST be atomic descendants of a <parallel> element that 
  //    is itself a descendant of the parent <state> element.)
  public readonly transitions: ScxmlTransition[] = [] as ScxmlTransition[];

  constructor(options: {
    id: string
  }) {
    this.id = options.id;
  }

  public setIdentifier(id: identifier): void {
    this.id = id;
  }

  public setHistoryType(name: "shallow" | "deep" | undefined): void {
    this.historyType = name;
  }

  public addTransition(transition: ScxmlTransition): void {
    this.transitions.push(transition);
  }

  public removeTransition(transitionId: identifier): void {
    const index = this.transitions.findIndex(x => x.id === transitionId);
    if (index !== -1) {
      this.transitions.splice(index, 1);
    } else {
      throw new Error(`Transition with id ${transitionId} not found.`);
    }
  }
}

// Transitions between states are triggered by events and conditionalized via guard conditions. They may contain executable content, which is executed when the transition is taken.
export class ScxmlTransition implements HasIdentifier, HasTransitionType, HasEventNames, HasTarget {

  // Not a part of the SCXML spec
  public id: identifier;

  // event	false		EventsTypes.datatype.	none	A space-separated list of event descriptors. See 3.12.1 Event Descriptors for details.	A list of designators of events that trigger this transition. See 3.13 Selecting and Executing Transitions for details on how transitions are selected and executed. See E Schema for the definition of the datatype.
  public readonly events: EventName[] = [] as EventName[];
  
  // target	false	.	IDREFS	none	A legal state specification. See 3.11 Legal State Configurations and Specifications for details.	The identifier(s) of the state or parallel region to transition to. See 3.13 Selecting and Executing Transitions for details.
  public target?: identifier;
  
  // type	false		enum	"external"	"internal" "external"	Determines whether the source state is exited in transitions whose target state is a descendant of the source state. See 3.13 Selecting and Executing Transitions for details.
  public transitionType?: "internal" | "external";

  // cond	false		Boolean expression	'true'	Any boolean expression. See 5.9.1 Conditional Expressions for details.	The guard condition for this transition. See 3.13 Selecting and Executing Transitions for details.

  constructor(options: {
    id: string
  }) {
    this.id = options.id;
  }

  public setIdentifier(id: identifier): void {
    this.id = id;
  }

  public setTransitionType(name: "internal" | "external" | undefined): void {
    this.transitionType = name;
  }
  
  public addEventName(event: EventName): void {
    this.events.push(event);
  }

  public removeEventName(event: EventName): void {
    const index = this.events.findIndex(x => x === event);
    if (index !== -1) {
      this.events.splice(index, 1);
    } else {
      throw new Error(`Event ${event} not found.`);
    }
  }

  public setTransitionTarget(target: identifier): void {
    this.target = target;
  }
}




export class SCXMLVisitor implements SCXMLStructureVisitor<void> {

  public document?: ScxmlDoc = undefined;
  private states: ScxmlState[] = [] as ScxmlState[];
  private parallels: ScxmlParallel[] = [] as ScxmlParallel[];
  private finals: ScxmlFinal[] = [] as ScxmlFinal[];
  private historys: ScxmlHistory[] = [] as ScxmlHistory[];
  private transitions: ScxmlTransition[] = [] as ScxmlTransition[];

  constructor(scxml: SCXML) {
    scxml.accept(this);
  }

  scxml(node: SCXML): void {

    const document = new ScxmlDoc();

    if(node.initial) {
      document.setInitial(node.initial);
    }
    if(node.name) {
      document.setName(node.name);
    }

    Object.entries(node.xmlns)
      .filter(([k]) => k !== "scxml")
      .map(([k, v]) => ["xmlns:" + k, v])
      .forEach(([k,v]) => {
        if(k !== undefined && v !== undefined) {
          document.setNamespace(k, v);
        }
      });
    
    node.children.forEach(child => {
      if (child instanceof State) {
        const state = this.states.find(x => x.id === child.id);
        if (state !== undefined) {
          document.addState(state);
        }
      }
      else if (child instanceof Parallel) {
        const parallel = this.parallels.find(x => x.id === child.id);
        if(parallel !== undefined) {
          document.addParallel(parallel);
        }
      }
      else if (child instanceof Final) {
        const final = this.finals.find(x => x.id === child.id);
        if(final !== undefined) {
          document.addFinal(final);
        }
      }
    });

  }
  state(node: State): void {
    const state = new ScxmlState({ id: node.id });
      
    if(node.initial) {
      state.setInitial(node.initial);
    }

    node.children.forEach(child => {
      if (child instanceof State) {
        const subState = this.states.find(x => x.id === child.id);
        if (subState !== undefined) {
          state.addState(subState);
        }
      }
      else if (child instanceof Parallel) {
        const subParallel = this.parallels.find(x => x.id === child.id);
        if(subParallel !== undefined) {
          state.addParallel(subParallel);
        }
      }
      else if (child instanceof Final) {
        const subFinal = this.finals.find(x => x.id === child.id);
        if(subFinal !== undefined) {
          state.addFinal(subFinal);
        }
      }
    });

    node.histories.forEach(child => {
      const history = this.historys.find(x => x.id === child.id);
      if(history !== undefined) {
        state.addHistory(history);
      }
    });

    node.transitions.forEach(child => {
      const transition = this.transitions.find(x => x.id === child.id);
      if(transition !== undefined) {
        state.addTransition(transition);
      }
    });

    this.states.push(state);
  }
  parallel(node: Parallel): void {
    const parallel = new ScxmlParallel({ id: node.id });

    node.children.forEach(child => {
      if (child instanceof State) {
        const subState = this.states.find(x => x.id === child.id);
        if (subState !== undefined) {
          parallel.addState(subState);
        }
      }
      else if (child instanceof Parallel) {
        const subParallel = this.parallels.find(x => x.id === child.id);
        if(subParallel !== undefined) {
          parallel.addParallel(subParallel);
        }
      }
    });

    node.histories.forEach(child => {
      const history = this.historys.find(x => x.id === child.id);
      if(history !== undefined) {
        parallel.addHistory(history);
      }
    });

    node.transitions.forEach(child => {
      const transition = this.transitions.find(x => x.id === child.id);
      if(transition !== undefined) {
        parallel.addTransition(transition);
      }
    });
      
    this.parallels.push(parallel);
  }
  final(node: Final): void {
    const final = new ScxmlFinal({ id: node.id });

    this.finals.push(final);
  }
  history(node: History): void {
    const history = new ScxmlHistory({ id: node.id });

    if(node.type) {
      history.setHistoryType(node.type);
    }
    
    node.transitions.forEach(child => {
      const transition = this.transitions.find(x => x.id === child.id);
      if(transition !== undefined) {
        history.addTransition(transition);
      }
    });

    this.historys.push(history);
  }
  transition(node: Transition): void {
    const transition = new ScxmlTransition({ id: node.id });
    
    if(node.event) {
      const events = Array.isArray(node.event) ? node.event : [node.event];
      events.forEach(event => {
        transition.addEventName(event);
      });
    }
    if(node.target) {
      transition.setTransitionTarget(node.target);
    }
    if(node.type) {
      transition.setTransitionType(node.type);
    }

    this.transitions.push(transition);
  }
  invoke(node: Invoke): void {}
  datamodel(node: Datamodel): void {}
  data(node: Data): void {}
  onentry(node: OnEntry): void {}
  onexit(node: OnExit): void {}
  finalize(node: Finalize): void {}
}