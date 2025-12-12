import mongoose from "mongoose";

const secretSchema = new mongoose.Schema({
  encryptedSecret: { type: String, required: false },
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileType: { type: String, default: null },
  passphrase: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  viewed: { type: Boolean, default: false },
});

const Secret = mongoose.model("Secret", secretSchema);
export default Secret;
