require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

const reservationSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    camera: String,
    lens: String,
    days: Number,
    total: Number,
    gcashReference: String,
    paymentStatus: {
      type: String,
      default: "pending",
    },
    status: {
      type: String,
      default: "pending",
    },
  },
  { timestamps: true },
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: String,
    name: String,
    message: String,
    sender: String,
  },
  { timestamps: true },
);

const conversationSchema = new mongoose.Schema(
  {
    name: String,
  },
  { timestamps: true },
);

const Conversation = mongoose.model("Conversation", conversationSchema);

const Reservation = mongoose.model("Reservation", reservationSchema);
const Message = mongoose.model("Message", messageSchema);

/* RESERVATIONS */

app.post("/api/reservations", async (req, res) => {
  try {
    const reservation = await Reservation.create(req.body);
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: "Failed to create reservation" });
  }
});

app.get("/api/reservations", async (req, res) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: "Failed to load reservations" });
  }
});

app.patch("/api/reservations/:id/payment", async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: "confirmed" },
      { new: true },
    );

    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: "Failed to confirm payment" });
  }
});

app.patch("/api/reservations/:id/status", async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true },
    );

    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: "Failed to update status" });
  }
});

/* MESSAGES */

app.get("/api/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to load messages" });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const message = await Message.create(req.body);
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

/* ADMIN LOGIN */

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true });
  }

  res.status(401).json({
    success: false,
    message: "Invalid password",
  });
});

app.post("/api/conversations", async (req, res) => {
  try {
    const { name } = req.body;

    let conversation = await Conversation.findOne({ name });

    if (!conversation) {
      conversation = await Conversation.create({ name });
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: "Failed to create conversation" });
  }
});

app.get("/api/conversations", async (req, res) => {
  try {
    const conversations = await Conversation.find().sort({ createdAt: -1 });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: "Failed to load conversations" });
  }
});

app.get("/api/messages/:conversationId", async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId,
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to load messages" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});
