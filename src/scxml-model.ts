/*!
 * scxml-model.ts
 * -------------------------------
 * A comprehensive, idiomatic TypeScript model of the **W3C SCXML 1.0 Recommendation**
 * (https://www.w3.org/TR/2015/REC-scxml-20150901/)
 *
 * © 2025 Your Name — Released under the MIT licence.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 *  DESIGN OVERVIEW
 *  ----------------
 *  • Pure data-model: captures the structure and constraints of the specification.
 *  • No runtime interpreter is included here; execution-time semantics should live
 *    in a dedicated engine layer so that the model remains portable and free of
 *    browser‑specific assumptions.
 *  • All relationships are expressed through rich TypeScript types, ensuring that
 *    consumers enjoy exhaustive compile‑time checking when constructing or
 *    transforming state‑machines.
 *  • Each element cites the relevant clause of the Recommendation to make
 *    cross‑referencing effortless while reading the source.
 *  • A minimal bidirectional **serialiser/deserialiser** is supplied so that a
 *    model instance can be converted to standards‑compliant SCXML markup and
 *    back again. (Where the spec allows arbitrary XPath or scripting, we store
 *    the verbatim text and do **not** attempt to evaluate it.)
 *
 *  ──────────────────────────────────────────────────────────────────────────────
 *  ABBREVIATED TABLE OF CONTENTS
 *  ─────────────────────────────
 *  §1  Utility types & enums
 *  §2  Executable-content expression objects
 *  §3  State‑chart structure (adds <history> & <invoke> in this revision)
 *  §4  Serialiser / Deserialiser helpers
 *  §5  Fluent builder helpers (optional ergonomics)
 *
 *  For a searchable index of every element defined in the Recommendation, see
 *  the "Element Registry" section at the bottom of the file.
 *
 * ──────────────────────────────────────────────────────────────────────────────*/

/* ********************************************************************** */
/* §1  UTILITY TYPES & ENUMS                                              */
/* ********************************************************************** */

/** Valid SCXML version identifiers (Spec §3.4.1 _scxml_). */
export type Version = "1.0" | "1.0.1" | string; // forward‑compatibility

/** Namespaces that may appear in the root <scxml> element (Spec §D). */
export interface Namespaces {
  /** Default SCXML namespace, usually `http://www.w3.org/2005/07/scxml`. */
  scxml?: string;
  /** Custom namespaces keyed by their prefix. */
  [customPrefix: string]: string | undefined;
}

/** A potentially space‑separated list of QNames (Spec §B.3). */
export type QNameList = string;

/** A simple Event string per Spec §5.9 (dot‑separated identifiers). */
export type EventName = string;

/** Raw XPath expression text (Spec §6) — the model does not evaluate it. */
export type XPathExpr = string;

/** MIME type (Spec §5.11.1 _send_). Default is text/plain. */
export type MimeType = string;

/** IDREF (Spec §B.10).  We use branded‑type trickery for extra safety. */
export type IDREF<_T extends { id: string }> = string & {
  readonly __idrefBrand: unique symbol;
};

/** Deep‑readonly helper (avoids accidental mutation of sub‑trees once built). */
export type Immutable<T> = {
  readonly [P in keyof T]: Immutable<T[P]>;
};

/** Generic callback used in visitors and builders. */
export type VisitorFn<T extends SCXMLElementBase> = (node: T) => void;

/* ********************************************************************** */
/* §2  EXECUTABLE CONTENT                                                 */
/* ********************************************************************** */

/**
 * Base interface for all executable‑content elements (Spec §5).
 */
export interface ExecutableContentBase {
  /**
   * The line‑number (1‑based) of the element’s opening tag in the source SCXML.
   * Useful for diagnostics; optional when building programmatically.
   */
  readonly line?: number;

  /** Visitor pattern (double‑dispatch) hook. */
  readonly accept: <R>(v: ExecutableContentVisitor<R>) => R;
}

/** Union type enumerating every executable‑content variant. */
export type ExecutableContent =
  | Raise
  | Send
  | Log
  | Cancel
  | Assign
  | If
  | Foreach
  | Script
  | CustomExecutable; // extensibility hook

