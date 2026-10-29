
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const db = require("../config/db");

/* ================================
   AUTHENTICATION MIDDLEWARE
================================ */
function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.redirect("/login");
    }

    next();
}

/* ================================
   HOMEPAGE
================================ */
router.get("/", (req, res) => {
    res.render("index");
});

/* ================================
   LOGIN PAGE
================================ */
router.get("/login", (req, res) => {
    res.render("login", {
        error: null,
        success: null
    });
});

/* ================================
   PROCESS LOGIN
================================ */
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== "string" ||
        !email.trim() ||
        typeof password !== "string" ||
        !password ||
        password.length > 72
    ) {
        return res.status(400).render("login", {
            error: "Please enter a valid email address and password.",
            success: null
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const sql = `
        SELECT id, full_name, email, password_hash
        FROM users
        WHERE email = ?
        LIMIT 1
    `;

    db.query(sql, [normalizedEmail], (err, results) => {
        if (err) {
            console.error("Login database error:", err.message);

            return res.status(500).render("login", {
                error: "Unable to log in right now. Please try again.",
                success: null
            });
        }

        if (results.length === 0) {
            return res.status(401).render("login", {
                error: "Invalid email or password.",
                success: null
            });
        }

        const user = results[0];

        bcrypt.compare(password, user.password_hash, (compareError, isMatch) => {
            if (compareError) {
                console.error("Password verification error:", compareError.message);

                return res.status(500).render("login", {
                    error: "Unable to log in right now. Please try again.",
                    success: null
                });
            }

            if (!isMatch) {
                return res.status(401).render("login", {
                    error: "Invalid email or password.",
                    success: null
                });
            }

            // Create a fresh session after successful authentication
            req.session.regenerate((sessionError) => {
                if (sessionError) {
                    console.error("Session creation error:", sessionError.message);

                    return res.status(500).render("login", {
                        error: "Unable to start your session. Please try again.",
                        success: null
                    });
                }

                req.session.userId = user.id;
                req.session.userName = user.full_name;
                req.session.userEmail = user.email;

                req.session.save((saveError) => {
                    if (saveError) {
                        console.error("Session save error:", saveError.message);

                        return res.status(500).render("login", {
                            error: "Unable to complete login. Please try again.",
                            success: null
                        });
                    }

                    console.log("User logged in successfully. User ID:", user.id);
                    return res.redirect("/dashboard");
                });
            });
        });
    });
});

/* ================================
   REGISTRATION PAGE
================================ */
router.get("/register", (req, res) => {
    res.render("register", {
        error: null,
        success: null,
        formData: {}
    });
});

/* ================================
   REGISTRATION FORM SUBMISSION
================================ */
router.post(
    "/register",
    [
        body("full_name")
            .trim()
            .notEmpty()
            .withMessage("Please enter your full name.")
            .isLength({ max: 100 })
            .withMessage("Name must be 100 characters or fewer."),

        body("email")
            .trim()
            .isEmail()
            .withMessage("Please enter a valid email address.")
            .normalizeEmail()
            .isLength({ max: 254 })
            .withMessage("Email is too long."),

        body("mobile")
            .trim()
            .matches(/^[0-9]{10,15}$/)
            .withMessage("Enter a mobile number containing 10 to 15 digits."),

        body("address")
            .trim()
            .notEmpty()
            .withMessage("Please enter your address.")
            .isLength({ max: 1000 })
            .withMessage("Address is too long."),

        body("password")
            .isLength({ min: 8, max: 72 })
            .withMessage("Password must be at least 8 characters long."),

        body("confirm_password")
            .custom((value, { req }) => value === req.body.password)
            .withMessage("Passwords do not match.")
    ],
    (req, res) => {
        const errors = validationResult(req);

        const formData = {
            full_name: req.body.full_name || "",
            email: req.body.email || "",
            mobile: req.body.mobile || "",
            address: req.body.address || ""
        };

        if (!errors.isEmpty()) {
            return res.status(400).render("register", {
                error: errors.array()[0].msg,
                success: null,
                formData
            });
        }

        const { full_name, email, mobile, address, password } = req.body;

        db.query(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [email],
            async (checkError, rows) => {
                if (checkError) {
                    console.error("Registration lookup error:", checkError.message);

                    return res.status(500).render("register", {
                        error: "Unable to register right now. Please try again.",
                        success: null,
                        formData
                    });
                }

                if (rows.length > 0) {
                    return res.status(409).render("register", {
                        error: "This email is already registered. Please log in.",
                        success: null,
                        formData
                    });
                }

                try {
                    // Never store the plain-text password
                    const passwordHash = await bcrypt.hash(password, 12);

                    const sql = `
                        INSERT INTO users
                        (full_name, email, mobile, address, password_hash)
                        VALUES (?, ?, ?, ?, ?)
                    `;

                    db.query(
                        sql,
                        [full_name, email, mobile, address, passwordHash],
                        (insertError) => {
                            if (insertError) {
                                console.error(
                                    "Registration insert error:",
                                    insertError.message
                                );

                                if (insertError.code === "ER_DUP_ENTRY") {
                                    return res.status(409).render("register", {
                                        error: "This email is already registered. Please log in.",
                                        success: null,
                                        formData
                                    });
                                }

                                return res.status(500).render("register", {
                                    error: "Unable to save your account. Please try again.",
                                    success: null,
                                    formData
                                });
                            }

                            return res.render("register", {
                                error: null,
                                success: "Registration successful! You can now log in.",
                                formData: {}
                            });
                        }
                    );
                } catch (hashError) {
                    console.error("Password hashing error:", hashError.message);

                    return res.status(500).render("register", {
                        error: "Unable to create your account right now. Please try again.",
                        success: null,
                        formData
                    });
                }
            }
        );
    }
);

/* ================================
   USER DASHBOARD
================================ */
router.get("/dashboard", requireLogin, (req, res) => {
    res.render("dashboard", {
        userName: req.session.userName
    });
});

/* ================================
   COLLECTION CENTERS
================================ */
router.get("/centers", (req, res) => {
    res.render("centers");
});

/* ================================
   RECYCLING DRIVES
================================ */
router.get("/drives", (req, res) => {
    res.render("drives");
});

/* ================================
   DISPLAY PICKUP REQUEST FORM
================================ */
router.get("/pickup", requireLogin, (req, res) => {
    res.render("pickup", {
        success: null,
        error: null
    });
});

/* ================================
   SUBMIT PICKUP REQUEST
================================ */
router.post("/pickup", requireLogin, (req, res) => {
    // Take the user ID from the authenticated session
    const userId = req.session.userId;

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

    // Validate required fields
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

    // Validate email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim()) || email.trim().length > 254) {
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

    // Validate date format
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

    // Validate field lengths
    if (
        name.trim().length > 100 ||
        phone.trim().length > 15 ||
        address.trim().length > 1000 ||
        (typeof notes === "string" && notes.length > 1000)
    ) {
        return res.status(400).render("pickup", {
            success: null,
            error: "One or more fields exceed the allowed length."
        });
    }

    // Insert request with the logged-in user's ID
    const sql = `
        INSERT INTO pickup_requests (
            user_id,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        userId,
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

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Pickup request database error:", err.message);

            return res.status(500).render("pickup", {
                success: null,
                error: "Unable to save your request. Please try again."
            });
        }

        console.log("Pickup request saved. ID:", result.insertId);

        return res.status(201).render("pickup", {
            success: `Your pickup request was submitted successfully! Request ID: ${result.insertId}`,
            error: null
        });
    });
});

/* ================================
   LOGOUT
================================ */
router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err.message);
            return res.status(500).send("Unable to log out. Please try again.");
        }

        res.clearCookie("ecorecycle.sid", {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: false
        });

        return res.redirect("/login");
    });
});

module.exports = router;
