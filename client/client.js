const EventEmitter = require("events");
const crypto = require("crypto");
const WebSocket = require("ws");
const util = require("util");
const vm = require("vm");

const vmContext = {
    chrome: {},
    localStorage: {
        "arras.io": "PxNSfF-=-pQ}Ju^L;FCS^3>dSn)e)akcI)WcAOW,<?Ku&$/5HWj1)-TSa4nEe[&OA5U6Q=q$9iy6KNRCvqOA<a|X1LRi:XOGJ"
    },
    document: {
        querySelector: () => ({
            toDataURL: () => 'data:image/png;base64,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'
        })
    }
};
vm.createContext(vmContext);

class GrowableBuffer {
    constructor(size) {
        this.buffer = Buffer.alloc(size);
        this.offset = 0;
    }
    check(size) {
        if (this.buffer.byteLength - this.offset < size) {
            const buffer = Buffer.alloc(this.offset + size);
            this.buffer.copy(buffer);
            this.buffer = buffer;
        }
    }
    write(data) {
        const buffer = Buffer.from(data);
        this.check(buffer.byteLength);
        buffer.copy(this.buffer, this.offset);
        this.offset += buffer.byteLength;
    }
    writeUint8(data) {
        this.check(1);
        this.buffer.writeUint8(data, this.offset);
        this.offset++;
    }
    writeUint16(data) {
        this.check(2);
        this.buffer.writeUint16LE(data, this.offset);
        this.offset += 2;
    }
    writeUint32(data) {
        this.check(4);
        this.buffer.writeUint32LE(data, this.offset);
        this.offset += 4;
    }
    writeFloat(data) {
        this.check(4);
        this.buffer.writeFloatLE(data, this.offset);
        this.offset += 4;
    }
}

const decoder = new TextDecoder();

function rotl(x, n) {
    return x << n | x >>> (32 - n);
}
function quarterRound(output, a, b, c, d) {
    output[a] += output[b];
    output[d] = rotl(output[d] ^ output[a], 16);
    output[c] += output[d];
    output[b] = rotl(output[b] ^ output[c], 12);
    output[a] += output[b];
    output[d] = rotl(output[d] ^ output[a],  8);
    output[c] += output[d];
    output[b] = rotl(output[b] ^ output[c],  7);
}
function chacha20(state) {
    const output = new Int32Array(16);
    output.set(state);
    for (let i = 0; i < 10; i += 1) {
        quarterRound(output, 0, 4, 8, 12);
        quarterRound(output, 1, 5, 9, 13);
        quarterRound(output, 2, 6, 10, 14);
        quarterRound(output, 3, 7, 11, 15);
        quarterRound(output, 0, 5, 10, 15);
        quarterRound(output, 1, 6, 11, 12);
        quarterRound(output, 2, 7, 8, 13);
        quarterRound(output, 3, 4, 9, 14);
    }
    for (let i = 0; i < 16; i++) {
        output[i] = state[i] + output[i];
    }
    return new Uint8Array(output.buffer);
}

function signExtend(value, bits) {
    const v = BigInt(value);
    const signBit = 1n << BigInt(bits - 1);
    const fullBit = 1n << BigInt(bits);
    return Number((v & signBit) ? v - fullBit : v);
}

function encodeSigned(value, bits) {
    if (value < 0) return value + 2 ** bits;
    return value;
}

function number(value, bits) {
    return {
        number: {
            unsigned: value,
            get signed() {
                if (!bits) return value <= 96 ? value : value - 192;
                return signExtend(value, bits);
            },
            get bool() {
                return value !== 0;
            }
        }
    };
}

function float(value) {
    return {
        number: {
            signed: value,
            unsigned: value
        }
    }
}

function string(value) {
    return {
        string: {
            value
        }
    }
}

function signed(value) {
    return { signed: true, value };
}

function unsigned(value) {
    return { unsigned: true, value };
}

