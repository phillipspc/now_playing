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
        console.error(params);
        callback(new Error('Error when creating user.'));
        return;
      }

      let response = {
        statusCode: 200,
        body: JSON.stringify({ message: "Authorization successful. You are now ready to use the /nowplaying command!" })
      }
      callback(null, response);
    })
  },

  findUser: function(params, id, responseUrl, callback) {
    dynamo.query(params, (error, data) => {
      if (!error && data.Count === 1) {
        this.showNowPlaying(data.Items[0], responseUrl);
        callback(null);
      } else {
        this.sendAuthUrl(id, callback);
      }
    });
  },

  sendAuthUrl: function (id, callback) {
    let scopes = ['user-read-playback-state'];
    let state = id;
    let url = spotifyApi.createAuthorizeURL(scopes, state);

    let response = {
      statusCode: 200,
      body: url
    };

    callback(null, response);
  },

  createUserWithTokens: function (code, params, callback) {
    let service = this;
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
    let refreshToken = user.refresh_token;
    spotifyApi.setRefreshToken(refreshToken);
    spotifyApi.refreshAccessToken().then(
      function (data) {
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.getMyCurrentPlaybackState({}).then(
          function (data) {
            let spotifyUrl = data.body.item.external_urls.spotify;
            slack.setWebhook(responseUrl);

            slack.webhook({
              text: spotifyUrl,
              response_type: "in_channel",
              unfurl_links: true
            }, function(err, response) {
              if (err) {
                console.log("Error posting to webhook", err);
              }
            });

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
