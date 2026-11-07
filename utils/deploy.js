const { REST, Routes } = require('discord.js')
const path = require('node:path')
const fs = require('node:fs')
require('dotenv').config()

const Token = process.env.something
const clientId = process.env.client_id

async function deploy(client) {
    const globalCmds = []
    const guildCmds = {}
    const globalCommandSources = new Map()
    const guildCommandSources = {}
    const foldersPath = path.join(__dirname, '../commands')

    if (!fs.existsSync(foldersPath)) return console.error('Folder commands gak ada!')

    const commandFolders = fs.readdirSync(foldersPath).sort()

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder)

        if (!fs.lstatSync(commandsPath).isDirectory()) continue

        const commandFiles = fs.readdirSync(commandsPath)
            .filter(file => file.endsWith('.js'))
            .sort()

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file)
            const command = require(filePath)

            if (!command?.data || !command?.execute) {
                console.warn(`[WARNING] The command at ${filePath} is missing "data" or "execute".`)
                continue
            }

            const json = command.data.toJSON()

            if (command.guilds?.length) {
                for (const gId of command.guilds) {
                    const sources = guildCommandSources[gId] ??= new Map()
                    if (sources.has(json.name)) {
                        console.warn(
                            `[WARNING] Duplicate command "${json.name}" for guild ${gId} at ${filePath}; ` +
                            `already registered by ${sources.get(json.name)}. Skipping duplicate.`
                        )
                        continue
                    }
                    sources.set(json.name, filePath)
                    const commands = guildCmds[gId] ??= []
                    commands.push(json)
                }
            } else {
                if (globalCommandSources.has(json.name)) {
                    console.warn(
                        `[WARNING] Duplicate global command "${json.name}" at ${filePath}; ` +
                        `already registered by ${globalCommandSources.get(json.name)}. Skipping duplicate.`
                    )
                    continue
                }
                globalCommandSources.set(json.name, filePath)
                globalCmds.push(json)
            }
        }
    }

    const rest = new REST({ version: '10' }).setToken(Token)

    // global
    try {
        console.log(`Deploying ${globalCmds.length} global commands...`)
        const data = await rest.put(Routes.applicationCommands(clientId), { body: globalCmds })
        console.log(`Successfully deployed ${data.length} global commands.`)
    } catch (error) {
        console.error('Error deploying global commands:', error)
    }

    for (const [gId, body] of Object.entries(guildCmds)) {
        try {
            console.log(`Deploying ${body.length} commands ke guild ${gId}...`)
            const data = await rest.put(Routes.applicationGuildCommands(clientId, gId), { body })
            console.log(`Successfully deployed ${data.length} commands ke guild ${gId}.`)
        } catch (error) {
            console.error(`Error deploying ke guild ${gId}:`, error)
        }
    }
}

module.exports = deploy