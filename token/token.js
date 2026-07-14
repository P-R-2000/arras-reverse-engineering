const TOKEN = "AQAAJMiWpAbGH/4kIPXP1HBBHsmeYgYAboi/UI5NXzkVnCPB";
const buffer = Buffer.from(atob(TOKEN), "ascii");

console.log("Discord ID:", buffer.readBigInt64LE(0).toString());
console.log("Expiration:", new Date(Number(buffer.readBigInt64LE(16) / 1000n)).toUTCString());