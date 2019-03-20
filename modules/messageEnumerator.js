module.exports = {
    fetchAll: async (message, channel, limit) => {
        const fetch = await channel.fetchMessages({ limit: limit})
        return fetch
    },
    fetchUser: async (message, channel, userID,  limit) => {
        var returnMessages = []
        var iterate = 0
        var userFetch = 0
        var latestID = 0
        var latest = await channel.fetchMessages({ limit: 1})
        for (let [snowflake, latestMessage] of latest) {
            latestID = latestMessage.id
        }
        while (iterate <= 100) {
            var fetch = await channel.fetchMessages()
            for(let[snowflake, fetchedMessage] of fetch) {
                if(fetchedMessage.author.id == userID && userFetch <= limit) {
                    returnMessages.push(fetchedMessage)
                    userFetch++
                } else if (userFetch > limit) {
                    iterate = 101
                }
                latestID = fetchedMessage.id
            }
            iterate++
        }
        return returnMessages
    }
}
