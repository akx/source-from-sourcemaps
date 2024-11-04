#!/usr/bin/env node

const fsp = require("fs/promises");
const path = require("path");
const { SourceMapConsumer } = require("source-map");
const minimist = require("minimist");

async function processSource(consumer, src) {
  const source = consumer.sourceContentFor(src, true);
  if (!source) {
    console.warn("Unable to source:", src);
    return;
  }
  const sanitizedPath = path
    .normalize(
      src
        .replace(/webpack:\/\/\//, "")
        .replace(/~\//, "node_modules/")
        .replace(/\?.+$/, ""),
    )
    .replace(/^(\.\.\/)+/, "");
  const fsSrc = path.join("sources-gen", sanitizedPath);
  await fsp.mkdir(path.dirname(fsSrc), { recursive: true });
  await fsp.writeFile(fsSrc, source, "UTF-8");
  console.log(`Wrote ${fsSrc}`);
}

async function processFile(pth) {
  const data = await fsp.readFile(pth, "UTF-8");
  return await SourceMapConsumer.with(data, null, async (consumer) => {
    const processors = consumer.sources.map((src) =>
      processSource(consumer, src),
    );
    return await Promise.all(processors);
  });
}

async function main() {
  const args = minimist(process.argv.slice(2));
  const processors = args._.map((pth) => processFile(pth));
  return await Promise.all(processors);
}

if (!module.parent) {
  main().then(() => process.exit(0));
}
