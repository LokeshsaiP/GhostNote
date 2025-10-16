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
app.use(express.static("public"));
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
      /^(?=.*[A-Z])(?=.*[0-9])(?=.*[@_.-])[a-zA-Z0-9@_.-]+$/,
      `Username must contain at least one uppercase letter.
       one number.
       And one special character (@, _, ., -).`
    ),

  password: zod
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^[\w~`!@#$%^&*()\-+=|{}[\]:;"'<>,.?/]+$/,
      "Password contains invalid characters"
    ),
});

//encrypt function
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
  if (!token) {
    return res.status(401).render("unauthorized");
  }
  jwt.verify(token, jwt_secret, (err, user) => {
    if (err) {
      return res.status(403).render("unauthorized");
    }
    req.user = user;
    next();
  });
}

app.get("/", (req, res) => {
  const token = req.cookies.token;
  let username = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, jwt_secret);
      username = decoded.username;
    } catch (err) {
      res.clearCookie("token");
    }
  }
  res.render("home", { user: username });
});

app.post("/encrypt", authenticateJWT, async (req, res) => {
  try {
    const { secret, expiration, passphrase } = req.body;

    if (!secret || !secret.trim()) {
      return res.status(400).render("home", {
        error: "Please enter a secret.",
        user: req.user?.username || null,
      });
    }

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
      passphrase: passphrase && passphrase.trim() !== "" ? passphrase : null,
      expiresAt: expirationTime,
    });

    await newSecret.save();

    // ✅ Redirect to link preview (PRG pattern)
    res.redirect(`/link/${newSecret._id}`);
  } catch (err) {
    console.error("[/encrypt] ERROR:", err);
    res.status(500).render("home", { error: "Something went wrong" });
  }
});

app.get("/secret/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const secretDoc = await Secret.findById(id);

    if (!secretDoc || secretDoc.viewed || secretDoc.expiresAt < new Date()) {
      // Secret expired or already viewed
      return res.render("secret", { revealed: false, hasPassphrase: false });
    }

    // Determine if secret has a passphrase
    const hasPassphrase = secretDoc.passphrase ? true : false;

    // Render page without revealing the secret yet
    res.render("secret", {
      revealed: false,
      hasPassphrase,
      id: secretDoc._id,
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error.");
  }
});

app.post("/secret/:id/reveal", async (req, res) => {
  const { id } = req.params;
  const { passphrase } = req.body;

  try {
    const secretDoc = await Secret.findById(id);

    if (!secretDoc || secretDoc.expiresAt < new Date()) {
      // Secret expired
      return res.render("secret", {
        revealed: false,
        hasPassphrase: false,
        id,
        error: "This secret has expired.",
      });
    }

    if (secretDoc.viewed) {
      // Secret already revealed
      return res.render("secret", {
        revealed: true,
        secret: "This secret has already been viewed.",
        hasPassphrase: false,
        id,
      });
    }

    // Check passphrase if required
    if (secretDoc.passphrase) {
      if (!passphrase || passphrase !== secretDoc.passphrase) {
        return res.render("secret", {
          revealed: false,
          hasPassphrase: true,
          id,
          error: "Incorrect passphrase. Try again.",
        });
      }
    }

    // Decrypt the secret
    const [encryptedData, ivHex, keyHex] = secretDoc.encryptedSecret.split(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(keyHex, "hex"),
      Buffer.from(ivHex, "hex")
    );

    let decrypted = decipher.update(encryptedData, "hex", "utf-8");
    decrypted += decipher.final("utf-8");

    // Mark as viewed
    secretDoc.viewed = true;
    await secretDoc.save();

    res.render("secret", {
      revealed: true,
      secret: decrypted,
      hasPassphrase: false,
      id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error.");
  }
});

app.get("/link/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const link = `${req.protocol}://${req.get("host")}/secret/${id}`;
  res.render("linkPreview", { link });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  try {
    const dup_user = await User.findOne({ username: username });
    if (dup_user) {
      return res.render("signup", { error: "Username already exists" });
    }
    const result = userSchema.safeParse({ username, password });
    if (!result.success) {
      const firstError = result.error.errors[0].message;
      return res.render("signup", { error: firstError, username });
    }
    if (password !== confirmPassword) {
      return res.render("signup", {
        error: "Passwords do not match",
        username,
        password,
      });
    }
    const user = new User({ username, password });
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username },
      jwt_secret,
      {
        expiresIn: "1h",
      }
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
    const firstError = result.error.errors[0].message;
    return res.render("login", { error: firstError });
  }
  try {
    const user = await User.findOne({ username: username });
    if (!user) {
      return res.render("login", { error: "Invalid username or password" });
    }
    if (user.password !== password) {
      return res.render("login", { error: "Invalid username or password" });
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

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});
