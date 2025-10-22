import mongoose from "mongoose";

const secretSchema = new mongoose.Schema({
  encryptedSecret: { type: String, required: true },
  passphrase: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  viewed: { type: Boolean, default: false },
});

const Secret = mongoose.model("Secret", secretSchema);
export default Secret;
