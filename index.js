import Discord from "discord.js";
import Twitter from "./modules/twitter";
import FriendlySunday from "./modules/friendlySunday.js";
import logger from "./logger";
import Mothman from "./modules/mothman";

const client = new Discord.Client();

client.on("ready", () => {
  logger.log("info", `Bot logged in as ${client.user.tag}`);

  // Setup modules
  new Twitter(client, process.env.TWITTER_API_KEY, process.env.TWITTER_SECRET);
  new FriendlySunday(client);
  new Mothman(client);
});

client.login(process.env.DISCORD_BOT_TOKEN);