class ArrasProtocol {
    constructor(key) {
        this.key = key;
        this.sentPacketCount = 0n;
        this.receivedPacketCount = 0n;

        this.encryptStateBuffer = Buffer.alloc(64);
        this.encryptStateBuffer.writeBigInt64LE(3684054920433006693n, 0);
        this.encryptStateBuffer.writeBigInt64LE(7719281312240119090n, 8);
        this.encryptStateBuffer.writeBigInt64LE(this.key[0], 16);
        this.encryptStateBuffer.writeBigInt64LE(this.key[1], 24);
        this.encryptStateBuffer.writeBigInt64LE(this.key[2], 32);
        this.encryptStateBuffer.writeBigInt64LE(this.key[3], 40);
        this.encryptStateBuffer.writeInt32LE(0, 52);
        this.encryptStateArray = new Int32Array(this.encryptStateBuffer.buffer);
        
        this.decryptStateBuffer = Buffer.alloc(64);
        this.decryptStateBuffer.writeBigInt64LE(3684054920433006693n, 0);
        this.decryptStateBuffer.writeBigInt64LE(7719281312240119090n, 8);
        this.decryptStateBuffer.writeBigInt64LE(this.key[0], 16);
        this.decryptStateBuffer.writeBigInt64LE(this.key[1], 24);
        this.decryptStateBuffer.writeBigInt64LE(this.key[2], 32);
        this.decryptStateBuffer.writeBigInt64LE(this.key[3], 40);
        this.decryptStateBuffer.writeInt32LE(0, 52);
        this.decryptStateBuffer.writeInt32LE(-2147483648, 60);
        this.decryptStateArray = new Int32Array(this.decryptStateBuffer.buffer);
    }
    encrypt(packet) {
        this.sentPacketCount++;
        const packetIndex = this.sentPacketCount - 1n;

        const size = packet.length;
        const dataBuffer = Buffer.alloc(size + 6);

        this.encryptStateBuffer.writeInt32LE(Number(BigInt.asIntN(32, packetIndex)), 56);
        this.encryptStateBuffer.writeInt32LE(Number(BigInt.asIntN(32, packetIndex >> 32n)), 60);

        for (let i = 0; i < size; i += 64) {
            this.encryptStateBuffer.writeInt32LE(i / 64, 48);

            const chunkKey = chacha20(this.encryptStateArray);

            for (let j = 0; j < 64 && i + j < size; j++) dataBuffer.writeUint8(packet[i + j] ^ chunkKey[j], i + j);
        }

        const hashDataBuffer = Buffer.alloc(size + 40);
        dataBuffer.copy(hashDataBuffer);

        hashDataBuffer.writeBigInt64LE(this.key[0], size);
        hashDataBuffer.writeBigInt64LE(this.key[1], size + 8);
        hashDataBuffer.writeBigInt64LE(this.key[2], size + 16);
        hashDataBuffer.writeBigInt64LE(this.key[3], size + 24);
        hashDataBuffer.writeBigInt64LE(packetIndex, size + 32);

        const hashBuffer = crypto.createHash("sha256").update(hashDataBuffer).digest();

        dataBuffer.writeInt32LE(hashBuffer.readInt32LE(0), size);
        dataBuffer.writeInt16LE(hashBuffer.readInt16LE(4), size + 4);

        return dataBuffer;
    }
    decrypt(packet, packets) {
        this.receivedPacketCount++;
        const packetIndex = this.receivedPacketCount - 1n;

        const size = packet.length;
        const dataBuffer = Buffer.alloc(size);

        this.decryptStateBuffer.writeInt32LE(Number(BigInt.asIntN(32, packetIndex)), 56);

        for (let i = 0; i < size; i += 64) {
            this.decryptStateBuffer.writeInt32LE(i / 64, 48);

            const chunkKey = chacha20(this.decryptStateArray);

            for (let j = 0; j < 64 && i + j < size; j++) {
                if (i === 0 && j === 0 && packets && !packets.includes(packet[0] ^ chunkKey[0])) return false;
                dataBuffer.writeUint8(packet[i + j] ^ chunkKey[j], i + j);
            }
        }
        return new Uint8Array(dataBuffer);
    }
    decode(packet) {
        const buffer = Buffer.from(packet.buffer);
        const output = [ String.fromCharCode(packet[0]) ];
        for (let i = 1; i < packet.length; i++) {
            const dataType = packet[i];

            switch (true) {
                case dataType <= 0xbf:
                    output.push(number(dataType));
                    break;
                case dataType >= 0xc0 && dataType <= 0xdf:
                    output.push(string(decoder.decode(packet.slice(i + 1, i + 1 + dataType - 0xc0))));
                    i += dataType - 0xc0;
                    break;
                case dataType >= 0xe0 && dataType <= 0xef:
                    output.push(number(((dataType - 0xe0) << 8) | packet[i + 1], 12));
                    i++;
                    break;
                case dataType >= 0xf0 && dataType < 0xf8:
                    output.push(number(((dataType - 0xf0) << 16) | (packet[i + 1] << 8) | packet[i + 2], 19));
                    i += 2;
                    break;
                case dataType === 0xf8:
                    output.push(number((packet[i + 1] << 16) | (packet[i + 2] << 8) | packet[i + 3], 25));
                    i += 3;
                    break;
                case dataType === 0xf9:
                    output.push(number(0x1000000 + ((packet[i + 1] << 16) | (packet[i + 2] << 8) | packet[i + 3]), 25));
                    i += 3;
                    break;
                case dataType === 0xfc:
                    output.push(number(buffer.readUint32BE(i + 1), 32));
                    i += 4;
                    break;
                case dataType === 0xfe:
                    let length = buffer.readUint16LE(i + 1);
                    i += 2;
                    if (length === 0) {
                        length = buffer.readUint32LE(i + 1);
                        i += 4;
                    }
                    output.push(string(decoder.decode(packet.slice(i + 1, i + 1 + length))));
                    i += length;
                    break;
                case dataType === 0xff:
                    output.push(float(buffer.readFloatLE(i + 1)));
                    i += 4;
                    break;
                default:
                    console.log(buffer.toString("hex"));
                    console.log(dataType);
                    console.log(i);
                    throw "unknown packet code";
            }
        }
        return output;
    }
    encode(packet) {
        const buffer = new GrowableBuffer(packet.length);
        buffer.write(packet[0]);

        for (let i = 1; i < packet.length; i++) {
            let data = packet[i];
            switch (typeof data) {
                case "string":
                    if (data.length >= 65536) {
                        buffer.writeUint16(0xfe);
                        buffer.writeUint8(0);
                        buffer.writeUint32(data.length);
                        buffer.write(data);
                    } else if (data.length >= 32) {
                        buffer.writeUint8(0xfe);
                        buffer.writeUint16(data.length);
                        buffer.write(data);
                    } else {
                        buffer.writeUint8(0xc0 + data.length);
                        buffer.write(data);
                    }
                    break;
                case "object":
                    let number = data.value;
                    if (Number.isInteger(number)) {
                        if (data.unsigned) {
                            if (number <= 191) buffer.writeUint8(number);
                            else if (number < 2 ** 12) {
                                buffer.writeUint8(0xe0 + (number >>> 8));
                                buffer.writeUint8(number & 0xff);
                            } else if (number < 2 ** 19) {
                                buffer.writeUint8(0xf0 + (number >>> 16));
                                buffer.writeUint8((number >>> 8) & 0xff);
                                buffer.writeUint8(number & 0xff);
                            } else if (number < 2 ** 24) {
                                buffer.writeUint8(0xf8);
                                buffer.writeUint8(number >>> 16);
                                buffer.writeUint8((number >>> 8) & 0xff);
                                buffer.writeUint8(number & 0xff);
                            } else if (number < 2 ** 25) {
                                buffer.writeUint8(0xf9);
                                buffer.writeUint8((number >>> 16) & 0xff);
                                buffer.writeUint8((number >>> 8) & 0xff);
                                buffer.writeUint8(number & 0xff);
                            } else if (number < 2 ** 32) {
                                buffer.writeUint8(0xfc);
                                buffer.writeUint8(number >>> 24);
                                buffer.writeUint8((number >>> 16) & 0xff);
                                buffer.writeUint8((number >>> 8) & 0xff);
                                buffer.writeUint8(number & 0xff);
                            } else throw "unknown packet number type";
                        } else {
                            if (number >= -95 && number <= 96) buffer.writeUint8(number >= 0 ? number : number + 192);
                            else if (number >= -(2 ** 11) && number < 2 ** 11) {
                                number = encodeSigned(number, 12);
                                buffer.writeUint8(0xe0 + (number >>> 8));
                                buffer.writeUint8(number & 0xff);
                            } else if (number >= -(2 ** 18) && number < 2 ** 18) {
                                number = encodeSigned(number, 19);
                                buffer.writeUint8(0xf0 + (number >>> 16));
                                buffer.writeUint8((number >>> 8) & 0xff);
                                buffer.writeUint8(number & 0xff);
                            } else if (number >= -(2 ** 24) && number < 2 ** 24) {
                                number = encodeSigned(number, 25)
                                buffer.writeUint8(number & 0x1000000 ? 0xf9 : 0xf8);
                                buffer.writeUint8((number >>> 16) & 0xff);
                                buffer.writeUint8((number >>> 8) & 0xff);
                                buffer.writeUint8(number & 0xff);
                            } else if (number >= -(2 ** 31) && number < 2 ** 31) {
                                number = encodeSigned(number, 32);
                                buffer.writeUint8(0xfc);
                                buffer.writeUint8(number >>> 24);
                                buffer.writeUint8((number >>> 16) & 0xff);
                                buffer.writeUint8((number >>> 8) & 0xff);
                                buffer.writeUint8(number & 0xff);
                            } else throw "unknown packet number type";
                        }
                    } else {
                        buffer.writeUint8(0xff);
                        buffer.writeFloat(number);
                    }
                    break;
                default:
                    throw "unknown packet data type";
            }
        }
        return new Uint8Array(buffer.buffer.buffer);
    }
}

