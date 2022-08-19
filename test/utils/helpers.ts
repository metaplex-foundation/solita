import { inspect } from 'util'

export function deepInspect(obj: any) {
  return inspect(obj, { depth: 15, colors: true, getters: true })
}

export function deepLog(obj: any) {
  console.log(deepInspect(obj))
}
