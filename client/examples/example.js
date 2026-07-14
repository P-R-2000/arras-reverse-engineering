const { ArrasClient, clientPackets } = require("../client");

const client = new ArrasClient("kvn3s3cpcdk4fl6j-c.uvwx.xyz:8443/5100");

const game = {
    entities: [],
    players: [],
    minimap: [],
    teamMinimap: [],
    leaderboard: [],
    mockups: {},
    player: {},
    body: {},
    camera: {
        x: 0,
        y: 0,
        fov: 0
    },
    mspt: 0,
    speed: 0,
    mockupIndex: 0,
    color: 0,
    id: 0,
    score: 0,
    kills: {
        player: 0,
        assist: 0,
        boss: 0,
        food: 0
    },
    skillPoints: 0,
    maxSkills: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    skills: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    upgrades: [],
    notifications: [],
    messages: []
};


client.on("c", ({ bodyX, bodyY, bodyFov }) => {
    game.camera.x = bodyX;
    game.camera.y = bodyY;
    game.camera.fov = bodyFov;
});

client.on("u", ({ bodyX, bodyY, bodyFov, dead, removed, changed, ...update }) => {
    game.camera.x = bodyX;
    game.camera.y = bodyY;
    game.camera.fov = bodyFov;

    if (update.mspt) game.mspt = update.mspt;
    if (update.speed) game.speed = update.speed;
    if (update.mockupIndex) game.mockupIndex = update.mockupIndex;
    if (update.color) game.color = update.color;
    if (update.id) game.id = update.id;
    if (update.score) game.score = update.score;
    if (update.kills) game.kills = update.kills;
    if (update.skillPoints) game.skillPoints = update.skillPoints;
    if (update.maxSkills) game.maxSkills = update.maxSkills;
    if (update.skills) game.skills = update.skills;
    if (update.upgrades) game.upgrades = update.upgrades;

    for (const entity of dead) {
        const index = game.entities.findIndex(e => e.id === entity.id);
        if (index >= 0) game.entities.splice(index, 1);
    }

    for (const entity of removed) {
        const index = game.entities.findIndex(e => e.id === entity.id);
        if (index >= 0) game.entities.splice(index, 1);
    }

    for (const entity of changed) {
        const index = game.entities.findIndex(e => e.id === entity.id);
        if (index >= 0) {
            function updateEntity(oldEntity, entity) {
                const newEntity = {
                    ...oldEntity,
                    ...entity,
                    guns: oldEntity.guns,
                    turrets: oldEntity.turrets
                }

                if (entity.deltaX) newEntity.x += entity.deltaX;
                if (entity.deltaY) newEntity.y += entity.deltaY;
                if (entity.deltaFacing) newEntity.facing += entity.deltaFacing;
                if (entity.guns) {
                    for (const [index, gun] of Object.entries(entity.guns)) {
                        if (newEntity.guns[index]) {
                            Object.assign(newEntity.guns[index], gun);
                        } else newEntity.guns[index] = gun;
                    }
                }
                if (entity.turrets) {
                    for (const [index, turret] of Object.entries(entity.turrets)) {
                        if (newEntity.turrets[index]) {
                            updateEntity(newEntity.turrets[index], turret);
                        } else newEntity.turrets[index] = turret;
                    }
                }

                return newEntity;
            }

            game.entities[index] = updateEntity(game.entities[index], entity);

            if (entity.id === game.id) {
                game.body = game.entities[index];
            }
        }
        else {
            entity.x = entity.deltaX;
            entity.y = entity.deltaY;
            entity.facing = entity.deltaFacing;
            game.entities.push(entity);

            if (entity.id === game.id) {
                game.body = entity;
            }
        }
    }
});

client.on("P", ({ removed, changed }) => {
    for (const player of removed) {
        const index = game.players.findIndex(p => p.socketId === player.socketId);
        if (index >= 0) game.players.splice(index, 1);
    }

    for (const player of changed) {
        const index = game.players.findIndex(p => p.socketId === player.socketId);
        if (index >= 0) game.entities[index] = player;
        else game.entities.push(player);

        if (player.self) {
            game.player = player;
        }
    }
});

client.on("J", ({ mockups: mockupsData }) => {
    Object.assign(game.mockups, mockupsData);
});

client.on("b", ({ minimapChanged, minimapRemoved, teamMinimapChanged, teamMinimapRemoved, leaderboardChanged, leaderboardRemoved }) => {
    for (const entity of minimapRemoved) {
        const index = game.minimap.findIndex(e => e.id === entity.id);
        if (index >= 0) game.minimap.splice(index, 1);
    }

    for (const entity of minimapChanged) {
        const index = game.minimap.findIndex(e => e.id === entity.id);
        if (index >= 0) game.minimap[index] = entity;
        else game.minimap.push(entity);
    }

    for (const entity of teamMinimapRemoved) {
        const index = game.teamMinimap.findIndex(e => e.id === entity.id);
        if (index >= 0) game.teamMinimap.splice(index, 1);
    }

    for (const entity of teamMinimapChanged) {
        const index = game.teamMinimap.findIndex(e => e.id === entity.id);
        if (index >= 0) game.teamMinimap[index] = entity;
        else game.teamMinimap.push(entity);
    }

    for (const entity of leaderboardRemoved) {
        const index = game.leaderboard.findIndex(e => e.id === entity.id);
        if (index >= 0) game.leaderboard.splice(index, 1);
    }

    for (const entity of leaderboardChanged) {
        const index = game.leaderboard.findIndex(e => e.id === entity.id);
        if (index >= 0) game.leaderboard[index] = entity;
        else game.leaderboard.push(entity);
    }
});

client.on("m", ({ message }) => {
    game.notifications.push(message);
});

client.on("M", message => {
    game.messages.push(message);
});