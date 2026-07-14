const { ArrasClient, ArrasProtocol, clientPackets } = require("../client");
const fs = require("fs");

const client = new ArrasClient("qrp6ujau11f36bnm-c.uvwx.xyz:8443/5090");

const TEAM_COLORS = [10, 11, 12, 15];

client.on("R", ({ mode, roomX1, roomY1, roomX2, roomY2, tiles }) => {
    if (!mode) return;
    client.ws.close();
    const colors = Array.from(new Set(tiles.flat())).filter(n => !Number.isNaN(n) && n >= 0 && n !== 18);
    const bases = colors.filter(n => TEAM_COLORS.includes(n)).sort();
    const otherColors = colors.filter(n => !TEAM_COLORS.includes(n)).sort();
    fs.writeFileSync(`${mode.match(/mode=(.*?),/)[1]}-${Date.now()}.js`, `${otherColors.length ? otherColors.map(color => `const c${color.toString().padStart(2, "0")} = new Tile({ COLOR: ${color} });`).join("\n") + "\n" : ""}const { normal: ___, wall: wal, portal: por${bases.length ? `, ${bases.map(color => `base${TEAM_COLORS.indexOf(color) + 1}: bs${TEAM_COLORS.indexOf(color) + 1}`).join(", ")}` : ""} } = tileClass;

Config.map_tile_width = ${(roomX2 - roomX1) / 2 * 27 / tiles[0].length};
Config.map_tile_height = ${(roomY2 - roomY1) / 2 * 27 / tiles.length};

module.exports = [
    ${tiles.map(row => `[${row.map(tile => tile === -16777216 ? "por" : tile === -1 ? "wal" : tile === 18 ? "___" : TEAM_COLORS.includes(tile) ? `bs${TEAM_COLORS.indexOf(tile) + 1}` : `c${tile.toString().padStart(2, "0")}`).join(", ")}]`).join(",\n\t")}
];`);
});