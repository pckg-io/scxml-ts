
# SCXML‑TS

A TypeScript implementation of the W3C **SCXML 1.0** data‑model,
plus a small parser, serializer and Jest test‑suite.

```
npm install
npm run build
npm test
```

* `src/` – library sources  
* `tests/` – Jest specs  
* `dist/` – compiled output (`npm run build`)

This package purposely **does not** include an interpreter; execution semantics
live in a sibling module so that the data‑model remains runtime‑agnostic.

MIT © 2025
