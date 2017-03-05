'use strict';

var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;

module.exports = function (server) {

    var socialAuthConfig = server.get("socialAuth");

    passport.use(new FacebookStrategy({
        clientID: socialAuthConfig.facebook.key, //config file??
        clientSecret: socialAuthConfig.facebook.secret,
        callbackURL: socialAuthConfig.facebook.callbackUrl,
        profileFields: ['id', 'photos', 'emails', 'name']
    },
        function (accessToken, refreshToken, profile, done) {

            let RbgUserModel = server.models.RbgUser;

            var createAccessToken = function(user, cb) {
                let AccessTokenModel = server.models.AccessToken;
                AccessTokenModel.create({
                    userId: user.id
                }, function(err, accessToken) {
                    if (err) return cb(err, null);

                    return cb(null, user);
                });
            }

            RbgUserModel.find({
                where: {
                    email: profile.emails[0].value // TODO: Look up user based on UserEmail table instead...
                }
            }, function (err, users) {
                if (err) return done(err);

                if (users.length > 0) {
                    return createAccessToken(users[0], function(err, user) {
                        if (err) return done(err);

                        return done(null, user);
                    });
                }

                var data = {
                    email: profile.emails[0].value,
                    firstname: profile.name.givenName,
                    lastname: profile.name.familyName,
                    password: "qwerty",
                    profilePictureUrl: "https://graph.facebook.com/" + profile.id + "/picture?width=900&height=900" //profile.photos[0].value || ""
                };

                RbgUserModel.create(data, function(err, rydrUser) {
                    if (err) return done(err);

                    return createAccessToken(rydrUser, function(err, user) {
                        if (err) return done(err);

                        return done(null, user);
                    });
                });
            });
        }
    ));

    server.get('/auth/facebook',
        passport.authenticate('facebook', { scope: ['public_profile', 'email', 'user_friends'] })
    );

    server.get('/auth/facebook/callback', passport.authenticate('facebook', {
        successRedirect: "/api/rbgusers/me",
        failureRedirect: "/api/rbgusers/me"
    }));

};