const spawn = require( 'cross-spawn' );
const path = require( 'path' );

const s = `\\${path.sep}`;
const pattern = process.argv[2] === 'e2e'
  ? `test${s}e2e${s}.+\\.spec\\.js`
  : `test${s}(?!e2e${s})[^${s}]+${s}.+\\.spec\\.js$`;
console.log( ':::::::::::::::::::::::::::::::::::::::::::::::::::::::' );
console.log( pattern );
console.log( ...process.argv.slice( 2 ) );

const result = spawn.sync(
  path.normalize( './node_modules/.bin/jest' ),
  [pattern, ...process.argv.slice( 2 )],
  { stdio: 'inherit' }
);

process.exit( result.status );
