const crypto = require("crypto");
const ascii85 = require("./ascii85");
const localStorageDef = require("./localStorageDef.json");

function rotl(x, n) {
    return x << n | x >>> (32 - n);
}

function generateKey(a) {
    const b = new Int32Array(a);
    let c,d,e,f;
    for (let i = 0; i < 10; i++) {
        b[3] = b[7] + b[3];
        b[15] = rotl(b[3] ^ b[15], 16);
        b[11] = b[15] + b[11];
        b[7] = rotl(b[11] ^ b[7], 12);
        b[2] = b[6] + b[2];
        b[14] = rotl(b[2] ^ b[14], 16);
        b[10] = b[14] + b[10];
        b[6] = rotl(b[10] ^ b[6], 12);
        b[1] = b[5] + b[1];
        b[13] = rotl(b[1] ^ b[13], 16);
        b[9] = b[13] + b[9];
        b[5] = rotl(b[9] ^ b[5], 12);
        b[1] = b[5] + b[1];
        b[13] = rotl(b[1] ^ b[13], 8);
        f = (b[13] + b[9]) | 0;
        b[0] =
            f +
            (b[14] =
                rotl((c = rotl((b[2] = b[6] + b[2]) ^ b[14], 8)) ^
                    (b[9] = (d = b[7] + b[3]) +
                        (b[4] = rotl((b[8] = rotl(b[4] ^ (b[12] = (b[4] = rotl((b[0] = b[0] + b[4]) ^ b[12], 16)) + b[8]), 12)) ^
                            (b[8] = b[12] + (b[12] = rotl((e = b[0] + b[8]) ^ b[4], 8))), 7))), 16));
        b[9] =
            b[0] +
            (b[14] =
                rotl(b[14] ^
                    (b[3] = (b[4] = rotl(b[0] ^ b[4], 12)) +
                        b[9]), 8));
        b[4] = rotl(b[9] ^ b[4], 7);
        b[7] =
            b[8] +
            (b[11] =
                rotl(b[13] ^ (b[13] = (b[8] = rotl((b[0] = (b[15] = rotl(b[15] ^ d, 8)) + b[11]) ^ b[7], 7)) + b[2]), 16));
        b[8] =
            b[7] +
            (b[13] = rotl(b[11] ^ (b[2] = (b[7] = rotl(b[7] ^ b[8], 12)) + b[13]), 8));
        b[7] = rotl(b[8] ^ b[7], 7);
        b[11] = rotl(b[12] ^ (b[12] = (b[6] = rotl((b[10] = b[10] + c) ^ b[6], 7)) + b[1]), 16);
        b[0] = b[11] + b[0];
        b[11] = b[0] + (b[12] = rotl(b[11] ^ (b[1] = (b[6] = rotl(b[0] ^ b[6], 12)) + b[12]), 8));
        b[6] = rotl(b[11] ^ b[6], 7);
        b[5] = b[10] + (b[15] = rotl((b[10] = (b[0] = rotl(b[5] ^ f, 7)) + e) ^ b[15], 16));
        b[10] = b[5] + (b[15] = rotl(b[15] ^ (b[0] = (f = rotl(b[5] ^ b[0], 12)) + b[10]), 8));
        b[5] = rotl(b[10] ^ f, 7);
    }
    const output = new Int32Array(a.length);
    for (let i = 0; i < a.length; i++) {
        output[i] = a[i] + b[i];
    }
    return output;
}

const encodeTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!$%&()+,-./:;<=>?[]^{|}".split("");
const decodeTable = [];

for (let i = 0; i < encodeTable.length; i++) {
    decodeTable[encodeTable[i].charCodeAt(0)] = i;
}

function decryptLocalStorage(input) {
    const inputBuffer = ascii85.decode(input, decodeTable);
    
    const data = new Uint8Array(inputBuffer.slice(0, -16));
    const size = data.length;

    const dataBuffer = Buffer.alloc(size);

    const stateBuffer = Buffer.alloc(64);
    const stateArray = new Int32Array(stateBuffer.buffer);

    stateBuffer.writeBigInt64LE(3684054920433006693n, 0);
    stateBuffer.writeBigInt64LE(7719281312240119090n, 8);
    stateBuffer.writeBigInt64LE(-37104944818579849n, 16);
    stateBuffer.writeBigInt64LE(-8740294561011147131n, 24);
    stateBuffer.writeBigInt64LE(-736570361772537783n, 32);
    stateBuffer.writeBigInt64LE(2857145462548429679n, 40);

    stateBuffer.writeInt32LE(0, 52);
    stateBuffer.writeInt32LE(inputBuffer.readInt32LE(size + 8), 56);
    stateBuffer.writeInt32LE(inputBuffer.readInt32LE(size + 12), 60);

    for (let i = 0; i < size; i += 64) {
        stateBuffer.writeInt32LE(i / 64, 48);

        const chunkKey = new Uint8Array(generateKey(stateArray).buffer);

        for (let j = 0; j < 64 && i + j < size; j++) dataBuffer.writeUint8(data[i + j] ^ chunkKey[j], i + j);
    }

    return dataBuffer;
}

