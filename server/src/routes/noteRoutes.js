import { Router } from "express";
import mongoose from "mongoose";
import Note from "../models/Note.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

router.get("/", async (req, res, next) => {
  try {
    const notes = await Note.find({ user: req.userId }).sort({ pinned: -1, updatedAt: -1 });
    res.json({ notes });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, content, color } = req.body;
    const note = await Note.create({ user: req.userId, title, content, color });
    res.status(201).json({ note });
  } catch (error) { next(error); }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid note ID" });
    const allowed = {};
    for (const key of ["title", "content", "color", "pinned"]) {
      if (req.body[key] !== undefined) allowed[key] = req.body[key];
    }
    const note = await Note.findOneAndUpdate({ _id: req.params.id, user: req.userId }, allowed, { new: true, runValidators: true });
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json({ note });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid note ID" });
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch (error) { next(error); }
});

export default router;
