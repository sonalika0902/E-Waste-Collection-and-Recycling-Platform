
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

// Session configuration
app.use(
    session({
        name: "ecorecycle.sid",
        secret: process.env.SESSION_SECRET || "ecorecycle-dev-secret-change-this",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60
        }
    })
);


app.use((req, res, next) => {
    res.locals.userName = req.session.userName || null;
    next();
});


// Website routes
const indexRoutes = require("./routes/index");
app.use("/", indexRoutes);

// Start server
const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
});