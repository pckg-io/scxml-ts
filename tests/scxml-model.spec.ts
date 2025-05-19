import { SCXML, State, toSCXML } from "../src/scxml-model";
import { parseSCXML } from "../src/scxml-parser";
import { validateXML } from "./custom-xml-validator";

describe("SCXML model", () => {
  
  it("serialises to XSD-valid SCXML", async () => {
    
    const doc = new SCXML({
      initial: "s" as any,
      children: [new State({ id: "s" })],
    });

    const xml = toSCXML(doc);
    
    // Act
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