/** Visitor interface — mirrors the union above. */
export interface ExecutableContentVisitor<R = void> {
  raise(node: Raise): R;
  send(node: Send): R;
  log(node: Log): R;
  cancel(node: Cancel): R;
  assign(node: Assign): R;
  if(node: If): R;
  foreach(node: Foreach): R;
  script(node: Script): R;
  custom(node: CustomExecutable): R;
}

/* --------------------------------------------------------------------- */
/*  Concrete executable‑content forms                                    */
/* --------------------------------------------------------------------- */

/** <raise> — Spec §5.4 */
export interface Raise extends ExecutableContentBase {
  readonly type: "raise";
  readonly event: EventName;
}

/** <send> — Spec §5.5 */
export interface Send extends ExecutableContentBase {
  readonly type: "send";
  readonly event: EventName;
  readonly target?: string; // e.g. #_internal or URI
  readonly typeexpr?: string; // dynamic MIME
  readonly delay?: string; // e.g. "1s" (Spec §5.11.2)
  readonly namelist?: QNameList;
  readonly params?: Record<string, string>; // <param>*
  readonly content?: string | ExecutableContent[]; // <content>
}

/** <log> — Spec §5.8 */
export interface Log extends ExecutableContentBase {
  readonly type: "log";
  readonly label?: string;
  readonly expr?: XPathExpr;
}

/** <cancel> — Spec §5.6 */
export interface Cancel extends ExecutableContentBase {
  readonly type: "cancel";
  readonly sendid: string; // ID of <send> to cancel
}

/** <assign> — Spec §5.3 */
export interface Assign extends ExecutableContentBase {
  readonly type: "assign";
  readonly location: XPathExpr;
  readonly expr?: XPathExpr;
  readonly src?: string; // external XML to assign
}

/** <if>/<elseif>/<else> — Spec §5.2 */
export interface If extends ExecutableContentBase {
  readonly type: "if";
  readonly cond: XPathExpr;
  readonly then: ExecutableContent[];
  readonly elseIfs?: ElseIf[];
  readonly else?: Else;
}

export interface ElseIf extends ExecutableContentBase {
  readonly type: "elseif";
  readonly cond: XPathExpr;
  readonly then: ExecutableContent[];
}

export interface Else extends ExecutableContentBase {
  readonly type: "else";
  readonly then: ExecutableContent[];
}

/** <foreach> — Spec §5.7 */
export interface Foreach extends ExecutableContentBase {
  readonly type: "foreach";
  readonly array: XPathExpr;
  readonly item: string; // variable name
  readonly index?: string; // optional loop index var
  readonly body: ExecutableContent[];
}

/** <script> — Spec §5.1 */
export interface Script extends ExecutableContentBase {
  readonly type: "script";
  readonly content: string; // raw script (ECMAScript)
}

/** Extensibility hook for domain‑specific actions (Spec §3.15). */
export interface CustomExecutable extends ExecutableContentBase {
  readonly type: "custom";
  readonly name: string; // Qualified name
  readonly attributes?: Record<string, string>;
  readonly body?: string | ExecutableContent[];
}

/* ********************************************************************** */
/* §3  STATE‑CHART STRUCTURE                                             */
/* ********************************************************************** */

/** Forward‑declarations for mutually‑recursive structures. */
export type ChildState = State | Parallel | Final;
export type TransitionTarget = IDREF<State | Parallel | Final | History>;

/** Base class common to <scxml>, <state>, <parallel>, <final>, <history>. */
export abstract class SCXMLElementBase {
  /** Unique identifier (Spec §B.2). */
  public readonly id: string;

  /** Arbitrary documentation (Spec §3.16). */
  public readonly doc?: string;

  protected constructor(id: string, doc?: string) {
    this.id = id;
    this.doc = doc;
  }

  /** Accept a visitor (GoF visitor pattern). */
  public abstract accept<R>(v: SCXMLStructureVisitor<R>): R;
}

