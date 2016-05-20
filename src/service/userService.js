var request = require('request'),
  q = require('q');

exports.getUsers = function() {
  var deferred = q.defer();

  request.get({
    url: 'https://txkaf3ohhf.execute-api.us-west-2.amazonaws.com/staging/profiles',
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
