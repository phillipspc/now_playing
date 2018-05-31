'use strict';
const queryString = require('query-string');
const service = require('./service');
const AWS = require('aws-sdk');
const sns = new AWS.SNS();

module.exports.nowPlaying = (event, context, callback) => {
  let parsed = queryString.parse(event.body);
  let id = parsed.user_id + "-" + parsed.team_id;
  let responseUrl = parsed.response_url;

  sns.publish({
    Message: JSON.stringify({id: id, responseUrl: responseUrl}),
    TopicArn: "arn:aws:sns:us-east-1:117620298113:dispatch"
  }, function(err, data) {
    if (err) {
      console.log(err);
    }
  });
  callback(null, { statusCode: 200 });
};

module.exports.dispatcher = (event, context, callback) => {
  let parsed = JSON.parse(event.Records[0].Sns.Message);
  let id = parsed.id;
  let responseUrl = parsed.responseUrl;

  let queryParams = {
    TableName: "users",
    KeyConditionExpression: "#id = :id",
    ExpressionAttributeNames:{
      "#id": "id"
    },
    ExpressionAttributeValues: {
      ":id": id
    }
  };

  service.findUser(queryParams, id, responseUrl);
};

module.exports.callback = (event, context, callback) => {
  const params = event.queryStringParameters;
  const id = params["state"];
  const code = params["code"]
  const timestamp = new Date().getTime();

  let putParams = {
    TableName: 'users',
    Item: {
      id: id,
      created_at: timestamp,
      updated_at: timestamp
    }
  }

  service.createUserWithTokens(code, putParams, callback);
}
