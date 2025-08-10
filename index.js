const express = require('express');
const app = express();
const port = process.env.PORT || 8000;
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const userRoute = require('./routers/user.js');
const staticRoute = require('./routers/static.js');
const stockRoute = require('./routers/stock.js');
const { connectDB } = require('./connection.js');
const { cheackAuth } = require('./middleware/auth.js');

// Middlewares
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/user', userRoute);
app.use('/', staticRoute);
app.use('/stock', stockRoute);

// View Engine
app.set('view engine', 'ejs');
app.set('views', './views');


// Database Connection
connectDB(process.env.MONGO_URI).then(() => {
    console.log("DB CONNECTED");
}).catch(err => {
    console.error("DB CONNECTION ERROR:", err);
});

// Server
app.listen(port, () => console.log(`Listening on port ${port}`));
