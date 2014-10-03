var crypto = require('crypto'),
    userValidate = require('npm-user-validate'),
    metrics = require('newww-metrics')();

module.exports = function (request, reply) {
  var opts = {
    user: request.auth.credentials,
    hiring: request.server.methods.hiring.getRandomWhosHiring()
  };

  var changePass = request.server.methods.user.changePass,
      loginUser = request.server.methods.user.loginUser,
      setSession = request.server.methods.user.setSession(request),
      addMetric = metrics.addMetric,
      addLatencyMetric = metrics.addPageLatencyMetric,
      timer = { start: Date.now() };

  if (request.method === 'get' || request.method === 'head') {
    timer.end = Date.now();
    addLatencyMetric(timer, 'password');

    return reply.view('user/password', opts);
  }

  if (request.method === 'post') {
    var data = request.payload;

    var prof = opts.user,
        salt = prof.salt,
        hashCurrent = prof.password_sha ? sha(data.current + salt) :
                        pbkdf2(data.current, salt, parseInt(prof.iterations, 10)),
        hashProf = prof.password_sha || prof.derived_key;

    if (hashCurrent !== hashProf) {
      opts.error = 'Invalid current password';

      timer.end = Date.now();
      addLatencyMetric(timer, 'password-error');

      addMetric({ name: 'password-error' });
      return reply.view('user/password', opts).code(403);
    }

    if (data.new !== data.verify) {
      opts.error = 'Failed to verify password';

      timer.end = Date.now();
      addLatencyMetric(timer, 'password-error');

      addMetric({ name: 'password-error' });
      return reply.view('user/password', opts).code(403);
    }

    var error = userValidate.pw(data.new);
    if (error) {
      opts.error = error.message;

      timer.end = Date.now();
      addLatencyMetric(timer, 'password-error');

      addMetric({ name: 'password-error' });
      return reply.view('user/password', opts).code(400);
    }

    request.server.methods.error.generateWarning('user-password', 'Changing password', { name: prof.name });

    var newAuth = { name: prof.name, password: data.new };
    newAuth.mustChangePass = false;

    changePass(newAuth, function (er, data) {
      if (er) {
        return showError(request, reply, 'Failed to set the password for ' + newAuth.name, er);
      }

      loginUser(newAuth, function (er, user) {
        if (er) {
          return showError(request, reply, 'Unable to login user', er);
        }

        setSession(user, function (err) {
          if (err) {
            return showError(request, reply, 'Unable to set session for ' + user.name, err);
          }

          timer.end = Date.now();
          addLatencyMetric(timer, 'changePass');

          addMetric({name: 'changePass'})

          return reply.redirect('/profile');
        });
      });

    });

  }
}


// ======== functions =======

function pbkdf2 (pass, salt, iterations) {
  return crypto.pbkdf2Sync(pass, salt, iterations, 20).toString('hex')
}

function sha (s) {
  return crypto.createHash("sha1").update(s).digest("hex")
}

function showError (request, reply, message, logExtras) {
  var opts = {
    user: request.auth.credentials,
    hiring: request.server.methods.hiring.getRandomWhosHiring(),
    namespace: 'user-password'
  };

  request.server.methods.error.generateError(opts, message, 500, logExtras, function (err) {

    return reply.view('errors/generic', err).code(err.code);
  });
}