'use strict';
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const Slack = require('slack-node');
const slack = new Slack();

const SpotifyApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URL
});

module.exports = {
  createUser: function(params, callback) {
    dynamo.put(params, (error, data) => {
      if (error) {
        console.log("Error creating user", error);
      }

      const response = {
        statusCode: 200,
        body: JSON.stringify({ message: "Authorization successful. You are now ready to use the /nowplaying command!" })
      }
      callback(null, response);
    })
  },

  findUser: function(params, id, responseUrl) {
    dynamo.query(params, (error, data) => {
      if (!error && data.Count === 1) {
        this.showNowPlaying(data.Items[0], responseUrl);
      } else {
        this.sendAuthUrl(id, responseUrl);
      }
    });
  },

  sendAuthUrl: function (id, responseUrl) {
    const scopes = ['user-read-playback-state'];
    const state = id;
    const url = spotifyApi.createAuthorizeURL(scopes, state);

    slack.setWebhook(responseUrl);

    slack.webhook({
      text: "Use this link to authorize your account: " + url
    }, function(err, response) {
      if (err) {
        console.log("Error posting Auth URL via webhook", err);
      }
    });
  },

  createUserWithTokens: function (code, params, callback) {
    const service = this;

    spotifyApi.authorizationCodeGrant(code).then(
      function (data) {
        params.Item.refresh_token = data.body['refresh_token'];
        service.createUser(params, callback);
      },
      function (err) {
        console.log('Error in createUserWithTokens', err);
      }
    );
  },

  showNowPlaying: function (user, responseUrl) {
    const refreshToken = user.refresh_token;
    slack.setWebhook(responseUrl);

    spotifyApi.setRefreshToken(refreshToken);
    spotifyApi.refreshAccessToken().then(
      function (data) {
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.getMyCurrentPlaybackState({}).then(
          function (data) {
            if (Object.keys(data.body).length !== 0) {
              if (data.body.item === null && data.body.device.is_private_session) {
                return slack.webhook({
                  response_type: "in_channel",
                  text: "It looks like you're currently in a private session. You'll need to go public to share what you're listening to."
                }, function(err, response) {
                  if (err) {
                    console.log("Error posting to webhook", err);
                  }
                });
              }

              const spotifyUrl = data.body.item.external_urls.spotify;

              slack.webhook({
                text: spotifyUrl,
                response_type: "in_channel",
                unfurl_links: true
              }, function(err, response) {
                if (err) {
                  console.log("Error posting to webhook", err);
                }
              });
            } else {
              slack.webhook({
                response_type: "in_channel",
                text: "It doesn't look like you're currently listening to anything."
              }, function(err, response) {
                if (err) {
                  console.log("Error posting to webhook", err);
                }
              });
            }
          }, function (err) {
            console.log("Error when getting current playback", err);
          }
        );
      }, function (err) {
        console.log("Could not refresh access token", err);
      }
    );
  }
}
