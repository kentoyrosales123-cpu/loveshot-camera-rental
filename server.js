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
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
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
    rentalDate: String,
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

const availabilitySchema = new mongoose.Schema(
  {
    fromDate: String,
    toDate: String,
    status: {
      type: String,
      default: "unavailable",
    },
    note: String,
  },
  { timestamps: true },
);

const Availability = mongoose.model("Availability", availabilitySchema);

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
          from: `"LoveShot Rental" <${process.env.GMAIL_USER}>`,
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
        .then((data) => {
          console.log("Confirmation email sent to:", reservation.email, data);
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

app.get("/api/availability", async (req, res) => {
  try {
    const dates = await Availability.find().sort({ date: 1 });
    res.json(dates);
  } catch (error) {
    res.status(500).json({ message: "Failed to load availability" });
  }
});

app.post("/api/availability", async (req, res) => {
  try {
    const { fromDate, toDate, note } = req.body;

    const unavailableDate = await Availability.create({
      fromDate,
      toDate,
      status: "unavailable",
      note,
    });

    res.json({
      success: true,
      message: "Unavailable dates saved.",
      unavailableDate,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to save availability",
    });
  }
});

app.post("/api/ai-chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        reply: "Please type a question about LoveShot Camera Rental.",
      });
    }

    const lowerMessage = message.toLowerCase();

    const unrelatedWords = [
      "weather",
      "politics",
      "game",
      "movie",
      "school",
      "homework",
      "crypto",
      "stock",
    ];

    if (unrelatedWords.some((word) => lowerMessage.includes(word))) {
      return res.json({
        reply:
          "I can only help with LoveShot Camera Rental questions such as bookings, prices, payments, availability, and rental rules.",
      });
    }

    if (
      lowerMessage === "hi" ||
      lowerMessage === "hello" ||
      lowerMessage === "hey" ||
      lowerMessage === "good morning" ||
      lowerMessage === "good afternoon" ||
      lowerMessage === "good evening"
    ) {
      return res.json({
        reply:
          "Welcome to LoveShot Rental! I can help you with booking, prices, payment, availability, and rental rules.",
      });
    }

    const faqAnswers = [
      {
        keywords: ["reservation", "fee", "downpayment"],
        answer:
          "The LoveShot reservation fee is ₱550. Your booking will stay pending until the admin confirms your payment.",
      },
      {
        keywords: ["pay", "payment", "gcash"],
        answer:
          "Payment is done manually through GCash. After paying, please wait for admin confirmation.",
      },
      {
        keywords: [
          "approved",
          "approval",
          "how will we know",
          "know if approved",
          "confirmed",
        ],
        answer:
          "You will know your booking is approved once the admin confirms your payment. LoveShot will send a confirmation message or email after approval.",
      },
      {
        keywords: ["available", "availability", "date", "schedule"],
        answer:
          "You can check the available dates on the booking form. The admin controls unavailable dates, so please wait for admin confirmation.",
      },
      {
        keywords: ["camera", "a6400", "sony"],
        answer:
          "LoveShot Rental offers the Sony A6400 with kit lens. Please check the booking form for the current camera rental price.",
      },
      {
        keywords: ["lens", "telephoto"],
        answer:
          "LoveShot Rental offers a telephoto lens option. You may also rent both the camera and lens as a package.",
      },
      {
        keywords: ["package", "camera and lens", "both"],
        answer:
          "The camera + lens package is ₱1000 per day. For rentals of 7 days or more, the promo rate is ₱500 per day.",
      },
      {
        keywords: ["7 days", "promo", "discount"],
        answer:
          "For rentals of 7 days or more, the daily promo rate is ₱500 per day. Admin confirmation is still required.",
      },
      {
        keywords: ["late", "return", "delay"],
        answer:
          "The late return fee is ₱100 per hour after the agreed return time.",
      },
      {
        keywords: ["after", "submit", "booking", "request"],
        answer:
          "After submitting your booking request, your reservation will be pending. Please complete the manual GCash payment and wait for admin confirmation.",
      },
      {
        keywords: ["requirement", "requirements", "valid id", "id"],
        answer:
          "Please prepare your booking details and any requirements requested by the admin. Final approval depends on admin confirmation.",
      },
    ];

    const matchedFaq = faqAnswers.find((faq) =>
      faq.keywords.some((keyword) => lowerMessage.includes(keyword)),
    );

    if (matchedFaq) {
      return res.json({ reply: matchedFaq.answer });
    }

    if (process.env.OPENAI_API_KEY) {
      const OpenAI = require("openai");

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `
You are LoveShot AI Assistant.

Only answer questions about LoveShot Camera Rental.

FAQ knowledge:
- Business name: LoveShot Rental
- Rental items: Sony A6400 with kit lens, telephoto lens, camera + lens package
- Reservation fee: ₱550
- Camera rental: use existing website price
- Camera + lens package: ₱1000 per day
- Rentals 7 days or more: ₱500 per day promo rate
- Payment method: Manual GCash payment
- Customer must upload or send proof of payment
- Booking is pending until admin confirms payment
- Admin controls unavailable dates
- Customers should check available dates before submitting reservation
- Late return fee: ₱100 per hour
- Rental period is based on selected rental dates
- Never confirm bookings automatically
- Never approve payments automatically
- Always remind customer that admin confirmation is required

If unrelated, reply:
"I can only help with LoveShot Camera Rental questions such as bookings, prices, payments, availability, and rental rules."

Keep answers short, clear, and friendly.
            `,
          },
          {
            role: "user",
            content: message,
          },
        ],
      });

      return res.json({
        reply: completion.choices[0].message.content,
      });
    }

    return res.json({
      reply:
        "For more details, please contact LoveShot support through the Messages section. Admin confirmation is required for bookings and payments.",
    });
  } catch (error) {
    console.error("AI chat error:", error);

    res.status(500).json({
      reply:
        "Sorry, LoveShot AI is currently unavailable. Please contact the admin for confirmation.",
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});
