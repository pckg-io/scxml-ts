
import fs from "fs";
import path from "path";
import https from "https";
import { SCXML, toSCXML, State } from "../src/scxml-model";
import { parseSCXML } from "../src/scxml-parser";
import { validateXML } from "xmllint-wasm";

const XSD_URL = "https://www.w3.org/2005/07/scxml.xsd";
const XSD_CACHE = path.join(__dirname, "scxml.xsd");

async function fetchXSD(): Promise<string> {
  if (fs.existsSync(XSD_CACHE)) return fs.readFileSync(XSD_CACHE, "utf8");
  const data = await new Promise<string>((resolve, reject) => {
    https.get(XSD_URL, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(d));
    }).on("error", reject);
  });
  fs.writeFileSync(XSD_CACHE, data, "utf8");
  return data;
}

describe("SCXML model", () => {
  let xsdStr: string;

  beforeAll(async () => {
    xsdStr = await fetchXSD();
  });

  it("produces XSD-valid serialisation", async () => {
    const machine = new SCXML({
      id: "m",
      children: [new State({ id: "s" })],
    });
    const xml = toSCXML(machine);

    const result = await validateXML({
      xml: [xml],
      schema: [xsdStr],
    });

    expect(result.valid).toBe(true);
  });

  it("round-trips serialise → parse → serialise unchanged", () => {
    const machine = new SCXML({
      id: "m2",
      children: [new State({ id: "s" })],
    });
    const first = toSCXML(machine);
    const parsed = parseSCXML(first);
    const second = toSCXML(parsed);

    expect(first).toStrictEqual(second);
  });
});
