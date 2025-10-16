import mongoose, { Document, Schema, Model } from "mongoose";

export interface ISecret extends Document {
  encryptedSecret: string;
  passphrase?: string | null;
  createdAt: Date;
  expiresAt: Date;
  viewed: boolean;
}

const secretSchema = new Schema<ISecret>({
  encryptedSecret: { type: String, required: true },
  passphrase: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  viewed: { type: Boolean, default: false },
});

const Secret: Model<ISecret> = mongoose.model<ISecret>("Secret", secretSchema);
export default Secret;
