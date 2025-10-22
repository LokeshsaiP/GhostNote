import mongoose, { Schema, Model } from "mongoose";
import dotenv from "dotenv";

dotenv.config();

mongoose
  .connect(process.env.dbURL)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    match: [
      /^(?=.*[A-Z])(?=.*\d)(?=.*[_.@-])[A-Za-z\d_.@-]+$/,
      "Username must contain at least one uppercase letter, one number, and one special character (@, _, ., -)",
    ],
  },
  password: {
    type: String,
    required: true,
    match: [
      /^[\w~`!@#$%^&*()\-+=|{}[\]:;"'<>,.?/]+$/,
      "Password contains invalid characters",
    ],
  },
});

const User = mongoose.model("User", userSchema);

export default User;
