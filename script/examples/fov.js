// ==UserScript==
// @name         Arras.io FOV changer and removed entities viewer
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Lets you change your FOV and see removed entities in arras.io
// @author       pr2000
// @match        https://arras.io/
// @match        https://arrax.io/
// @match        https://arras.netlify.app/
// @icon         https://arras.io/favicon/64x64.png
// @grant        none
// ==/UserScript==

let fov = 1386;

window.addEventListener("wheel", e => {
    fov = Math.min(Math.max(fov + fov * e.deltaY / 1000, 0.1), 10000000);
});

arras.server.on("c", p => {
    p.bodyFov = fov;
    return p;
});

const removed = new Set();

arras.server.on("u", p => {
    p.bodyFov = fov;

    for (const { id } of p.removed) removed.add(id);
    p.removed = [];

    for (const { id } of p.changed) {
        if (removed.delete(id)) {
            p.removed.push({ id });
        }
    }

    return p;
});