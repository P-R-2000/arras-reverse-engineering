// ==UserScript==
// @name         Arras Packet Hook
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Allows hooking of arras.io packets
// @author       pr2000
// @match        https://arras.io/
// @match        https://arrax.io/
// @match        https://arras.netlify.app/
// @match        https://arras.pages.dev/
// @match        https://arras-wwii.pages.dev/
// @icon         https://arras.io/favicon/64x64.png
// @grant        none
// @run-at       document-start
// ==/UserScript==

let memory;

WebAssembly.instantiateStreaming = false;
const instantiate = WebAssembly.instantiate;
WebAssembly.instantiate = async function (module, imports) {
    const wasm = await instantiate(module, imports);
    for (const exp of Object.values(wasm.instance.exports)) {
        if (exp instanceof WebAssembly.Memory) {
            memory = exp;
            break;
        }
    }
    return wasm;
}

const log = console.log;
console.log = function (...logs) {
    if (memory) {
        console.log = log;
    } else if (new Error().stack.includes("wasm")) {
        console.log = log;
        eval(document.querySelector("body > script").innerText);
        throw "stopped the wasm";
    }
    log(...logs);
}

class PacketInterface {
    constructor(server) {
        this.server = server;
        this.listeners = new Map();
    }
    on(type, listener) {
        if (this.listeners.has(type)) this.listeners.get(type).push(listener);
        else this.listeners.set(type, [listener]);
    }
    async emit(type, packet) {
        if (!this.listeners.has(type)) return;

        let output;
        for (const listener of this.listeners.get(type)) {
            const result = await listener(packet);
            if (result != null) output = result;
        }

        return output;
    }
    send(type, data) {
        if (this.server) window.arras.ws.sendServer(type, data);
        else window.arras.ws.sendClient(type, data);
    }
}

window.arras = {
    client: new PacketInterface(false),
    server: new PacketInterface(true)
};

class GrowableBuffer {
    constructor() {
        this.buffer = new ArrayBuffer(2 ** 6, { maxByteLength: 2 ** 32 });
        this.view = new DataView(this.buffer);
        this.array = new Uint8Array(this.buffer);
        this.offset = 0;
    }
    check(size) {
        if (this.buffer.byteLength - this.offset < size) {
            this.buffer.resize((this.offset + size) * 2);
        }
    }
    set(data) {
        this.check(data.length);
        this.array.set(data, this.offset)
        this.offset += data.length;
    }
    write(data) {
        const array = encoder.encode(data);
        this.check(array.length);
        this.array.set(array, this.offset)
        this.offset += array.length;
    }
    writeUint8(data) {
        this.check(1);
        this.array[this.offset] = data;
        this.offset += 1;
    }
    writeUint16(data) {
        this.check(2);
        this.view.setUint16(this.offset, data, true);
        this.offset += 2;
    }
    writeUint32(data) {
        this.check(4);
        this.view.setUint32(this.offset, data, true);
        this.offset += 4;
    }
    writeFloat(data) {
        this.check(4);
        this.view.setFloat32(this.offset, data, true);
        this.offset += 4;
    }
}

function rotl(x, n) {
    return x << n | x >>> (32 - n);
}

