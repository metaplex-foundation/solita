import debug from 'debug'

export const logErrorDebug = debug('solita:error')
export const logInfoDebug = debug('solita:info')
export const logDebug = debug('solita:debug')
export const logTrace = debug('solita:trace')

export const logError = logErrorDebug.enabled
  ? logErrorDebug
  : console.error.bind(console)

export const logInfo = logInfoDebug.enabled
  ? logInfoDebug
  : console.log.bind(console)
