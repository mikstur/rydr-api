'use strict';

let async = require('async');
var UserService = require('../../lib/golf-services').UserService;

class TestDB {

    /**
     * Sets up default test data. All objects with a number suffix belong together.
     * Example: user1 and accessToken1 belong together
     */
  constructor(server) {
    this.server = server;

        // models
    this.RbgUserModel = this.server.models.RbgUser;
    this.GolferModel = this.server.models.Golfer;
    this.RoleMappingModel = this.server.models.RoleMapping;
    this.UserEmailModel = this.server.models.UserEmail;

    this.roles = {
      golfer: null,
      organizer: null,
    };

    this.users = {
      user1: null,
    };
  }

  setupTestData(callback) {
    var self = this;

    async.series({

      golferRole: function(done) {
        self.setupGolferRole(done);
      },

      organizerRole: function(done) {
        self.setupOrganizerRole(done);
      },

      user1: function(done) {
        self.setupUser1(done);
      },

    }, function(err, results) {
      self.roles.golfer = results.golferRole;
      self.roles.organizer = results.organizerRole;

      self.users.user1 = results.user1;

      return callback(null);
    });
  }

  setupGolferRole(done) {
    this.server.models.Role
            .create({
              name: 'golfer',
              description: 'Golfer',
            }, function(err, newGolferRole) {
              if (err) return done(err, null);

              return done(null, newGolferRole);
            });
  }

  setupOrganizerRole(done) {
    this.server.models.Role
            .create({
              name: 'organizer',
              description: 'Organizer',
            }, function(err, newOrganizerRole) {
              if (err) return done(err);

              return done(null, newOrganizerRole);
            });
  }

  setupUser1(done) {
    var userService = new UserService(this.server);
    userService.golferRegistration({
      firstName: 'John',
      lastName: 'Snow',
      mobile: '0721234567',
      email: 'john.snow@theblack.com',
      password: 'qwerty',
    }, done);
  }

}

module.exports = TestDB;
