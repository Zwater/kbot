// Load up the discord.js library
const util = require('util')
const Discord = require("discord.js");
const fs = require('fs');
const schedule = require('node-schedule')
// TODO: Make this configurable instead of hard-coded
//
const defaultConfig = {
    'leaveUnconfigured' : 'false',
    'configured' : 'false',
    'idiotChamber' : {
        'enabled' : 'false',
        'idiotChannel' : {
            'value': 'UNSET',
            'type': 'channel'
        },
        'idiotRole' : {
            'value' : 'UNSET',
            'type' : 'role'
        },
    },
    'kickAfter' : {
        'enabled' : 'false',
        'timeout' : {
            'value' : 'UNSET',
            'type' : 'integer'
        },
    },
    'accountability': {
        'enabled' : 'false',
        'accountabilityChannel' : {
            'value' : 'UNSET',
            'type' : 'channel'
        },
    }
}
const client = new Discord.Client();
const config = require("./config.json");
var serverConfig = {}
var recentJoins = {}
var autokick = schedule.scheduleJob('* * * * *', function() {
    //Auto-kicker for members who've not posted something after joining
    //
    var timestamp = new Date()
    var seconds = Math.round(timestamp / 1000)
    Object.keys(recentJoins).forEach(function(server) {
        if (serverConfig[server].kickAfter.timeout.value == 'UNSET') return;
        Object.keys(recentJoins[server]).forEach(async function(user) {
            //console.log(`we would kick ${user}`)
            if (seconds - recentJoins[server][user] > serverConfig[server].kickAfter.timeout.value) {
                kickServer = await client.guilds.find(guild => guild.id === server)
                kickMember = await kickServer.members.find(member => member.id === user)
                kickMember.kick('Inactivity Upon Joining')
                delete recentJoins[server][user]
            }
        })
    })
})
async function initConfig(client) {
    var configDir = config.configDir
    for ( let[snowflake, guild] of client.guilds) {
        // For each guild, load it's configuration file, else create an empty one
        //
        recentJoins[guild.id] = {}
        if (fs.existsSync(`${configDir}/${guild.id}_config.json`)) {
            var fileConfig = require(`${configDir}/${guild.id}_config.json`)
            serverConfig[guild.id] = Object.assign({}, defaultConfig, fileConfig)
        } else {
            // Config Doesn't exist
            //
            console.log(`Creating skeleton config for ${guild.name}(${guild.id})`)
            fs.writeFileSync(`${configDir}/${guild.id}_config.json`, JSON.stringify(defaultConfig))
            serverConfig[guild.id] = defaultConfig
        }
    }
    console.log(`Finished initializing configs`)
}
function urlGenerator(msgObj) {
    // Generates links to individual messages in a guild
    //
    var url = `https://discordapp.com/channels/${msgObj.guild.id}/${msgObj.channel.id}/${msgObj.id}`
    return url
}
async function doBulkDelete(message, args){
    // Bulk-deletes messages
    // TODO: Function-ize much of this, lots of repeated code
    //
    var statusMessage = await message.channel.send('Working...')
    if(!message.member.hasPermission("ADMINISTRATOR")) {
        statusMessage.edit(`ERROR: You do not appear to be an administrator`)
        return;
    }
    switch(args.length) {
        case 1 :
            if (isNaN(args[0])){
                statusMessage.edit('ERROR: When using only one argument, the argument must be a number between 1 and 100')
                return;
            }
            var fetchLimit = args[0]
            var channel = message.channel
            var fetch = await channel.fetchMessages({ limit: fetchLimit })
            var bulk = await channel.bulkDelete(fetch)
            statusMessage.edit(`Done. Deleted ${fetch.size} messages`)
            break;
        case 2 :
            if(isNaN(args[1])){
                statusMessage.edit('ERROR: When using two arguments, the number of messages to delete must be the final argument, and be a number between 1 and 100')
                return;
            }
            if(message.mentions.channels.array().length == 1  && message.mentions.users.array().length == 0) {
                var fetchLimit = args[1]
                for (let[snowflake, channel] of message.mentions.channels) {
                    var fetch = await channel.fetchMessages({ limit: fetchLimit })
                    var bulk = await channel.bulkDelete(fetch)
                    statusMessage.edit(`Done. Deleted ${fetch.size} messages in ${channel}`)
                }
            } else if (message.mentions.users.array().length == 1 && message.mentions.channels.array().length == 0){
                var fetchLimit = args[1] - 1
                for (let[snowflake, user] of message.mentions.users) {
                    var iterate = 0
                    var userFetch = 0
                    var latestID = 0
                    var latest = await message.channel.fetchMessages({ limit: 1})
                    for (let[snowflake, message] of latest) {
                        latestID = message.id
                    }
                    statusMessage.edit(`Working. This may take a while...`)
                    // Fetch up to 5K messages attempting to delete messages from user
                    //
                    while (iterate <= 100) {
                        var fetch = await message.channel.fetchMessages()
                        for(let[snowflake, fetchedMessage] of fetch) {
                            if(fetchedMessage.author.id == user.id && userFetch <= fetchLimit) {
                                await fetchedMessage.delete()
                                userFetch++
                            } else if (userFetch > fetchLimit) {
                                iterate = 101
                            }

                            latestID = fetchedMessage.id

                        }
                        iterate++
                    }
                    statusMessage.edit(`Done. deleted ${userFetch} messages from ${user.tag}`)

                }

            } else {
                var targetID = args[0]
                var fetchLimit = args[1] - 1
                var iterate = 0
                var userFetch = 0
                var latestID = 0
                var latest = await message.channel.fetchMessages({ limit: 1})
                for (let[snowflake, message] of latest) {
                    latestID = message.id
                }
                statusMessage.edit(`Working. This may take a while...`)
                while (iterate <= 100) {
                    var fetch = await message.channel.fetchMessages()
                    for(let[snowflake, fetchedMessage] of fetch) {
                        if(fetchedMessage.author.id == targetID && userFetch <= fetchLimit) {
                            await fetchedMessage.delete()
                            userFetch++
                        } else if (userFetch > fetchLimit) {
                            iterate = 101
                        }

                        latestID = fetchedMessage.id

                    }
                    iterate++
                }
                statusMessage.edit(`Done. deleted ${userFetch} messages from ${targetID}`)
            }
            break;
        case 3 :
            if(message.mentions.users.array().length == 1 && message.mentions.channels.array().length == 1) {
                var fetchLimit = args[2] - 1
                var targetChannel = message.mentions.channels.first()
                for (let[snowflake, user] of message.mentions.users) {
                    var iterate = 0
                    var userFetch = 0
                    var latestID = 0
                    var latest = await targetChannel.fetchMessages({ limit: 1})
                    for (let[snowflake, message] of latest) {
                        latestID = message.id
                    }
                    statusMessage.edit(`Working. This may take a while...`)
                    while (iterate <= 100) {
                        var fetch = await targetChannel.fetchMessages()
                        for(let[snowflake, fetchedMessage] of fetch) {
                            if(fetchedMessage.author.id == user.id && userFetch <= fetchLimit) {
                                await fetchedMessage.delete()
                                userFetch++
                            } else if (userFetch > fetchLimit) {
                                iterate = 101
                            }

                            latestID = fetchedMessage.id

                        }
                        iterate++
                    }
                    statusMessage.edit(`Done. deleted ${userFetch} messages from ${user.tag} in ${targetChannel}`)

                }

            } else {
                var targetID = args[0]
                var channel = message.mentions.channels.first()
                var fetchLimit = args[2] - 1
                var iterate = 0
                var userFetch = 0
                var latestID = 0
                var latest = await channel.fetchMessages({ limit: 1})
                for (let[snowflake, message] of latest) {
                    latestID = message.id
                }
                statusMessage.edit(`Working. This may take a while...`)
                while (iterate <= 100) {
                    var fetch = await channel.fetchMessages()
                    for(let[snowflake, fetchedMessage] of fetch) {
                        if(fetchedMessage.author.id == targetID && userFetch <= fetchLimit) {
                            await fetchedMessage.delete()
                            userFetch++
                        } else if (userFetch > fetchLimit) {
                            iterate = 101
                        }

                        latestID = fetchedMessage.id

                    }
                    iterate++
                }
                statusMessage.edit(`Done. deleted ${userFetch} messages from ${targetID} in ${channel}`)
            }
            break;
    }

}
function doConfig(message, args,  displayMessage) {
    if (!message.member.hasPermission("ADMINISTRATOR")){
        displayMessage.edit('ERROR: You do not appear to be a server administrator')
        return;
    }
    switch(args[0]) {
        case 'show' :
            displayMessage.edit('', new Discord.RichEmbed({
                title: '**Current Server Configuration**',
                fields: [
                    {name: `**idiotChamber**`, value: `_Set either of these values to 'UNSET' to disable the idiot chamber_`},
                    {name: `idiotChamber.idiotChannel:`, value: `<#${serverConfig[message.guild.id].idiotChamber.idiotChannel.value}>`},
                    {name: `idiotChamber.idiotRole:`, value: `<@${serverConfig[message.guild.id].idiotChamber.idiotRole.value}>`},
                    {name: `**kickAfter**`, value: `_Set this value to 'UNSET' to disable kicking new members if they haven't posted after a certain time_`},
                    {name: `kickAfter.timeout:`, value: `${serverConfig[message.guild.id].kickAfter.timeout.value} Seconds`},
                    {name: `**accountability**`, value: `_Set this value to 'UNSET' to disable logging deleted or modified messages to a channel_`},
                    {name: `accountability.accountabilityChannel:`, value: `<#${serverConfig[message.guild.id].accountability.accountabilityChannel.value}>`}
                ]
            }))
            break;
        case 'set' :
            var keys = args[1].split('.')
            var type = serverConfig[message.guild.id][keys[0]][keys[1]].type
            switch(type) {
                case 'channel' :
                    if(message.mentions.channels.array().length != 1){
                        displayMessage.edit('ERROR: Please specify only a single channel')
                    } else {
                        for (let[snowflake, channel] of message.mentions.channels) {
                            // Remove Circular structure
                            //configValue = util.inspect(channel)
                            serverConfig[message.guild.id][keys[0]][keys[1]].value = channel.id
                            displayMessage.edit('Done.')
                        }
                    }
                    break;
                case 'role' :
                    if (message.guild.roles.find(role => role.id === args[2])) {
                        serverConfig[message.guild.id][keys[0]][keys[1]].value = args[2]
                        displayMessage.edit('Done.')
                    } else  if (message.mentions.roles.array().length == 1) {
                        for (let[snowflake, role] of message.mentions.roles) {
                            serverConfig[message.guild.id][keys[0]][keys[1]].value = role.id
                            displayMessage.edit('Done.')
                        }
                    } else {
                        displayMessage.edit('ERROR: You either passed more than one role mention, or the ID you passed is not a role in this server. to get a list of current role IDs, run \`+config dumproleids\`\nNOTE: in order to @mention a role, it must be mentionable.')                    }
                    break;
                case 'integer' :
                    if (!isNaN(args[2])) {
                        serverConfig[message.guild.id][keys[0]][keys[1]].value = args[2]
                        displayMessage.edit('Done.')
                    } else {
                        displayMessage.edit('ERROR: This value must be an integer, not a string or decimal')
                    }
                    break;

            }
            var writeConfig = JSON.stringify(serverConfig[message.guild.id])
            //console.log(writeConfig)
            fs.writeFile(`${config.configDir}/${message.guild.id}_config.json`, writeConfig, (err) => {
                if(err) throw err;
                console.log(`Write ${config.configDir}/${message.guild.id}_config.json`)
            })

            break;
        case 'dumproleids' :
            var messageContents = ""
            for (let[snowflake, role] of message.guild.roles) {
                messageContents = `\`${role.name}\` **ID**: \`${role.id}\`\n${messageContents}`
            }
            displayMessage.edit(messageContents)
            break;
        default :
            displayMessage.edit('No valid config command. Available config commands are as follows', new Discord.RichEmbed({
                fields: [
                    {name: '**+config show**', value: 'Shows the current configuration'},
                    {name: '**+config set**', value: 'Sets a configuration node. for example:\n\`+config set kickAfter.timeout 3600\`'},
                    {name: '**+config dumproleids**', value: 'Dumps the role IDs for each role in the server.'}
                ]
            }))
    }
}
client.on("ready", () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
    console.log(`Initializing per-server config...`)
    initConfig(client)

});
client.on("guildCreate", guild => {
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    // Generate an empty config for newly joined servers
    //
    console.log(`Creating skeleton config for ${guild.name}(${guild.id})`)
    fs.writeFileSync(`${config.configDir}/${guild.id}_config.json`, JSON.stringify(defaultConfig))
    serverConfig[guild.id] = defaultConfig

});
client.on("guildDelete", guild => {
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
});
client.on("guildMemberAdd", member => {
    if (serverConfig[member.guild.id].idiotChamber.idiotRole.value != "UNSET" && serverConfig[member.guild.id].idiotChamber.idiotChannel.value != "UNSET") {
        member.addRole(serverConfig[member.guild.id].idiotChamber.idiotRole.value)
    }
    if(!recentJoins[member.guild.id]){
        recentJoins[member.guild.id] = {}
    }
    // Add member to recentJoins object so we can kick them later if the server has it enabled
    //
    var timestamp = new Date()
    var seconds = Math.round(timestamp / 1000)
    recentJoins[member.guild.id][member.id] = seconds

})
client.on("messageDelete", async message => {
    if(message.author.bot) return;
    // If it's enabled, log deleted messages to the accountability log
    // TODO: Create an embed constructor function
    //
    if(serverConfig[message.guild.id].accountability.accountabilityChannel.value == 'UNSET') return;
    var channel = message.guild.channels.find(channel => channel.id === serverConfig[message.guild.id].accountability.accountabilityChannel.value)
    var color = 0x781706
    channel.send(`Deleted message in ${message.channel}`, new Discord.RichEmbed({
        color: color,
        author: {
            name: message.author.username,
            icon_url: message.author.displayAvatarURL
        },
        url: urlGenerator(message),
        title: `Message ID: ${message.id} deleted in #${message.channel.name}`,
        description: 'The following message was deleted',
        fields: [
            {name: '**Msg**', value: `\`${message.cleanContent}\``},
        ],
        timestamp: new Date(),
        footer: {
            icon_url: client.user.displayAvatarURL,
            text: `User ID: ${message.author.id}`
        }
    }))
})
client.on("messageUpdate", async (oldMessage, newMessage) => {
    // If it's enabled, write modified messages to the accountability log
    // TODO: Ditto on the embed constructor
    //
    if(oldMessage.author.bot) return;
    if(oldMessage.cleanContent == newMessage.cleanContent) return;
    if(serverConfig[newMessage.guild.id].accountability.accountabilityChannel.value == 'UNSET') return;
    var channel = newMessage.guild.channels.find(channel => channel.id === serverConfig[newMessage.guild.id].accountability.accountabilityChannel.value)
    var color = 0xBA430D
    channel.send(`Edited message in ${newMessage.channel}`, new Discord.RichEmbed({
        color: color,
        author: {
            name: newMessage.author.username,
            icon_url: newMessage.author.displayAvatarURL
        },
        url: urlGenerator(newMessage),
        title: `Message ID: ${newMessage.id} modified in #${newMessage.channel.name}`,
        description: 'The following message was modified',
        fields: [
            {name: '**Old**', value: `\`${oldMessage.cleanContent}\``},
            {name: '**New**', value: `\`${newMessage.cleanContent}\``},
        ],
        timestamp: new Date(),
        footer: {
            icon_url: client.user.displayAvatarURL,
            text: `User ID: ${newMessage.author.id}`
        }
    }))
})
client.on("message", async message => {
    if(message.author.bot) return;
    if(recentJoins[message.guild.id][message.author.id] && message.type == 'DEFAULT') {
        delete recentJoins[message.guild.id][message.author.id]
    }
    if(message.content.indexOf(config.prefix) !== 0) return;
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    if(command === "ping") {
        const m = await message.channel.send("Ping?");
        m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
    }
    if(command === "config") {
        const m = await message.channel.send('Fetching Data')
        doConfig(message, args ,m)
    }
    if(command === "bulkdelete") {
        doBulkDelete(message, args)
    }
    if(command === "help") {
        // TODO: Create a help function instead of dumping the whole thing at once.
        // Works for now, won't work once there are a lot of commands
        //
        message.channel.send('', new Discord.RichEmbed({
            fields: [
                {name: `**Config**`, value: `**To configure your bot**, an administrator must run the +config command.\n
                    to see the server's current configuration, run \`+config show\`\n
                    to set a configuration option, pick the configuration node you'd like to change, and copy-paste it like this:\n
                    \`+config set kickAfter.timeout 50\`\n
                    This will configure kbot to kick new users who haven't posted a message after the number of seconds you specify`},
                {name: `**Bulk Delete**`, value: `To bulk-delete messages, use the \`+bulkdelete\` command\n
                There are a number of ways to bulk-delete messages. all commands require a number of messages to delete between 1 and 100, and it must be the final argument to the command\n
                    Here are some examples:\n
                    \`+bulkdelete 100\` to delete the last 100 messages from your channel\n
                    \`+bulkdelete #general 100\` to delete the last 100 messages from the #general channel\n
                    \`+bulkdelete @someone 100\` to delete the last 100 messages from @someone in your channel\n
                    \`+bulkdelete @someone #general 100\` to delete the last 100 messages from @someone in the #general channel\n
                    a user ID can also be substituted for an @mention, provided it is the first argument to the command`}
            ]
        }))
    }
});

client.login(config.token);
