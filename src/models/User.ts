import mongoose, { Schema, Document } from 'mongoose';

export interface IUser {
  name: string;
  email: string;
  password: string;
}

export interface UserDocument extends IUser, Document {}

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);
