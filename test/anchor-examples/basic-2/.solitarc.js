// @ts-check
const path = require('path')
const programDir = path.join(__dirname, 'programs', 'basic-2')
const idlDir = path.join(__dirname, 'idl')
const sdkDir = path.join(__dirname, 'src', 'generated')
const binaryInstallDir = path.join(__dirname, '..', '.crates')

module.exports = {
  idlGenerator: 'anchor',
  programName: 'basic_2',
  programId: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
}
