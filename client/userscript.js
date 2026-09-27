// ==UserScript==
// @name         Arras CAPTCHA Solver
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Solves arras CAPTCHAs upon node.js client request
// @author       pr2000
// @match        https://arras.io/
// @icon         https://arras.io/favicon/64x64.png
// @grant        none
// ==/UserScript==

function run() {
    const ws = new WebSocket("ws://localhost:8080", "arras-captcha");
    ws.addEventListener("message", e => {
        const div = document.createElement("div");
        div.style.position = "fixed";
        div.style.top = "12px";
        div.style.left = "50%";
        div.style.transform = "translateX(-50%)";
        div.style.zIndex = "2147483647";
        document.body.appendChild(div);

        const siteKey = e.data;
        const widget = turnstile.render(div, {
            sitekey: siteKey,
            retry: "auto",
            "retry-interval": 1,
            callback(token) {
                turnstile.remove(widget);
                div.remove();
                ws.send(`${siteKey}|${token}`);
            }
        });
    });
}

const _appendChild = document.head.appendChild;
document.head.appendChild = function(child) {
    if (child && child.src === "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit") {
        document.head.appendChild = _appendChild;
        child.addEventListener("load", run);
    }
    return _appendChild.call(this, child);
}