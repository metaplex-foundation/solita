import { TypeMapper } from './type-mapper'
import {
  IdlInstruction,
  IdlInstructionArg,
  IdlType,
  IdlTypeArray,
  isIdlTypeArray,
  isShankIdlInstruction,
} from './types'
import {
  anchorDiscriminatorField,
  anchorDiscriminatorType,
  instructionDiscriminator,
} from './utils'

export function isAnchorDiscriminatorFormat(ty: IdlType): ty is IdlTypeArray {
  return isIdlTypeArray(ty) && ty.array[0] == 'u8' && ty.array[1] == 8
}

export class InstructionDiscriminator {
  constructor(
    private readonly ix: IdlInstruction,
    private readonly fieldName: string,
    private readonly typeMapper: TypeMapper
  ) {}

  renderValue() {
    return isShankIdlInstruction(this.ix)
      ? JSON.stringify(this.ix.discriminant.value)
      : JSON.stringify(Array.from(instructionDiscriminator(this.ix.name)))
  }

  getField(): IdlInstructionArg {
    if (isShankIdlInstruction(this.ix)) {
      const ty = this.ix.discriminant.type

      if (isAnchorDiscriminatorFormat(ty)) {
        return { name: this.fieldName, type: ty }
      } else {
        this.typeMapper.assertBeetSupported(
          ty,
          `instruction ${this.ix.name} discriminant field`
        )
        return { name: this.fieldName, type: ty }
      }
    }

    return anchorDiscriminatorField(this.fieldName)
  }

  renderType(): string {
    return isShankIdlInstruction(this.ix)
      ? this.typeMapper.map(
          this.ix.discriminant.type,
          `instruction ${this.ix.name} discriminant type`
        )
      : anchorDiscriminatorType(
          this.typeMapper,
          `instruction ${this.ix.name} discriminant type`
        )
  }
}
