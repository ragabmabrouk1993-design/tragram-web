#!/usr/bin/env node

import { createHash, createPublicKey } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    buildDir: '.next/static',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--build-dir') {
      args.buildDir = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  node packages/webapp/scripts/check-webapp-mt-public-key.mjs [--build-dir <path>]

Checks built webapp JavaScript for embedded PEM public keys. Browser MT encryption should
fetch /api/mt/public-key at runtime; any embedded PEM public key fails this guard.`);
}

function fingerprintPublicKey(pem) {
  const publicKey = createPublicKey(pem);
  const der = publicKey.export({ type: 'spki', format: 'der' });
  return createHash('sha256').update(der).digest('hex');
}

function normalizePotentialPem(value) {
  return value.replace(/\\n/g, '\n').replace(/\\"/g, '"');
}

function extractPublicKeyFingerprints(content) {
  const matches = new Set();
  const patterns = [
    /-----BEGIN PUBLIC KEY-----[\s\S]*?-----END PUBLIC KEY-----/g,
    /-----BEGIN PUBLIC KEY-----(?:\\n|[A-Za-z0-9+/=])+?-----END PUBLIC KEY-----/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      matches.add(normalizePotentialPem(match[0]));
    }
  }

  const fingerprints = [];
  for (const pem of matches) {
    try {
      fingerprints.push(fingerprintPublicKey(pem));
    } catch {
      // Ignore unrelated strings that only resemble a PEM block after minification.
    }
  }

  return [...new Set(fingerprints)];
}

async function listJavaScriptFiles(root) {
  if (!existsSync(root)) {
    throw new Error(`Build directory not found: ${root}`);
  }

  const files = [];

  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(entryPath);
      }
    }
  }

  if (statSync(root).isDirectory()) {
    await visit(root);
  }

  return files;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const buildDir = path.resolve(args.buildDir);
  const files = await listJavaScriptFiles(buildDir);
  const embedded = [];

  for (const file of files) {
    const fingerprints = extractPublicKeyFingerprints(readFileSync(file, 'utf8'));
    for (const fingerprint of fingerprints) {
      embedded.push({ file, fingerprint });
    }
  }

  if (embedded.length > 0) {
    console.error('MT public key preflight failed: built webapp contains embedded PEM public keys.');
    for (const occurrence of embedded) {
      console.error(`- ${path.relative(process.cwd(), occurrence.file)}: ${occurrence.fingerprint}`);
    }
    process.exit(1);
  }

  console.log(`MT public key preflight passed: no embedded PEM public key found in ${buildDir}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
