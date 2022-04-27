// @ts-check
const path = require('path')
const programDir = path.join(__dirname, 'programs', 'basic-4')
const idlDir = path.join(__dirname, 'idl')
const sdkDir = path.join(__dirname, 'src', 'generated')
const binaryInstallDir = path.join(__dirname, '..', '.crates')

module.exports = {
  idlGenerator: 'anchor',
  programName: 'basic_4',
  programId: 'CwrqeMj2U8tFr1Rhkgwc84tpAsqbt9pTt2a4taoTADPr',
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
}
