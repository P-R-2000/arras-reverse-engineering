// ==UserScript==
// @name         Arras.io FOV changer and removed entities viewer
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Lets you change your FOV and see removed entities in arras.io
// @author       pr2000
// @match        https://arras.io/
// @match        https://arrax.io/
// @match        https://arras.netlify.app/
// @match        https://arras.pages.dev/
// @match        https://arras-wwii.pages.dev/
// @icon         https://arras.io/favicon/64x64.png
// @grant        none
// ==/UserScript==

const START_FOV = 1386;
let fov = START_FOV;

window.addEventListener("wheel", e => {
    const delta = e.deltaY * 1.3 / 100;
    fov = Math.min(Math.max(fov * (delta < 0 ? -1 / delta : delta), 0.1), 10000000);
});

arras.client.on("k", p => {
    fov = START_FOV;
});

arras.server.on("c", p => {
    p.bodyFov = fov;
    return p;
});

const entities = new Set();
const changed = new Set();
const removed = new Set();

arras.server.on("u", p => {
    p.bodyFov = fov;

    for (let i = 0; i < p.removed.length; i++) {
        const { id } = p.removed[i];
        if (!changed.has(id)) {
            removed.add(id);
            p.removed.splice(i, 1);
            i--;
        }
    }

    for (const { id } of p.changed) {
        if (removed.has(id)) {
            p.removed.push({ id });
            removed.delete(id);
        } else if (!entities.has(id)) {
            entities.add(id);
        } else if (!changed.has(id)) {
            changed.add(id);
        }
    }

    return p;
});