const clientPackets = {
    k (playerId = "", playerToken = "", travelToken = "") {
        // key verification - authenticates the player
        // first packet sent by the client
        // playerId: the player ID that identifies that player
        //           it's given by the first server the player joins in the "w" packet
        //           it gets stored inside arrasLocalStorage.id
        // playerToken: the token connected to a discord account that can give special permissions
        //              it's given by the server in the "k" packet when running $auth with a valid login token
        //              it gets stored inside arrasLocalStorage.token
        // travelToken: a 8-character hex token used to transfer players from one server to another
        //              it's given by the first server in the "r" packet

        return ["k", playerId, playerToken, travelToken];
    },
    T (data) {
        // tracking - tracking data
        // second (optional) packet sent by the client
        // data: a JSON string containing the following data:
        //       {
        //           "adblock": bool,
        //           "mobile": bool,
        //           "storage": object, // the arras local storage data
        //           "overseer": {
        //               "features": { // various browser features
        //                   "wasm": array,
        //                   "rtc": string,
        //                   "wt": bool,
        //                   "sw": bool,
        //                   "gpu": bool,
        //                   "credentialless": bool,
        //                   "ua": string,
        //                   "hc": int,
        //                   "renderer": string,
        //                   "webgl": string,
        //                   "experimental-webgl": string,
        //                   "webgl2": string
        //               },
        //               "window": { // window size
        //                   "innerWidth": int,
        //                   "innerHeight": int
        //               },
        //               "fingerprints": { // browser fingerprints
        //                   "canvas": string,
        //                   "unicode": string
        //               },
        //               "report": string // contains the .toString() value of window.addEventListener, canvas.addEventListener, WebAssembly.instantiate, WebAssembly.instantiateStreaming, requestAnimationFrame, Function and an error stack
        //           }
        //     }

        return ["T", JSON.stringify(data)];
    },
    p () {
        // ping - replies to the server ping
        // also sent after receiving the "w" packet

        return ["p"];
    },
    s (name = "", partyId = "", { autoLevelUp, incognito } = {}) {
        // spawn request - spawns the player
        // name: the player name
        // partyId: the party id of team to spawn into
        // flags: spawn settings (auto level up, incognito)

        return ["s", name, partyId, unsigned(autoLevelUp | incognito << 1)];
    },
    e (id, result) {
        // eval - eval result
        // sent in response to the "e" packet
        // required to spawn
        // id: the eval id (sent by the server in the "e" packet)
        // result: the eval result

        return ["e", id, result];
    },
    R (input, result) {
        // proof of work - hash result
        // sent in response to the "C" packet
        // required to spawn
        // input: the input string (sent by the server in the "C" packet)
        // result: the proof of work result

        return ["R", input, result];
    },
    U (index) {
        // upgrade request - upgrades to a tank
        // index - the tank index in the upgrades

        return ["U", unsigned(index)];
    },
    x (index, type = "add", value) {
        // skill upgrade request - upgrades a skill
        // index: the skill index
        // type: type of upgrade (add, max, set)
        // value: the value to set the skill to

        switch (type) {
            case "add":
                return ["x", unsigned(index), signed(-1)];
            case "max":
                return ["x", unsigned(index), signed(255)];
            case "set":
                return ["x", unsigned(index), signed(value)];
        }
    },
    C (x, y, { up, down, left, right, lmb, rmb } = {}) {
        // command - tank command
        // x: tank target x
        // y: tank target y
        // action: movement and shooting actions (up, down, left, right, lmb, rmb)

        return ["C", signed(x), signed(y), unsigned(up | down << 1 | left << 2 | right << 3 | lmb << 4 | rmb << 6)];
    },
    t (action) {
        // player toggle - toggles tank actions
        // action: tank action (autofire, autospin, override, reverse)

        return ["t", unsigned(["autofire", "autospin", "override", "reverse"].indexOf(action))];
    },
    L () {
        // level up cheat - levels up the tank

        return ["L"];
    },
    0 (keyCode, isKeyDown) {
        // key command - key press info
        // sends keydown and keyup information only while the sandbox key is being held
        // keyCode: the KeyboardEvent.prototype.code of a key press (use Self for the sandbox key `)
        // isKeyDown: true for keydown, false for keyup

        return ["0", keyCode, unsigned(isKeyDown)];
    },
    M (message) {
        // chat messages - sends a chat message
        // message: the chat message

        return ["M", message];
    },
    P (action, playerId) {
        // player action - executes an action on a player
        // works only while being an operator
        // action: the action to perform on the player (promote, demote, kick)
        // playerId: the current socket id of the player

        return ["P", unsigned(["promote", "demote", "kick"].indexOf(action)), unsigned(playerId)];
    },
    K () {
        // suicide - kills the player body
        
        return ["K"];
    },
    A () {
        // ability - runs the F key ability

        return ["A"];
    },
    D () {
        // pause score - saves the player score

        return ["D"];
    }
}
const serverPackets = {
    R (packet) { // room
        let i = 0;

        const info = Object.fromEntries(packet[i++].string.value.split(",").map(d => d.split("=")));
        const roomX1 = packet[i++].number.signed;
        const roomY1 = packet[i++].number.signed;
        const roomX2 = packet[i++].number.signed;
        const roomY2 = packet[i++].number.signed;
        const unknown = packet[i++].string.value;
        const tileWidth = packet[i++].number.unsigned;
        const tileHeight = packet[i++].number.unsigned;
        
        const tiles = Array(tileHeight).fill().map(() => Array(tileWidth));

        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                tiles[y][x] = packet[i++].number.signed;
            }
        }

        return {
            info,
            roomX1,
            roomY1,
            roomX2,
            roomY2,
            tiles
        };
    },
    u (packet) { // update
        let i = 0;

        const output = {
            bodyX: packet[i++].number.signed,
            bodyY: packet[i++].number.signed,
            bodyFov: packet[i++].number.unsigned,
            dead: [],
            removed: [],
            changed: []
        };
        
        const updateFlags = packet[i++].number.unsigned;

        if (updateFlags & (1 << 0)) {
            output.mspt = packet[i++].number.unsigned;
        }
        if (updateFlags & (1 << 1)) {
            output.speed = packet[i++].number.unsigned;
        }
        if (updateFlags & (1 << 2)) {
            output.mockupIndex = packet[i++].number.unsigned;
            i++;
        }
        if (updateFlags & (1 << 3)) {
            output.color = packet[i++].number.signed;
            output.id = packet[i++].number.unsigned;
        }
        if (updateFlags & (1 << 4)) {
            output.score = packet[i++].number.unsigned;
        }
        if (updateFlags & (1 << 5)) {
            output.kills = {
                player: packet[i++].number.unsigned,
                assist: packet[i++].number.unsigned,
                boss: packet[i++].number.unsigned,
                food: packet[i++].number.unsigned
            };
        }
        if (updateFlags & (1 << 6)) {
            output.skillPoints = packet[i++].number.unsigned;
        }
        if (updateFlags & (1 << 7)) {
            output.maxSkills = [];
            for (let j = 0; j < 10; j++) {
                output.maxSkills.push(packet[i++].number.unsigned);
            }
        }
        if (updateFlags & (1 << 8)) {
            output.skills = [];
            for (let j = 0; j < 10; j++) {
                output.skills.push(packet[i++].number.unsigned);
            }
        }
        if (updateFlags & (1 << 9)) {
            const upgradesLength = packet[i++].number.unsigned;
            output.upgrades = [];
            for (let j = 0; j < upgradesLength; j++) {
                output.upgrades.push(packet[i++].number.unsigned);
            }
        }
        if (updateFlags & (1 << 10)) {
            output.partyCode = packet[i++].string.value;
        }
        if (updateFlags & (1 << 11)) {
            output.operatorLevel = packet[i++].number.unsigned;
        }

        while (packet[i].number.signed !== -1) {
            output.dead.push({
                id: packet[i++].number.unsigned
            });
        }
        i++;

        while (packet[i].number.signed !== -1) {
            output.removed.push({
                id: packet[i++].number.unsigned
            });
        }
        i++;

        function parseEntity() {
            const entity = {};
            const entityFlags = packet[i++].number.unsigned;

            if (entityFlags & (1 << 0)) {
                entity.deltaX = packet[i++].number.signed / 4;
                entity.deltaY = packet[i++].number.signed / 4;
            }
            if (entityFlags & (1 << 1)) {
                entity.deltaFacing = packet[i++].number.signed * Math.PI / 512;
            }
            if (entityFlags & (1 << 2)) {
                entity.mockupIndex = packet[i++].number.unsigned;
            }
            if (entityFlags & (1 << 3)) {
                entity.guns = {};
                while (packet[i].number.signed !== -1) {
                    const gunIndex = packet[i++].number.unsigned;
                    const gunFlags = packet[i++].number.unsigned;
                    const gun = {};

                    if (gunFlags & (1 << 0)) gun.time = packet[i++].number.unsigned;
                    if (gunFlags & (1 << 1)) gun.power = packet[i++].number.unsigned;

                    entity.guns[gunIndex] = gun;
                }
                i++;
            }
            if (entityFlags & (1 << 4)) {
                entity.turrets = {};
                while (packet[i].number.signed !== -1) {
                    const turretIndex = packet[i++].number.unsigned;

                    entity.turrets[turretIndex] = parseEntity();
                }
                i++;
            }
            if (entityFlags & (1 << 5)) {
                const entityDataFlags = packet[i++].number.unsigned;
                entity.autoSpin = Boolean(entityDataFlags & (1 << 0));
                entity.reverseTank = Boolean(entityDataFlags & (1 << 1));
                const unknown1 = Boolean(entityDataFlags & (1 << 2));
                entity.invuln = Boolean(entityDataFlags & (1 << 3));
                entity.damage = Boolean(entityDataFlags & (1 << 4));
                const unknown2 = Boolean(entityDataFlags & (1 << 5));
            }
            if (entityFlags & (1 << 6)) {
                entity.health = packet[i++].number.unsigned / 255;
            }
            if (entityFlags & (1 << 7)) {
                entity.shield = packet[i++].number.unsigned / 255;
            }
            if (entityFlags & (1 << 8)) {
                entity.alpha = packet[i++].number.unsigned / 255;
            }
            if (entityFlags & (1 << 9)) {
                entity.size = packet[i++].number.unsigned  * 0.0625;
            }
            if (entityFlags & (1 << 10)) {
                entity.score = packet[i++].number.unsigned;
            }
            if (entityFlags & (1 << 11)) {
                entity.name = packet[i++].string.value;
            }
            if (entityFlags & (1 << 12)) {
                entity.color = packet[i++].number.signed;
            }
            if (entityFlags & (1 << 13)) {
                entity.layer = packet[i++].number.signed;
            }

            return entity;
        }

        while (i < packet.length - 1) {
            const id = packet[i++].number.unsigned;
            const entity = parseEntity();
            entity.id = id;
            output.changed.push(entity);
        }

        return output;
    },
    w (packet) { // welcome
        return {
            playerId: packet[0].string.value
        };
    },
    P (packet) { // player list
        const removed = [];
        const changed = [];

        let i = 0;

        const removedLength = packet[i++].number.unsigned;
        for (let j = 0; j < removedLength; j++) {
            removed.push({
                socketId: packet[i++].number.unsigned
            });
        }

        const changedLength = packet[i++].number.unsigned;
        for (let j = 0; j < changedLength; j++) {
            const socketId = packet[i++].number.unsigned;
            const flag = packet[i++].number.unsigned;
            const name = packet[i++].string.value;
            const mockupIndex = packet[i++].number.signed;

            changed.push({
                socketId: socketId,
                self: Boolean(flag & 1),
                operatorLevel: flag >> 1,
                name,
                mockupIndex
            });
        }

        return { removed, changed };
    },
    m (packet) { // message
        return {
            message: packet[0].string.value
        };
    },
    J (packet) { // mockups
        const output = {};

        let i = 0;
        const length = packet[i++].number.unsigned;

        for (let j = 0; j < length; j++) {
            const mockup = {};
            mockup.mockupIndex = packet[i++].number.unsigned;

            mockup.name = packet[i++].string.value;
            mockup.scoreText = packet[i++].string.value;
            mockup.color = packet[i++].number.signed;

            mockup.shape = packet[i++].number.signed;
            if (mockup.shape === 0x800) {
                const pathLength = packet[i++].number.unsigned;
                mockup.shape = [];
                for (let k = 0; k < pathLength; k++) {
                    mockup.shape.push([packet[i++].number.signed, packet[i++].number.signed]);
                }
            }

            mockup.entityType = packet[i++].number.unsigned;
            mockup.shootsType = packet[i++].number.unsigned;

            mockup.offset = packet[i++].number.signed;
            mockup.size = packet[i++].number.signed;

            const upgradesLength = packet[i++].number.unsigned;
            mockup.upgrades = [];
            for (let k = 0; k < upgradesLength; k++) {
                mockup.upgrades.push({
                    tier: packet[i++].number.unsigned,
                    mockupIndex: packet[i++].number.unsigned
                });
            }

            const gunsLength = packet[i++].number.unsigned;
            mockup.guns = [];
            for (let k = 0; k < gunsLength; k++) {
                mockup.guns.push({
                    x: packet[i++].number.signed,
                    y: packet[i++].number.signed,
                    length: packet[i++].number.signed,
                    width: packet[i++].number.signed,
                    aspect: packet[i++].number.signed,
                    angle: packet[i++].number.signed
                });
            }

            const turretsLength = packet[i++].number.unsigned;
            mockup.turrets = [];
            for (let k = 0; k < turretsLength; k++) {
                mockup.turrets.push({
                    mockupIndex: packet[i++].number.unsigned,
                    scale: packet[i++].number.signed,
                    offset: packet[i++].number.signed,
                    direction: packet[i++].number.signed,
                    renderOnTop: packet[i++].number.bool,
                    angle: packet[i++].number.signed
                });
            }

            output[mockup.mockupIndex] = mockup;
        }
        return { mockups: output };
    },
    C (packet) { // proof of work
        return {
            input: packet[0].string.value
        };
    },
    e (packet) { // eval
        return {
            id: packet[0].string.value,
            code: packet[1].string.value
        };
    },
    p () { // ping
        return {};
    },
    b (packet) { // broadcast
        const minimapRemoved = [];
        const minimapChanged = [];
        const teamMinimapRemoved = [];
        const teamMinimapChanged = [];
        const leaderboardRemoved = [];
        const leaderboardChanged = [];

        let i = 0;

        let minimapRemovedLength = packet[i++].number;
        if (minimapRemovedLength.signed === -1) minimapRemovedLength = minimapRemovedLength.signed;
        else minimapRemovedLength = minimapRemovedLength.unsigned;
        for (let j = 0; j < minimapRemovedLength; j++) {
            minimapRemoved.push({
                id: packet[i++].number.unsigned
            });
        }

        let minimapChangedLength = packet[i++].number;
        if (minimapChangedLength.signed === -1) minimapChangedLength = minimapChangedLength.signed;
        else minimapChangedLength = minimapChangedLength.unsigned;
        for (let j = 0; j < minimapChangedLength; j++) {
            minimapChanged.push({
                id: packet[i++].number.unsigned,
                type: packet[i++].number.unsigned,
                x: packet[i++].number.signed / 255,
                y: packet[i++].number.signed / 255,
                color: packet[i++].number.signed,
                size: packet[i++].number.unsigned
            });
        }

        let teamMinimapRemovedLength = packet[i++].number;
        if (teamMinimapRemovedLength.signed === -1) teamMinimapRemovedLength = teamMinimapRemovedLength.signed;
        else teamMinimapRemovedLength = teamMinimapRemovedLength.unsigned;
        for (let j = 0; j < teamMinimapRemovedLength; j++) {
            teamMinimapRemoved.push({
                id: packet[i++].number.unsigned
            });
        }

        let teamMinimapChangedLength = packet[i++].number;
        if (teamMinimapChangedLength.signed === -1) teamMinimapChangedLength = teamMinimapChangedLength.signed;
        else teamMinimapChangedLength = teamMinimapChangedLength.unsigned;
        for (let j = 0; j < teamMinimapChangedLength; j++) {
            teamMinimapChanged.push({
                id: packet[i++].number.unsigned,
                x: packet[i++].number.signed / 255,
                y: packet[i++].number.signed / 255,
                color: packet[i++].number.signed
            });
        }

        let leaderboardRemovedLength = packet[i++].number;
        if (leaderboardRemovedLength.signed === -1) leaderboardRemovedLength = leaderboardRemovedLength.signed;
        else leaderboardRemovedLength = leaderboardRemovedLength.unsigned;
        for (let j = 0; j < leaderboardRemovedLength; j++) {
            leaderboardRemoved.push({
                id: packet[i++].number.unsigned
            });
        }

        let leaderboardChangedLength = packet[i++].number;
        if (leaderboardChangedLength.signed === -1) leaderboardChangedLength = leaderboardChangedLength.signed;
        else leaderboardChangedLength = leaderboardChangedLength.unsigned;
        for (let j = 0; j < leaderboardChangedLength; j++) {
            leaderboardChanged.push({
                id: packet[i++].number.unsigned,
                score: packet[i++].number.unsigned,
                mockupIndex: packet[i++].number.unsigned,
                name: packet[i++].string.value,
                color: packet[i++].number.signed,
                barColor: packet[i++].number.signed
            });
        }

        return { minimapChanged, minimapRemoved, teamMinimapChanged, teamMinimapRemoved, leaderboardChanged, leaderboardRemoved };
    },
    c (packet) { // camera
        return {
            bodyX: packet[0].number.signed,
            bodyY: packet[1].number.signed,
            bodyFov: packet[2].number.unsigned
        };
    },
    M (packet) { // chat message
        return {
            entityId: packet[0].number.unsigned,
            message: packet[1].string.value,
            isGlobal: packet[2].number.bool
        };
    },
    K (packet) { // kick
        return {
            reason: packet[0].string.value
        };
    },
    F (packet) { // death
        let i = 0;

        const time = packet[i++].number.unsigned;
        const score = packet[i++].number.unsigned;
        const timeAlive = packet[i++].number.unsigned;

        const playerKills = packet[i++].number.unsigned;
        const assistKills = packet[i++].number.unsigned;
        const bossKills = packet[i++].number.unsigned;
        const foodKills = packet[i++].number.unsigned;

        const killType = packet[i++].number.unsigned;
        const killInfo = {};
        switch (killType) {
            case 1:
                killInfo.amount = packet[i++];
                break;
            case 2:
                killInfo.amount = packet[i++];
                killInfo.name = packet[i++];
                break;
        }

        const deathType = packet[i++].number.unsigned;
        
        const killers = [];
        const killersLength = deathType === 0 ? packet[i++].number.unsigned : 0;
        for (let k = 0; k < killersLength; k++) {
            killers.push({
                name: packet[i++].string.value,
                tank: packet[i++].string.value
            });
        }

        const serverActivity = packet[i++].number.unsigned;
        const serversTraveled = packet[i++].number.unsigned;
        const respawnTime = packet[i++].number.unsigned;
        const saveCode = packet[i++].string.value;

        return {
            time,
            timeAlive,
            score,
            kills: {
                player: playerKills,
                assist: assistKills,
                boss: bossKills,
                food: foodKills
            },
            killInfo: {
                type: ["none", "food", "player"][killType],
                ...killInfo
            },
            killers,
            deathType: ["killed", "dumb_death", "self_destruct", "surrender_control", "save_score"][deathType],
            serverActivity,
            serversTraveled,
            respawnTime: respawnTime + 2000,
            saveCode,
        };
    },
    r (packet) { // server travel
        return {
            server: packet[0].string.value,
            travelToken: packet[1].string.value
        };
    },
    k (packet) { // key
        return {
            playerToken: packet[0].string.value
        };
    }
};

