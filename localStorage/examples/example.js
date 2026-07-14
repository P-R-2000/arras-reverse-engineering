const { getLocalStorage, setLocalStorage } = require("../localStorage");

console.log(`localStorage['arras.io']='${setLocalStorage({
    secrets: {
        unlocked: true,
        unlocked_full: true
    },
    name: "it worked"
})}';location.reload()`);

console.log(getLocalStorage("=;m!z6}uEu43HJFIQNY9O:f]uuZFyg{HNS3crQC//qwKTN,il"));