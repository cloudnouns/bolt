#! /usr/bin/env node

import { existsSync } from "fs";
import { readConfigAndGenerateTypes, createConfigFile } from "./bolt.js";

const args = process.argv.slice(2, process.argv.length);
const action = args[0];

if (["init", "i"].includes(action)) {
  console.log("Looking for config file...");

  if (existsSync("bolt.toml")) {
    console.log("Found! Generating types...");
    await readConfigAndGenerateTypes();
  } else {
    console.log("not found. creating bolt.toml");
    createConfigFile();
    console.log("update bolt.toml and run `npx bolt g` to generate types");
  }
} else if (["generate", "g"].includes(action)) {
  console.log("generating types...");
  const pathToConfig = args[1] || "bolt.toml";

  if (!existsSync(pathToConfig)) {
    console.error("config file not found:", pathToConfig);
    process.exit(1);
  }

  await readConfigAndGenerateTypes(pathToConfig);
} else {
  console.error("Missing or unknown command");
}

process.exit(0);
