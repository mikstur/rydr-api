'use strict';

var clsHooked = require('cls-hooked');
var loopback = require('loopback');
var boot = require('loopback-boot');
var session = require('express-session');
var passport = require('passport');

var app = module.exports = loopback();

app.use(session({
  secret: 'arbee gie',
  resave: true,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.start = function () {
  // start the web server
  return app.listen(function () {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
      if (process.env.NODE_ENV != null || undefined) {
        console.log('database configuration for settings: ',
          process.env.NODE_ENV);
      }
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function (err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
