module.exports = {
    doBulkDelete: async (message, targetMessages) => {
        message.channel.bulkDelete(targetMessages)
            .then(messages => message.channel.send(`Done. Deleted ${messages.size} messages`))
            .catch(error => message.channel.send(`Encountered an error attempting to delete messages. Do I have the right permissions?`))
    }
}
