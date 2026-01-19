# Simple AES-256-GCM File Encrypt/Decrypt CLI


## Installation

```bash
git clone git@github.com:Jee-vim/cryptic
cd cryptic
```

Make the script executable:
```bash
chmod +x cryptic.js
```
 

(Optional) Add to your system PATH to run it globally:
```bash
sudo ln -s $(pwd)/cryptic.js /usr/local/bin/cryptic
```


You can now run the tool directly as ./cryptic.js or cryptic if added to PATH.

## Usage
Encrypt a File
```bash
./cryptic.js -e <file> <password>
```

Decrypt a File
```bash
./cryptic.js -d <file> <password>
```

Help
```bash
./cryptic.js -h
```


Displays usage instructions and available flags.

## Notes

- Use a strong password; weak passwords can still be brute-forced.
- AES-256-GCM provides integrity checks; modified ciphertext will fail to decrypt.
- Designed for local use only, files are not uploaded anywhere.

