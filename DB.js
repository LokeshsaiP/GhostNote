import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.dbURL);

const User = mongoose.model("users", {
  username: {
    type: String,
    required: true,
    match: /^(?=.*[A-Z])(?=.*\d)(?=.*[_.@-])[A-Za-z\d_.@-]+$/, // Match uppercase, number, special char
  },
  password: {
    type: String,
    required: true,
    match: /^[\w~`!@#$%^&*()\-+=|{}[\]:;"'<>,.?/]+$/, // Same as Zod pattern
  },
});
export default User;