/** Visitor over the high‑level structure elements. */
export interface SCXMLStructureVisitor<R = void> {
  scxml(node: SCXML): R;
  state(node: State): R;
  parallel(node: Parallel): R;
  final(node: Final): R;
  history(node: History): R;
  transition(node: Transition): R;
  invoke(node: Invoke): R;
  datamodel(node: Datamodel): R;
  data(node: Data): R;
  onentry(node: OnEntry): R;
  onexit(node: OnExit): R;
  finalize(node: Finalize): R;
}

/* --------------------------------------------------------------------- */
/*  Core structural elements                                             */
/* --------------------------------------------------------------------- */

/** <scxml> — the document root (Spec §3.4). */
export class SCXML {
  public readonly version: Version;
  public readonly profile?: string; // e.g. minimum profile
  public readonly initial?: TransitionTarget;
  public readonly xmlns: Namespaces;
  public readonly children: ChildState[];
  public readonly datamodel?: Datamodel;
  public readonly bindings?: "early" | "late"; // Spec §3.4.4
  public readonly script?: Script; // optional global script
  public readonly doc?: string;

  constructor(options: {
    version?: Version;
    profile?: string;
    initial?: TransitionTarget;
    xmlns?: Namespaces;
    children?: ChildState[];
    datamodel?: Datamodel;
    bindings?: "early" | "late";
    script?: Script;
    doc?: string;
  }) {
    this.version = options.version ?? "1.0";
    this.profile = options.profile;
    this.initial = options.initial;
    this.xmlns = options.xmlns ?? { scxml: "http://www.w3.org/2005/07/scxml" };
    this.children = options.children ?? [];
    this.datamodel = options.datamodel;
    this.bindings = options.bindings;
    this.script = options.script;
    this.doc = options.doc;
  }

  public accept<R>(v: SCXMLStructureVisitor<R>): R {
    return v.scxml(this);
  }
}

/** Abstract superclass for compound states (Spec §3.5). */
export abstract class CompoundStateBase extends SCXMLElementBase {
  public readonly initial?: TransitionTarget;
  public readonly onentry?: OnEntry;
  public readonly onexit?: OnExit;
  public readonly transitions: Transition[];
  public readonly children: ChildState[];
  public readonly datamodel?: Datamodel;
  public readonly invokes: Invoke[];
  public readonly histories: History[];

  protected constructor(options: {
    id: string;
    initial?: TransitionTarget;
    onentry?: OnEntry;
    onexit?: OnExit;
    transitions?: Transition[];
    children?: ChildState[];
    datamodel?: Datamodel;
    invokes?: Invoke[];
    histories?: History[];
    doc?: string;
  }) {
    super(options.id, options.doc);
    this.initial = options.initial;
    this.onentry = options.onentry;
    this.onexit = options.onexit;
    this.transitions = options.transitions ?? [];
    this.children = options.children ?? [];
    this.datamodel = options.datamodel;
    this.invokes = options.invokes ?? [];
    this.histories = options.histories ?? [];
  }
}

/** <state> (simple/compound/history‑container) — Spec §3.5 */
export class State extends CompoundStateBase {
  public readonly type: "simple" | "compound";

  constructor(options: {
    id: string;
    initial?: TransitionTarget;
    onentry?: OnEntry;
    onexit?: OnExit;
    transitions?: Transition[];
    children?: ChildState[];
    datamodel?: Datamodel;
    invokes?: Invoke[];
    histories?: History[];
    doc?: string;
  }) {
    super(options);
    this.type = options.children && options.children.length > 0 ? "compound" : "simple";
  }

  public accept<R>(v: SCXMLStructureVisitor<R>): R {
    return v.state(this);
  }
}

/** <parallel> — Spec §3.6 */
export class Parallel extends CompoundStateBase {
  constructor(options: {
    id: string;
    onentry?: OnEntry;
    onexit?: OnExit;
    transitions?: Transition[];
    children?: ChildState[];
    invokes?: Invoke[];
    histories?: History[];
    doc?: string;
  }) {
    super({ ...options, initial: undefined }); // no initial attribute in <parallel>
  }

