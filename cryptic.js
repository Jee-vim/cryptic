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

if (args.length < 2 || !['-e', '-d'].includes(args[0])) {
  console.log(`
Usage: node cryptic.js -e|-d <file>
  -e  Encrypt mode
  -d  Decrypt mode
File argument is mandatory.
Password will be prompted securely.
Output file will be auto-generated as encrypt_<file> or decrypt_<file>
`);
  process.exit(0);
}

const mode = args[0] === '-e' ? 'encrypt' : 'decrypt';
const inputFile = args[1];
const inputBase = path.basename(inputFile);

let outputFile;

if (mode === 'encrypt') {
  outputFile = path.join(path.dirname(inputFile), `encrypt_${inputBase}`);
} else {
  if (inputBase.startsWith('encrypt_')) {
    outputFile = path.join(path.dirname(inputFile), inputBase.slice(8));
  } else {
    outputFile = path.join(path.dirname(inputFile), `decrypt_${inputBase}`);
  }
}

function promptPassword(prompt = 'Password: ') {
  return new Promise(resolve => {
    process.stdout.write(prompt);

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    function onData(char) {
      char = String(char);

      // Enter
      if (char === '\r' || char === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
        return;
      }

      // Ctrl+C
      if (char === '\u0003') {
        process.exit(130);
      }

      // Backspace
      if (char === '\u007f') {
        password = password.slice(0, -1);
        return;
      }

      password += char;
    }

    stdin.on('data', onData);
  });
}

(async () => {
  try {
    const password = await promptPassword();

    const inputData = fs.readFileSync(inputFile, 'utf8');
    const outputData =
      mode === 'encrypt'
        ? encrypt(inputData, password)
        : decrypt(inputData, password);

    fs.writeFileSync(outputFile, outputData, 'utf8');
    console.log(`Success: ${mode}ed file saved to ${outputFile}`);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