function quarterRound(output, a, b, c, d) {
    output[a] += output[b];
    output[d] = rotl(output[d] ^ output[a], 16);
    output[c] += output[d];
    output[b] = rotl(output[b] ^ output[c], 12);
    output[a] += output[b];
    output[d] = rotl(output[d] ^ output[a], 8);
    output[c] += output[d];
    output[b] = rotl(output[b] ^ output[c], 7);
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

const encoder = new TextEncoder();
const decoder = new TextDecoder();

class ArrasProtocol {
    constructor(key) {
        this.key = key;

        const stateBuffer = new ArrayBuffer(64);
        this.state = new DataView(stateBuffer);

        this.state.setBigInt64(0, 3684054920433006693n, true);
        this.state.setBigInt64(8, 7719281312240119090n, true);
        this.state.setBigInt64(16, this.key[0], true);
        this.state.setBigInt64(24, this.key[1], true);
        this.state.setBigInt64(32, this.key[2], true);
        this.state.setBigInt64(40, this.key[3], true);
        this.state.setInt32(52, 0, true);
        this.stateArray = new Int32Array(stateBuffer);
    }
    async encrypt(packet, packetIndex) {
        const size = packet.length;
        const dataBuffer = new ArrayBuffer(size + 6);
        const dataArray = new Uint8Array(dataBuffer);
        const dataView = new DataView(dataBuffer);

        this.state.setBigInt64(56, packetIndex, true);

        for (let i = 0; i < size; i += 64) {
            this.state.setInt32(48, i / 64, true);

            const chunkKey = chacha20(this.stateArray);

            for (let j = 0; j < 64 && i + j < size; j++) {
                dataArray[i + j] = packet[i + j] ^ chunkKey[j];
            }
        }

        const hashDataBuffer = new ArrayBuffer(size + 40);
        const hashDataView = new DataView(hashDataBuffer);

        new Uint8Array(hashDataBuffer).set(new Uint8Array(dataBuffer));
        hashDataView.setBigInt64(size, this.key[0], true);
        hashDataView.setBigInt64(size + 8, this.key[1], true);
        hashDataView.setBigInt64(size + 16, this.key[2], true);
        hashDataView.setBigInt64(size + 24, this.key[3], true);
        hashDataView.setBigInt64(size + 32, packetIndex, true);

        const hashBuffer = await crypto.subtle.digest("SHA-256", hashDataBuffer);
        const hashBufferView = new DataView(hashBuffer);

        dataView.setInt32(size, hashBufferView.getInt32(0, true), true);
        dataView.setInt16(size + 4, hashBufferView.getInt16(4, true), true);

        return dataBuffer;
    }
    decrypt(packet, packetIndex) {
        const size = packet.length;
        const output = new Uint8Array(size);

        this.state.setBigInt64(56, packetIndex, true);

        for (let i = 0; i < size; i += 64) {
            this.state.setInt32(48, i / 64, true);

            const chunkKey = chacha20(this.stateArray);

            for (let j = 0; j < 64 && i + j < size; j++) {
                output[i + j] = packet[i + j] ^ chunkKey[j];
            }
        }
        return output;
    }
    decode(packet) {
        const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
        const output = [String.fromCharCode(packet[0])];
        for (let i = 1; i < packet.length;) {
            const header = packet[i++];

            switch (true) {
                case header <= 0x7f:
                    output.push(header);
                    break;
                case header <= 0xbf:
                    output.push((header & 0x3f) - 64);
                    break;
                case header <= 0xdf:
                    output.push(decoder.decode(packet.subarray(i, i + (header & 0x1f))));
                    i += header & 0x1f;
                    break;
                case header < 0xfe:
                    if (header < 0xf0) {
                        output.push(((header << 28) >> 20) | packet[i]);
                        i += 1;
                    } else if (header < 0xf8) {
                        output.push(((header << 29) >> 13) | (packet[i] << 8) | packet[i + 1]);
                        i += 2;
                    } else if (header < 0xfc) {
                        output.push(((header << 30) >> 6) | (packet[i] << 16) | (packet[i + 1] << 8) | packet[i + 2]);
                        i += 3;
                    } else {
                        const low32 = ((packet[i] << 24) | (packet[i + 1] << 16) | (packet[i + 2] << 8) | packet[i + 3]) >>> 0;
                        output.push((header & 1) ? low32 - 0x100000000 : low32);
                        i += 4;
                    }
                    break;
                case header === 0xfe:
                    let length = view.getUint16(i, true);
                    i += 2;
                    if (length === 0) {
                        length = view.getUint32(i, true);
                        i += 4;
                    }
                    output.push(decoder.decode(packet.subarray(i, i + length)));
                    i += length;
                    break;
                case header === 0xff:
                    output.push(view.getFloat32(i, true));
                    i += 4;
                    break;
            }
        }
        return output;
    }
    encode(packet) {
        const buffer = new GrowableBuffer();
        buffer.write(packet[0]);

        for (let i = 1; i < packet.length; i++) {
            let data = packet[i];
            switch (typeof data) {
                case "string":
                    const str = encoder.encode(data);
                    const length = str.length;
                    if (length < 2 ** 5) {
                        buffer.writeUint8(0xc0 | length);
                        buffer.set(str);
                    } else if (length < 2 ** 16) {
                        buffer.writeUint8(0xfe);
                        buffer.writeUint16(length);
                        buffer.set(str);
                    } else if (length < 2 ** 32) {
                        buffer.writeUint8(0xfe);
                        buffer.writeUint16(0);
                        buffer.writeUint32(length);
                        buffer.set(str);
                    } else {
                        console.log(packet, data, i);
                        throw "unencodable string";
                    }
                    break;
                case "bigint":
                    data = Number(data);
                case "number":
                    if (!Number.isInteger(data)) {
                        buffer.writeUint8(0xff);
                        buffer.writeFloat(data);
                        break;
                    }
                case "boolean":
                    if (data >= 0 && data <= 127) {
                        buffer.writeUint8(data);
                    } else if (data >= -64 && data < 0) {
                        buffer.writeUint8(data & 0xbf);
                    } else if (data >= -2048 && data <= 2047) {
                        buffer.writeUint8(0xe0 | ((data >> 8) & 0x0f));
                        buffer.writeUint8(data & 0xff);
                    } else if (data >= -262144 && data <= 262143) {
                        buffer.writeUint8(0xf0 | ((data >> 16) & 0x07));
                        buffer.writeUint8((data >> 8) & 0xff);
                        buffer.writeUint8(data & 0xff);
                    } else if (data >= -33554432 && data <= 33554431) {
                        buffer.writeUint8(0xf8 | ((data >> 24) & 0x03));
                        buffer.writeUint8((data >> 16) & 0xff);
                        buffer.writeUint8((data >> 8) & 0xff);
                        buffer.writeUint8(data & 0xff);
                    } else if (data >= -4294967296 && data <= 4294967295) {
                        buffer.writeUint8(data < 0 ? 0xfd : 0xfc);
                        buffer.writeUint8((data >>> 24) & 0xff);
                        buffer.writeUint8((data >>> 16) & 0xff);
                        buffer.writeUint8((data >>> 8) & 0xff);
                        buffer.writeUint8(data & 0xff);
                    } else {
                        buffer.writeUint8(0xff);
                        buffer.writeFloat(data);
                    }
                    break;
                default:
                    console.log(packet, data, i);
                    throw "unknown packet data type";
            }
        }
        return buffer.array.subarray(0, buffer.offset);
    }
}

function serializeColor(color) {
    if (typeof color === "string") {
        return 1 << 24 | parseInt(color.slice(1), 16);
    }
    return color;
}

function deserializeColor(color) {
    if (color & 1 << 24) {
        return `#${(color ^ 1 << 24).toString(16).padStart(6, "0")}`;
    }
    return color;
}

const clientPackets = {
    k: {
        serialize({ playerId = "", playerToken = "", travelToken = "" }) {
            return ["k", playerId, playerToken, travelToken];
        },
        deserialize(packet) {
            return {
                playerId: packet[0],
                playerToken: packet[1],
                travelToken: packet[2]
            };
        }
    },
    T: {
        serialize({ data }) {
            return ["T", JSON.stringify(data)];
        },
        deserialize(packet) {
            return {
                data: JSON.parse(packet[0])
            };
        }
    },
    p: {
        serialize() {
            return ["p"];
        },
        deserialize() {
            return {};
        }
    },
    s: {
        serialize({ name = "", partyId = "", autoLevelUp, incognito, anonymous, stealth, spytab }) {
            return ["s", name, partyId, autoLevelUp | incognito << 1 | anonymous << 2 | stealth << 3 | spytab << 4];
        },
        deserialize(packet) {
            return {
                name: packet[0],
                partyId: packet[1],
                autoLevelUp: Boolean(packet[2] & 1 << 0),
                incognito: Boolean(packet[2] & 1 << 1),
                anonymous: Boolean(packet[2] & 1 << 2),
                stealth: Boolean(packet[2] & 1 << 3),
                spytab: Boolean(packet[2] & 1 << 4)
            };
        }
    },
    e: {
        serialize({ id, result }) {
            return ["e", id, result];
        },
        deserialize(packet) {
            return {
                id: packet[0],
                result: packet[1]
            };
        }
    },
    R: {
        serialize({ input, result }) {
            return ["R", input, result];
        },
        deserialize(packet) {
            return {
                input: packet[0],
                result: packet[1]
            };
        }
    },
    G: {
        serialize({ id, token, error = "" }) {
            return ["G", id, token, error];
        },
        deserialize(packet) {
            return {
                id: packet[0],
                token: packet[1],
                error: packet[2]
            };
        }
    },
    U: {
        serialize({ index }) {
            return ["U", index];
        },
        deserialize(packet) {
            return {
                index: packet[0]
            };
        }
    },
    x: {
        serialize({ index, type = "add", value }) {
            switch (type) {
                case "add":
                    return ["x", index, -1];
                case "max":
                    return ["x", index, 255];
                case "set":
                    return ["x", index, value];
            }
        },
        deserialize(packet) {
            return {
                index: packet[0],
                value: packet[1],
                type: packet[1] === -1 ? "add" : packet[1] === 255 ? "max" : "set"
            };
        }
    },
    C: {
        serialize({ x, y, up, down, left, right, lmb, rmb, mmb, scope, timeout }) {
            return ["C", x, y, up | down << 1 | left << 2 | right << 3 | lmb << 4 | rmb << 5 | mmb << 6 | scope << 7 | timeout << 8];
        },
        deserialize(packet) {
            return {
                x: packet[0],
                y: packet[1],
                up: Boolean(packet[2] & 1 << 0),
                down: Boolean(packet[2] & 1 << 1),
                left: Boolean(packet[2] & 1 << 2),
                right: Boolean(packet[2] & 1 << 3),
                lmb: Boolean(packet[2] & 1 << 4),
                rmb: Boolean(packet[2] & 1 << 5),
                mmb: Boolean(packet[2] & 1 << 6),
                scope: Boolean(packet[2] & 1 << 7),
                timeout: Boolean(packet[2] & 1 << 8)
            };
        }
    },
    t: {
        serialize({ action }) {
            return ["t", ["autofire", "autospin", "override", "reverseTank", "reverseMouse"].indexOf(action)];
        },
        deserialize(packet) {
            return {
                action: ["autofire", "autospin", "override", "reverseTank", "reverseMouse"][packet[0]]
            };
        }
    },
    L: {
        serialize() {
            return ["L"];
        },
        deserialize() {
            return {};
        }
    },
    0: {
        serialize({ keyCode, isKeyDown }) {
            return ["0", keyCode, isKeyDown];
        },
        deserialize(packet) {
            return {
                keyCode: packet[0],
                isKeyDown: packet[1]
            };
        }
    },
    M: {
        serialize({ message }) {
            return ["M", message];
        },
        deserialize(packet) {
            return {
                message: packet[0]
            };
        }
    },
    P: {
        serialize({ action, socketId }) {
            return ["P", ["promote", "demote", "kick"].indexOf(action), socketId];
        },
        deserialize(packet) {
            return {
                action: ["promote", "demote", "kick"][packet[0]],
                socketId: packet[1]
            };
        }
    },
    r: {
        serialize({ socketId }) {
            return ["r", socketId];
        },
        deserialize(packet) {
            return {
                socketId: packet[0]
            }
        }
    },
    K: {
        serialize() {
            return ["K"];
        },
        deserialize() {
            return {};
        }
    },
    A: {
        serialize() {
            return ["A"];
        },
        deserialize() {
            return {};
        }
    },
    D: {
        serialize() {
            return ["D"];
        },
        deserialize() {
            return {};
        }
    },
    V: {
        serialize() {
            return ["V"];
        },
        deserialize() {
            return {};
        }
    }
};

const serverPackets = {
    R: {
        serialize({ info, short, roomX1, roomY1, roomX2, roomY2, unknown, tiles }) {
            if (short) return ["R", [...Object.entries(info).map(d => d.join("=")), "end"].join(",")];
            return ["R", Object.entries(info).map(d => d.join("=")).join(","), roomX1, roomY1, roomX2, roomY2, unknown, tiles[0].length, tiles.length, ...tiles.flat().map(color => serializeColor(color))];
        },
        deserialize(packet) {
            let i = 0;

            const info = Object.fromEntries(packet[i++].split(",").filter(d => d).map(d => [...d.split("="), true]));
            if (info.end) {
                delete info.end;
                return {
                    info,
                    short: true
                }
            }

            const roomX1 = packet[i++];
            const roomY1 = packet[i++];
            const roomX2 = packet[i++];
            const roomY2 = packet[i++];
            const unknown = packet[i++];
            const tilesWidth = packet[i++];
            const tilesHeight = packet[i++];

            const tiles = Array(tilesHeight).fill().map(() => Array(tilesWidth));

            for (let y = 0; y < tilesHeight; y++) {
                for (let x = 0; x < tilesWidth; x++) {
                    tiles[y][x] = deserializeColor(packet[i++]);
                }
            }

            return {
                info,
                roomX1,
                roomY1,
                roomX2,
                roomY2,
                unknown,
                tiles
            };
        }
    },
    u: {
        serialize({ bodyX, bodyY, bodyFov, mspt, speed, mockupIndex, treeMockupIndex, color, id, score, kills, skillPoints, maxSkills, skills, upgrades, partyCode, operatorLevel, dead, removed, changed }) {
            const packet = [
                "u",
                bodyX,
                bodyY,
                bodyFov,
                0
            ];

            if (mspt != null) {
                packet[4] |= (1 << 0);
                packet.push(mspt);
            }
            if (speed != null) {
                packet[4] |= (1 << 1);
                packet.push(speed);
            }
            if (mockupIndex != null && treeMockupIndex != null) {
                packet[4] |= (1 << 2);
                packet.push(mockupIndex, treeMockupIndex);
            }
            if (color != null && id != null) {
                packet[4] |= (1 << 3);
                packet.push(serializeColor(color), id);
            }
            if (score != null) {
                packet[4] |= (1 << 4);
                packet.push(score);
            }
            if (kills != null) {
                packet[4] |= (1 << 5);
                packet.push(
                    kills.player,
                    kills.assist,
                    kills.boss,
                    kills.food
                );
            }
            if (skillPoints != null) {
                packet[4] |= (1 << 6);
                packet.push(skillPoints);
            }
            if (maxSkills != null) {
                packet[4] |= (1 << 7);
                packet.push(...maxSkills);
            }
            if (skills != null) {
                packet[4] |= (1 << 8);
                packet.push(...skills);
            }
            if (upgrades != null) {
                packet[4] |= (1 << 9);
                packet.push(upgrades.length, ...upgrades);
            }
            if (partyCode != null) {
                packet[4] |= (1 << 10);
                packet.push(partyCode);
            }
            if (operatorLevel != null) {
                packet[4] |= (1 << 11);
                packet.push(operatorLevel);
            }

            packet.push(
                ...dead.map(e => e.id),
                -1,
                ...removed.map(e => e.id),
                -1
            );

            function flattenEntity(entity) {
                let i = packet.length;
                packet.push(0);

                if (entity.deltaX != null || entity.deltaY != null) {
                    packet[i] |= 1 << 0;
                    packet.push((entity.deltaX ?? 0) * 4, (entity.deltaY ?? 0) * 4);
                }
                if (entity.deltaFacing != null) {
                    packet[i] |= 1 << 1;
                    packet.push(entity.deltaFacing * 512 / Math.PI);
                }
                if (entity.mockupIndex != null) {
                    packet[i] |= 1 << 2;
                    packet.push(entity.mockupIndex);
                }
                if (entity.guns != null) {
                    packet[i] |= 1 << 3;
                    for (const gun of Object.values(entity.guns)) {
                        let j = packet.length + 1;
                        packet.push(
                            gun.index,
                            0
                        );

                        if (gun.time != null) {
                            packet[j] |= 1 << 0;
                            packet.push(gun.time);
                        }
                        if (gun.power != null) {
                            packet[j] |= 1 << 1;
                            packet.push(gun.power);
                        }
                    }
                    packet.push(-1);
                }
                if (entity.turrets != null) {
                    packet[i] |= 1 << 4;
                    for (const turret of Object.values(entity.turrets)) {
                        packet.push(turret.index);
                        flattenEntity(turret);
                    }
                    packet.push(-1);
                }
                if (entity.twiggle != null && entity.reverse != null && entity.drawHealth != null && entity.invuln != null && entity.damage1 != null && entity.damage2 != null) {
                    packet[i] |= 1 << 5;
                    packet.push(entity.twiggle | entity.reverse << 1 | entity.drawHealth << 2 | entity.invuln << 3 | entity.damage1 << 4 | entity.damage2 << 5);
                }
                if (entity.health != null) {
                    packet[i] |= 1 << 6;
                    packet.push(entity.health * 255);
                }
                if (entity.shield != null) {
                    packet[i] |= 1 << 7;
                    packet.push(entity.shield * 255);
                }
                if (entity.alpha != null) {
                    packet[i] |= 1 << 8;
                    packet.push(entity.alpha * 255);
                }
                if (entity.size != null) {
                    packet[i] |= 1 << 9;
                    packet.push(entity.size * 16);
                }
                if (entity.score != null) {
                    packet[i] |= 1 << 10;
                    packet.push(entity.score);
                }
                if (entity.name != null) {
                    packet[i] |= 1 << 11;
                    packet.push(entity.name);
                }
                if (entity.color != null) {
                    packet[i] |= 1 << 12;
                    packet.push(serializeColor(entity.color));
                }
                if (entity.layer != null) {
                    packet[i] |= 1 << 13;
                    packet.push(entity.layer);
                }
            }

            for (const entity of changed) {
                packet.push(entity.id);
                flattenEntity(entity);
            }
            packet.push(-1);

            return packet;
        },
        deserialize(packet) {
            let i = 0;

            const output = {
                bodyX: packet[i++],
                bodyY: packet[i++],
                bodyFov: packet[i++],
                dead: [],
                removed: [],
                changed: []
            };

            const updateFlags = packet[i++];

            if (updateFlags & (1 << 0)) {
                output.mspt = packet[i++];
            }
            if (updateFlags & (1 << 1)) {
                output.speed = packet[i++];
            }
            if (updateFlags & (1 << 2)) {
                output.mockupIndex = packet[i++];
                output.treeMockupIndex = packet[i++];
            }
            if (updateFlags & (1 << 3)) {
                output.color = deserializeColor(packet[i++]);
                output.id = packet[i++];
            }
            if (updateFlags & (1 << 4)) {
                output.score = packet[i++];
            }
            if (updateFlags & (1 << 5)) {
                output.kills = {
                    player: packet[i++],
                    assist: packet[i++],
                    boss: packet[i++],
                    food: packet[i++]
                };
            }
            if (updateFlags & (1 << 6)) {
                output.skillPoints = packet[i++];
            }
            if (updateFlags & (1 << 7)) {
                output.maxSkills = [];
                for (let j = 0; j < 10; j++) {
                    output.maxSkills.push(packet[i++]);
                }
            }
            if (updateFlags & (1 << 8)) {
                output.skills = [];
                for (let j = 0; j < 10; j++) {
                    output.skills.push(packet[i++]);
                }
            }
            if (updateFlags & (1 << 9)) {
                const upgradesLength = packet[i++];
                output.upgrades = [];
                for (let j = 0; j < upgradesLength; j++) {
                    output.upgrades.push(packet[i++]);
                }
            }
            if (updateFlags & (1 << 10)) {
                output.partyCode = packet[i++];
            }
            if (updateFlags & (1 << 11)) {
                output.operatorLevel = packet[i++];
            }

            while (packet[i] !== -1) {
                output.dead.push({
                    id: packet[i++]
                });
            }
            i++;

            while (packet[i] !== -1) {
                output.removed.push({
                    id: packet[i++]
                });
            }
            i++;

            function parseEntity() {
                const entity = {};
                const entityFlags = packet[i++];

                if (entityFlags & (1 << 0)) {
                    entity.deltaX = packet[i++] / 4;
                    entity.deltaY = packet[i++] / 4;
                }
                if (entityFlags & (1 << 1)) {
                    entity.deltaFacing = packet[i++] * Math.PI / 512;
                }
                if (entityFlags & (1 << 2)) {
                    entity.mockupIndex = packet[i++];
                }
                if (entityFlags & (1 << 3)) {
                    entity.guns = {};
                    while (packet[i] !== -1) {
                        const gunIndex = packet[i++];
                        const gunFlags = packet[i++];
                        const gun = { index: gunIndex };

                        if (gunFlags & (1 << 0)) gun.time = packet[i++];
                        if (gunFlags & (1 << 1)) gun.power = packet[i++];

                        entity.guns[gunIndex] = gun;
                    }
                    i++;
                }
                if (entityFlags & (1 << 4)) {
                    entity.turrets = {};
                    while (packet[i] !== -1) {
                        const turretIndex = packet[i++];

                        const turret = entity.turrets[turretIndex] = parseEntity();
                        turret.index = turretIndex;
                    }
                    i++;
                }
                if (entityFlags & (1 << 5)) {
                    const entityDataFlags = packet[i++];
                    entity.twiggle = Boolean(entityDataFlags & (1 << 0));
                    entity.reverse = Boolean(entityDataFlags & (1 << 1));
                    entity.drawHealth = Boolean(entityDataFlags & (1 << 2));
                    entity.invuln = Boolean(entityDataFlags & (1 << 3));
                    entity.damage1 = Boolean(entityDataFlags & (1 << 4));
                    entity.damage2 = Boolean(entityDataFlags & (1 << 5));
                }
                if (entityFlags & (1 << 6)) {
                    entity.health = packet[i++] / 255;
                }
                if (entityFlags & (1 << 7)) {
                    entity.shield = packet[i++] / 255;
                }
                if (entityFlags & (1 << 8)) {
                    entity.alpha = packet[i++] / 255;
                }
                if (entityFlags & (1 << 9)) {
                    entity.size = packet[i++] / 16;
                }
                if (entityFlags & (1 << 10)) {
                    entity.score = packet[i++];
                }
                if (entityFlags & (1 << 11)) {
                    entity.name = packet[i++];
                }
                if (entityFlags & (1 << 12)) {
                    entity.color = deserializeColor(packet[i++]);
                }
                if (entityFlags & (1 << 13)) {
                    entity.layer = packet[i++];
                }

                return entity;
            }

            while (packet[i] !== -1) {
                const id = packet[i++];
                const entity = parseEntity();
                entity.id = id;
                output.changed.push(entity);
            }

            return output;
        }
    },
    w: {
        serialize({ playerId }) {
            return ["w", playerId];
        },
        deserialize(packet) {
            return {
                playerId: packet[0]
            };
        }
    },
    P: {
        serialize({ removed, changed }) {
            const packet = ["P"];

            packet.push(removed.length);
            for (const player of removed) {
                packet.push(player.socketId);
            }

            packet.push(changed.length);
            for (const player of changed) {
                packet.push(
                    player.socketId,
                    player.self | player.operatorLevel << 1,
                    player.name,
                    player.mockupIndex
                );
            }

            return packet;
        },
        deserialize(packet) {
            let i = 0;

            const removed = [];
            const changed = [];

            const removedLength = packet[i++];
            for (let j = 0; j < removedLength; j++) {
                removed.push({
                    socketId: packet[i++]
                });
            }

            const changedLength = packet[i++];
            for (let j = 0; j < changedLength; j++) {
                const socketId = packet[i++];
                const flag = packet[i++];
                const name = packet[i++];
                const mockupIndex = packet[i++];

                changed.push({
                    socketId: socketId,
                    self: Boolean(flag & 1),
                    operatorLevel: flag >> 1,
                    name,
                    mockupIndex
                });
            }

            return { removed, changed };
        }
    },
    m: {
        serialize({ message }) {
            return ["m", message];
        },
        deserialize(packet) {
            return {
                message: packet[0]
            };
        }
    },
    J: {
        serialize({ mockups }) {
            const packet = ["J"];

            const values = Object.values(mockups);
            packet.push(values.length);

            for (const mockup of values) {
                packet.push(
                    mockup.mockupIndex,
                    `${mockup.name}${mockup.censorName ? "/N" : ""}${mockup.censorDesign ? "/D" : ""}`,
                    mockup.scoreText,
                    serializeColor(mockup.color)
                );

                let shape = mockup.shape.sides;
                if (mockup.shape.flip) shape |= 1 << 9;
                if (mockup.shape.star) shape |= 1 << 10;
                if (mockup.shape.path || mockup.shape.threeD) shape |= 1 << 11;

                packet.push(shape);
                if (mockup.shape.path) {
                    packet.push(
                        mockup.shape.path.length,
                        ...mockup.shape.path.flat()
                    );
                }

                packet.push(
                    mockup.size,
                    mockup.bulletType,
                    mockup.offset,
                    mockup.scale,
                    mockup.upgrades.length,
                    ...mockup.upgrades.flatMap(u => [u.tier, u.mockupIndex]),
                    mockup.guns.length,
                    ...mockup.guns.flatMap(g => [g.offset, g.direction, g.length, g.width, g.aspect, g.angle]),
                    mockup.turrets.length,
                    ...mockup.turrets.flatMap(t => [t.mockupIndex, t.scale, t.offset, t.direction, t.layer, t.angle])
                );
            }

            return packet;
        },
        deserialize(packet) {
            let i = 0;

            const mockups = {};
            const length = packet[i++];

            for (let j = 0; j < length; j++) {
                const mockup = {};
                mockup.mockupIndex = packet[i++];

                mockup.name = packet[i++];

                if (mockup.name.endsWith("/D")) {
                    mockup.censorDesign = true;
                    mockup.name = mockup.name.slice(0, -2);
                }
                if (mockup.name.endsWith("/N")) {
                    mockup.censorName = true;
                    mockup.name = mockup.name.slice(0, -2);
                }

                mockup.scoreText = packet[i++];

                mockup.color = deserializeColor(packet[i++]);

                const shape = packet[i++];
                mockup.shape = {
                    sides: shape & 0xff
                };
                if (shape & 1 << 9) mockup.shape.flip = true;
                if (shape & 1 << 10) mockup.shape.star = true;
                if (shape & 1 << 11) {
                    if (mockup.shape.sides === 0) {
                        const pathLength = packet[i++];
                        mockup.shape.path = [];
                        for (let k = 0; k < pathLength; k++) {
                            mockup.shape.path.push([packet[i++], packet[i++]]);
                        }
                    } else mockup.shape.threeD = true;
                }

                mockup.size = packet[i++];
                mockup.bulletType = packet[i++];

                mockup.offset = packet[i++];
                mockup.scale = packet[i++];

                const upgradesLength = packet[i++];
                mockup.upgrades = [];
                for (let k = 0; k < upgradesLength; k++) {
                    mockup.upgrades.push({
                        tier: packet[i++],
                        mockupIndex: packet[i++]
                    });
                }

                const gunsLength = packet[i++];
                mockup.guns = [];
                for (let k = 0; k < gunsLength; k++) {
                    mockup.guns.push({
                        offset: packet[i++],
                        direction: packet[i++],
                        length: packet[i++],
                        width: packet[i++],
                        aspect: packet[i++],
                        angle: packet[i++]
                    });
                }

                const turretsLength = packet[i++];
                mockup.turrets = [];
                for (let k = 0; k < turretsLength; k++) {
                    mockup.turrets.push({
                        mockupIndex: packet[i++],
                        scale: packet[i++],
                        offset: packet[i++],
                        direction: packet[i++],
                        layer: packet[i++],
                        angle: packet[i++]
                    });
                }

                mockups[mockup.mockupIndex] = mockup;
            }

            return { mockups };
        }
    },
    C: {
        serialize({ input }) {
            return ["C", input];
        },
        deserialize(packet) {
            return {
                input: packet[0]
            };
        }
    },
    e: {
        serialize({ id, code }) {
            return ["e", id, code];
        },
        deserialize(packet) {
            return {
                id: packet[0],
                code: packet[1]
            };
        }
    },
    G: {
        serialize({ id, siteKey }) {
            return ["G", id, siteKey];
        },
        deserialize(packet) {
            return {
                id: packet[0],
                siteKey: packet[1]
            };
        }
    },
    p: {
        serialize() {
            return ["p"];
        },
        deserialize() {
            return {};
        }
    },
    b: {
        serialize({ minimapRemoved, minimapChanged, minimapReset, teamMinimapRemoved, teamMinimapChanged, teamMinimapReset, leaderboardRemoved, leaderboardChanged, leaderboardReset }) {
            const packet = ["b"];

            if (minimapReset) {
                packet.push(-1);
            } else {
                packet.push(minimapRemoved.length);
                for (const { id } of minimapRemoved) {
                    packet.push(id);
                }
            }

            packet.push(minimapChanged.length);
            for (const { id, type, x, y, color, size } of minimapChanged) {
                packet.push(
                    id,
                    type,
                    x * 255,
                    y * 255,
                    serializeColor(color),
                    size
                );
            }

            if (teamMinimapReset) {
                packet.push(-1);
            } else {
                packet.push(teamMinimapRemoved.length);
                for (const { id } of teamMinimapRemoved) {
                    packet.push(id);
                }
            }

            packet.push(teamMinimapChanged.length);
            for (const { id, x, y, color } of teamMinimapChanged) {
                packet.push(
                    id,
                    x * 255,
                    y * 255,
                    serializeColor(color)
                );
            }

            if (leaderboardReset) {
                packet.push(-1);
            } else {
                packet.push(leaderboardRemoved.length);
                for (const { id } of leaderboardRemoved) {
                    packet.push(id);
                }
            }

            packet.push(leaderboardChanged.length);
            for (const { id, score, mockupIndex, name, color, barColor } of leaderboardChanged) {
                packet.push(
                    id,
                    score,
                    mockupIndex,
                    name,
                    serializeColor(color),
                    serializeColor(barColor)
                );
            }

            return packet;
        },
        deserialize(packet) {
            let i = 0;

            const minimapRemoved = [];
            const minimapChanged = [];
            const teamMinimapRemoved = [];
            const teamMinimapChanged = [];
            const leaderboardRemoved = [];
            const leaderboardChanged = [];

            const minimapRemovedLength = packet[i++];
            for (let j = 0; j < minimapRemovedLength; j++) {
                minimapRemoved.push({
                    id: packet[i++]
                });
            }

            const minimapChangedLength = packet[i++];
            for (let j = 0; j < minimapChangedLength; j++) {
                minimapChanged.push({
                    id: packet[i++],
                    type: packet[i++],
                    x: packet[i++] / 255,
                    y: packet[i++] / 255,
                    color: deserializeColor(packet[i++]),
                    size: packet[i++]
                });
            }

            const teamMinimapRemovedLength = packet[i++];
            for (let j = 0; j < teamMinimapRemovedLength; j++) {
                teamMinimapRemoved.push({
                    id: packet[i++]
                });
            }

            const teamMinimapChangedLength = packet[i++];
            for (let j = 0; j < teamMinimapChangedLength; j++) {
                teamMinimapChanged.push({
                    id: packet[i++],
                    x: packet[i++] / 255,
                    y: packet[i++] / 255,
                    color: deserializeColor(packet[i++])
                });
            }

            const leaderboardRemovedLength = packet[i++];
            for (let j = 0; j < leaderboardRemovedLength; j++) {
                leaderboardRemoved.push({
                    id: packet[i++]
                });
            }

            const leaderboardChangedLength = packet[i++];
            for (let j = 0; j < leaderboardChangedLength; j++) {
                leaderboardChanged.push({
                    id: packet[i++],
                    score: packet[i++],
                    mockupIndex: packet[i++],
                    name: packet[i++],
                    color: deserializeColor(packet[i++]),
                    barColor: deserializeColor(packet[i++])
                });
            }

            return {
                minimapRemoved,
                minimapChanged,
                minimapReset: minimapRemovedLength === -1,
                teamMinimapRemoved,
                teamMinimapChanged,
                teamMinimapReset: teamMinimapRemovedLength === -1,
                leaderboardRemoved,
                leaderboardChanged,
                leaderboardReset: leaderboardRemovedLength === -1
            };
        }
    },
    c: {
        serialize({ bodyX, bodyY, bodyFov }) {
            return ["c", bodyX, bodyY, bodyFov];
        },
        deserialize(packet) {
            return {
                bodyX: packet[0],
                bodyY: packet[1],
                bodyFov: packet[2]
            };
        }
    },
    M: {
        serialize({ entityId, message, isGlobal }) {
            return ["M", entityId, message, isGlobal];
        },
        deserialize(packet) {
            return {
                entityId: packet[0],
                message: packet[1],
                isGlobal: packet[2]
            };
        }
    },
    K: {
        serialize({ reason }) {
            return ["K", reason];
        },
        deserialize(packet) {
            return {
                reason: packet[0]
            };
        }
    },
    F: {
        serialize({ time, timeAlive, score, kills: { player: playerKills, assist: assistKills, boss: bossKills, food: foodKills }, killInfo, killers, deathType, serverActivity, serversTraveled, respawnTime, saveCode }) {
            const packet = [
                "F",
                time,
                score,
                timeAlive,
                playerKills,
                assistKills,
                bossKills,
                foodKills
            ];

            const killType = ["none", "food", "player"].indexOf(killInfo.type);
            packet.push(killType);
            switch (killType) {
                case 1:
                    packet.push(killInfo.amount);
                    break;
                case 2:
                    packet.push(killInfo.name);
                    break;
            }

            const type = ["killed", "dumb_death", "self_destruct", "surrender_control", "save_score"].indexOf(deathType);
            packet.push(type);

            if (type === 0) {
                packet.push(killers.length);
                for (const killer of killers) {
                    packet.push(killer.name, killer.tank);
                }
            }

            packet.push(
                serverActivity,
                serversTraveled,
                respawnTime,
                saveCode
            );

            return packet;
        },
        deserialize(packet) {
            let i = 0;

            const time = packet[i++];
            const score = packet[i++];
            const timeAlive = packet[i++];

            const playerKills = packet[i++];
            const assistKills = packet[i++];
            const bossKills = packet[i++];
            const foodKills = packet[i++];

            const killType = packet[i++];
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

            const deathType = packet[i++];

            const killers = [];
            const killersLength = deathType === 0 ? packet[i++] : 0;
            for (let k = 0; k < killersLength; k++) {
                killers.push({
                    name: packet[i++],
                    tank: packet[i++]
                });
            }

            const serverActivity = packet[i++];
            const serversTraveled = packet[i++];
            const respawnTime = packet[i++];
            const saveCode = packet[i++];

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
                respawnTime,
                saveCode
            };
        }
    },
    r: {
        serialize({ server, travelToken }) {
            return ["r", server, travelToken];
        },
        deserialize(packet) {
            return {
                server: packet[0],
                travelToken: packet[1]
            };
        }
    },
    k: {
        serialize({ playerToken }) {
            return ["k", playerToken];
        },
        deserialize(packet) {
            return {
                playerToken: packet[0]
            };
        }
    }
};