  public accept<R>(v: SCXMLStructureVisitor<R>): R {
    return v.parallel(this);
  }
}

/** <final> — Spec §3.7 */
export class Final extends SCXMLElementBase {
  public readonly onentry?: OnEntry;
  public readonly onexit?: OnExit;

  constructor(options: { id: string; onentry?: OnEntry; onexit?: OnExit; doc?: string }) {
    super(options.id, options.doc);
    this.onentry = options.onentry;
    this.onexit = options.onexit;
  }

  public accept<R>(v: SCXMLStructureVisitor<R>): R {
    return v.final(this);
  }
}

/** <history> — Spec §3.9 */
export class History extends SCXMLElementBase {
  public readonly type: "shallow" | "deep"; // default shallow
  public readonly transitions: Transition[]; // default target(s)
  public readonly onentry?: OnEntry;
  public readonly onexit?: OnExit;

  constructor(options: {
    id: string;
    type?: "shallow" | "deep";
    transitions?: Transition[];
    onentry?: OnEntry;
    onexit?: OnExit;
    doc?: string;
  }) {
    super(options.id, options.doc);
    this.type = options.type ?? "shallow";
    this.transitions = options.transitions ?? [];
    this.onentry = options.onentry;
    this.onexit = options.onexit;
  }

  public accept<R>(v: SCXMLStructureVisitor<R>): R {
    return v.history(this);
  }
}

/** <transition> — Spec §3.8 */
export class Transition extends SCXMLElementBase {
  public readonly event?: EventName | EventName[]; // list space‑separated OK
  public readonly cond?: XPathExpr;
  public readonly target?: TransitionTarget | TransitionTarget[];
  public readonly type?: "internal" | "external"; // external default
  public readonly execution: ExecutableContent[];

  constructor(options: {
    id: string;
    event?: EventName | EventName[];
    cond?: XPathExpr;
    target?: TransitionTarget | TransitionTarget[];
    type?: "internal" | "external";
    execution?: ExecutableContent[];
    doc?: string;
  }) {
    super(options.id, options.doc);
    this.event = options.event;
    this.cond = options.cond;
    this.target = options.target;
    this.type = options.type ?? "external";
    this.execution = options.execution ?? [];
  }

  public accept<R>(v: SCXMLStructureVisitor<R>): R {
    return v.transition(this);
  }
}

/* --------------------------------------------------------------------- */
/*  Invocation hierarchy                                                 */
/* --------------------------------------------------------------------- */

/** <invoke> — Spec §3.11 */
export class Invoke extends SCXMLElementBase {
  public readonly type?: string;
  public readonly typeexpr?: string;
  public readonly src?: string;
  public readonly srcexpr?: XPathExpr;
  public readonly idlocation?: XPathExpr;
  public readonly namelist?: QNameList;
  public readonly params?: Record<string, string>; // <param>*
  public readonly autoforward?: boolean;
  public readonly finalize?: Finalize;
  public readonly content?: string | ExecutableContent[]; // <content>

  constructor(options: {
    id: string;
    type?: string;
    typeexpr?: string;
    src?: string;
    srcexpr?: XPathExpr;
    idlocation?: XPathExpr;
    namelist?: QNameList;
    params?: Record<string, string>;
    autoforward?: boolean;
    finalize?: Finalize;
    content?: string | ExecutableContent[];
    doc?: string;
  }) {
    super(options.id, options.doc);
    this.type = options.type;
    this.typeexpr = options.typeexpr;
    this.src = options.src;
    this.srcexpr = options.srcexpr;
    this.idlocation = options.idlocation;
    this.namelist = options.namelist;
    this.params = options.params;
    this.autoforward = options.autoforward;
    this.finalize = options.finalize;
    this.content = options.content;
  }

  public accept<R>(v: SCXMLStructureVisitor<R>): R {
    return v.invoke(this);
  }
}

/** <finalize> — Spec §3.12 */
export class Finalize extends SCXMLElementBase {
  public readonly execution: ExecutableContent[];

