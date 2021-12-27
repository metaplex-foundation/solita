'use strict'
const path = require('path')
const puppetIdl = require('./idl/puppet.json')
const puppetMasterIdl = require('./idl/puppet_master.json')
const validator = {
  programs: [
    {
      programId: puppetIdl.metadata.address,
      deployPath: path.resolve(__dirname, './target/deploy/puppet.so'),
    },
    {
      programId: puppetMasterIdl.metadata.address,
      deployPath: path.resolve(__dirname, './target/deploy/puppet_master.so'),
    },
  ],
}
module.exports = { validator }
