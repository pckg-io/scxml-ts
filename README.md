
# SCXML-TS

[![npm version](https://badge.fury.io/js/scxml-ts.svg)](https://www.npmjs.com/package/scxml-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/pckg-io/scxml-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/pckg-io/scxml-ts/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/scxml-ts.svg)](https://www.npmjs.com/package/scxml-ts)

A TypeScript implementation of the [W3C SCXML 1.0](https://www.w3.org/TR/scxml/) data model, parser, serializer, and utilities.

## Features

- Complete TypeScript model for W3C SCXML 1.0 Recommendation
- Strongly-typed interfaces with rich type declarations
- Parser to convert SCXML XML to TypeScript objects
- Serializer to convert TypeScript objects back to valid SCXML XML
- Comprehensive test suite with sample SCXML documents

## Installation

```bash
npm install scxml-ts
```

or

```bash
yarn add scxml-ts
```

## Usage

### Parsing SCXML from XML

```typescript
import { parseScxml } from 'scxml-ts';

// Parse from XML string
const scxml = parseScxml(`
  <scxml version="1.0" xmlns="http://www.w3.org/2005/07/scxml">
    <state id="main">
      <transition event="done" target="final" />
    </state>
    <final id="final" />
  </scxml>
`);

console.log(scxml.states[0].id); // "main"
```

### Creating SCXML models programmatically

```typescript
import { SCXML, State, Transition } from 'scxml-ts';

// Create a model programmatically
const scxml = new SCXML({
  version: "1.0",
  initialState: "idle",
  states: [
    new State({
      id: "idle",
      transitions: [
        new Transition({
          event: "start",
          target: "active"
        })
      ]
    }),
    new State({
      id: "active"
    })
  ]
});
```

### Serializing to XML

```typescript
import { serializeScxml } from 'scxml-ts';

// Assuming you have a SCXML model object
const xmlString = serializeScxml(scxml);
console.log(xmlString);
// Outputs valid SCXML XML
```

## Project Structure

* `src/` – Library source files
* `tests/` – Jest test specifications
* `dist/` – Compiled output (after running `npm run build`)

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Lint the codebase
npm run lint
```

## Note

This package purposely **does not** include an interpreter; execution semantics 
live in a separate module so that the data model remains runtime-agnostic.

## License

MIT © 2025 Sam Chapman