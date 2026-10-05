// Java's "modified UTF-8", for the strings Minecraft sends inside NBT.
//
// Since 1.20.3 the server sends chat as NBT, and NBT strings are written with
// Java's DataOutput.writeUTF: a character outside the Basic Multilingual
// Plane (an emoji such as 📎) goes as its two UTF-16 surrogates, three bytes
// each (ED A0..AF xx ED B0..BF xx), and NUL as C0 80. mineflayer (through
// protodef and prismarine-nbt) reads every string as standard UTF-8, where
// those bytes are invalid, so each became U+FFFD: Mailboxes' 📎 was captured
// as six replacement characters, though the plugin sends it correctly.
//
// install() makes Buffer#toString('utf8') in this process decode such bytes
// as modified UTF-8. It only changes what would otherwise be U+FFFD: the
// sequences it looks for never occur in valid standard UTF-8, and any other
// buffer is decoded exactly as before. capture.js installs it before its bots
// connect, so it applies to every capture.
'use strict';

// True if buf[start..end) holds an encoded surrogate or an encoded NUL.
function isModified(buf, start, end) {
  for (let i = start; i + 1 < end; i++) {
    const b = buf[i];
    if (b === 0xed && buf[i + 1] >= 0xa0 && buf[i + 1] <= 0xbf) return true;
    if (b === 0xc0 && buf[i + 1] === 0x80) return true;
  }
  return false;
}

// Decodes buf[start..end) as modified UTF-8 (CESU-8, with C0 80 for NUL).
// Standard 4-byte sequences are accepted too; a malformed byte is U+FFFD.
function decode(buf, start = 0, end = buf.length) {
  const units = [];
  let i = start;
  const cont = (k) => i + k < end && (buf[i + k] & 0xc0) === 0x80;
  while (i < end) {
    const b = buf[i];
    if (b < 0x80) { units.push(b); i += 1; } else if ((b & 0xe0) === 0xc0 && cont(1)) {
      units.push(((b & 0x1f) << 6) | (buf[i + 1] & 0x3f)); i += 2;
    } else if ((b & 0xf0) === 0xe0 && cont(1) && cont(2)) {
      units.push(((b & 0x0f) << 12) | ((buf[i + 1] & 0x3f) << 6) | (buf[i + 2] & 0x3f)); i += 3;
    } else if ((b & 0xf8) === 0xf0 && cont(1) && cont(2) && cont(3)) {
      const cp = (((b & 0x07) << 18) | ((buf[i + 1] & 0x3f) << 12) | ((buf[i + 2] & 0x3f) << 6) | (buf[i + 3] & 0x3f)) - 0x10000;
      units.push(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff)); i += 4;
    } else { units.push(0xfffd); i += 1; }
  }
  let out = '';
  for (let k = 0; k < units.length; k += 4096) out += String.fromCharCode(...units.slice(k, k + 4096));
  return out;
}

let installed = false;
function install() {
  if (installed) return;
  installed = true;
  const toString = Buffer.prototype.toString;
  Buffer.prototype.toString = function (encoding, start, end) {
    if (encoding === undefined || encoding === 'utf8' || encoding === 'utf-8') {
      const s = Math.max(0, start | 0);
      const e = end === undefined ? this.length : Math.min(this.length, end | 0);
      if (isModified(this, s, e)) return decode(this, s, e);
    }
    return toString.apply(this, arguments);
  };
}

module.exports = { decode, isModified, install };
