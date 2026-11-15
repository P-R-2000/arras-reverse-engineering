// ==UserScript==
// @name         Copy arras.io player names
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Copies player name when single-clicking the report button, reports on double-click
// @author       pr2000
// @match        https://arras.io/
// @match        https://arrax.io/
// @match        https://arras.netlify.app/
// @match        https://arras.pages.dev/
// @match        https://arras-wwii.pages.dev/
// @icon         https://arras.io/favicon/64x64.png
// @grant        none
// ==/UserScript==

const players = new Map();

arras.server.on("P", p => {
    for (const player of p.changed) {
        players.set(player.socketId, player);
    }
});

arras.client.on("k", p => {
    players.clear();
});

let last;
let timeout;
arras.client.on("r", p => {
    if (p.socketId === last) {
        clearTimeout(timeout);
        last = null;
    } else {
        last = p.socketId;
        timeout = setTimeout(() => {
            last = null;
            navigator.clipboard.writeText(players.get(p.socketId).name);
            arras.server.send("m", { message: "Copied player name!" });
        }, 300);
        return false;
    }
});