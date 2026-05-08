const navLinks = document.querySelectorAll("nav a");
const pages = document.querySelectorAll(".page");

let unavailableDates = [];

async function loadClientAvailability() {
  try {
    const res = await fetch("/api/availability");
    unavailableDates = await res.json();
  } catch (error) {
    console.error("Failed to load availability:", error);
  }
}

loadClientAvailability();

/* PAGE TRANSITION */

function showPage(pageId) {
  pages.forEach((page) => {
    page.classList.remove("active-page");
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");
  });

  const targetSection = document.getElementById(pageId);

  if (targetSection) {
    targetSection.classList.add("active-page");
  }

  const activeLink = document.querySelector(`nav a[data-page="${pageId}"]`);

  if (activeLink) {
    activeLink.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", function (e) {
    const targetPage = this.dataset.page;

    if (!targetPage) {
      return;
    }

    e.preventDefault();
    showPage(targetPage);
  });
});

/* HERO BUTTON */

const heroBtn = document.querySelector(".hero-btn");

if (heroBtn) {
  heroBtn.addEventListener("click", function (e) {
    e.preventDefault();

    showPage("cameras");
  });
}

/* HERO SLIDESHOW */

const slides = document.querySelectorAll(".slide");

let currentSlide = 0;

function changeSlide() {
  if (slides.length === 0) return;

  slides[currentSlide].classList.remove("active");

  currentSlide = (currentSlide + 1) % slides.length;

  slides[currentSlide].classList.add("active");
}

setInterval(changeSlide, 3500);

/* TERMS MODAL */

const rentButtons = document.querySelectorAll(".rent-btn");
const termsModal = document.getElementById("termsModal");
const closeModal = document.getElementById("closeModal");
const agreeBtn = document.querySelector(".agree-btn");
const termsContent = document.getElementById("termsContent");

const cameraTerms = `
<h3>Rental Period</h3>
<p>
The rental period begins at the date and time of camera pickup and
ends 24 hours later. PHP 100 per hour applies for delayed returns.
</p>

<h3>Rental Fee & Deposit</h3>
<ul>
<li>Rental fee: PHP 550 per day</li>
<li>Refundable security deposit: PHP 1,500</li>
<li>Late return fee: PHP 100 per hour</li>
<li>Reservation fee equal to one day's rental rate is required.</li>
</ul>

<h3>Equipment Provided</h3>
<p>
Sony Alpha6400, Charger, Battery,
Sony Kit Lens, Neck Strap,
SD Card & SD Card Reader.
</p>

<h3>Responsibility & Liability</h3>
<ul>
<li>Renter assumes full responsibility for loss or damage.</li>
<li>Renter agrees to pay repair or replacement costs.</li>
</ul>
`;

const lensTerms = `
<h3>Rental Period</h3>
<p>
The rental period begins at the date and time
of pickup and ends 24 hours later.
</p>

<h3>Rental Fee & Deposit</h3>
<ul>
<li>Lens rental fee: PHP 350 per day</li>
<li>Refundable security deposit: PHP 1,000</li>
<li>Late return fee: PHP 100 per hour</li>
</ul>

<h3>Equipment Provided</h3>
<p>
Sony E 55-210mm Telephoto Lens,
Lens Caps, Lens Pouch,
and Cleaning Cloth.
</p>

<h3>Responsibility & Liability</h3>
<ul>
<li>
Renter assumes full responsibility
for scratches, fungus, cracks,
or internal damage.
</li>

<li>
Renter agrees to shoulder
repair or replacement costs.
</li>
</ul>
`;

rentButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const type = button.dataset.type;

    if (type === "camera") {
      termsContent.innerHTML = cameraTerms;
    } else {
      termsContent.innerHTML = lensTerms;
    }

    termsModal.classList.add("active");
  });
});
closeModal.addEventListener("click", () => {
  termsModal.classList.remove("active");
});

agreeBtn.addEventListener("click", () => {
  termsModal.classList.remove("active");

  showPage("contact");
});

window.addEventListener("click", (e) => {
  if (e.target === termsModal) {
    termsModal.classList.remove("active");
  }
});

const albumGrid = document.querySelector(".album-grid");
const albumViews = document.querySelectorAll(".album-view");

