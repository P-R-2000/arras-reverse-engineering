// ==UserScript==
// @name         Copy arras.io player names
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Copies player name when double-clicking the profile button
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
        navigator.clipboard.writeText(players.get(p.socketId).name);
        arras.server.send("m", { message: "Copied player name!" });
    } else {
        last = p.socketId;
        timeout = setTimeout(() => {
            last = null;
            arras.client.send("r", { socketId: p.socketId });
        }, 300);
    }
    return false;
});