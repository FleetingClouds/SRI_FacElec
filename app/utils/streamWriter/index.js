'use strict';

var fs               = require('fs');
var EOL              = require('os').EOL;
var findTargetPath   = require('./findTargetPath');

streamWriter.findTargetPath  = findTargetPath;
streamWriter.maxSize      = 1024 * 1024;
streamWriter.streamConfig = undefined;

function streamWriter( payLoad ) {

  if (streamWriter.stream === undefined) {

    initStreamConfig();
    openStream();

  } else {
    console.log('Streamwriter exists');
  }

  console.log(`............... streamWriter ................... `);
  // console.log( payLoad );
  // console.log( streamWriter );
  streamWriter.stream.write( payLoad );
}

function initStreamConfig() {
  streamWriter.file = streamWriter.file ||
                      findTargetPath(
                        streamWriter.appName,
                        streamWriter.fileNamePrefix,
                        streamWriter.fileNameSuffix
                      );

  if (streamWriter.file) {
    console.log('Streaming to :: ', streamWriter.file);
  } else {
    console.log('Could not set up a file for streaming');
  }
}

function openStream() {
  streamWriter.stream = fs.createWriteStream(
    streamWriter.file,
    streamWriter.streamConfig || { flags: 'a' }
  );

  console.log('Stream opened.');
}

function getStreamSize(stream) {
  if (!stream) {
    return 0;
  }

  if (stream.logSizeAtStart === undefined) {
    try {
      stream.logSizeAtStart = fs.statSync(stream.path).size;
    } catch (e) {
      stream.logSizeAtStart = 0;
    }
  }

  return stream.logSizeAtStart + stream.bytesWritten;
}

function archiveLog(stream) {
  if (stream.end) {
    stream.end();
  }

  try {
    fs.renameSync(stream.path, stream.path.replace(/log$/, 'old.log'));
  } catch (e) {
    console.log('Could not rotate log', e);
  }
}

streamWriter.endStream = () => {
  if (streamWriter.stream === undefined) {
    console.log('No stream exists');
  } else {
    console.log('Waiting to end stream');
    // streamWriter.stream.on('finish', function () {
    //   console.log('File writing finished');
    //   streamWriter.stream.end();
    //   delete streamWriter.stream;
    //   console.log('Stream ended');
    // });
    streamWriter.stream.end();
    delete streamWriter.stream;
    console.log('Stream ended');

  }
}


module.exports = streamWriter;

