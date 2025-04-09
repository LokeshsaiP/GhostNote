import express from "express";
import zod from "zod";
import User from "./DB.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import Secret from "./secretDB.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const jwt_secret = process.env.jwtsecret;

app.use(cookieParser());
app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const userSchema = zod.object({
  username: zod
    .string()
    .min(3, "Username must be at least 3 characters long")
    .max(30, "Username must be at most 30 characters long")
    .regex(
      /^[a-zA-Z0-9_.@-]+$/,
      "Username can only contain letters, numbers, _, .,@ and -"
    ),

  password: zod
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^[\w~`!@#$%^&*()\-+=|{}[\]:;"'<>,.?/]+$/,
      "Password contains invalid characters"
    ),
});

function encrypt(text) {
  const algorithm = "aes-256-cbc";
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");

  return {
    encryptedData: encrypted,
    key: key.toString("hex"),
    iv: iv.toString("hex"),
  };
}

//jwt middleware
function authenticateJWT(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, jwt_secret, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

app.get("/", (req, res) => {
  res.render("home");
});

app.post("/encrypt", authenticateJWT, async (req, res) => {
  const { secret } = req.body;
  if (!secret || secret.trim() === "") {
    return res.status(400).json({ error: "Secret cannot be empty" });
  }

  try {
    const { encryptedData, key, iv } = encrypt(secret);

    const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const newSecret = new Secret({
      encryptedSecret: `${encryptedData}:${iv}:${key}`,
      expiresAt: expirationTime,
    });

    await newSecret.save();

    const link = `${req.protocol}://${req.get("host")}/secret/${newSecret._id}`;
    res.render("linkPreview", { link });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/secret/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const secret = await Secret.findById(id);
    if (!secret || secret.viewed || secret.expiresAt < new Date()) {
      return res.status(404).send("This secret is no longer available.");
    }

    const [encryptedData, ivHex, keyHex] = secret.encryptedSecret.split(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(keyHex, "hex"),
      Buffer.from(ivHex, "hex")
    );

    let decrypted = decipher.update(encryptedData, "hex", "utf-8");
    decrypted += decipher.final("utf-8");

    // Mark as viewed
    secret.viewed = true;
    await secret.save();

    res.render("secret", { secret: decrypted }); // Create `view-secret.ejs`
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error.");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const result = userSchema.safeParse({
    username: username,
    password: password,
  });
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors });
  }
  try {
    const dup_user = await User.findOne({ username: username });
    if(dup_user){
      return res.status(409).json({ message: "User already exists.Try log in!" });
    }
    const user = new User({
      username: username,
      password: password,
    });
    await user.save();
    const token = jwt.sign(
      { id: user._id, username: user.username },
      jwt_secret,
      { expiresIn: "1h" }
    );
    res.cookie("token", token, { httpOnly: true });
    res.render("home", { user: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const result = userSchema.safeParse({
    username: username,
    password: password,
  });
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors });
  }
  try {
    const user = await User.findOne({ username: username });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const token = jwt.sign(
      { id: user._id, username: user.username },
      jwt_secret,
      { expiresIn: "1h" }
    );
    res.cookie("token", token, { httpOnly: true });
    res.render("home", { user: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on all interfaces");
});
