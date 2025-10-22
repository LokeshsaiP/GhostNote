import express from "express";
import zod from "zod";
import User from "./DB.js";
import Secret from "./secretDB.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const jwt_secret = process.env.jwtsecret || "";
const allowedOrigins = [
  "http://localhost:5173",
  "https://ghost-note-fe-six.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const userSchema = zod.object({
  username: zod
    .string()
    .min(3, "Username must be at least 3 characters long")
    .max(30, "Username must be at most 30 characters long")
    .regex(
      /^(?=.*[A-Z])(?=.*[0-9])(?=.*[@_.-])[a-zA-Z0-9@_.-]+$/,
      `Username must contain at least one uppercase letter, one number, and one special character (@, _, ., -).`
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

const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, jwt_secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Forbidden" });
  }
};

app.get("/", (_req, res) => {
  res.json({ message: "Welcome to GhostNote API" });
});

app.post("/encrypt", authenticateJWT, async (req, res) => {
  try {
    const { secret, expiration, passphrase } = req.body;

    if (!secret || !secret.trim())
      return res.status(400).json({ error: "Secret is required" });

    const { encryptedData, key, iv } = encrypt(secret);

    const expirationMap = {
      "1m": 1 * 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "30m": 30 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "3h": 3 * 60 * 60 * 1000,
      "10h": 10 * 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    };

    const ttl = expirationMap[expiration] || 15 * 60 * 1000;
    const expirationTime = new Date(Date.now() + ttl);

    const newSecret = new Secret({
      encryptedSecret: `${encryptedData}:${iv}:${key}`,
      passphrase: passphrase?.trim() || null,
      expiresAt: expirationTime,
    });

    await newSecret.save();

    res.json({
      success: true,
      link: `${req.protocol}://${req.get("host")}/secret/${newSecret._id}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/secret/:id/reveal", async (req, res) => {
  const { id } = req.params;
  const { passphrase } = req.body;

  try {
    const secretDoc = await Secret.findById(id);
    if (!secretDoc || secretDoc.expiresAt < new Date()) {
      return res.status(404).json({ error: "Secret expired or not found" });
    }

    if (secretDoc.viewed) {
      return res.json({ secret: "This secret has already been viewed" });
    }

    if (secretDoc.passphrase && secretDoc.passphrase !== passphrase) {
      return res.status(401).json({ error: "Incorrect passphrase" });
    }

    const [encryptedData, ivHex, keyHex] = secretDoc.encryptedSecret.split(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(keyHex, "hex"),
      Buffer.from(ivHex, "hex")
    );

    let decrypted = decipher.update(encryptedData, "hex", "utf-8");
    decrypted += decipher.final("utf-8");

    secretDoc.viewed = true;
    await secretDoc.save();

    res.json({ secret: decrypted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/signup", async (req, res) => {
  const { username, password, confirmPassword } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing)
      return res.status(400).json({ error: "Username already exists" });

    const validation = userSchema.safeParse({ username, password });
    if (!validation.success)
      return res
        .status(400)
        .json({ error: validation.error.errors[0].message });

    if (password !== confirmPassword)
      return res.status(400).json({ error: "Passwords do not match" });

    const user = new User({ username, password });
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username },
      jwt_secret,
      { expiresIn: "1h" }
    );
    res.cookie("token", token, { httpOnly: true });
    res.json({ success: true, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      jwt_secret,
      { expiresIn: "1h" }
    );
    res.cookie("token", token, { httpOnly: true });
    res.json({ success: true, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
