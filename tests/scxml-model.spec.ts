import { SCXML, State, toSCXML } from "../src/scxml-model";
import { parseSCXML } from "../src/scxml-parser";
import { validateXML } from "./custom-xml-validator";

/* ------------------------------------------------------------------ */
/*  Jest tests                                                         */
/* ------------------------------------------------------------------ */

describe("SCXML model", () => {
  
  it("serialises to XSD-valid SCXML", async () => {
    // According to the schema, SCXML elements should NOT have an ID attribute
    const doc = new SCXML({
      initial: "s" as any, // branded TransitionTarget
      children: [new State({ id: "s" })],
    });

    const xml = toSCXML(doc);
    
    // Validate against the W3C SCXML schema using our native xmllint CLI validator
    const result = await validateXML(xml);
    
    if (!result.valid) {
      console.error("XML validation errors:", result.errors);
    }
    
    expect(result.valid).toBe(true);
  });

  it("round-trips serialise → parse → serialise unchanged", () => {
    const doc = new SCXML({
      children: [new State({ id: "s" })],
    });

    const first  = toSCXML(doc);
    const parsed = parseSCXML(first);
    const second = toSCXML(parsed);

    expect(second).toStrictEqual(first);
  });
});
