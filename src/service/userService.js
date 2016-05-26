var request = require('request'),
    config  = require('../config.json'),
    q = require('q');

exports.getUsers = function() {
  var deferred = q.defer();

  request.get({
    url: config.profilesApiUrl,
    headers: {
      'Accept': 'application/json'
    }
  }, function(err, httpResponse, body) {
    if (err || (body && body.ok === false)) {
      deferred.reject(new Error(err));
    }

    var data = JSON.parse(body);

    deferred.resolve(data.Items);
  });

  return deferred.promise;
};
