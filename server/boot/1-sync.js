module.exports = function(app) {

	var dbDataSource = app.dataSources.db;
	
	var models = [
		'AccessToken',
		'ACL',
		'RoleMapping',
		'RbgRole',
		'RbgUser'
	];
	
	models.forEach(function(model) {
		dbDataSource.isActual(model, function(err, actual) {
			if (!actual) {
				dbDataSource.autoupdate(model, function(err, result) {
					console.log("Autoupdated " + model);
				});
			}
		});
	});
	
};