class ArrasSocket extends WebSocket {
    constructor(url, protocols) {
        super(url, protocols);

        this.handshake = false;
        this.clientHandshake = 0;

        this.realClientPacketIndex = 0n;
        this.realServerPacketIndex = 0x8000000000000000n;
        this.fakeClientPacketIndex = 0n;
        this.fakeServerPacketIndex = 0x8000000000000000n;

        this.clientPacketQueue = [];
        this.serverPacketQueue = [];

        window.arras.ws = this;
    }
    async sendClient(packetType, data) {
        const fakePacketIndex = this.fakeClientPacketIndex++;
        const type = clientPackets[packetType];
        if (!type) throw `Unknown client packet: ${packetType}`;

        super.send(await this.arrasProtocol.encrypt(this.arrasProtocol.encode(type.serialize(data)), fakePacketIndex));
    }
    async sendServer(packetType, data) {
        const fakePacketIndex = this.fakeServerPacketIndex++;
        const type = serverPackets[packetType];
        if (!type) throw `Unknown server packet: ${packetType}`;

        this.messageListener({
            data: await this.arrasProtocol.encrypt(this.arrasProtocol.encode(type.serialize(data)), fakePacketIndex)
        });
    }
    async processClientPacket(data, packetIndex) {
        const decryptedPacket = this.arrasProtocol.decrypt(data.subarray(0, -6), packetIndex);
        const packet = this.arrasProtocol.decode(decryptedPacket);
        const packetType = packet.shift();
        const type = clientPackets[packetType];
        if (!type) {
            console.log(packet)
            throw `Unknown client packet: ${packetType}`;
        }

        const editedPacket = await arras.client.emit(packetType, type.deserialize(packet));
        if (editedPacket === false) return;

        const fakePacketIndex = this.fakeClientPacketIndex++;
        if (editedPacket) {
            data = await this.arrasProtocol.encrypt(this.arrasProtocol.encode(type.serialize(editedPacket)), fakePacketIndex);
        } else if (fakePacketIndex !== packetIndex) {
            data = await this.arrasProtocol.encrypt(decryptedPacket, fakePacketIndex);
        }

        super.send(data);
    }
    async processServerPacket(data, packetIndex) {
        const decryptedPacket = this.arrasProtocol.decrypt(data.subarray(0, -6), packetIndex);
        const packet = this.arrasProtocol.decode(decryptedPacket);
        const packetType = packet.shift();
        const type = serverPackets[packetType];
        if (!type) throw `Unknown server packet: ${packetType}`;

        const editedPacket = await arras.server.emit(packetType, type.deserialize(packet));
        if (editedPacket === false) return;

        const fakePacketIndex = this.fakeServerPacketIndex++;
        if (editedPacket) {
            data = await this.arrasProtocol.encrypt(this.arrasProtocol.encode(type.serialize(editedPacket)), fakePacketIndex);
        } else if (fakePacketIndex !== packetIndex) {
            data = await this.arrasProtocol.encrypt(decryptedPacket, fakePacketIndex);
        }

        this.messageListener({ data });
    }
    async send(data) {
        if (!this.handshake) {
            switch (this.clientHandshake++) {
                case 0:
                    this.memory1 = new Uint8Array(memory.buffer.slice());
                    break;
                case 1:
                    this.handshake = true;
                    break;
            }
            return super.send(data);
        }

        const packetIndex = this.realClientPacketIndex++;
        const packet = data.slice();

        if (!this.arrasProtocol) {
            this.clientPacketQueue.push([packet, packetIndex]);
            if (packetIndex === 0n) {
                const memory1 = this.memory1;
                const memory2 = new Uint8Array(memory.buffer.slice());

                const diffs = [];
                let start = false;
                let index = 0;
                for (let i = 0; i < memory2.length; i++) {
                    if (memory1[i] !== memory2[i]) {
                        if (!start) {
                            start = true;
                            index = i;
                        }
                    } else if (start) {
                        if (i - index >= 32) diffs.push([index, i]);
                        start = false;
                    }
                }
                if (start && memory2.length - index >= 32) diffs.push([index, memory2.length]);

                const packetLength = packet.length - 6;
                const targetHash = packet.subarray(packetLength);
                const hashData = new Uint8Array(packetLength + 40);
                hashData.set(packet.subarray(0, packetLength));

                hashCheck: for (const [start, end] of diffs) {
                    for (let i = start; i <= end - 32; i++) {
                        hashData.set(memory2.subarray(i, i + 32), packetLength);
                        const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", hashData));

                        let match = true;
                        for (let i = 0; i < 6; i++) {
                            if (hash[i] !== targetHash[i]) {
                                match = false;
                                break;
                            }
                        }

                        if (match) {
                            this.arrasProtocol = new ArrasProtocol(new BigInt64Array(memory2.buffer.slice(i, i + 32)));
                            for (const [packet, packetIndex] of this.clientPacketQueue) await this.processClientPacket(packet, packetIndex);
                            for (const [packet, packetIndex] of this.serverPacketQueue) await this.processServerPacket(packet, packetIndex);
                            break hashCheck;
                        }
                    }
                }
            }
        } else this.processClientPacket(packet, packetIndex);
    }
    addEventListener(type, listener, options) {
        if (type === "message") {
            this.messageListener = listener;
            listener = event => {
                if (!this.handshake) return this.messageListener(event);

                const packet = new Uint8Array(event.data);
                const packetIndex = this.realServerPacketIndex++;

                if (!this.arrasProtocol) this.serverPacketQueue.push([packet, packetIndex]);
                else this.processServerPacket(packet, packetIndex);
            }
        }
        super.addEventListener(type, listener, options);
    }
}

window.WebSocket = class extends WebSocket {
    constructor(url, protocols) {
        if (Array.isArray(protocols) && protocols[0] === "arras.io#v1.4+sls+et0") {
            return new ArrasSocket(url, protocols);
        }
        super(url, protocols);
    }
};