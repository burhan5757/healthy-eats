import mongoose, { Schema, type InferSchemaType } from 'mongoose'
import bcrypt from 'bcryptjs'
import { ROLES } from '../../../shared/index.js'

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    /**
     * NEVER assignable from a request body. Registration always forces 'customer';
     * admin and chef exist only via the seed script (CLAUDE.md §10).
     */
    role: { type: String, enum: ROLES, required: true, default: 'customer' },
  },
  { timestamps: true },
)

userSchema.methods.verifyPassword = function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash)
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId
  verifyPassword(password: string): Promise<boolean>
}

export const User = mongoose.model<UserDoc>('User', userSchema)
