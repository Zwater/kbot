module.exports = async (config, serverConfig, modules, client, message) => {
    if (message.content.indexOf(config.prefix) !== 0) return
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g)
    const command = args.shift().toLowerCase()
    switch (command) {
        case 'hello' : {
            modules.doServerConfig.helloWorld(message)
            break;
        }
        case 'bulkdelete' : {
            switch(args.length) {
                case 1 :
                    if (isNaN(args[0])){
                        message.channel.send('ERROR: When using only one argument, the argument must be a number between 1 and 100')
                        return;
                    }
                    var fetchLimit = args[0]
                    var channel = message.channel
                    var fetch = await modules.messageEnumerator.fetchAll(message, message.channel, fetchLimit)
                    modules.bulkDelete.doBulkDelete(message, fetch)
                    //statusMessage.edit(`Done. Deleted ${fetch.size} messages`)
                    break;
                case 2 :
                    if(isNaN(args[1])){
                        statusMessage.edit('ERROR: When using two arguments, the number of messages to delete must be the final argument, and be a number between 1 and 100')
                        return;
                    }
                    if(message.mentions.channels.array().length == 1  && message.mentions.users.array().length == 0) {
                        var fetchLimit = args[1]
                        for (let[snowflake, channel] of message.mentions.channels) {
                            var fetch = modules.messageEnumerator.fetchAll(message, channel, fetchLimit)
                            modules.bulkDelete.doBulkDelete(message, fetch)
                        }
                    } else if (message.mentions.users.array().length == 1 && message.mentions.channels.array().length == 0) {
                        var fetchLimit = args[1] - 1
                        for (let [snowflake, user] of message.mentions.users) {
                            var fetch = await modules.messageEnumerator.fetchUser(message, message.channel, user.id, fetchLimit)
                            modules.bulkDelete.doBulkDelete(message, fetch)

                        }
                    } 
            }
            break;
        }
    }
}