class ArrasClient extends EventEmitter {
    static BUILD = "2c170ae5c3f70dd0";
    static PROTOCOLS = ["arras.io#v1.4+sls+et0", "arras.io"];

    constructor(server, { playerName, playerId, playerToken, travelToken, partyId, autoLevelUp, incognito, trackingData, ignoreUnusedPackets, proxy, serverLogs, clientLogs } = {}) {
        super();

        this.playerName = playerName ?? "";
        this.playerId = playerId ?? "";
        this.playerToken = playerToken ?? "";
        this.travelToken = travelToken ?? "";
        this.partyId = partyId ?? "";
        this.autoLevelUp = autoLevelUp ?? true;
        this.incognito = incognito ?? false;
        this.trackingData = trackingData ?? false;

        this.ignoreUnusedPackets = ignoreUnusedPackets ?? false;
        this.serverLogs = serverLogs ?? false;
        this.clientLogs = clientLogs ?? false;

        this.ws = new WebSocket(
            `wss://${server}/?a=3&b=${ArrasClient.BUILD}&t=${Math.floor(Date.now() / 1000)}`,
            ArrasClient.PROTOCOLS,
            {
                headers: {
                    origin: "https://arras.io"
                },
                agent: proxy
            }
        );
        this.ws.addEventListener("open", () => {
            const build = new Uint8Array(Buffer.from(ArrasClient.BUILD, "hex")).toReversed();
            const msg = new Uint8Array([0, 1, 0, 1, ...build]);
            this.ws.send(msg);
        });
        this.ws.addEventListener("message", async event => {
            const serverKey = await crypto.subtle.importKey("raw", event.data.slice(0, 32), "X25519", false, []);
            const clientKeys = await crypto.subtle.generateKey("X25519", false, ["deriveBits"]);

            const sharedKey = await crypto.subtle.deriveBits({
                name: "X25519",
                public: serverKey
            }, clientKeys.privateKey, 256);
            this.protocol = new ArrasProtocol(new BigInt64Array(sharedKey));

            this.usedPackets = this.ignoreUnusedPackets ? ["w", "p", "e", "C", ...Object.keys(this._events).filter(event => event.length === 1)].map(c => c.charCodeAt(0)) : false;
            this.ws.addEventListener("message", e => this.message(e));

            const clientPublicKey = await crypto.subtle.exportKey("raw", clientKeys.publicKey);
            this.ws.send(clientPublicKey);

            this.send(clientPackets.k(this.playerId, this.playerToken, this.travelToken));
            if (this.trackingData) this.send(clientPackets.T(this.trackingData));
        }, { once: true });

        this.ws.addEventListener("close", e => this.emit("close", e));
        this.ws.addEventListener("error", e => this.emit("error", e))
    }
    send(packet) {
        this.ws.send(this.protocol.encrypt(this.protocol.encode(packet)));
        if (this.clientLogs) console.log("[CLIENT]", packet.map(v => util.inspect(typeof v === "object" ? v.value : v, { compact: true, colors: true, maxStringLength: Infinity })).join(" "));
    }
    message(event) {
        const rawPacket = this.protocol.decrypt(event.data.slice(0, -6), this.usedPackets);
        if (!rawPacket) return;

        const packet = this.protocol.decode(rawPacket);

        const type = packet.shift();
        if (!serverPackets[type]) throw `Unknown packet type ${type}`;

        const data = serverPackets[type](packet);

        if (this.serverLogs) console.log("[SERVER]", type, data);

        switch (type) {
            case "w":
                this.send(clientPackets.s(this.playerName, this.partyId, {
                    autoLevelUp: this.autoLevelUp,
                    incognito: this.incognito
                }));
                this.send(clientPackets.p());
                break;
            case "p":
                this.send(clientPackets.p());
                break;
            case "e":
                const { id, code } = data;
                const result = vm.runInContext(`(()=>{${code}})()`, vmContext).toString();
                
                this.send(clientPackets.e(id, result));
                break;
            case "C":
                const { input } = data;
                let string = "";
                for (let i = 0; i < 64 ** 6; i++) {
                    let n = i;
                    string = "";
                    for (let j = 0; j < 6; j++) {
                        string = String.fromCharCode(n % 64 + 48) + string;
                        n = Math.floor(n / 64);
                    }
                    if (crypto.createHash("sha256").update(string + input).digest().readUint16LE() === 0) break;
                }
                this.send(clientPackets.R(input, string));
                break;
        }

        this.emit(type, data);
    }
}

module.exports = { ArrasClient, ArrasProtocol, clientPackets, serverPackets };