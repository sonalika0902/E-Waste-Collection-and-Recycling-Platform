
const express = require("express");
const path = require("path");
const session = require("express-session");

require("./config/db");

const app = express();

// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve CSS, JavaScript and images
app.use(express.static(path.join(__dirname, "public")));

// Configure EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Trust Render's proxy when deployed
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

// Session configuration
app.use(
    session({
        name: "ecorecycle.sid",
        secret:
            process.env.SESSION_SECRET ||
            "ecorecycle-dev-secret-change-this",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 1000 * 60 * 60
        }
    })
);

// Make the signed-in user's name available to EJS
app.use((req, res, next) => {
    res.locals.userName = req.session.userName || null;
    next();
});

// Website routes
const indexRoutes = require("./routes/index");
app.use("/", indexRoutes);

// Start server using Render's assigned port
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
