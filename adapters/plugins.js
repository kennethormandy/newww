var config = require('../config');

// all those plugins
module.exports = [
  {
    plugin: require('crumb'),
    options: { isSecure: true }
  },
  require('scooter'),
  {
    plugin: require('blankie'),
    options: config.csp
  },
  {
    plugin: require('../services/user'),
    options: config.couch
  },
  require('../services/registry'),
  require('../services/whoshiring'),
  require('../services/error'),
  {
    plugin: require('../services/downloads'),
    options: config.downloads
  },
  {
    plugin: require('./bonbon'),
    options: {
      stamp: config.stamp,
      canonicalHost: config.canonicalHost,
      lang: "en_US"
    }
  }
];
