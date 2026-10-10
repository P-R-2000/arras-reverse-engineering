# Packet Hook Script
This Tampermonkey script allows you to read, edit and send packets using the arras.io browser client.
You can download it [here](https://greasyfork.org/scripts/599561).
You can interact with its API by making new userscripts.
There are some examples on how to use this script in the `examples/` directory.

## How to use it
You can hook a packet by using `arras.server.on` or `arras.client.on`. The listener you provide will be called with the packet data.
```js
arras.client.on("s", p /* packet data */ => {
    console.log("Client sent spawn request with name", p.name);
});
```
You can edit these packets by making the listener return a value:
- prevent the packet from getting sent: return `false`
    ```js
    // Prevents chat messages from being received
    arras.server.on("M", () => false);
    ```
- modify the packet: return the new packet
    ```js
    // Always enables blackout mode
    arras.server.on("M", p => {
        p.info.blackout = true;
        return p;
    });
    ```
You can send new packets by using `arras.server.send` or `arras.client.send`.
```js
// Sends a notification when you attempt to chat
arras.client.on("M", p => {
    arras.server.send("m", { message: "You can't send messages while muted!" });
    return false;
});