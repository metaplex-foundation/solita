'use strict'
const path = require('path')
const idl = require('./target/idl/basic_0.json')
const validator = {
  programs: [
    {
      programId: idl.metadata.address,
      deployPath: path.resolve(__dirname, './target/deploy/basic_0.so'),
    },
  ],
}
module.exports = { validator }
