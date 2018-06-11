'use strict';
const queryString = require('query-string');
const service = require('./service');
const AWS = require('aws-sdk');
const sns = new AWS.SNS();
const authorizer = require('./authorizer');


module.exports.nowPlaying = (event, context, callback) => {
  const parsed = queryString.parse(event.body);
  const id = parsed.user_id + "-" + parsed.team_id;
  const responseUrl = parsed.response_url;

  sns.publish({
    Message: JSON.stringify({id: id, responseUrl: responseUrl}),
    TopicArn: "arn:aws:sns:us-east-1:117620298113:dispatch"
  }, function(err, data) {
    if (err) {
      console.log(err);
    }
  });

  const response = {
    statusCode: 200,
    headers: {
      "Content-type": "application/json"
    },
    // bit of a hack here, ensures the original command invocation shows up in slack
    body: JSON.stringify({
      response_type: "in_channel",
      text: ""
    })
  }
  callback(null, response);
};

module.exports.dispatcher = (event, context, callback) => {
  const parsed = JSON.parse(event.Records[0].Sns.Message);
  const id = parsed.id;
  const responseUrl = parsed.responseUrl;

  const queryParams = {
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
  const id = event.queryStringParameters.state;
  const code = event.queryStringParameters.code;
  const timestamp = new Date().getTime();

  const putParams = {
    TableName: 'users',
    Item: {
      id: id,
      created_at: timestamp,
      updated_at: timestamp
    }
  }

  service.createUserWithTokens(code, putParams, callback);
};

module.exports.authorization = (event, context, callback) => {
  const code = event.queryStringParameters.code;

  authorizer(code, callback);
}
