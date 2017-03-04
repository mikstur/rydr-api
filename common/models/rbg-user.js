'use strict';

var LoopBackContext = require('loopback-context');

module.exports = function (RbgUser) {

  RbgUser.on('resetPasswordRequest', function (info) {

    var baseUrl = RbgUser.app.get("resetPasswordBaseUrl");

    var html = 'Click <a href="' + baseUrl + '?access_token=' +
      info.accessToken.id + '">here</a> to reset your password';

    RbgUser.app.models.Email.send({
      to: info.email,
      from: "no-reply@rbgapps.com",
      subject: 'Password reset',
      html: html
    }, function (err) {
      if (err) return console.log('> error sending password reset email');
      console.log('> sending password reset email to:', info.email);
    });
  });

  RbgUser.observe('after save', function (ctx, next) {
    if (ctx.isNewInstance) {
      let SettingsModel = RbgUser.app.models.Settings;
      SettingsModel.create({
        userId: ctx.instance.id
      }, function(err, settings) {
        if (err) return next(err);

        return next();
      });
    }
  });

  RbgUser.me = function (req, res, cb) {

    if (req.user) {
      let AccessTokenModel = RbgUser.app.models.AccessToken;
      return AccessTokenModel.find({
        where: {
          userId: req.user.id
        },
        order: "created DESC"
      }, function (err, accessTokens) {
        if (err) return cb(err, null);

        if (accessTokens.length == 0) {
          var err = new Error("Not authenticated");
          err.statusCode = 401;
          return cb(err);
        }

        req.user.accessToken = accessTokens[0];
        return cb(null, req.user);
      });
    }

    var ctx = LoopBackContext.getCurrentContext();
    var currentUser = ctx && ctx.get('currentUser');

    if (!currentUser) {
      var err = new Error("Not authenticated");
      err.statusCode = 401;
      return cb(err, null);
    }

    return cb(null, currentUser, "ALLOWALL");
  }

};
