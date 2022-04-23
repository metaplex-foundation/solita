import { RustbinConfig } from '@metaplex-foundation/rustbin'
export { RustbinConfig }

type SolitaConfigBase = {
  programName: string
  idlDir: string
  sdkDir: string
  binaryInstallDir: string
  programDir: string
  rustbin?: RustbinConfig
}

export type SolitaConfigAnchor = SolitaConfigBase & {
  idlGenerator: 'anchor'
  programId: string
}

export type SolitaConfigShank = SolitaConfigBase & {
  idlGenerator: 'shank'
}

export type SolitaConfig = SolitaConfigAnchor | SolitaConfigShank

// -----------------
// Guards
// -----------------
export function isSolitaConfigAnchor(
  config: SolitaConfig
): config is SolitaConfigAnchor {
  return config.idlGenerator === 'anchor'
}

export function isSolitaConfigShank(
  config: SolitaConfig
): config is SolitaConfigShank {
  return config.idlGenerator === 'shank'
}
