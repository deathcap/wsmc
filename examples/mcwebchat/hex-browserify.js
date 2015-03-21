'use strict';

/* adapted for browser, based on https://github.com/gagle/node-hex
 The MIT License (MIT)
 
 Copyright (c) 2015 Gabriel Llamas
 */

var zero = function (n, max) {
  n = n.toString(16).toUpperCase();
  while (n.length < max) {
    n = '0' + n;
  }
  return n;
};

module.exports = function (buffer) {
  var rows = Math.ceil(buffer.length / 16);
  var last = buffer.length % 16 || 16;
  var offsetLength = buffer.length.toString(16).length;
  if (offsetLength < 6) offsetLength = 6;

  var str = 'Offset';
  while (str.length < offsetLength) {
    str += ' ';
  }

  str = /*'\u001b[36m' +*/ str + '  ';

  var i;
  for (i = 0; i < 16; i++) {
    str += ' ' + zero(i, 2);
  }

  //str += '\u001b[0m\n';
  if (buffer.length) str += '\n';

  var b = 0;
  var lastBytes;
  var lastSpaces;
  var v;

  for (i = 0; i < rows; i++) {
    str += /*'\u001b[36m' +*/ zero(b, offsetLength) + /*'\u001b[0m  '*/ + '  ';
    lastBytes = i === rows - 1 ? last : 16;
    lastSpaces = 16 - lastBytes;

    var j;
    for (j = 0; j < lastBytes; j++) {
      str += ' ' + zero(buffer[b], 2);
      b++;
    }

    for (j = 0; j < lastSpaces; j++) {
      str += '   ';
    }

    b -= lastBytes;
    str += '   ';

    for (j = 0; j < lastBytes; j++) {
      v = buffer[b];
      str += (v > 31 && v < 127) || v > 159 ? String.fromCharCode(v) : '.';
      b++;
    }

    str += '\n';
  }

  //process.stdout.write(str);
  console.log(str);
};
