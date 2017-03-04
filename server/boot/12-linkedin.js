'use strict';

var passport = require('passport');
var LinkedInStrategy = require('passport-linkedin').Strategy;

module.exports = function (server) {

    var socialAuthConfig = server.get("socialAuth");

    passport.use(new LinkedInStrategy({
        consumerKey: socialAuthConfig.linkedIn.key,
        consumerSecret: socialAuthConfig.linkedIn.secret,
        callbackURL: "http://localhost:3000/auth/linkedin/callback",
        profileFields: ['id', 'first-name', 'last-name', 'email-address', 'headline']

    },
        function (token, tokenSecret, profile, done) {
            done(null, profile);
        }
    ));

    server.get('/auth/linkedin',
        passport.authenticate('linkedin', { scope: ['r_basicprofile', 'r_emailaddress'] }, { failureRedirect: '/login' }),
        function (req, res) {
            // Successful authentication, redirect home.
            res.redirect('/');
        });

};