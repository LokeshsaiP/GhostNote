import express from "express";
import type { Request, Response, NextFunction } from "express";
import zod from "zod";
import User from "./DB.ts";
import Secret from "./secretDB.ts";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import cors from "cors";

dotenv.config();

const app = express();
const PORT: number = parseInt(process.env.PORT || "3000", 10);
const jwt_secret: string = process.env.jwtsecret || "";

// Middlewares
app.use(cors({ origin: "http://localhost:5173", credentials: true })); // adjust origin if using Vite
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Type for req.user
interface AuthenticatedRequest extends express.Request {
  user?: { id: string; username: string };
}

// Zod schema for user validation
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

// Encrypt function
function encrypt(text: string): {
  encryptedData: string;
  key: string;
  iv: string;
} {
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

// JWT Middleware
const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, jwt_secret) as {
      id: string;
      username: string;
    };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Forbidden" });
  }
};

// Routes
app.get("/", (_req: express.Request, res: express.Response) => {
  res.json({ message: "Welcome to GhostNote API" });
});

// Encrypt secret
app.post(
  "/encrypt",
  authenticateJWT,
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { secret, expiration, passphrase } = req.body as {
        secret: string;
        expiration: string;
        passphrase?: string;
      };

      if (!secret || !secret.trim())
        return res.status(400).json({ error: "Secret is required" });

      const { encryptedData, key, iv } = encrypt(secret);

      const expirationMap: Record<string, number> = {
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
  }
);

// Reveal secret
app.post(
  "/secret/:id/reveal",
  async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { passphrase } = req.body as { passphrase?: string };

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

      // Decrypt
      const [encryptedData, ivHex, keyHex] =
        secretDoc.encryptedSecret.split(":");
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
  }
);

// Signup
app.post("/signup", async (req: express.Request, res: express.Response) => {
  const { username, password, confirmPassword } = req.body as {
    username: string;
    password: string;
    confirmPassword: string;
  };

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

// Login
app.post("/login", async (req: express.Request, res: express.Response) => {
  const { username, password } = req.body as {
    username: string;
    password: string;
  };

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

// Logout
app.post("/logout", (req: express.Request, res: express.Response) => {
  res.clearCookie("token");
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
