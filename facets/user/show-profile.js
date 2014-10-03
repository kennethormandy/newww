var transform = require('./presenters/profile').transform,
    metrics = require('newww-metrics')();

module.exports = function (options) {
  return function (request, reply) {
    var getUser = request.server.methods.user.getUser,
        getBrowseData = request.server.methods.registry.getBrowseData,
        addMetric = metrics.addMetric,
        addLatencyMetric = metrics.addPageLatencyMetric,
        timer = { start: Date.now() };

    var opts = {
      user: request.auth.credentials,
      hiring: request.server.methods.hiring.getRandomWhosHiring(),
      namespace: 'user-profile'
    };

    var profileName = request.params.name || opts.user.name;

    if (request.info.referrer.indexOf('profile-edit') !== -1) {
      getUser.cache.drop(profileName, function (er, resp) {
        if (er) {
          return showError(request, reply, 'Unable to drop key ' + profileName, er);
        }
        return getUser(profileName, showProfile);
      });
    }

    return getUser(profileName, showProfile);

    function showProfile (er, showprofile) {
      if (er) {
        return request.server.methods.error.generateError(opts, 'Profile for ' + profileName + ' not found', 404, er, function (err) {

          opts.name = profileName;

          timer.end = Date.now();
          addLatencyMetric(timer, 'profile-not-found');

          addMetric({ name: 'profile-not-found', value: opts.name });
          return reply.view('user/profile-not-found', opts).code(404);
        });
      }

      getBrowseData('userstar', profileName, 0, 1000, function (err, starred) {
        if (err) {
          return showError(request, reply, 'Unable to get stars for user ' + profileName, err);
        }

        getBrowseData('author', profileName, 0, 1000, function (err, packages) {
          if (err) {
            return showError(request, reply, 'Unable to get modules by user ' + profileName, err);
          }

          opts.profile = {
            title: showprofile.name,
            packages: getRandomAssortment(packages, 'packages', profileName),
            starred: getRandomAssortment(starred, 'starred', profileName),
            isSelf: opts.user && opts.user.name && profileName === opts.user.name
          }

          opts.profile.showprofile = transform(showprofile, options);
          opts.profile.fields = opts.profile.showprofile.fields;

          timer.end = Date.now();
          addLatencyMetric(timer, 'showProfile');

          addMetric({ name: 'showProfile' });

          return reply.view('user/profile', opts)
        });
      });
    }
  }
}

function getRandomAssortment (items, browseKeyword, name) {
  var l = items.length;
  var MAX_SHOW = 20;

  if (l > MAX_SHOW) {
    items = items.sort(function (a, b) {
      return Math.random() * 2 - 1
    }).slice(0, MAX_SHOW);
    items.push({
      url: '/browse/' + browseKeyword + '/' + name,
      name: 'and ' + (l - MAX_SHOW) + ' more',
      description: ''
    })
  }

  return items;
}

function showError (request, reply, message, logExtras) {
  var opts = {
    user: request.auth.credentials,
    hiring: request.server.methods.hiring.getRandomWhosHiring(),
    namespace: 'user-profile'
  };

  return request.server.methods.error.generateError(opts, message, 500, logExtras, function (err) {

    return reply.view('errors/generic', err).code(err.code);
  });
}