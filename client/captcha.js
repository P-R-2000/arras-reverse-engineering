const http = require("http");
const { WebSocketServer } = require("ws");

const requests = [];
let socket;

const server = http.createServer((req, res) => {
    const siteKey = req.url.slice(1);
    if (!siteKey) return res.end();

    if (socket) socket.send(siteKey);
    requests.push([siteKey, token => res.end(token)]);
}).listen(8080, () => console.log("Waiting for client connection."));

const wss = new WebSocketServer({ server });

wss.on("connection", ws => {
    if (ws.protocol !== "arras-captcha") return ws.close();
    if (socket) return ws.close();

    socket = ws;
    socket.addEventListener("close", e => {
        socket = null;
        console.log("Client disconnected.");
    });
    socket.addEventListener("error", () => {
        socket = null;
        console.log("Client socket error:", e);
    });
    socket.addEventListener("message", e => {
        const [siteKey, token] = e.data.split("|");
        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];
            if (request[0] === siteKey) {
                requests.splice(i, 1);
                request[1](token);
                break;
            }
        }

        console.log("Received token for", siteKey);
    });

    console.log("Client connected.");

    for (const [siteKey] of requests) {
        socket.send(siteKey);
    }
});