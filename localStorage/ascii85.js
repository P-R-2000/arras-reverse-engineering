// https://www.npmjs.com/package/ascii85
// adapted for this project

var ASCII85_BASE = 85;
var ASCII85_CODE_START = 33;
var ASCII85_CODE_END = ASCII85_CODE_START + ASCII85_BASE;
var ASCII85_NULL = String.fromCharCode(0);
var ASCII85_NULL_STRING = ASCII85_NULL + ASCII85_NULL + ASCII85_NULL + ASCII85_NULL;
var ASCII85_ZERO = 'z';
var ASCII85_ZERO_VALUE = ASCII85_ZERO.charCodeAt(0);
var ASCII85_PADDING_VALUE = 'u'.charCodeAt(0);
var ASCII85_ENCODING_GROUP_LENGTH = 4;
var ASCII85_DECODING_GROUP_LENGTH = 5;
var ASCII85_BLOCK_START = '<~';
var ASCII85_BLOCK_START_LENGTH = ASCII85_BLOCK_START.length;
var ASCII85_BLOCK_START_VALUE = Buffer.from(ASCII85_BLOCK_START).readUInt16BE(0);
var ASCII85_BLOCK_END = '~>';
var ASCII85_BLOCK_END_LENGTH = ASCII85_BLOCK_END.length;
var ASCII85_BLOCK_END_VALUE = Buffer.from(ASCII85_BLOCK_END).readUInt16BE(0);
var ASCII85_GROUP_SPACE = 'y';
var ASCII85_GROUP_SPACE_VALUE = ASCII85_GROUP_SPACE.charCodeAt(0);
var ASCII85_GROUP_SPACE_CODE = 0x20202020;
var ASCII85_GROUP_SPACE_STRING = '    ';

var ASCII85_DEFAULT_ENCODING_TABLE = (function() {
  var arr = new Array(ASCII85_BASE);
  var i;

  for (i = 0; i < ASCII85_BASE; i++) {
    arr[i] = String.fromCharCode(ASCII85_CODE_START + i);
  }

  return arr;
})();

var ASCII85_DEFAULT_DECODING_TABLE = (function() {
  var arr = new Array(1 << 8);
  var i;

  for (i = 0; i < ASCII85_BASE; i++) {
    arr[ASCII85_CODE_START + i] = i;
  }

  return arr;
})();

module.exports.encode = function(data, table) {
  var bytes = new Uint8Array(5);
  var buf = Buffer.from(data, 'binary');
  var output, offset, delimiter, groupSpace, digits, cur, i, j, r, b, len, padding;

  // estimate output length and alloc buffer for it.
  offset = 0;
  len = Math.ceil(buf.length * ASCII85_DECODING_GROUP_LENGTH / ASCII85_ENCODING_GROUP_LENGTH) +
        ASCII85_ENCODING_GROUP_LENGTH;
  output = Buffer.allocUnsafe(len);

  // iterate over all data bytes.
  for (i = digits = cur = 0, len = buf.length; i < len; i++) {
    b = buf.readUInt8(i);

    cur *= 1 << 8;
    cur += b;
    digits++;

    if (digits % ASCII85_ENCODING_GROUP_LENGTH) {
      continue;
    }

    if (groupSpace && cur === ASCII85_GROUP_SPACE_CODE) {
      offset += output.write(ASCII85_GROUP_SPACE, offset);
    } else {
      for (j = ASCII85_ENCODING_GROUP_LENGTH; j >= 0; j--) {
        r = cur % ASCII85_BASE;
        bytes[j] = r;
        cur = (cur - r) / ASCII85_BASE;
      }

      for (j = 0; j < ASCII85_DECODING_GROUP_LENGTH; j++) {
        offset += output.write(table[bytes[j]], offset);
      }
    }

    cur = 0;
    digits = 0;
  }

  // add padding for remaining bytes.
  if (digits) {
    if (cur) {
      padding = ASCII85_ENCODING_GROUP_LENGTH - digits;

      for (i = ASCII85_ENCODING_GROUP_LENGTH - digits; i > 0; i--) {
        cur *= 1 << 8;
      }

      for (j = ASCII85_ENCODING_GROUP_LENGTH; j >= 0; j--) {
        r = cur % ASCII85_BASE;
        bytes[j] = r;
        cur = (cur - r) / ASCII85_BASE;
      }

      for (j = 0; j < ASCII85_DECODING_GROUP_LENGTH; j++) {
        offset += output.write(table[bytes[j]], offset);
      }

      offset -= padding;
    } else {
      // If remaining bytes are zero, need to insert '!' instead of 'z'.
      // This is a special case.
      for (i = 0; i < digits + 1; i++) {
        offset += output.write(table[0], offset);
      }
    }
  }

  if (delimiter) {
    offset += output.write(ASCII85_BLOCK_END, offset);
  }

  return output.slice(0, offset);
};

