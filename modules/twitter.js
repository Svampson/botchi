import { exec } from "child_process";
import Twit from "twit";
import logger from "../logger";
import util from "util";

class Twitter {
  constructor(client, twitterApiKey, twitterSecret) {
    this.client = client;
    this.twitterClient = new Twit({
      consumer_key:    twitterApiKey,
      consumer_secret: twitterSecret,
      app_only_auth:   true,
    });

    client.on("message", (msg) => {
      const tweetId = this._getTweetId(msg);
      if (tweetId) {
        this._getTweet(tweetId).then((result) => {
          if (result) {
            this._expandGalleries(msg, result);
            this._expandGif(msg, result);
            this._expandQuote(msg, result);
          }
        });
      }
    });

    logger.log("info", "Twitter module initialized successfully");
  }

  _expandQuote(msg, tweet) {
    const quotedId = tweet.data.quoted_status_id_str;
    if (quotedId) {
      msg.channel.send(`:arrow_right: Response to https://twitter.com/statuses/${quotedId}`)
    }
  }

  _expandGif(msg, tweet) {
    const media = tweet.data.extended_entities ? tweet.data.extended_entities.media : [];
    if (media.length == 1 && media[0].type === "animated_gif") {
      const tweetId = tweet.data.id_str;

      // Fuck me up fam
      const cmd = `
          curl -0 ${media[0].video_info.variants[0].url} -o tmp/${tweetId}.mp4 && \
          ffmpeg -i tmp/${tweetId}.mp4 -r 25 'tmp/${tweetId}-%03d.jpg' && \
          rm tmp/${tweetId}.mp4 && \
          convert -delay 4 -loop 0 tmp/${tweetId}*.jpg tmp/${tweetId}.gif && \
          rm tmp/${tweetId}*.jpg
      `;
      exec(cmd, (error) => {
        if (error) {
          logger.log("error", `caption generation error: ${error}`);
          return;
        }

        msg.channel.send({ files: [`tmp/${tweetId}.gif`] });
        exec(`rm tmp/${tweetId}.gif`);
      });
    }
  }

  _expandGalleries(msg, tweet) {
    const media = tweet.data.extended_entities ? tweet.data.extended_entities.media : [];
    if (media.length > 1) {
      const images = media.splice(1, 100).map((m) => m.media_url_https);
      // This is the best way I can think of to make sure images preserve their order
      for (const image of images) {
        msg.channel.send({
          embed: {
            image: {
              url: image
            }
          }
        });
      }
    }
  }

  _getTweetId(string) {
    const pattern = /(?:http[s]?:\/\/)?(?:www\.)?twitter.com\/.*?\/status\/([0-9]*)/;
    const matches = pattern.exec(string)
      return matches ? matches[1] : null;
  }

  _getTweet(id) {
    return this.twitterClient.get("statuses/show", { id, trim_user: 1, tweet_mode: "extended" })
      .then((result) => {
        if (result.data.errors != null) {
          return Promise.reject(util.inspect(result.data.errors));
        }

        return result;
      })
      .catch((error) => logger.log("error", `Could not get tweet: ${error}`));
  }
}

export default Twitter;
