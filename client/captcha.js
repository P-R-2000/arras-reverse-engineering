const http = require("http");
const { WebSocketServer } = require("ws");

const tokens = new Map();
const requests = new Map();
let socket;

const server = http.createServer((req, res) => {
    const siteKey = req.url.slice(1);
    if (!siteKey) return res.end();
    if (tokens.has(siteKey)) return res.end(tokens.get(siteKey));

    if (socket) socket.send(siteKey);
    if (!requests.has(siteKey)) requests.set(siteKey, []);
    requests.get(siteKey).push(token => {
        res.end(token);
    });
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
        tokens.set(siteKey, token);
        setTimeout(() => {
            tokens.delete(siteKey);
        }, 4.5 * 60 * 1000);
        if (requests.has(siteKey)) {
            const req = requests.get(siteKey);
            for (const r of req) r(token);
            requests.delete(siteKey);
        }

        console.log("Received token for", siteKey);
    });

    console.log("Client connected.");

    for (const siteKey of requests.keys()) {
        socket.send(siteKey);
    }
});