module.exports.decode = function(str, table) {
  var defOptions = this._options;
  var buf = str;
  var enableZero = true;
  var enableGroupSpace = true;
  var output, offset, digits, cur, i, c, t, len, padding;

  table = table || defOptions.decodingTable || ASCII85_DEFAULT_DECODING_TABLE;

  // convert a key/value format char map to code array.
  if (!Array.isArray(table)) {
    table = table.table || table;

    if (!Array.isArray(table)) {
      t = [];
      Object.keys(table).forEach(function(v) {
        t[v.charCodeAt(0)] = table[v];
      });
      table = t;
    }
  }

  enableZero = !table[ASCII85_ZERO_VALUE];
  enableGroupSpace = !table[ASCII85_GROUP_SPACE_VALUE];

  if (!(buf instanceof Buffer)) {
    buf = Buffer.from(buf);
  }

  // estimate output length and alloc buffer for it.
  t = 0;

  if (enableZero || enableGroupSpace) {
    for (i = 0, len = buf.length; i < len; i++) {
      c = buf.readUInt8(i);

      if (enableZero && c === ASCII85_ZERO_VALUE) {
        t++;
      }

      if (enableGroupSpace && c === ASCII85_GROUP_SPACE_VALUE) {
        t++;
      }
    }
  }

  offset = 0;
  len = Math.ceil(buf.length * ASCII85_ENCODING_GROUP_LENGTH / ASCII85_DECODING_GROUP_LENGTH) +
        t * ASCII85_ENCODING_GROUP_LENGTH +
        ASCII85_DECODING_GROUP_LENGTH;
  output = Buffer.allocUnsafe(len);

  // if str starts with delimiter ('<~'), it must end with '~>'.
  if (buf.length >= ASCII85_BLOCK_START_LENGTH + ASCII85_BLOCK_END_LENGTH && buf.readUInt16BE(0) === ASCII85_BLOCK_START_VALUE) {
    for (i = buf.length - ASCII85_BLOCK_END_LENGTH; i > ASCII85_BLOCK_START_LENGTH; i--) {
      if (buf.readUInt16BE(i) === ASCII85_BLOCK_END_VALUE) {
        break;
      }
    }

    if (i <= ASCII85_BLOCK_START_LENGTH) {
      throw new Error('Invalid ascii85 string delimiter pair.');
    }

    buf = buf.slice(ASCII85_BLOCK_START_LENGTH, i);
  }

  for (i = digits = cur = 0, len = buf.length; i < len; i++) {
    c = buf.readUInt8(i);

    if (enableZero && c === ASCII85_ZERO_VALUE) {
      offset += output.write(ASCII85_NULL_STRING, offset);
      continue;
    }

    if (enableGroupSpace && c === ASCII85_GROUP_SPACE_VALUE) {
      offset += output.write(ASCII85_GROUP_SPACE_STRING, offset);
      continue;
    }

    if (table[c] === undefined) {
      continue;
    }

    cur *= ASCII85_BASE;
    cur += table[c];
    digits++;

    if (digits % ASCII85_DECODING_GROUP_LENGTH) {
      continue;
    }

    offset = output.writeUInt32BE(cur, offset);
    cur = 0;
    digits = 0;
  }

  if (digits) {
    padding = ASCII85_DECODING_GROUP_LENGTH - digits;

    for (i = 0; i < padding; i++) {
      cur *= ASCII85_BASE;
      cur += ASCII85_BASE - 1;
    }

    for (i = 3, len = padding - 1; i > len; i--) {
      offset = output.writeUInt8((cur >>> (i * 8)) & 0xFF, offset);
    }
  }

  return output.slice(0, offset);
};