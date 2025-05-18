
import fs from "fs";
import path from "path";
import https from "https";
import { SCXML, toSCXML, State } from "../src/scxml-model";
import { parseSCXML } from "../src/scxml-parser";
import { validateXML } from "xmllint-wasm";

const SCHEMA_URLS = [
  "https://www.w3.org/2011/04/SCXML/scxml.xsd",
  "https://www.w3.org/2011/04/SCXML/scxml-module-core.xsd",
  "https://www.w3.org/2011/04/SCXML/scxml-module-data.xsd",
  "https://www.w3.org/2011/04/SCXML/scxml-module-external.xsd",
  "https://www.w3.org/2001/xml.xsd",
];

const CACHE_DIR = path.join(__dirname, "schema-cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) return resolve();
    https.get(url, (res) => {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
    }).on("error", reject);
  });
}

async function loadSchemas() {
  const entries: { fileName: string; contents: string }[] = [];
  for (const url of SCHEMA_URLS) {
    const fname = path.join(CACHE_DIR, path.basename(url));
    await download(url, fname);
    
    let fileName = path.basename(url);
    let contents = fs.readFileSync(fname, "utf8");
    if (fileName === "scxml.xsd") {
      contents = contents.replace("http://www.w3.org/2001/xml.xsd", "xml.xsd");
    }
    entries.push({ fileName, contents });

  }
  return entries;
}

describe("SCXML model", () => {
  let schemas: { fileName: string; contents: string }[];

  beforeAll(async () => {
    schemas = await loadSchemas();
  });

  it("produces XSD-valid serialisation", async () => {
    const machine = new SCXML({
      id: "m",
      initial: "s" as any,
      children: [new State({ id: "s" })],
    });
    const xmlDoc = toSCXML(machine);

    const result = await validateXML({
      xml: [{ fileName: "doc.xml", contents: xmlDoc }],
      schema: schemas as any,
    });

    if (!result.valid) console.error(result.errors);
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
