require("dotenv").config();

const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction]
});

const settings = require("./settings/config.js");
const periods = require("./settings/bellschedule.json");

function formatAMPM(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
  }
  

function getCurrentDate() {
    const date = new Date();
    return new Date(new Date(`1970-01-01 ${formatAMPM(date)}`).toLocaleString('en', {timeZone: settings.TimeZone})).getTime();
}

function compareDate(date1, date2) {
    if (date1.isBefore(date2)) {
        return "before";
    } else if (date1.isAfter(date2)) {
        return "after";
    } else {
        return "equals";
    }
}

function getPeriod(currentTime) {
    for (const period of periods) {
        console.log(period)
        const startTime = new Date(new Date(`1970-01-01 ${period.start}`).toLocaleString('en', {timeZone: settings.TimeZone})).getTime();
        const endTime = new Date(new Date(`1970-01-01 ${period.end}`).toLocaleString('en', {timeZone: settings.TimeZone})).getTime();
        console.log(`${currentTime} >= ${startTime} && ${currentTime} <= ${endTime}`)

        if (currentTime >= startTime && currentTime <= endTime) {
            return period;
        }
    }
    return null;
}

function getRemainingTime(period) {
    const startTime = new Date(new Date(`1970-01-01 ${period.start}`).toLocaleString('en', {timeZone: settings.TimeZone})).getTime();
    const endTime = new Date(new Date(`1970-01-01 ${period.end}`).toLocaleString('en', {timeZone: settings.TimeZone})).getTime();
    const currentTime = getCurrentDate();
  
    const elapsedTime = (endTime - currentTime);
    const hours = Math.floor(elapsedTime / 3600000); // Convert milliseconds to hours
    const minutes = Math.floor((elapsedTime % 3600000) / 60000); // Convert remaining milliseconds to minutes
    const seconds = Math.floor((elapsedTime % 60000) / 1000); 

    const remainingTimeString = `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;

    return remainingTimeString;
  }
  


async function sendMessage() {
    const guild = client.guilds.cache.get(settings.message.serverID)
    const channel = guild.channels.cache.get(settings.message.channelID)
    const message = await channel.send('Hello, world!');
    addMessageIDtoConfig(message.id);
    return message;
}

async function addMessageIDtoConfig(id) {
    const path = "./settings/config.js";
    try {
        const data = await fs.promises.readFile(path, 'utf8');
        const updatedData = data.replace('{{mID}}', id);
        await fs.promises.writeFile(path, updatedData, 'utf8');
        console.log('File updated successfully!');
    } catch (error) {
        console.error('Error updating configuration file:', error);
    }
}


async function getMessage() {
    try {
        if (settings.message.messageID && Number(settings.message.messageID)) {
            const guild = client.guilds.cache.get(settings.message.serverID);
            const channel = guild.channels.cache.get(settings.message.channelID);
            const msg = await channel.messages.fetch(settings.message.messageID);
            return msg;
        } else {
            return await sendMessage();
        }
    } catch (error) {
        console.error('Error fetching message:', error);
        return await sendMessage();
    }
}


async function editMessage(msg, message) {
    if (!msg || !message) {
      console.error("Invalid arguments for editMessage. msg:", msg, " message:", message);
      return; // Handle the error gracefully, like logging or notifying the user
    }
  
    try {
      await msg.edit(message);
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }
  


async function checkConfig() {
    // Check for files
    if (!settings) {
        console.log(`settings/config.js is not found!`)
    }
    if (!periods) {
        console.log(`settings/bellschedule.json is not found!`)
    }

    // Check for important vars
    if (!settings.TOKEN) {
        console.log(`TOKEN is not found!`)
    }
    if (!settings.TimeZone) {
        console.log(`TimeZone is not found!`)
    }
    if (!settings.message) {
        console.log(`message info is not found!`)
    }
    if (!settings.message.channelID) {
        console.log(`message channelID is not found!`)
    }
    if (!settings.message.messageID) {
        console.log(`message messageID is not found!`)
    }
    if (!settings.message.serverID) {
        console.log(`message serverID is not found!`)
    }
}

async function timer() {
    const msg = await getMessage()
    const currentTime = getCurrentDate();
    editMessage(msg, formatAMPM(new Date()));
    const currentPeriodData = getPeriod(currentTime)
    const countdown = getRemainingTime(currentPeriodData)
    const currentPeriod = currentPeriodData.title;

    let lastPeriod = periods[currentPeriodData.id - 1] || {title: "None"};
    let nextPeriod = periods[currentPeriodData.id + 1] || {title: "None"};
    console.log(lastPeriod)
    
    const embed = new EmbedBuilder()
        .setTitle('Period Schedule')
        .addFields(
            { name: "Last Period", value: lastPeriod.title || 'None', inline: true },
            { name: "Current Period", value: currentPeriod || 'None', inline: true },
            { name: "Next Period", value: nextPeriod.title || 'None', inline: true },
            { name: "Time left in class", value: countdown || 'None', inline: false }
        );

    editMessage(msg, { embeds: [embed] })
}

async function start() {
    const msg = await getMessage();
    timer();
    setInterval(timer, 500);
    
}

client.on("ready", () => {
    start()
});

checkConfig();

client.login(settings.TOKEN);