"use strict";

const fs = require("fs");
const path = require("path");

const CONTRACTS_DIRECTORY = path.join(".minitok", "contracts");

function contractsDirectory(workspaceRoot) {
  return path.resolve(workspaceRoot, CONTRACTS_DIRECTORY);
}

function atomicWrite(filePath, value) {
  const temporary = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temporary, filePath);
}

function writeContract(workspaceRoot, contract) {
  const directory = contractsDirectory(workspaceRoot);
  fs.mkdirSync(directory, { recursive: true });
  const record = { schema_version: 1, updated_at: new Date().toISOString(), ...contract };
  const filePath = path.join(directory, "task-contract.json");
  atomicWrite(filePath, record);
  return filePath;
}

function writeContextManifest(workspaceRoot, manifest) {
  const directory = contractsDirectory(workspaceRoot);
  fs.mkdirSync(directory, { recursive: true });
  const record = { schema_version: 1, updated_at: new Date().toISOString(), ...manifest };
  const filePath = path.join(directory, "context-manifest.json");
  atomicWrite(filePath, record);
  return filePath;
}

function readContract(workspaceRoot) {
  return readJson(path.join(contractsDirectory(workspaceRoot), "task-contract.json"));
}

function readContextManifest(workspaceRoot) {
  return readJson(path.join(contractsDirectory(workspaceRoot), "context-manifest.json"));
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(`Invalid minitok contract state: ${path.basename(filePath)}`);
  }
}

module.exports = { CONTRACTS_DIRECTORY, contractsDirectory, writeContract, writeContextManifest, readContract, readContextManifest };
