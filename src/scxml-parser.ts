
/*!
 * scxml-parser.ts
 * ------------------------------------------------------------------------
 * Streaming-free, DOM-based parser that converts SCXML markup to the
 * in‑memory model defined in `scxml-model.ts`.
 *
 * NOTE: The implementation supports the elements that the model serialiser
 * can currently emit.  It is intentionally minimal and does **not** attempt
 * to evaluate XPath, scripts, or external resources.  Those concerns belong
 * in the interpreter layer.
 *
 * Dependencies:
 *   npm i @xmldom/xmldom
 */

import { createDOMParser } from "./xml-parser";
import {
  SCXML, State, Parallel, Final, History, Transition, TransitionTarget, /* Datamodel, Data, */
  OnEntry, OnExit, Invoke, Finalize,
  Raise, Send, Log, Cancel, Assign, If, ElseIf, Else, Foreach, Script,
  ExecutableContent, ExecutableContentVisitor
} from "./scxml-model";

/* --------------------------------------------------------------------- */
/*  Helper utilities                                                     */
/* --------------------------------------------------------------------- */

function attr(el: Element, name: string): string | undefined {
  const v = el.getAttribute(name);
  return v === null || v === "" ? undefined : v;
}

function splitQNameList(v?: string | null): string | undefined {
  return v ?? undefined;
}

function parseExecutable(el: Element): ExecutableContent {
  switch (el.tagName) {
    case "raise":
      return {
        type: "raise",
        event: attr(el, "event")!,
        accept: () => { /* dummy */ } 
      } as Raise;
    case "log":
      return {
        type: "log",
        label: attr(el, "label"),
        expr: attr(el, "expr"),
        accept: (<R>(_v: ExecutableContentVisitor<R>) => undefined as R) 
      } as Log;
    case "cancel":
      return { 
        type: "cancel", 
        sendid: attr(el, "sendid")!, 
        accept: (<R>(_v: ExecutableContentVisitor<R>) => undefined as R)
      } as Cancel;
    case "assign":
      return {
        type: "assign",
        location: attr(el, "location")!,
        expr: attr(el, "expr"),
        src: attr(el, "src"),
        accept: (<R>(_v: ExecutableContentVisitor<R>) => undefined as R)
      } as Assign;
    case "script":
      return {
        type: "script",
        content: el.textContent ?? "",
        accept: (<R>(_v: ExecutableContentVisitor<R>) => undefined as R)
      } as Script;
    case "send":
      return {
        type: "send",
        event: attr(el, "event")!,
        target: attr(el, "target"),
        delay: attr(el, "delay"),
        namelist: splitQNameList(attr(el, "namelist")),
        params: Object.fromEntries(
          Array.from(el.getElementsByTagName("param")).map(p => [attr(p, "name")!, attr(p, "expr")!])
        ),
        content: el.textContent?.trim() ?? undefined,
        accept: (<R>(_v: ExecutableContentVisitor<R>) => undefined as R)
      } as Send;
    case "if": {
      const thenBody: ExecutableContent[] = [];
      const elseIfs: ElseIf[] = [];
      let elseNode: Else | undefined;

      Array.from(el.childNodes).forEach(n => {
        if (n.nodeType !== n.ELEMENT_NODE) return;
        const c = n as Element;
        switch (c.tagName) {
          case "elseif":
            elseIfs.push({
              type: "elseif",
              cond: attr(c, "cond")!,
              then: Array.from(c.childNodes)
                .filter(nn => nn.nodeType === nn.ELEMENT_NODE)
                .map(nn => parseExecutable(nn as Element)),
              accept: (<R>(_v: ExecutableContentVisitor<R>) => undefined as R)
            });
            break;
          case "else":
            elseNode = {
              type: "else",
              then: Array.from(c.childNodes)
                .filter(nn => nn.nodeType === nn.ELEMENT_NODE)
                .map(nn => parseExecutable(nn as Element)),
              accept: (<R>(_v: ExecutableContentVisitor<R>) => undefined as R)
            };
            break;
          default:
            thenBody.push(parseExecutable(c));
        }
      });

      return {
        type: "if",
        cond: attr(el, "cond")!,
        then: thenBody,
        elseIfs: elseIfs.length ? elseIfs : undefined,
        else: elseNode,
        accept: (<R>(_v: ExecutableContentVisitor<R>) => undefined as R)
      } as If;
    }
    case "foreach":
      return {
        type: "foreach",
        array: attr(el, "array")!,
        item: attr(el, "item")!,
        index: attr(el, "index") ?? undefined,
        body: Array.from(el.childNodes)
          .filter(nn => nn.nodeType == nn.ELEMENT_NODE)
          .map(nn => parseExecutable(nn as Element)),
        accept: (<R>(_v: ExecutableContentVisitor<R>) => undefined as R)
      } as Foreach;
    default:
      return {
        type: "custom",
        name: el.tagName,
        attributes: Object.fromEntries(Array.from(el.attributes).map(a => [a.name, a.value])),
        body: el.textContent || undefined,
        accept: (<R>(_v: ExecutableContentVisitor<R>) => undefined as R)
      };
  }
}

