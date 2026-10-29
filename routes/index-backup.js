
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// =====================================
// HOMEPAGE
// =====================================
router.get("/", (req, res) => {
    res.render("index");
});

// =====================================
// LOGIN PAGE
// =====================================
router.get("/login", (req, res) => {
    res.render("login");
});

// =====================================
// REGISTRATION PAGE
// =====================================
router.get("/register", (req, res) => {
    res.render("register");
});

// =====================================
// USER DASHBOARD
// =====================================
router.get("/dashboard", (req, res) => {
    res.render("dashboard");
});

// =====================================
// COLLECTION CENTERS
// =====================================
router.get("/centers", (req, res) => {
    res.render("centers");
});

// =====================================
// RECYCLING DRIVES
// =====================================
router.get("/drives", (req, res) => {
    res.render("drives");
});

// =====================================
// DISPLAY PICKUP REQUEST FORM
// =====================================
router.get("/pickup", (req, res) => {
    res.render("pickup", {
        success: null,
        error: null
    });
});

// =====================================
// SUBMIT PICKUP REQUEST
// =====================================
router.post("/pickup", (req, res) => {
    const {
        name,
        email,
        phone,
        wasteType,
        quantity,
        address,
        pickupDate,
        pickupTime,
        notes
    } = req.body;

    // Check required fields
    if (
        typeof name !== "string" || !name.trim() ||
        typeof email !== "string" || !email.trim() ||
        typeof phone !== "string" || !phone.trim() ||
        typeof wasteType !== "string" || !wasteType ||
        quantity === undefined || quantity === "" ||
        typeof address !== "string" || !address.trim() ||
        typeof pickupDate !== "string" || !pickupDate ||
        typeof pickupTime !== "string" || !pickupTime
    ) {
        return res.status(400).render("pickup", {
            success: null,
            error: "Please complete all required fields."
        });
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim()) || email.length > 254) {
        return res.status(400).render("pickup", {
            success: null,
            error: "Please enter a valid email address."
        });
    }

    // Validate quantity
    const quantityKg = Number(quantity);

    if (
        !Number.isFinite(quantityKg) ||
        quantityKg < 0.1 ||
        quantityKg > 10000
    ) {
        return res.status(400).render("pickup", {
            success: null,
            error: "Enter a quantity between 0.1 and 10000 kg."
        });
    }

    // Validate e-waste type
    const allowedWasteTypes = [
        "Mobile Phones",
        "Laptops and Computers",
        "Batteries",
        "Chargers and Cables",
        "Televisions",
        "Other Electronics"
    ];

    if (!allowedWasteTypes.includes(wasteType)) {
        return res.status(400).render("pickup", {
            success: null,
            error: "Please select a valid e-waste type."
        });
    }

    // Validate pickup time
    const allowedTimes = [
        "09:00-12:00",
        "12:00-15:00",
        "15:00-18:00"
    ];

    if (!allowedTimes.includes(pickupTime)) {
        return res.status(400).render("pickup", {
            success: null,
            error: "Please select a valid pickup time."
        });
    }

    // Validate date format and calendar date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
        return res.status(400).render("pickup", {
            success: null,
            error: "Please select a valid pickup date."
        });
    }

    const [year, month, day] = pickupDate.split("-").map(Number);

    const dateCheck = new Date(Date.UTC(year, month - 1, day));

    const isValidDate =
        dateCheck.getUTCFullYear() === year &&
        dateCheck.getUTCMonth() === month - 1 &&
        dateCheck.getUTCDate() === day;

    const today = new Date();

    const todayString = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    if (!isValidDate || pickupDate < todayString) {
        return res.status(400).render("pickup", {
            success: null,
            error: "Please select a valid date today or later."
        });
    }

    // Validate text lengths
    if (
        name.trim().length > 100 ||
        phone.trim().length > 15 ||
        address.trim().length > 1000 ||
        (notes && notes.length > 1000)
    ) {
        return res.status(400).render("pickup", {
            success: null,
            error: "One or more fields exceed the allowed length."
        });
    }

    // Prepare SQL query
    const sql = `
        INSERT INTO pickup_requests (
            name,
            email,
            phone,
            waste_type,
            quantity_kg,
            pickup_address,
            pickup_date,
            pickup_time,
            notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        name.trim(),
        email.trim(),
        phone.trim(),
        wasteType,
        quantityKg,
        address.trim(),
        pickupDate,
        pickupTime,
        typeof notes === "string" ? notes.trim() || null : null
    ];

    // Save the pickup request to MySQL
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Pickup request database error:", err.message);

            return res.status(500).render("pickup", {
                success: null,
                error: "Unable to save your request. Please check the database connection and try again."
            });
        }

        console.log("Pickup request saved. ID:", result.insertId);

        return res.status(201).render("pickup", {
            success: `Your pickup request was submitted successfully! Request ID: ${result.insertId}`,
            error: null
        });
    });
});

router.get("/pickup", (req, res) => {
    res.render("pickup", {
        success: null,
        error: null
    });
});
// =====================================
// EXPORT ROUTER
// =====================================
module.exports = router;
