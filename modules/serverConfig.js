module.exports = {
    helloWorld: (message) => {
        message.channel.send(`Hello! Your message: ${message.cleanContent}`)
    }
}