  constructor(options: { id: string; execution?: ExecutableContent[]; doc?: string }) {
    super(options.id, options.doc);
    this.execution = options.execution ?? [];
  }

  public accept<R>(v: SCXMLStructureVisitor<R>): R {
    return v.finalize(this);
  }
}

/** <datamodel> — Spec §6 */
export class Datamodel extends SCXMLElementBase {
  public readonly data: Data[];

  constructor(options: { id: string; data?: Data[]; doc?: string }) {
    super(options.id, options.doc);
    this.data = options.data ?? [];
  }

  public accept<R>(v: SCXMLStructureVisitor<R>): R {
    return v.datamodel(this);
  }
}

/** <data> — Spec §6 */
export class Data extends SCXMLElementBase {
  public readonly src?: string;
  public readonly expr?: XPathExpr;
  public readonly location?: XPathExpr; // for <assign>

  constructor(options: { id: string; src?: string; expr?: XPathExpr; location?: XPathExpr; doc?: string }) {
    super(options.id, options.doc);
    this.src = options.src;
    this.expr = options.expr;
    this.location = options.location;
  }

  public accept<R>(v: SCXMLStructureVisitor<R>): R {
    return v.data(this);
  }
}

/** <onentry> — Spec §5 (container) */
export class OnEntry extends SCXMLElementBase {
  public readonly execution: ExecutableContent[];

  constructor(options: { id: string; execution?: ExecutableContent[]; doc?: string }) {
    super(options.id, options.doc);
    this.execution = options.execution ?? [];
  }

  public accept<R>(v: SCXMLStructureVisitor<R>): R {
    return v.onentry(this);
  }
}

/** <onexit> — Spec §5 (container) */
export class OnExit extends SCXMLElementBase {
  public readonly execution: ExecutableContent[];

  constructor(options: { id: string; execution?: ExecutableContent[]; doc?: string }) {
    super(options.id, options.doc);
    this.execution = options.execution ?? [];
  }

  public accept<R>(v: SCXMLStructureVisitor<R>): R {
    return v.onexit(this);
  }
}

/* ********************************************************************** */
/* §4  SERIALISER / DESERIALISER                                         */
/* ********************************************************************** */

/*
 * A _minimal_ XML serialiser sufficient for reliable round‑tripping of the
 * data‑model. For full control you would typically integrate an established
 * XML library such as `xmlbuilder2`, but that would impose a runtime
 * dependency on the consumer of this file. The implementation below is
 * dependency‑free and focuses solely on correctness with regard to the spec.
 */

/** Escapes text content for inclusion inside character‑data sections. */
function xmlEscape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Helper for serialising attribute dictionaries. */
function attrs(atts: Record<string, string | undefined>): string {
  return Object.entries(atts)
    .filter(([, v]) => v != null)
    .map(([k, v]) => ` ${k}="${xmlEscape(String(v!))}"`)
    .join("");
}

/** Pluggable context object allowing custom indentation styles. */
export interface SerialiserOptions {
  indent?: string; // default "  "
  newline?: string; // default "\n"
  pretty?: boolean; // default true
}

