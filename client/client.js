const EventEmitter = require("events");
const crypto = require("crypto");
const WebSocket = require("ws");
const vm = require("vm");

const vmContext = {
    chrome: {},
    navigator: {},
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
    constructor() {
        this.arrayBuffer = new ArrayBuffer(2 ** 6, { maxByteLength: 2 ** 32 });
        this.buffer = Buffer.from(this.arrayBuffer);
        this.offset = 0;
    }
    check(size) {
        if (this.arrayBuffer.byteLength - this.offset < size) {
            this.arrayBuffer.resize((this.offset + size) * 2);
        }
    }
    write(data) {
        const buffer = Buffer.from(data);
        this.check(buffer.length);
        buffer.copy(this.buffer, this.offset);
        this.offset += buffer.length;
    }
    writeUint8(data) {
        this.check(1);
        this.buffer[this.offset] = data;
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

class ArrasProtocol {
    constructor(key) {
        this.key = key;
        this.sentPacketCount = 0n;
        this.receivedPacketCount = 0n;

        this.stateBuffer = Buffer.alloc(64);
        this.stateBuffer.writeBigInt64LE(3684054920433006693n, 0);
        this.stateBuffer.writeBigInt64LE(7719281312240119090n, 8);
        this.stateBuffer.writeBigInt64LE(this.key[0], 16);
        this.stateBuffer.writeBigInt64LE(this.key[1], 24);
        this.stateBuffer.writeBigInt64LE(this.key[2], 32);
        this.stateBuffer.writeBigInt64LE(this.key[3], 40);
        this.stateBuffer.writeInt32LE(0, 52);
        this.stateArray = new Int32Array(this.stateBuffer.buffer);
    }
    encrypt(packet) {
        const packetIndex = this.sentPacketCount++;

        const size = packet.length;
        const dataBuffer = Buffer.alloc(size + 6);

        this.stateBuffer.writeBigInt64LE(packetIndex, 56);

        for (let i = 0; i < size; i += 64) {
            this.stateBuffer.writeInt32LE(i / 64, 48);

            const chunkKey = chacha20(this.stateArray);

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
        const packetIndex = this.receivedPacketCount++;

        const size = packet.length;
        const dataBuffer = Buffer.alloc(size);

        this.stateBuffer.writeBigInt64LE(BigInt.asIntN(64, packetIndex | 0x8000000000000000n), 56);

        for (let i = 0; i < size; i += 64) {
            this.stateBuffer.writeInt32LE(i / 64, 48);

            const chunkKey = chacha20(this.stateArray);

            for (let j = 0; j < 64 && i + j < size; j++) {
                if (packets && j === 0 && i === 0 && !packets.has(packet[0] ^ chunkKey[0])) return false;
                dataBuffer.writeUint8(packet[i + j] ^ chunkKey[j], i + j);
            }
        }
        return dataBuffer;
    }
    decode(packet) {
        const buffer = Buffer.from(packet.buffer);
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
                    let length = buffer.readUint16LE(i);
                    i += 2;
                    if (length === 0) {
                        length = buffer.readUint32LE(i);
                        i += 4;
                    }
                    output.push(decoder.decode(packet.subarray(i, i + length)));
                    i += length;
                    break;
                case header === 0xff:
                    output.push(buffer.readFloatLE(i));
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
                    const length = Buffer.byteLength(data);
                    if (length < 2 ** 5) {
                        buffer.writeUint8(0xc0 | length);
                        buffer.write(data);
                    } else if (length < 2 ** 16) {
                        buffer.writeUint8(0xfe);
                        buffer.writeUint16(length);
                        buffer.write(data);
                    } else if (length < 2 ** 32) {
                        buffer.writeUint8(0xfe);
                        buffer.writeUint16(0);
                        buffer.writeUint32(length);
                        buffer.write(data);
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
        return buffer.buffer.subarray(0, buffer.offset);
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

module.exports = class ArrasClient extends EventEmitter {
    static BUILD = "2c170ae5c3f70dd0";
    static PROTOCOLS = ["arras.io#v1.4+sls+et0", "arras.io"];

    constructor(server, options = {}) {
        super();

        this.options = {
            name: "",
            playerId: "",
            playerToken: "",
            travelToken: "",
            partyId: "",
            autoLevelUp: true,
            incognito: false,
            anonymous: false,
            stealth: false,
            trackingData: false,

            ignoreUnusedPackets: false,
            spawn: true,
            serverLogs: false,
            clientLogs: false,

            ...options
        };

        this.ws = new WebSocket(
            `wss://${server}/?a=3&b=${ArrasClient.BUILD}&t=${Math.floor(Date.now() / 1000)}`,
            ArrasClient.PROTOCOLS,
            {
                headers: {
                    origin: "https://arras.io"
                },
                agent: this.options.proxy
            }
        );
        this.ws.addEventListener("open", () => {
            const build = new Uint8Array(Buffer.from(ArrasClient.BUILD, "hex")).toReversed();
            const msg = new Uint8Array([0, 1, 0, 1, ...build]);
            this.ws.send(msg);
        });
        this.ws.addEventListener("message", async event => {
            const serverKey = crypto.createPublicKey({
                key: Buffer.concat([
                    Buffer.from("302a300506032b656e032100", "hex"),
                    event.data.subarray(0, 32)
                ]),
                format: "der",
                type: "spki"
            });
            const clientKeys = crypto.generateKeyPairSync("x25519");

            const sharedKey = crypto.diffieHellman({
                publicKey: serverKey,
                privateKey: clientKeys.privateKey
            });

            this.protocol = new ArrasProtocol(new BigInt64Array(sharedKey.buffer, sharedKey.byteOffset, sharedKey.byteLength / 8));

            this.usedPackets = this.options.ignoreUnusedPackets ? new Set(["w", "p", "e", "C", "G", ...Object.keys(this._events).filter(event => event.length === 1)].map(c => c.charCodeAt(0))) : false;
            this.ws.addEventListener("message", this.message);

            this.ws.send(clientKeys.publicKey.export({ format: "raw-public" }));

            this.send("k", {
                playerId: this.options.playerId,
                playerToken: this.options.playerToken,
                travelToken: this.options.travelToken
            });
            if (this.options.trackingData) {
                this.send("T", { data: this.options.trackingData });
            }
        }, { once: true });

        this.ws.addEventListener("close", e => this.emit("close", e));
        this.ws.addEventListener("error", e => this.emit("error", e));
    }
    send(packetType, data = {}) {
        const type = clientPackets[packetType];
        if (!type) throw `Unknown client packet: ${packetType}`;

        this.ws.send(this.protocol.encrypt(this.protocol.encode(type.serialize(data))));
        if (this.options.clientLogs) console.log("[CLIENT]", packetType, data);
    }
    message = (event) => {
        const rawPacket = this.protocol.decrypt(event.data.subarray(0, -6), this.usedPackets);
        if (!rawPacket) return;

        const packet = this.protocol.decode(rawPacket);

        const packetType = packet.shift();
        const type = serverPackets[packetType];
        if (!type) throw `Unknown server packet: ${packetType}`;

        const data = type.deserialize(packet);

        if (this.options.serverLogs) console.log("[SERVER]", packetType, data);

        switch (packetType) {
            case "w":
                if (this.options.spawn) this.spawn();
                this.send("p");
                break;
            case "p":
                this.send("p");
                break;
            case "e":
                const result = vm.runInContext(`(()=>{${data.code}})()`, vmContext).toString();

                this.send("e", {
                    id: data.id,
                    result
                });
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
                this.send("R", {
                    input,
                    result: string
                });
                break;
            case "G":
                fetch(`http://localhost:8080/${data.siteKey}`)
                    .then(r => r.text())
                    .then(token => {
                        if (!token) {
                            throw "CAPTCHA solver failed. Make sure you have arras.io open with the extension.";
                        }
                        this.send("G", {
                            id: data.id,
                            token: token
                        });
                    })
                    .catch(e => {
                        console.error(e);
                        throw "CAPTCHA solver is unavailable. Make sure captcha.js is running.";
                    });
                break;
        }

        this.emit(packetType, data);
    }
    spawn(options = {}) {
        this.send("s", {
            ...this.options,
            ...options
        });
    }
}