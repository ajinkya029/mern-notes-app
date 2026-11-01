import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, trim: true, maxlength: 120, default: "Untitled note" },
  content: { type: String, trim: true, maxlength: 20000, default: "" },
  color: { type: String, enum: ["cream", "blue", "pink", "green", "purple"], default: "cream" },
  pinned: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Note", noteSchema);