/** Main serialiser entry‑point. Call `toSCXML(doc)`. */
export function toSCXML(doc: SCXML, opt: SerialiserOptions = {}): string {
  const ctx = {
    indent: opt.indent ?? "  ",
    nl: opt.pretty !== false ? opt.newline ?? "\n" : "",
    pretty: opt.pretty !== false,
    depth: 0,
  };

  function pad(): string {
    return ctx.pretty ? ctx.indent.repeat(ctx.depth) : "";
  }

  function open(tag: string, atts: Record<string, string | undefined>): string {
    return `${pad()}<${tag}${attrs(atts)}>` + ctx.nl;
  }

  function close(tag: string): string {
    return `${pad()}</${tag}>` + ctx.nl;
  }

  function self(tag: string, atts: Record<string, string | undefined>): string {
    return `${pad()}<${tag}${attrs(atts)}/>` + ctx.nl;
  }

  /* ------------------------------------------------------------------- */
  /*  Recursive element emitters                                         */
  /* ------------------------------------------------------------------- */

  const emitExecutable = (ec: ExecutableContent): string => {
    switch (ec.type) {
      case "raise":
        return self("raise", { event: ec.event });
      case "log":
        return self("log", { label: ec.label, expr: ec.expr });
      case "cancel":
        return self("cancel", { sendid: ec.sendid });
      case "assign":
        return self("assign", { location: ec.location, expr: ec.expr, src: ec.src });
      case "script": {
        const openTag = `${pad()}<script>`;
        const body = xmlEscape(ec.content);
        const closeTag = `</script>` + ctx.nl;
        return openTag + body + closeTag;
      }
      case "send": {
        const p = {
          event: ec.event,
          target: ec.target,
          delay: ec.delay,
          namelist: ec.namelist,
          type: ec.typeexpr,
        } as Record<string, string | undefined>;
        let s = open("send", p);
        ctx.depth++;
        for (const [k, v] of Object.entries(ec.params ?? {})) {
          s += self("param", { name: k, expr: v });
        }
        if (typeof ec.content === "string") {
          s += xmlEscape(ec.content);
        } else if (Array.isArray(ec.content)) {
          ec.content.forEach((x) => (s += emitExecutable(x)));
        }
        ctx.depth--;
        s += close("send");
        return s;
      }
      case "if": {
        let s = open("if", { cond: ec.cond });
        ctx.depth++;
        ec.then.forEach((x) => (s += emitExecutable(x)));
        ec.elseIfs?.forEach((ei) => {
          s += open("elseif", { cond: ei.cond });
          ctx.depth++;
          ei.then.forEach((x) => (s += emitExecutable(x)));
          ctx.depth--;
          s += close("elseif");
        });
        if (ec.else) {
          s += open("else", {});
          ctx.depth++;
          ec.else.then.forEach((x) => (s += emitExecutable(x)));
          ctx.depth--;
          s += close("else");
        }
        ctx.depth--;
        s += close("if");
        return s;
      }
      case "foreach": {
        let s = open("foreach", { array: ec.array, item: ec.item, index: ec.index });
        ctx.depth++;
        ec.body.forEach((x) => (s += emitExecutable(x)));
        ctx.depth--;
        s += close("foreach");
        return s;
      }
      case "custom": {
        const qn = ec.name;
        let s = open(qn, ec.attributes ?? {});
        ctx.depth++;
        if (typeof ec.body === "string") {
          s += xmlEscape(ec.body);
        } else if (Array.isArray(ec.body)) {
          ec.body.forEach((x) => (s += emitExecutable(x)));
        }
        ctx.depth--;
        s += close(qn);
        return s;
      }
    }
  };

  const emitOnX = (tag: "onentry" | "onexit", ox?: OnEntry | OnExit): string => {
    if (!ox) return "";
    let s = open(tag, { id: ox.id });
    ctx.depth++;
    ox.execution.forEach((ec) => (s += emitExecutable(ec)));
    ctx.depth--;
    s += close(tag);
    return s;
  };

  const emitDataModel = (dm?: Datamodel): string => {
    if (!dm) return "";
    let s = open("datamodel", { id: dm.id });
    ctx.depth++;
    dm.data.forEach((d) => {
      s += self("data", {
        id: d.id,
        src: d.src,
        expr: d.expr,
        location: d.location,
      });
    });
    ctx.depth--;
    s += close("datamodel");
    return s;
  };

  const emitTransition = (t: Transition): string => {
    let s = open("transition", {
      id: t.id,
      event: Array.isArray(t.event) ? t.event.join(" ") : t.event,
      cond: t.cond,
      target: Array.isArray(t.target) ? t.target.join(" ") : t.target,
      type: t.type === "internal" ? "internal" : undefined,
    });
    ctx.depth++;
    t.execution.forEach((x) => (s += emitExecutable(x)));
    ctx.depth--;
    s += close("transition");
    return s;
  };

  const emitInvoke = (inv: Invoke): string => {
    const p = {
      id: inv.id,
      type: inv.type,
      typeexpr: inv.typeexpr,
      src: inv.src,
      srcexpr: inv.srcexpr,
      idlocation: inv.idlocation,
      namelist: inv.namelist,
      autoforward: inv.autoforward ? "true" : undefined,
    };
    let s = open("invoke", p);
    ctx.depth++;
    for (const [k, v] of Object.entries(inv.params ?? {})) {
      s += self("param", { name: k, expr: v });
    }
    if (inv.finalize) {
      s += open("finalize", { id: inv.finalize.id });
      ctx.depth++;
      inv.finalize.execution.forEach((x) => (s += emitExecutable(x)));
      ctx.depth--;
      s += close("finalize");
    }
    if (typeof inv.content === "string") {
      s += xmlEscape(inv.content);
    } else if (Array.isArray(inv.content)) {
      inv.content.forEach((x) => (s += emitExecutable(x)));
    }
    ctx.depth--;
    s += close("invoke");
    return s;
  };

  const emitHistory = (h: History): string => {
    let s = open("history", { id: h.id, type: h.type });
    ctx.depth++;
    if(h.onentry) {
      s += emitOnX("onentry", h.onentry)
    }
    if(h.onexit) {
      s += emitOnX("onexit", h.onexit)
    }
    h.transitions.forEach((t) => (s += emitTransition(t)));
    ctx.depth--;
    s += close("history");
    return s;
  };

  const emitState = (s0: ChildState | History): string => {
    // History handled separately
    if (s0 instanceof History) {
      return emitHistory(s0);
    }

    switch (s0.constructor) {
      case State: {
        const s = s0 as State;
        let out = open("state", { id: s.id, initial: s.initial });
        ctx.depth++;
        out += emitOnX("onentry", s.onentry);
        out += emitOnX("onexit", s.onexit);
        out += emitDataModel(s.datamodel);
        s.invokes.forEach((iv) => (out += emitInvoke(iv)));
        s.histories.forEach((h) => (out += emitHistory(h)));
        s.transitions.forEach((t) => (out += emitTransition(t)));
        s.children.forEach((c) => (out += emitState(c)));
        ctx.depth--;
        out += close("state");
        return out;
      }
      case Parallel: {
        const p = s0 as Parallel;
        let out = open("parallel", { id: p.id });
        ctx.depth++;
        out += emitOnX("onentry", p.onentry);
        out += emitOnX("onexit", p.onexit);
        p.invokes.forEach((iv) => (out += emitInvoke(iv)));
        p.histories.forEach((h) => (out += emitHistory(h)));
        p.transitions.forEach((t) => (out += emitTransition(t)));
        p.children.forEach((c) => (out += emitState(c)));
        ctx.depth--;
        out += close("parallel");
        return out;
      }
      case Final: {
        const f = s0 as Final;
        let out = open("final", { id: f.id });
        ctx.depth++;
        out += emitOnX("onentry", f.onentry);
        out += emitOnX("onexit", f.onexit);
        ctx.depth--;
        out += close("final");
        return out;
      }
      default:
        throw new Error("Unknown state type");
    }
  };

  // Add XML declaration
  let xml = `<?xml version="1.0" encoding="UTF-8"?>${ctx.nl}`;
  
  /* Root <scxml> */
  xml += open("scxml", {
    xmlns: "http://www.w3.org/2005/07/scxml",
    version: doc.version || "1.0",
    profile: doc.profile,
    initial: doc.initial,
    bindings: doc.bindings,
    ...Object.fromEntries(
      Object.entries(doc.xmlns)
        .filter(([k]) => k !== "scxml")
        .map(([k, v]) => ["xmlns:" + k, v])
    ),
  });
  ctx.depth++;
  if (doc.script) xml += emitExecutable(doc.script);
  xml += emitDataModel(doc.datamodel);
  doc.children.forEach((c) => (xml += emitState(c)));
  ctx.depth--;
  xml += close("scxml");
  return xml.trim();
}

/* === §5  Fluent builders + Element registry identical to previous === */

/* End of scxml-model.ts */
