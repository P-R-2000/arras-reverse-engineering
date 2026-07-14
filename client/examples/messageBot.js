const { ArrasClient, clientPackets } = require("../client");

const SERVER = "qrp6ujau11f36bnm-c.uvwx.xyz:8443/5106";
const NAME = "your average message bot";
const MESSAGES = [
    "First message",
    "Second message",
    "Third message"
];
const UPGRADES = [8, 1];
const SKILLS = [1, 9, 8, 0];

async function main() {
    while (true) {
        const client = new ArrasClient(SERVER, { playerName: NAME, autoLevelUp: true });

        // messages interval
        let interval;

        // send messages
        function sendMessages() {
            for (const message of MESSAGES) {
                client.send(clientPackets.M(message));
            }
        }

        // respawn on death
        client.on("F", () => {
            clearInterval(interval);
            client.send(clientPackets.s(NAME, "", { autoLevelUp: true }));
        });

        // on spawn
        client.on("c", () => {
            // upgrade tank
            for (const upgrade of UPGRADES) {
                client.send(clientPackets.U(upgrade));
            }

            // upgrade skills
            for (const skill of SKILLS) {
                client.send(clientPackets.x(skill, "max"));
            }

            // start sending messages
            sendMessages();
            interval = setInterval(sendMessages, 10100);
        });
        
        // on close
        await new Promise(resolve => {
            client.on("close", () => {
                clearInterval(interval);
                resolve();
            })
        });
    }
}
main();