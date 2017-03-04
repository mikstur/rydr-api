'use strict';

var passport = require('passport');

module.exports = function (server) {

    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        let RbgUserModel = server.models.RbgUser;
        RbgUserModel.findById(id, function (err, user) {
            done(err, user); // TODO: Include access token
        });
    });

};