function openAlbum(albumName) {
  if (!albumGrid) return;

  albumGrid.classList.add("hide");

  setTimeout(() => {
    albumGrid.style.display = "none";

    albumViews.forEach((album) => {
      album.classList.remove("active");
    });

    const selectedAlbum = document.getElementById(`${albumName}Album`);

    if (selectedAlbum) {
      selectedAlbum.style.display = "block";

      requestAnimationFrame(() => {
        selectedAlbum.classList.add("active");
      });
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, 350);
}

function closeAlbum() {
  albumViews.forEach((album) => {
    album.classList.remove("active");

    setTimeout(() => {
      album.style.display = "none";
    }, 450);
  });

  setTimeout(() => {
    albumGrid.style.display = "grid";

    requestAnimationFrame(() => {
      albumGrid.classList.remove("hide");
    });
  }, 250);
}

/* IMAGE MODAL */

const galleryImages = document.querySelectorAll(".gallery-item img");
const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const closeImageModal = document.getElementById("closeImageModal");

galleryImages.forEach((image) => {
  image.addEventListener("click", () => {
    modalImage.src = image.src;
    imageModal.classList.add("active");
    document.body.style.overflow = "hidden";
  });
});

closeImageModal.addEventListener("click", () => {
  imageModal.classList.remove("active");
  document.body.style.overflow = "auto";
});

imageModal.addEventListener("click", (e) => {
  if (e.target === imageModal) {
    imageModal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
});

/* GCASH PAYMENT MODAL */

const rentalForm = document.getElementById("rentalForm");
const paymentModal = document.getElementById("paymentModal");
const closePaymentModal = document.getElementById("closePaymentModal");
const donePaymentBtn = document.getElementById("donePaymentBtn");

let pendingReservation = null;

if (rentalForm && paymentModal) {
  rentalForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const rentalDate = document.getElementById("rentalDate").value;

    const selectedDate = new Date(rentalDate);

    const isUnavailable = unavailableDates.some((item) => {
      const from = new Date(item.fromDate);
      const to = new Date(item.toDate);

      return selectedDate >= from && selectedDate <= to;
    });

    if (isUnavailable) {
      alert("Selected date is unavailable. Please choose another date.");
      return;
    }

    pendingReservation = {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      camera:
        document.getElementById("cameraSelect").options[
          document.getElementById("cameraSelect").selectedIndex
        ].text,
      lens: "Included / Selected Package",
      days: Number(document.getElementById("rentalDays").value),
      total: Number(
        document
          .getElementById("totalPrice")
          .textContent.replace("₱", "")
          .replace(",", ""),
      ),
      paymentStatus: "pending",
      status: "pending",
    };

    paymentModal.classList.add("active");
    document.body.style.overflow = "hidden";
  });
}

if (donePaymentBtn) {
  donePaymentBtn.addEventListener("click", async () => {
    const referenceInput = document.getElementById("gcashReference");
    const gcashReference = referenceInput.value.trim();

    if (!gcashReference) {
      alert("Please enter your GCash reference number.");
      return;
    }

    pendingReservation.gcashReference = gcashReference;

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pendingReservation),
      });

      if (!response.ok) {
        throw new Error("Reservation was not saved.");
      }

      alert("Reservation submitted successfully!");

      paymentModal.classList.remove("active");
      document.body.style.overflow = "auto";

      rentalForm.reset();
      referenceInput.value = "";
      totalPrice.textContent = "₱0";
      discountNote.textContent = "";
      pendingReservation = null;
    } catch (error) {
      console.error(error);
      alert("Failed to submit reservation. Please try again.");
    }
  });
}

if (closePaymentModal) {
  closePaymentModal.addEventListener("click", () => {
    paymentModal.classList.remove("active");
    document.body.style.overflow = "auto";
  });
}

if (donePaymentBtn) {
  donePaymentBtn.addEventListener("click", () => {
    paymentModal.classList.remove("active");
    document.body.style.overflow = "auto";
    rentalForm.reset();
  });
}

if (paymentModal) {
  paymentModal.addEventListener("click", (e) => {
    if (e.target === paymentModal) {
      paymentModal.classList.remove("active");
      document.body.style.overflow = "auto";
    }
  });
}

/* RENTAL PRICE CALCULATION */

const cameraSelect = document.getElementById("cameraSelect");
const rentalDays = document.getElementById("rentalDays");
const totalPrice = document.getElementById("totalPrice");
const discountNote = document.getElementById("discountNote");

function calculateRentalTotal() {
  const selectedPrice = Number(cameraSelect.value);
  const days = Number(rentalDays.value);

  if (!selectedPrice || !days || days < 1) {
    totalPrice.textContent = "₱0";
    discountNote.textContent = "";
    return;
  }

  let dailyRate = selectedPrice;

  const selectedText = cameraSelect.options[cameraSelect.selectedIndex].text;

  /* DISCOUNT RULES */

  if (days >= 7) {
    if (selectedText.includes("Bundle")) {
      dailyRate = 900;
    } else {
      dailyRate = 500;
    }
  }
  const total = dailyRate * days;

  totalPrice.textContent = `₱${total.toLocaleString()}`;

  if (days >= 7) {
    if (selectedText.includes("Bundle")) {
      discountNote.textContent = `Weekly bundle discount applied: ₱900/day x ${days} days`;
    } else {
      discountNote.textContent = `Weekly discount applied: ₱500/day x ${days} days`;
    }
  }
}

if (cameraSelect && rentalDays) {
  cameraSelect.addEventListener("change", calculateRentalTotal);
  rentalDays.addEventListener("input", calculateRentalTotal);
}
