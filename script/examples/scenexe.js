// ==UserScript==
// @name         Arras.io scenexe mode
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Weird thing
// @author       pr2000
// @match        https://arras.io/
// @match        https://arrax.io/
// @match        https://arras.netlify.app/
// @icon         https://arras.io/favicon/64x64.png
// @grant        none
// ==/UserScript==

arras.server.on("R", p => {
    p.info.blackout = true;
    p.tiles = [[0x1000000]];
    return p;
});

arras.server.on("u", p => {
    if (p.color) p.color = 9;
    for (const entity of p.changed) {
        if (entity.name != null) delete entity.name;
        if (entity.score != null) delete entity.score;
        if (entity.color != null) entity.color = 9;
    }
    return p;
});

arras.server.on("b", p => {
    for (const entry of p.leaderboardChanged) {
        entry.name = "???";
        entry.color = 0x1000000;
        entry.barColor = 0x1000000;
    }
    for (const entry of p.teamMinimapChanged) {
        entry.color = 0x1000000;
    }
    p.minimapRemovedLength = 0;
    p.minimapRemoved = [];
    p.minimapChangedLength = 0;
    p.minimapChanged = [];
    return p;
});

arras.server.on("M", () => false);