'use strict'
const path = require('path')
const idl = require('./idl/basic_1.json')
const validator = {
  programs: [
    {
      programId: idl.metadata.address,
      deployPath: path.resolve(__dirname, './target/deploy/basic_1.so'),
    },
  ],
}
module.exports = { validator }