function parseOnX(el?: Element): OnEntry | OnExit | undefined {
  if (!el) return undefined;
  const exec: ExecutableContent[] = Array.from(el.childNodes)
    .filter(n => n.nodeType === n.ELEMENT_NODE)
    .map(n => parseExecutable(n as Element));
  if (el.tagName === "onentry") {
    return new OnEntry({ id: attr(el, "id") ?? "onentry", execution: exec });
  } else {
    return new OnExit({ id: attr(el, "id") ?? "onexit", execution: exec });
  }
}

function parseTransition(el: Element): Transition {
  return new Transition({
    event: attr(el, "event") ?? undefined,
    cond: attr(el, "cond") ?? undefined,
    target: attr(el, "target")?.split(/\s+/) as (TransitionTarget | TransitionTarget[]),
    type: (attr(el, "type") as "internal" | "external") ?? undefined,
    execution: Array.from(el.childNodes)
      .filter(n => n.nodeType === n.ELEMENT_NODE)
      .map(n => parseExecutable(n as Element)),
  });
}

function parseHistory(el: Element): History {
  return new History({
    id: attr(el, "id") ?? "",
    type: (attr(el, "type") as "shallow" | "deep") ?? "shallow",
    transitions: Array.from(el.getElementsByTagName("transition")).map(parseTransition)
  });
}

function parseInvoke(el: Element): Invoke {
  const params = Object.fromEntries(
    Array.from(el.getElementsByTagName("param")).map(p => [attr(p, "name")!, attr(p, "expr")!])
  );
  const finalizeEl = el.getElementsByTagName("finalize").item(0);
  let finalize: Finalize | undefined = undefined;
  if (finalizeEl) {
    finalize = new Finalize({
      execution: Array.from(finalizeEl.childNodes)
        .filter(n => n.nodeType === n.ELEMENT_NODE)
        .map(n => parseExecutable(n as Element))
    });
  }

  return new Invoke({
    type: attr(el, "type") ?? undefined,
    typeexpr: attr(el, "typeexpr") ?? undefined,
    src: attr(el, "src") ?? undefined,
    srcexpr: attr(el, "srcexpr") ?? undefined,
    namelist: attr(el, "namelist") ?? undefined,
    autoforward: attr(el, "autoforward") === "true",
    params: Object.keys(params).length ? params : undefined,
    finalize
  });
}

function parseStateLike(el: Element): State | Parallel | Final {
  switch (el.tagName) {
    case "state": {
      const histories = Array.from(el.getElementsByTagName("history")).map(parseHistory);
      const invokes = Array.from(el.getElementsByTagName("invoke")).map(parseInvoke);
      return new State({
        id: attr(el, "id") ?? "",
        initial: attr(el, "initial") as TransitionTarget,
        onentry: parseOnX(el.getElementsByTagName("onentry").item(0) ?? undefined),
        onexit: parseOnX(el.getElementsByTagName("onexit").item(0) ?? undefined),
        transitions: Array.from(el.getElementsByTagName("transition")).map(parseTransition),
        children: Array.from(el.childNodes)
          .filter(n => n.nodeType === n.ELEMENT_NODE && (n as Element).tagName.match(/^(state|parallel|final)$/))
          .map(n => parseStateLike(n as Element)),
        histories,
        invokes,
      });
    }
    case "parallel": {
      const histories = Array.from(el.getElementsByTagName("history")).map(parseHistory);
      const invokes = Array.from(el.getElementsByTagName("invoke")).map(parseInvoke);
      return new Parallel({
        id: attr(el, "id") ?? "",
        onentry: parseOnX(el.getElementsByTagName("onentry").item(0) ?? undefined),
        onexit: parseOnX(el.getElementsByTagName("onexit").item(0) ?? undefined),
        transitions: Array.from(el.getElementsByTagName("transition")).map(parseTransition),
        children: Array.from(el.childNodes)
          .filter(n => n.nodeType === n.ELEMENT_NODE && (n as Element).tagName.match(/^(state|parallel|final)$/))
          .map(n => parseStateLike(n as Element)),
        histories,
        invokes,
      });
    }
    case "final":
    default:
      return new Final({
        id: attr(el, "id") ?? "",
        onentry: parseOnX(el.getElementsByTagName("onentry").item(0) ?? undefined),
        onexit: parseOnX(el.getElementsByTagName("onexit").item(0) ?? undefined)
      });
  }
}

/* --------------------------------------------------------------------- */

export function parseSCXML(xml: string): SCXML {
  const parser = createDOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const root = doc.documentElement;
  if (root.tagName !== "scxml") {
    throw new Error("Not an <scxml> document");
  }

  const scxml = new SCXML({
    version: attr(root, "version") ?? "1.0",
    initial: attr(root, "initial") as TransitionTarget,
    bindings: (attr(root, "bindings") as "early" | "late") ?? undefined,
    children: Array.from(root.childNodes)
      .filter(n => n.nodeType === n.ELEMENT_NODE && (n as Element).tagName.match(/^(state|parallel|final)$/))
      .map(n => parseStateLike(n as Element)),
  });

  return scxml;
}
