const fs = require('node:fs');
const path = require('node:path');

function loadCommands(client) { 
    const commandsData = [];
    const commandSources = new Map();
    const foldersPath = path.join(__dirname, '../commands');
    const commandFolders = fs.readdirSync(foldersPath).sort();

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        
        if (!fs.lstatSync(commandsPath).isDirectory()) continue;
        
        const commandFiles = fs.readdirSync(commandsPath)
            .filter(file => file.endsWith('.js'))
            .sort();

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);

            const command = require(filePath); 

            if (command.data && command.execute) {
                const commandName = command.data.name;
                if (commandSources.has(commandName)) {
                    console.warn(
                        `[WARNING] Duplicate command "${commandName}" at ${filePath}; ` +
                        `already loaded from ${commandSources.get(commandName)}. Skipping duplicate.`
                    );
                    continue;
                }

                commandSources.set(commandName, filePath);
                client.commands.set(command.data.name, command);
                commandsData.push(command.data.toJSON());
            } else {
                console.warn(`[WARNING] The command at ${filePath} is missing "data" or "execute".`);
            }
        }
    }
    return commandsData;
}

module.exports = loadCommands;