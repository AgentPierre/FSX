import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise real TypeScript handlers without credentials or a Next dev server.
// Replace only external boundaries; undeclared imports fail rather than reaching a live service.
export function loadModule(url, dependencies) {
  const compiled = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  const wrapper = vm.runInNewContext(`(function(require, module, exports) { ${compiled}\n})`, {
    process, console: { error() {} },
  });
  wrapper((name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return loaded.exports;
}
