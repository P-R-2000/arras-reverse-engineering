# Documentation on server and client packets
## Client packets
### k
**k**ey verification - authenticates the player first packet sent by the client
`playerId`: the player ID that identifies that player
          it's given by the first server the player joins in the "w" packet
          it gets stored inside arrasLocalStorage.id
`playerToken`: the token connected to a discord account that can give special permissions
             it's given by the server in the "k" packet when running $auth with a valid login token
             it gets stored inside arrasLocalStorage.token
`travelToken`: a 8-character hex token used to transfer players from one server to another
             it's given by the first server in the "r" packet
### T
**T**racking - tracking data
second (optional) packet sent by the client
`data`: a JSON string containing the following data:
      `{
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
    }`
### p
**p**ing - replies to the server ping also sent after receiving the "w" packet
### s
**s**pawn request - spawns the player
`name`: the player name
`partyId`: the party id of team to spawn into
`flags`: spawn settings (auto level up, incognito)
### e
**e**val - eval result
sent in response to the "e" packet
required to spawn
`id`: the eval id (sent by the server in the "e" packet)
`result`: the eval result
### R
p**R**oof of work - hash result
sent in response to the "C" packet
required to spawn
`input`: the input string (sent by the server in the "C" packet)
`result`: the proof of work result
### G
turnstile token
### U
**U**pgrade request - upgrades to a tank
`index`: the tank index in the upgrades
### x
skill upgrade request - upgrades a skill
`index`: the skill index
`type`: type of upgrade (add, max, set)
`value`: the value to set the skill to
### C
**C**ommand - tank command
`x`: tank target x
`y`: tank target y
`action`: movement and shooting actions (up, down, left, right, lmb, rmb)
### t
player **t**oggle - toggles tank actions
`action`: tank action (autofire, autospin, override, reverse)
### L
**L**evel up cheat - levels up the tank
### 0
key command - key press info
sends keydown and keyup information only while the sandbox key is being held
`keyCode`: the KeyboardEvent.prototype.code of a key press (use Self for the sandbox key `)
`isKeyDown`: true for keydown, false for keyup
### M
chat **M**essages - sends a chat message
`message`: the chat message
### P
**P**layer action - executes an action on a player
works only while being an operator
`action`: the action to perform on the player (promote, demote, kick)
`playerId`: the current socket id of the player
### K
suicide - **K**ills the player body
### A
**A**bility - runs the F key ability
### D
pause score - saves the player score

