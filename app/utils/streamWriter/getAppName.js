// jshint -W074
'use strict';

/** @name process.resourcesPath */

var fs   = require('fs');
var path = require('path');

module.exports = getAppName;

function getAppName() {
  try {
    var name = loadPackageName();
    if (name) {
      return name;
    }
    return console.log('electron-log: unable to load the app name from package.json');
  } catch (e) {
    return console.log('electron-log: ' + e.message);
  }
}

/**
 * Try to load main app package
 * @throws {Error}
 * @return {Object|null}
 */
function loadPackageName() {
  var packageFile;

  try {
    if (require.main.filename) {
      packageFile = find(path.dirname(require.main.filename));
    }
  } catch (e) {}

  if (!packageFile && process.resourcesPath) {
    packageFile = find(path.join(process.resourcesPath, 'app.asar'));
    var electronModule = path.join('node_modules', 'electron', 'package.json');
    if (packageFile && packageFile.indexOf(electronModule) !== -1) {
      packageFile = null;
    }
  }

  if (!packageFile) {
    packageFile = find(process.cwd());
  }

  if (!packageFile) {
    return null;
  }

  var content = fs.readFileSync(packageFile, 'utf-8');
  var packageData = JSON.parse(content);

  //noinspection JSUnresolvedVariable
  return packageData ? packageData.productName || packageData.name : false;
}

function find(root) {
  var file;

  while (!file) {
    var parent;
    file = path.join(root, 'package.json');

    try {
      fs.statSync(file);
    } catch (e) {
      parent = path.resolve(root, '..');
      file = null;
    }

    if (root === parent) {
      break;
    }

    root = parent;
  }

  return file;
}
