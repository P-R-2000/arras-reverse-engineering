# Documentation on server and client packets
## Client packets
### k
**k**ey verification - authenticates the player first packet sent by the client <br>
`playerId`: the player ID that identifies that player. 
          It's given by the first server the player joins in the "w" packet. 
          It gets stored inside arrasLocalStorage.id <br>
`playerToken`: the token connected to a discord account that can give special permissions. 
             It's given by the server in the "k" packet when running $auth with a valid login token. 
             It gets stored inside arrasLocalStorage.token <br>
`travelToken`: a 8-character hex token used to transfer players from one server to another. 
             It's given by the first server in the "r" packet <br>
### T
**T**racking - tracking data
second (optional) packet sent by the client <br>
`data`: a JSON string containing the following data:
      ```
      {
          "adblock": bool,
          "mobile": bool,
          "storage": object, // the arras local storage data
          "overseer": {
              "features": { // various browser features
                  "wasm": array,
                  "rtc": string,
                  "wt": bool,
                  "sw": bool,
                  "gpu": bool,
                  "credentialless": bool,
                  "ua": string,
                  "hc": int,
                  "renderer": string,
                  "webgl": string,
                  "experimental-webgl": string,
                  "webgl2": string
              },
              "window": { // window size
                  "innerWidth": int,
                  "innerHeight": int
              },
              "fingerprints": { // browser fingerprints
                  "canvas": string,
                  "unicode": string
              },
              "report": string // contains the .toString() value of window.addEventListener, canvas.addEventListener, WebAssembly.instantiate, WebAssembly.instantiateStreaming, requestAnimationFrame, Function and an error stack
          }
    }```
### p
**p**ing - replies to the server ping. Also sent after receiving the "w" packet
### s
**s**pawn request - spawns the player <br>
`name`: the player name <br>
`partyId`: the party id of team to spawn into <br>
`flags`: spawn settings (auto level up, incognito) <br>
### e
**e**val - eval result. 
Sent in response to the "e" packet. 
Required to spawn <br>
`id`: the eval id (sent by the server in the "e" packet) <br>
`result`: the eval result <br>
### R
p**R**oof of work - hash result. 
Sent in response to the "C" packet. 
Required to spawn <br>
`input`: the input string (sent by the server in the "C" packet) <br>
`result`: the proof of work result <br>
### G
turnstile token
### U
**U**pgrade request - upgrades to a tank <br>
`index`: the tank index in the upgrades <br>
### x
skill upgrade request - upgrades a skill <br>
`index`: the skill index <br>
`type`: type of upgrade (add, max, set) <br> 
`value`: the value to set the skill to<br>
### C
**C**ommand - tank command<br>
`x`: tank target x<br>
`y`: tank target y<br>
`action`: movement and shooting actions (up, down, left, right, lmb, rmb)<br>
### t
player **t**oggle - toggles tank actions<br>
`action`: tank action (autofire, autospin, override, reverse)<br>
### L
**L**evel up cheat - levels up the tank<br>
### 0
key command - key press info.
Sends keydown and keyup information only while the sandbox key is being held. <br>
`keyCode`: the KeyboardEvent.prototype.code of a key press (use Self for the sandbox key \`) <br>
`isKeyDown`: true for keydown, false for keyup<br>
### M
chat **M**essages - sends a chat message<br>
`message`: the chat message<br>
### P
**P**layer action - executes an action on a player.
Works only while being an operator. <br>
`action`: the action to perform on the player (promote, demote, kick) <br>
`playerId`: the current socket id of the player <br>
### K
suicide - **K**ills the player body
### A
**A**bility - runs the F key ability
### D
pause score - saves the player score

## Server packets
### R
Room
### u
Update
### w
Welcome
### P
Player list
### m
**m**essage - message which appears in top middle of the screen(not chat message!)<br>
`message`: message text
### J
mock ups
### C
proof of work
### e
eval
### G
turnstile request
### p
**p**ing - replies to the client ping.
### b
broadcast
### c
**c**amera - 
### M
chat **M**essage <br>
`entityId`: ID of message sender<br>
`message`: the message text<br>
`isGlobal`: is message a global one, or local(team chat for example)<br>
### K
**K**ick - kicks player from room<br>
`reason`: kick reason<br>
### F
death - makes player dead, sends information about player death<br>
`time`<br>
`timeAlive`: amount of time player was alive for<br>
`score`: amount of score player gained<br>
`kills`: {<br>
          `player`: amount of players killed<br>
          `assist`: amount of assist kills<br>
          `boss`: amount of bosses killed<br>
          `boss`: amount of food(polygons) killed<br>
}
`killInfo`: {<br>
          `type`: who killed the player. Can be "none", "food", "player" <br>
}<br>
`killers`<br>
`deathType`: type of death. Can be "killed", "dumb_death", "self_destruct", "surrender_control", "save_score"
`serverActivity`: activity of server, measured in %<br>
`serversTraveled`: amount of servers traveled<br>
`respawnTime`: timeout for respawn<br>
`saveCode`: save code<br>
### r
server t**r**avel - sends player to another server<br>
`server`: server to send to<br>
`travelToken`: a 8-character hex token used to transfer players from one server to another. 
             It's given by the first server in the "r" packet <br>
### k
**k**ey - gives player a token.<br>
`playerToken`: the token connected to a discord account that can give special permissions. 
             It's given by the server in the "k" packet when running $auth with a valid login token. 
             It gets stored inside arrasLocalStorage.token <br>
