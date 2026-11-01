import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = Router();
const makeToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET || "development_only_secret", { expiresIn: "7d" });
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email });

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ message: "Name, email and password are required" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: "An account with this email already exists" });
    const user = await User.create({ name: name.trim(), email, password: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: makeToken(user._id), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password || "", user.password))) return res.status(401).json({ message: "Email or password is incorrect" });
    res.json({ token: makeToken(user._id), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.get("/me", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("name email");
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

export default router;
