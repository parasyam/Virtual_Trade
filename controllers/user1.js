const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const bcrypt = require('bcrypt');
const path = require("path");
const User = require("../models/user");
const { setUser, getUser } = require('../service/auth');
require("dotenv").config();

const RAPIDAPI_HOST = "real-time-finance-data.p.rapidapi.com";
const RAPIDAPI_KEY = "7953fbc373msh261e8a9a95783aap1a6958jsne93911bd74b4";

async function handleUserSignup(req, res) {
    const { name, email, password } = req.body;
    const user = await User.findOne({ email });

    if (user) {
        return res.render("signup", { error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword });

    return res.render('login');
}

async function handleUserLogin(req, res) {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.render("login", { error: "Invalid Email or Password" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
        return res.render("login", { error: "Invalid Email or Password" });
    }

    const sessionId = uuidv4();
    setUser(sessionId, user);
    res.cookie('uid', sessionId);

    return res.redirect("/");
}

async function handleStockDetails(req, res) {
    if (!req.user) {
        return res.redirect("/login");
    }
    
    const sym = req.params.symbol;
    const symbol = `${sym}:NSE`;

    try {
        const response = await axios.get("https://real-time-finance-data.p.rapidapi.com/stock-overview", {
            params: { symbol, language: "en" },
            headers: {
                "x-rapidapi-host": RAPIDAPI_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
            },
        });

        const stockData = response.data;

        if (stockData?.data?.price) {
            return res.render("stock_data", {
                symbol: sym,
                stockPrice: stockData.data.price,
                stockAbout: stockData.data.about,
                changePercent: stockData.data.change_percent,
                marketCap: stockData.data.company_market_cap,
                peRatio: stockData.data.company_pe_ratio,
                yearLow: stockData.data.year_low,
                yearHigh: stockData.data.year_high,
                dividend: stockData.data.company_dividend_yield,
                industry: stockData.data.company_industry
            });
        } else {
            return res.status(404).json({ error: "Stock price not found" });
        }
    } catch (error) {
        console.error("Error fetching stock data:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function handleAddPortfolio(req, res) {
    if (!req.user) {
        return res.redirect("/login");
    }
    
    try {
        const { stockName, stockPrice, quantity } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const newStock = {
            name: stockName,
            price: parseFloat(stockPrice),
            quantity: parseInt(quantity, 10)
        };

        user.favoriteStocks.push(newStock);
        await user.save();

        res.json({ message: "Stock added to your watchlist!", user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
async function handlePortfolio(req, res) {
    if (!req.user) {
        return res.redirect("/login");
    }
    
    try {
        const user = await User.findById(req.user._id);
        let totalInvestment = 0;
        let presentValue = 0;
        let stocksData = [];

        for (let stock of user.favoriteStocks) {
            try {
                const response = await axios.get("https://real-time-finance-data.p.rapidapi.com/stock-overview", {
                    params: { symbol: stock.name, language: "en" },
                    headers: {
                        "x-rapidapi-host": RAPIDAPI_HOST,
                        "x-rapidapi-key": RAPIDAPI_KEY,
                    },
                });
    
                const stockData = response.data;
                const currentPrice = stockData?.data?.price || 0;
    
                stocksData.push({
                    symbol: stock.name,
                    quantity: stock.quantity,
                    pastPrice: stock.price,
                    currentPrice: currentPrice,
                });
    
                presentValue += stock.quantity * currentPrice;
                totalInvestment += stock.quantity * stock.price;
            } catch (error) {
                console.error(`Error fetching price for ${stock.name}:`, error.message);
            }
        }

        return res.render("portfolio", { 
            stocks: stocksData, 
            presentValue, 
            totalInvestment, 
            realizedProfit: user.realizedProfit || 0 
        });
    } catch (error) {
        console.error("Error fetching portfolio:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


const handlesellStock = async (req, res) => {
    try {
        const { stockName, quantityToSell } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const stockIndex = user.favoriteStocks.findIndex(stock => stock.name === stockName);

        if (stockIndex === -1) {
            return res.status(404).json({ error: "Stock not found in portfolio" });
        }

        let stock = user.favoriteStocks[stockIndex];

        if (stock.quantity < quantityToSell) {
            return res.status(400).json({ error: "Not enough quantity to sell" });
        }

        
        const response = await axios.get("https://real-time-finance-data.p.rapidapi.com/stock-overview", {
            params: { symbol: stock.name, language: "en" },
            headers: {
                "x-rapidapi-host": RAPIDAPI_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
            },
        });

        const stockData = response.data;
        const sellPrice = stockData?.data?.price || stock.price; 
        const buyPrice = stock.price;
        const profit = (sellPrice - buyPrice) * quantityToSell;

       
        stock.quantity -= quantityToSell;

        user.realizedProfit = (user.realizedProfit || 0) + profit;


        if (stock.quantity === 0) {
            user.favoriteStocks.splice(stockIndex, 1);
        }

        await user.save();
        return res.json({ message: "Stock sold successfully", realizedProfit: user.realizedProfit });
    } catch (error) {
        console.error("Error selling stock:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};



module.exports = {
    handleUserSignup,
    handleUserLogin,
    handleStockDetails,
    handleAddPortfolio,
    handlePortfolio,
    handlesellStock,
   
};
