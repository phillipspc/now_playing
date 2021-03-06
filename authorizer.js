'use strict';
const request = require('request-promise');

module.exports = (code, callback) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  const oauthURL = 'https://slack.com/api/oauth.access?' +
    'client_id=' + clientId + '&' +
    'client_secret=' + clientSecret + '&' +
    'code=' + code;

  const options = {
    url: oauthURL,
    json: true
  }

  return request(options)
    .then((responseFromSlack) => {
      console.log("response from slack: ", responseFromSlack);
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          message: "Cool, that worked."
        })
      };

      callback(null, response);
    })
    .catch((error) => {
      console.log("error: ", error)
    });
}
