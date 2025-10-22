import { Schema, Model } from "mongoose";

const secretSchema =
  new Schema() <
  ISecret >
  {
    encryptedSecret: { type: String, required: true },
    passphrase: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    viewed: { type: Boolean, default: false },
  };

const Secret = mongoose.model < ISecret > ("Secret", secretSchema);
export default Secret;
