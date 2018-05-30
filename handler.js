'use strict';
const queryString = require('query-string');
const service = require('./service');

module.exports.nowPlaying = (event, context, callback) => {
  let parsed = queryString.parse(event.body);
  let id = parsed.user_id + "-" + parsed.team_id;
  let responseUrl = parsed.response_url;

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

  service.findUser(queryParams, id, responseUrl, callback);
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
