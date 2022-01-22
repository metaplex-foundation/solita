export function renderScalarEnum(
  name: string,
  variants: string[],
  includeExport: boolean
) {
  const exp = includeExport ? 'export ' : ''
  return `
${exp}enum ${name} {
  ${variants.join(',\n  ')}    
}`.trim()
}

export function renderScalarEnums(
  map: Map<string, string[]>,
  includeExport = false
) {
  const codes = []
  for (const [name, variants] of map) {
    codes.push(renderScalarEnum(name, variants, includeExport))
  }
  return codes
}
