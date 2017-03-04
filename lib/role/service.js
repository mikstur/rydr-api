'use strict';

let winston = require('winston');
let BaseService = require('../base-service');

/**
 * This callback type is called `requestCallback`
 *
 * @callback requestCallback
 * @param {object} error
 * @param {object} response
 */

/**
 * Role related Service
 */
class RoleService extends BaseService {

	/**
	 * Instantiates the Role Service
	 * @param {object} app - The LoopBack app
	 */
  constructor(app) {
    super(app);
  }

    /**
     * Get Golfer Role will always return a Golfer Role instance by either finding it or creating it
     * @param {requestCallback} cb      - The callback
     */
  getGolferRole(cb) {
    this.findOrCreateRole({
      name: 'golfer',
      description: 'Golfer',
    }, cb);
  }

    /**
     * Find or create role
     * @param {object} role                 - Describes a role
     * @param {string} role.name            - The unique name of the role
     * @param {string} role.description     - The description of the role
     * @param {requestCallback} cb          - The callback
     */
  findOrCreateRole(role, cb) {
    winston.debug('Finding or creating a Role', role);
    this.app.models.RbgRole.findOrCreate(role, function(err, newRole) {
      if (err) return cb(err);
      winston.debug('Found or created Role', newRole);
      return cb(null, newRole);
    });
  }

}

module.exports = RoleService;
