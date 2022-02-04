'use strict'
const path = require('path')
const idl = require('./idl/basic_4.json')
const validator = {
  programs: [
    {
      programId: idl.metadata.address,
      deployPath: path.resolve(__dirname, './target/deploy/basic_4.so'),
    },
  ],
}
module.exports = { validator, commitment: 'singleGossip' }