function encryptLocalStorage(input) {
    const data = new Uint8Array(input);
    const size = data.length;

    const dataBuffer = Buffer.alloc(size + 16);

    const stateBuffer = Buffer.alloc(64);
    const stateArray = new Int32Array(stateBuffer.buffer);

    const n = Math.floor(Math.random() * 1_000_000_000);
    const m = Math.floor(Math.random() * 1_000_000_000);

    stateBuffer.writeBigInt64LE(3684054920433006693n, 0);
    stateBuffer.writeBigInt64LE(7719281312240119090n, 8);
    stateBuffer.writeBigInt64LE(-37104944818579849n, 16);
    stateBuffer.writeBigInt64LE(-8740294561011147131n, 24);
    stateBuffer.writeBigInt64LE(-736570361772537783n, 32);
    stateBuffer.writeBigInt64LE(2857145462548429679n, 40);

    stateBuffer.writeInt32LE(0, 52);
    stateBuffer.writeInt32LE(n, 56);
    stateBuffer.writeInt32LE(m, 60);

    for (let i = 0; i < size; i += 64) {
        stateBuffer.writeInt32LE(i / 64, 48);

        const chunkKey = new Uint8Array(generateKey(stateArray).buffer);

        for (let j = 0; j < 64 && i + j < size; j++) dataBuffer.writeUint8(data[i + j] ^ chunkKey[j], i + j);
    }

    const hashDataBuffer = Buffer.alloc(size + 40);
    dataBuffer.copy(hashDataBuffer);

    hashDataBuffer.writeBigInt64LE(-37104944818579849n, size);
    hashDataBuffer.writeBigInt64LE(-8740294561011147131n, size + 8);
    hashDataBuffer.writeBigInt64LE(-736570361772537783n, size + 16);
    hashDataBuffer.writeBigInt64LE(2857145462548429679n, size + 24);
    hashDataBuffer.writeInt32LE(n, size + 32);
    hashDataBuffer.writeInt32LE(m, size + 36);

    const hashBuffer = crypto.createHash("sha256").update(hashDataBuffer).digest();

    dataBuffer.writeBigInt64LE(hashBuffer.readBigInt64LE(0), size);
    dataBuffer.writeInt32LE(n, size + 8);
    dataBuffer.writeInt32LE(m, size + 12);

    return ascii85.encode(dataBuffer, encodeTable).toString();
}

function getLocalStorage(input) {
    const buffer = decryptLocalStorage(input);
    const data = new Uint8Array(buffer);

    const decoder = new TextDecoder();
    const output = {};
    const length = buffer.readInt16LE(0);
    let i = 2;
    while (i < length) {
        const keyLength = buffer.readInt16LE(i);
        i += 2;
        const key = decoder.decode(data.slice(i, i + keyLength));
        i += keyLength;

        const propertyLength = buffer.readInt16LE(i);
        i += 2;
        const propertyIndex = i;
        const property = data.slice(i, i + propertyLength);
        i += propertyLength;

        const keys = key.split(".");
        const lastKey = keys.pop();
        let object = output;
        let def = localStorageDef;
        for (let key of keys) {
            if (!object[key]) object[key] = {};
            object = object[key];
            if (def[key]) def = def[key];
            else def = {};
        }
        switch (def[lastKey]) {
            case "bool":
                object[lastKey] = property[0] === 1;
                break;
            case "int":
                object[lastKey] = property.reduce((a, b) => (a << 8) | b, 0);
                break;
            case "float64":
                object[lastKey] = buffer.readFloatLE(propertyIndex);
                break;
            case "string":
                object[lastKey] = decoder.decode(property);
                break;
            default:
                object[lastKey] = property.filter(val => val >= 0x20 && val <= 0x7e || val == 0xa) ? decoder.decode(property) : propertyLength <= 6 ? property.reduce((a, b) => (a << 8) | b, 0) : property.reduce((a, b) => (a << 8n) | BigInt(b), 0n);
                break;
        }
    }

    return output;
}

function flatten(object, keys = []) {
    const output = {};
    for (const [key, value] of Object.entries(object)) {
        if (typeof value === "object") Object.assign(output, flatten(value, [...keys, key]));
        else output[[...keys, key].join(".")] = value;
    }
    return output;
}

function setLocalStorage(object) {
    const buffer = Buffer.alloc(8176);

    let i = 2;
    const flattened = flatten(object);
    for (const [key, value] of Object.entries(flattened)) {
        buffer.writeInt16LE(key.length, i);
        i += 2;
        buffer.write(key, i, "ascii");
        i += key.length;

        switch (typeof value) {
            case "boolean":
                buffer.writeInt16LE(1, i);
                i += 2;
                buffer.writeUint8(value, i);
                i += 1;
                break;
            case "number":
                if (Number.isInteger(value)) {
                    if (key.includes("color")) {
                        buffer.writeInt16LE(3, i);
                        i += 2;
                        buffer.writeUint8((value >> 16) & 0xFF, i);
                        buffer.writeUint8((value >> 8) & 0xFF, i + 1);
                        buffer.writeUint8(value & 0xFF, i + 2);
                        i += 3;
                    } else {
                        buffer.writeInt16LE(1, i);
                        i += 2;
                        buffer.writeUint8(value, i);
                        i += 1;
                    }
                } else {
                    buffer.writeInt16LE(8, i);
                    i += 2;
                    buffer.writeFloatLE(value, i);
                    i += 8;
                }
                break;
            case "string":
                buffer.writeInt16LE(value.length, i);
                i += 2;
                buffer.write(value, i, "ascii");
                i += value.length;
                break;
        }
    }
    buffer.writeInt16LE(i, 0);

    return encryptLocalStorage(buffer.slice(0, i + 2));
}

module.exports = { getLocalStorage, setLocalStorage };