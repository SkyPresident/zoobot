import { stripIndent } from "common-tags";
import Discord from "discord.js";
import mongoose from "mongoose";
import { DISCORD_TOKEN, MONGODB_PATH } from "./config/secrets";
import { BeastiaryServer } from "./server";
import DatabaseIntegrityChecker from "./structures/DatabaseIntegrityChecker";

mongoose.connect(MONGODB_PATH, { dbName: "zoobot", useNewUrlParser: true, useUnifiedTopology: true }).then(async () => {
    const beastiaryServer = new BeastiaryServer();

    try {
        await beastiaryServer.start();
    }
    catch (error) {
        throw new Error(stripIndent`
            There was an error starting The Beastiary's webserver.

            ${error}
        `);
    }

    console.log("Beginning database integrity check");

    const integrityChecker = new DatabaseIntegrityChecker();

    let errors;
    try {
        errors = await integrityChecker.run()
    }
    catch (error) {
        throw new Error(stripIndent`
            There was an error running the database integrity check.

            ${error}
        `);
    }

    if (errors.length > 0) {
        console.log("Database integrity error(s) detected:");
        errors.forEach(currentError => {
            let errorString = currentError.info;

            currentError.documents.forEach(currentErrorDocument => {
                errorString += `\nDocument:\n${currentErrorDocument.toString()}`;
            });
            console.log(stripIndent`
                Error:

                ${errorString}
            `);
        });
    }
    else {
        console.log("Database integrity check passed");
    }

    const manager = new Discord.ShardingManager("./build/index.js", { respawn: false, token: DISCORD_TOKEN });
        
    manager.spawn("auto");

    manager.on("shardCreate", shard => {
        console.log(`- Spawned shard ${shard.id} -`);

        shard.on("message", message => {
            if (message === "exit") {
                process.exit();
            }
        });
    });

    beastiaryServer.on("vote", userId => {
        manager.broadcastEval(`this.emit("vote", "${userId}")`);
    });
});