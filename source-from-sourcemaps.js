#!/usr/bin/env node

const fs = require("fs");
const util = require("util");
const writeFileP = util.promisify(fs.writeFile);
const readFileP = util.promisify(fs.readFile);
const mkdirp = require("mkdirp");
const path = require("path");
const { SourceMapConsumer } = require("source-map");
const minimist = require("minimist");

async function processSource(consumer, src) {
  const fsSrc =
    "sources-gen/" +
    src
      .replace(/webpack:\/\/\//, "")
      .replace(/~\//, "node_modules/")
      .replace(/\?.+$/, "");
  const source = consumer.sourceContentFor(src, true);
  if (!source) {
    console.warn("Unable to source:", src);
    return;
  }
  await mkdirp(path.dirname(fsSrc));
  await writeFileP(fsSrc, source, "UTF-8");
  console.log(`Wrote ${fsSrc}`);
}

async function processFile(pth) {
  const data = await readFileP(pth, "UTF-8");
  return await SourceMapConsumer.with(data, null, async (consumer) => {
    const processors = consumer.sources.map((src) =>
      processSource(consumer, src)
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
