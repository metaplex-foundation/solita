import { TypeMapper } from './type-mapper'
import {
  IdlInstruction,
  IdlInstructionArg,
  IdlTypeArray,
  isShankIdlInstruction,
} from './types'
import { instructionDiscriminator } from './utils'

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

  // -----------------
  // Field
  // -----------------
  getField(): IdlInstructionArg {
    if (isShankIdlInstruction(this.ix)) {
      const ty = this.ix.discriminant.type
      this.typeMapper.assertBeetSupported(
        ty,
        `instruction ${this.ix.name} discriminant field`
      )
      return { name: this.fieldName, type: ty }
    }

    return this.anchorDiscriminatorField()
  }

  renderType(): string {
    return isShankIdlInstruction(this.ix)
      ? this.typeMapper.map(
          this.ix.discriminant.type,
          `instruction ${this.ix.name} discriminant type`
        )
      : this.anchorDiscriminatorType()
  }

  anchorDiscriminatorField() {
    const ty: IdlTypeArray = { array: ['u8', 4] }
    return { name: this.fieldName, type: ty }
  }

  anchorDiscriminatorType() {
    const ty: IdlTypeArray = { array: ['u8', 4] }
    return this.typeMapper.mapSerde(
      ty,
      `instruction ${this.ix.name} discriminant type`
    )
  }
}
