# CSGO Gamestate

A CS:GO Gamestate integration in NodeJS

### Example

```javascript
const CSGOClient = require("csgo-gamestate");

const client = new CSGOClient().start();

client.player.on("burning", health => {
    console.log(`Player is burning. ${health}HP remaining`);
});
```

### [Docs](docs/README.md)
