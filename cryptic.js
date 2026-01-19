#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 200000, 32, 'sha256');
}

function encrypt(text, password) {
  const salt = crypto.randomBytes(16);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decrypt(data, password) {
  const [saltHex, ivHex, tagHex, encrypted] = data.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const key = deriveKey(password, salt);
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const args = process.argv.slice(2);

if (args.length < 3 || !['-e','-d'].includes(args[0])) {
  console.log(`
Usage: node cryptic.js -e|-d <file> <password>
  -e  Encrypt mode
  -d  Decrypt mode
File argument is mandatory. Password argument is mandatory.
Output file will be auto-generated as encrypt_<file> or decrypt_<file>
`);
  process.exit(0);
}

const mode = args[0] === '-e' ? 'encrypt' : 'decrypt';
const inputFile = args[1];
const password = args[2];

// Auto-generate output file name
const inputBase = path.basename(inputFile);
const outputFile = path.join(
  path.dirname(inputFile),
  `${mode}_${inputBase}`
);

try {
  const inputData = fs.readFileSync(inputFile, 'utf8');
  const outputData = mode === 'encrypt' ? encrypt(inputData, password) : decrypt(inputData, password);
  fs.writeFileSync(outputFile, outputData, 'utf8');
  console.log(`Success: ${mode}ed file saved to ${outputFile}`);
} catch (err) {
  console.error('Error:', err.message);
}
