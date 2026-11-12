const {Client, Collection, GatewayIntentBits, Partials} = require('discord.js')
require('dotenv').config()
const Token = process.env.something
const handler = require('./utils/handler')
const deploy = require('./utils/deploy')
const loadCommands = require('./utils/loadcom')

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages,
    ],
    partials: [
        Partials.Channel, Partials.Message  
    ]
});
client.commands = new Collection()
loadCommands(client)
deploy(client)
handler(client)
client.login(Token)