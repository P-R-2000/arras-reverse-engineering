## Node.js Client
This client allows to connect to arras.io servers. Look at the `examples/` directory to better understand how to use it.

### Setup
Following the introduction of CAPTCHAs in arras, bots can't join normally anymore. This makes the setup of this client more complex.
The client includes the recommended way to deal with CAPTCHAs, but you're welcome to replace it with a solver API.

1. Install the [Tampermonkey](https://www.tampermonkey.net/#download) extension for your browser.
2. Install [this](https://greasyfork.org/scripts/597692) userscript.
3. Install [Node.js](https://nodejs.org/en/download/current).
4. Run `npm i ws` in the terminal.
5. Run `node captcha` in the terminal.
6. Go to [arras.io](https://arras.io/) on your browser.
7. Now you can run your bot's main file or one of the bot examples in `examples/`.
8. Complete any CAPTCHAs that show up in arras.io.

This works by making arras.io solve the CAPTCHA and send the token back to the client. That's why this requires you to keep arras open when running your bot.