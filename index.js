const express = require('express');
const app = express();
const port = 8000;
const cookieParser = require('cookie-parser');
const cors = require('cors');

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

// Routes
app.use('/user', userRoute);
app.use('/', staticRoute);
app.use('/stock', stockRoute);

// View Engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Database Connection
connectDB("mongodb://127.0.0.1:27017/authDb").then(() => {
    console.log("DB CONNECTED");
});

// Server
app.listen(port, () => console.log(`Listening on port ${port}`));
