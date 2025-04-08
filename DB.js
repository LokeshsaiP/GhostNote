import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.dbURL);

const User = mongoose.model("users", {
  username: {
    type: String,
    required: true,
    match: /^[a-zA-Z0-9_.-]+$/,
  },
  password: {
    type: String,
    required: true,
    match: /^[\w~`!@#$%^&*()\-+=|{}[\]:;"'<>,.?/]+$/,
  },
});
export default User;
