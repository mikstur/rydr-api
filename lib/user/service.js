'use strict';

let async = require('async');
let winston = require('winston');
let BaseService = require('../base-service');
let RoleService = require('../role/service');

/**
 * This callback type is called `requestCallback`
 *
 * @callback requestCallback
 * @param {object} error
 * @param {object} response
 */

/**
 * User related Service
 */
class UserService extends BaseService {

	/**
	 * Instantiates the User Service
	 * @param {object} app - The LoopBack app
	 */
  constructor(app) {
    super(app);
    this.roleService = new RoleService(app);
  }

	/**
	 * Registers a new User as a Golfer
	 * @param {object} userData 			- Object containing new user data
	 * @param {string} userData.firstname 	- The first name of the new golfer
	 * @param {string} userData.lastname	- The last name of the new golfer
	 * @param {string} userData.email		- The email of the new golfer
	 * @param {string} userData.password	- The password of the new golfer
	 * @param {requestCallback} cb			- The callback
	 */
  golferRegistration(userData, cb) {
    var self = this;

    async.waterfall([
      async.constant(userData),

      function(userData, next) {
        self.createRbgUser(userData, next);
      },

      function(newUser, next) {
				// Passing null as first parameter as we still need to define what additional golfer
				// data to pass into here...
        self.createGolfer(null, newUser, next);
      },

      function(newUser, next) {
        winston.debug('Getting Golfer Role');
        self.roleService.getGolferRole(function(err, golferRole) {
          if (err) return next(err);
          winston.debug('Got Golfer Role');
          return next(null, newUser, golferRole);
        });
      },

      function(newUser, golferRole, next) {
        self.mapRoleToUser(newUser, golferRole, next);
      },

      function(newUser, next) {
        self.createUserEmail(newUser, true, true, next);
      },
    ], function(err, result) {
      if (err) return cb(err);

      return cb(null, result);
    });
  }

	/**
	 * Creates a new RbgUser
	 * @param {object} userData 			- Object containing new user data
	 * @param {string} userData.firstname 	- The first name of the new golfer
	 * @param {string} userData.lastname	- The last name of the new golfer
	 * @param {string} userData.email		- The email of the new golfer
	 * @param {string} userData.password	- The password of the new golfer
	 * @param {requestCallback} cb			- The callback
	 */
  createRbgUser(userData, next) {
    winston.debug('Creating RBG User');
    this.app.models.RbgUser.create({
      firstname: userData.firstname,
      lastname: userData.lastname,
      email: userData.email,
      password: userData.password,
    }, function(err, newRbgUser) {
      if (err) return next(err);
      winston.debug('Created RBG User');
      return next(null, newRbgUser);
    });
  }

	/**
	 * Creates a new Golfer from an RbgUser instance
	 * @param {object} golferData 		- An object representing golfer information TO BE DEFINED...
	 * @param {object} rbgUser 			- An RbgUser instance, an existing user from the database
	 * @param {requestCallback} next	- The callback
	 */
  createGolfer(golferData, rbgUser, next) {
    winston.debug('Creating Golfer');
    this.app.models.Golfer.create({
      golferId: rbgUser.id,
    }, function(err, newGolfer) {
      if (err) return next(err);
      winston.debug('Created Golfer');
      return next(null, rbgUser);
    });
  }

	/**
	 * Maps a Role to a User
	 * @param {object} rbgUser		- An instance of RbgUser
	 * @param {object} role			- An instance of Role / RbgroLE
	 */
  mapRoleToUser(rbgUser, role, next) {
    winston.debug('Creating Role Map');
    this.app.models.RoleMapping.create({
      principalId: rbgUser.id,
      principalType: 'USER',
      roleId: role.id,
    }, function(err, newRoleMap) {
      if (err) return next(err);
      winston.debug('Created Role Map');
      return next(null, rbgUser);
    });
  }

	/**
	 * Creates a User email record for a user
	 * @param {object} rbgUser 		- An RbgUser instance
	 * @param {boolean} primary 	- Flag determining whether or not the email is the primary email
	 * @param {boolean} isActive	- Flag determining whether or not the email is active
	 */
  createUserEmail(rbgUser, primary, isActive, next) {
    winston.debug('Creating User Email');
    this.app.models.UserEmail.create({
      userId: rbgUser.id,
      email: rbgUser.email,
      primary: primary,
      isActive: isActive,
    }, function(err, theUserEmail) {
      if (err) return next(err);
      winston.debug('Created User Email');
      return next(null, rbgUser);
    });
  }

}

module.exports = UserService;
