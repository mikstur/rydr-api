var LoopBackContext = require('loopback-context');
var app = require("../server");

module.exports = function(options) {
  return function storeCurrentUser(req, res, next) {
    if (!req.accessToken) {
      return next();
    }

    app.models.RbgUser.findById(req.accessToken.userId, function(err, user) {
      if (err) {
        return next(err);
      }
      if (!user) {
        return next(new Error('No user with this access token was found.'));
      }

      user.accessToken = req.accessToken;

      // TODO: Search for roles
      user.roles = [

      ];

      var loopbackContext = LoopBackContext.getCurrentContext();
      if (loopbackContext) {
        loopbackContext.set('currentUser', user);
      }
      next();
    });
  };
};