var Joi = require('joi'),
    userValidate = require('npm-user-validate'),
    murmurhash = require('murmurhash'),
    metrics = require('newww-metrics')();

module.exports = function signup (request, reply) {
  var signupUser = request.server.methods.user.signupUser,
      setSession = request.server.methods.user.setSession(request),
      delSession = request.server.methods.user.delSession(request),
      addMetric = metrics.addMetric,
      addLatencyMetric = metrics.addPageLatencyMetric,
      timer = { start: Date.now() };

  var opts = {
    user: request.auth.credentials,
    errors: [],
    hiring: request.server.methods.hiring.getRandomWhosHiring()
  };

  if (request.method === 'post') {
    var schema = Joi.object().keys({
      name: Joi.string().required(),
      password: Joi.string().required(),
      verify: Joi.string().required(),
      email: Joi.string().email().required()
    });

    var joiOptions = {
      convert: false,
      abortEarly: false
    };

    var data = request.payload;

    Joi.validate(data, schema, joiOptions, function (err, value) {

      if (err) {
        opts.errors = err.details;
      }

      if (data.password !== data.verify) {
        opts.errors.push({message: new Error("Passwords don't match").message});
      }

      userValidate.username(data.name) && opts.errors.push({ message: userValidate.username(data.name).message});

      if (opts.errors.length) {

        timer.end = Date.now();
        addLatencyMetric(timer, 'signup-form-error');

        addMetric({name: 'signup-form-error'});

        return reply.view('user/signup-form', opts);
      }

      delSession(value, function (er) {

        if (er) {
          return showError(request, reply, 'Unable to delete the session for user ' + data.name, 500, er);
        }

        signupUser(value, function (er, user) {

          if (er) {
            return showError(request, reply, 'Failed to create account', 403, er);
          }

          setSession(user, function (err) {

            if (err) {
              return showError(request, reply, 'Unable to set the session for user ' + opts.user.name, 500, err);
            }

            timer.end = Date.now();
            addLatencyMetric(timer, 'signup');

            addMetric({name: 'signup'});

            return reply.redirect('/profile-edit');
          });
        });

      });
    });

  }


  if (request.method === 'get' || request.method === 'head') {

    timer.end = Date.now();
    addLatencyMetric(timer, 'signup-form');

    addMetric({ name: 'signup-form' });
    return reply.view('user/signup-form', opts);
  }
};

function showError (request, reply, message, code, logExtras) {
  var opts = {
    user: request.auth.credentials,
    hiring: request.server.methods.hiring.getRandomWhosHiring(),
    namespace: 'user-signup'
  };

  request.server.methods.error.generateError(opts, message, code, logExtras, function (err) {

    return reply.view('errors/generic', err).code(err.code);
  });
}