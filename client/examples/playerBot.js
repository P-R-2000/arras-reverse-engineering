const { ArrasClient, clientPackets } = require("../client");
const { Client, IntentsBitField, Message } = require("discord.js");

const DISCORD_TOKEN = "CHANGE_THIS";
const CHANNEL_ID = "CHANGE_THIS";

const players = [];
const mockupIndexToName = {};

function playerInfo(player) {
    return `${player.name ? `"${player.name}"` : "unnamed"} [#${player.socketId}] [${["PL", "AC", "AS", "AO"][player.operatorLevel]}] [${player.mockupIndex === -1 ? "not spawned" : (mockupIndexToName[player.mockupIndex] ?? `unknown (${player.mockupIndex})`)}]`;
}

function updateMessage(message) {
    const connectedPlayers = players.filter(p => !p.self && !p.connect);
    if (connectedPlayers.length > 0) {
        message.edit(`### Player List\n${connectedPlayers.sort((a, b) => a.socketId - b.socketId).map(p => `${p.socketId === 1 ? ":crown:" : [" ".repeat(6), ":green_square:", ":orange_square:", ":red_square:"][p.operatorLevel]} #${p.socketId}: ${p.name || "unnamed"} - ${p.mockupIndex === -1 ? "not spawned" : (mockupIndexToName[p.mockupIndex] ?? `unknown (${p.mockupIndex})`)}`).join("\n")}`.slice(0, 2000));
    } else message.edit("### Player List\n*no players*");
}

async function main() {
    const bot = new Client({ intents: IntentsBitField.Flags.Guilds | IntentsBitField.Flags.GuildMessages });
    bot.login(DISCORD_TOKEN);

    await new Promise(resolve => bot.once("clientReady", resolve));
    let channel = await bot.channels.fetch(CHANNEL_ID);
    const message = await channel.send("### Player List\n*Connecting...*");
    channel = await message.startThread({ name: "Player List" });

    const client = new ArrasClient("kvn3s3cpcdk4fl6j-c.uvwx.xyz:8443/5103");

    client.on("P", ({ removed, changed }) => {
        for (const player of removed) {
            const index = players.findIndex(p => p.socketId === player.socketId);
            if (index >= 0) {
                const oldPlayer = players[index];
                players.splice(index, 1);
                if (!oldPlayer.self) channel.send(`:broken_chain: ${playerInfo(oldPlayer)} disconnected`);
            }
        }
        for (const player of changed) {
            const index = players.findIndex(p => p.socketId === player.socketId);
            if (index >= 0) {
                if (!player.self) {
                    const oldPlayer = players[index];
                    const diff = Object.keys(player).filter(k => player[k] !== oldPlayer[k]);

                    if (diff.includes("name")) {
                        channel.send(`:pencil: ${playerInfo(oldPlayer)} changed name to "${player.name || "unnamed"}"`);
                        oldPlayer.name = player.name;
                    }
                    if (diff.includes("operatorLevel")) {
                        const promoted = player.operatorLevel > oldPlayer.operatorLevel;
                        channel.send(`${promoted ? ":chart_with_upwards_trend:" : ":chart_with_downwards_trend:"} ${playerInfo(oldPlayer)} got ${promoted ? "promoted" : "demoted"} to ${["player", "Arena Conductor", "Arena Supervisor", "Arena Operator"][player.operatorLevel]}`);
                        oldPlayer.operatorLevel = player.operatorLevel;
                    }
                    if (diff.includes("mockupIndex")) {
                        if (oldPlayer.mockupIndex === -1) {
                            channel.send(`:calling: ${playerInfo(oldPlayer)} ${oldPlayer.connect ? "" : "re"}spawned as ${mockupIndexToName[player.mockupIndex] ?? `unknown (${player.mockupIndex})`}`);
                        } else if (player.mockupIndex === -1) {
                            channel.send(`:headstone: ${playerInfo(oldPlayer)} died`);
                        } else channel.send(`:arrow_forward: ${playerInfo(oldPlayer)} upgraded to ${mockupIndexToName[player.mockupIndex] ?? `unknown (${player.mockupIndex})`}`);
                        oldPlayer.mockupIndex = player.mockupIndex;
                    }

                    if (oldPlayer.connect) oldPlayer.connect = false;
                } else players[index] = player;
            } else {
                if (player.mockupIndex === -1) player.connect = true;
                players.push(player);
                if (!player.self) {
                    if (player.mockupIndex !== -1) channel.send(`:information_source: ${playerInfo(player)} is in the server`);
                    else channel.send(`:satellite: ${playerInfo(player)} is connecting`);
                }
            }
        }
        updateMessage(message);
    });
    client.on("J", ({ mockups }) => {
        for (const [index, mockup] of Object.entries(mockups)) {
            mockupIndexToName[index] = mockup.name.replaceAll("/N", "").replaceAll("/D", "");
        }
    });

    client.on("F", () => client.send(clientPackets.s()));

    client.on("c", () => {
        client.send(clientPackets.U(1));
        client.send(clientPackets.U(0));
        client.send(clientPackets.U(0));
        client.send(clientPackets.x(0, "max"));
        client.send(clientPackets.x(1, "max"));
        client.send(clientPackets.x(8, "max"));
        client.send(clientPackets.x(9, "max"));
    });
    setInterval(() => client.send(clientPackets.C(1, 0)), 4 * 60000);
}

main();