function renderScalarEnum(name: string, variants: string[]) {
  return `
enum ${name} {
  ${variants.join(',\n  ')}    
}`.trim()
}

export function renderScalarEnums(map: Map<string, string[]>) {
  const codes = []
  for (const [name, variants] of map) {
    codes.push(renderScalarEnum(name, variants))
  }
  return codes
}
