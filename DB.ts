import mongoose, { Document, Schema, Model } from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.dbURL as string)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Define the interface for a User document
export interface IUser extends Document {
  username: string;
  password: string;
}

// Define schema
const userSchema = new Schema<IUser>({
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

// Create model
const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
