var mongoSettings = require(process.cwd() + '/mongoSettings');
var util = require(process.cwd() + '/util/util');
var urlTemplate = 'mongodb://${HOST}:${PORT}/${DATABASENAME}';

exports.url = util.replaceTpl(urlTemplate, [
  { token: /\${HOST}/g, value: mongoSettings.hostname },
  { token: /\${PORT}/g, value: mongoSettings.databaseport },
  { token: /\${DATABASENAME}/g, value: mongoSettings.databasename }
]);