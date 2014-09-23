var path = require('path');
var internals = {};

exports.register = function Regsitry (facet, options, next) {

  facet.views({
    engines: { hbs: require('handlebars') },
    path: path.resolve(__dirname, 'templates'),
    layoutPath: path.resolve(__dirname, '../../templates/layouts'),
    layout: 'default',
  });

  facet.route({
    path: "/package/{package}",
    method: "GET",
    handler: require('./show-package')
  });

  facet.route({
    path: "/packages/{package}",
    method: "GET",
    handler: function (request, reply) {
      return reply.redirect("/package/" + request.params.package).code(301);
    }
  });

  facet.route({
    path: "/browse/{p*}",
    method: "GET",
    handler: require('./show-browse')
  })

  facet.route({
    path: "/keyword/{kw}",
    method: "GET",
    handler: function (request, reply) {
      return reply.redirect('/browse/keyword/' + request.params.kw).code(301);
    }
  });

  facet.route({
    path: "/recent-authors/{since?}",
    method: "GET",
    handler: require('./show-recent-authors')
  });

  facet.route({
    path: "/star",
    method: "POST",
    config: {
      handler: require('./show-star'),
      plugins: {
        crumb: {
          source: 'payload',
          restful: true
        }
      }
    }
  });

  facet.route({
    path: "/star",
    method: "GET",
    config: {
      handler: require('./show-star'),
      auth: {
        mode: 'required'
      },
      plugins: { 'hapi-auth-cookie': {
        redirectTo: '/login'
      }}
    }
  });

  facet.route({
    path: "/search",
    method: "GET",
    handler: require('./show-search')(options)
  });

  facet.route({
    method: '*',
    path: '/{p*}',
    handler: require('./show-fallback')
  });

  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
