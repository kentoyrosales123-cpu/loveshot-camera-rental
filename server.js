require("dotenv").config();

const nodemailer = require("nodemailer");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  })
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
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    reservation.paymentStatus = "confirmed";
    reservation.status = "approved";
    await reservation.save();

    res.json({
      success: true,
      message: "Payment confirmed. Email is being sent.",
      reservation,
    });

    if (reservation.email) {
      transporter
        .sendMail({
          from: process.env.GMAIL_USER,
          to: reservation.email,
          subject: "LoveShot Booking Confirmation",
          html: `
            <div style="font-family: Arial; padding: 20px;">
              <h2 style="color:#2563eb;">Booking Confirmed 📸</h2>

              <p>Hello ${reservation.name},</p>

              <p>
                Your payment has been confirmed successfully.
                Your booking with <strong>LoveShot Rental</strong>
                is now officially reserved.
              </p>

              <div style="background:#f1f5f9; padding:20px; border-radius:12px; margin-top:20px;">
                <h3>Booking Details</h3>
                <p><strong>Camera:</strong> ${reservation.camera || "N/A"}</p>
                <p><strong>Lens:</strong> ${reservation.lens || "N/A"}</p>
                <p><strong>Rental Days:</strong> ${reservation.days}</p>
                <p><strong>Total:</strong> ₱${reservation.total}</p>
                <p><strong>Status:</strong> Approved</p>
              </div>

              <p style="margin-top:20px;">
                Thank you for choosing LoveShot Rental.
              </p>
            </div>
          `,
        })
        .then(() => {
          console.log("Confirmation email sent to:", reservation.email);
        })
        .catch((error) => {
          console.error("Email failed:", error);
        });
    }
  } catch (error) {
    console.error("Payment confirmation error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

app.patch("/api/reservations/:id/status", async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { returnDocument: "after" },
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
    const { conversationId, name, message, sender } = req.body;

    let finalConversationId = conversationId;

    // If customer sends first message, create conversation automatically
    if (!finalConversationId) {
      let conversation = await Conversation.findOne({ name });

      if (!conversation) {
        conversation = await Conversation.create({ name });
      }

      finalConversationId = conversation._id.toString();
    }

    const newMessage = await Message.create({
      conversationId: finalConversationId,
      name,
      message,
      sender,
    });

    res.json(newMessage);
  } catch (error) {
    console.error("Message error:", error);
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
