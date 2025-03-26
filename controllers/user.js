const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const bcrypt = require('bcrypt');
const path = require("path");
const User = require("../models/user");
const { setUser, getUser,removeUser } = require('../service/auth');
require("dotenv").config();

// const RAPIDAPI_HOST = "real-time-finance-data.p.rapidapi.com";
// const RAPIDAPI_KEY = "7953fbc373msh261e8a9a95783aap1a6958jsne93911bd74b4";

// const RAPIDAPI_HOST= "real-time-finance-data.p.rapidapi.com";
// const RAPIDAPI_KEY="075e1f3f59mshb3ce46bc0a83b88p1631afjsnd500d40a50e3";

const RAPIDAPI_HOST= "real-time-finance-data.p.rapidapi.com";
const RAPIDAPI_KEY=" 252591b063mshac5adcd5dc6681ap12fb32jsncf8be35cd00c";




async function handleUserSignup(req, res) {
    const { name, email, password } = req.body;
    const user = await User.findOne({ email });

    if (user) {
        return res.render("signup", { error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword });

    res.render('login', { error: 'Invalid Email or Password' }); 
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


async function handleUserLogout(req, res) {
    const sessionId = req.cookies.uid;

    if (sessionId) {
        
        removeUser(sessionId);
       
        res.clearCookie('uid');
    }
    return res.redirect('/login');
}


async function handleStockDetails(req, res) {
    if (!req.user) {
        return res.redirect("/login");
    }

    const sym = req.params.symbol;
    const symbol = `${sym}:NSE`;

    try {
        // ✅ Parallel API calls with Promise.all() and timeout added
        const [stockResponse, incomeResponse] = await Promise.all([
            axios.get("https://real-time-finance-data.p.rapidapi.com/stock-overview", {
                params: { symbol, language: "en" },
                headers: {
                    "x-rapidapi-host": RAPIDAPI_HOST,
                    "x-rapidapi-key": RAPIDAPI_KEY,
                },
                timeout: 5000 // ✅ Added timeout to avoid waiting too long
            }),
            axios.get("https://real-time-finance-data.p.rapidapi.com/company-income-statement", {
                params: { symbol, period: "QUARTERLY", language: "en" },
                headers: {
                    "x-rapidapi-host": RAPIDAPI_HOST,
                    "x-rapidapi-key": RAPIDAPI_KEY,
                },
                timeout: 5000 // ✅ Added timeout here as well
            })
        ]);

        const stockData = stockResponse.data;
        const incomeData = incomeResponse.data?.data?.income_statement || [];

        // ✅ Process the latest 4 quarters
        const pastFourQuarters = incomeData.slice(0, 4).map((quarter) => ({
            period: quarter?.date || 'N/A',
            revenue: quarter?.revenue ? (quarter.revenue / 10000000).toFixed(2) : 0,         // Convert to Cr
            netIncome: quarter?.net_income ? (quarter.net_income / 10000000).toFixed(2) : 0, // Convert to Cr
            eps: quarter?.earnings_per_share || 0,
            netProfitMargin: quarter?.net_profit_margin || 0,
            EBITDA: quarter?.EBITDA ? (quarter.EBITDA / 10000000).toFixed(2) : 0              // Convert to Cr
        }));

        // ✅ Render with stock and income data
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
                industry: stockData.data.company_industry,
                pastFourQuarters: pastFourQuarters
            });
        } else {
            return res.render("stock_data", {
                symbol: sym,
                stockPrice: 0,
                stockAbout: "No data available",
                changePercent: 0,
                marketCap: 0,
                peRatio: 0,
                yearLow: 0,
                yearHigh: 0,
                dividend: 0,
                industry: "N/A",
                pastFourQuarters: []
            });
        }
    } catch (error) {
        // ✅ Improved error log with optional chaining
        console.error("Error fetching stock or income data:", error.response?.data || error.message);

        // ✅ Render fallback view on error
        return res.render("stock_data", {
            symbol: sym,
            stockPrice: 0,
            stockAbout: "No data available (API error or limit exceeded)",
            changePercent: 0,
            marketCap: 0,
            peRatio: 0,
            yearLow: 0,
            yearHigh: 0,
            dividend: 0,
            industry: "N/A",
            pastFourQuarters: []
        });
    }
}


async function handleAddPortfolio(req, res) {
    if (!req.user) {
        res.render('login', { error: 'Invalid Email or Password' }); 
    }

    try {
        const { stockName, stockPrice, quantity } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const price = parseFloat(stockPrice);
        const qty = parseInt(quantity, 10);
        const totalCost = price * qty;

        // Check if user has enough funds
        if (user.funds < totalCost) {
            return res.status(400).json({ error: "Insufficient funds to buy this stock" });
        }

        // Check if stock already exists in portfolio
        const existingStockIndex = user.favoriteStocks.findIndex(stock => stock.name === stockName);
        if (existingStockIndex !== -1) {
            // Average the price if already exists
            const existingStock = user.favoriteStocks[existingStockIndex];
            const totalQuantity = existingStock.quantity + qty;
            existingStock.price = ((existingStock.price * existingStock.quantity) + (price * qty)) / totalQuantity;
            existingStock.quantity = totalQuantity;
        } else {
            // Add new stock
            const newStock = {
                name: stockName,
                price: price,
                quantity: qty
            };
            user.favoriteStocks.push(newStock);
        }

        // Deduct funds after buying
        user.funds -= totalCost;
        await user.save();

        res.json({ message: "Stock purchased successfully!", remainingFunds: user.funds, user });
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
        let apiFailed = false;

        // ✅ Parallel API calls using Promise.all()
        const stockPromises = user.favoriteStocks.map(async (stock) => {
            let currentPrice = 0;
            try {
                const response = await axios.get("https://real-time-finance-data.p.rapidapi.com/stock-overview", {
                    params: { symbol: stock.name, language: "en" },
                    headers: {
                        "x-rapidapi-host": RAPIDAPI_HOST,
                        "x-rapidapi-key": RAPIDAPI_KEY,
                    },
                });
                const stockData = response.data;
                currentPrice = stockData?.data?.price || 0;
            } catch (error) {
                console.error(`Error fetching price for ${stock.name}:`, error.message);
                apiFailed = true;
            }

            return {
                symbol: stock.name,
                quantity: stock.quantity,
                pastPrice: stock.price,
                currentPrice: currentPrice,
            };
        });

        const stocksData = await Promise.all(stockPromises);

        // ✅ Calculate totalInvestment and presentValue
        if (!apiFailed) {
            for (let stock of stocksData) {
                presentValue += stock.quantity * stock.currentPrice;
                totalInvestment += stock.quantity * stock.pastPrice;
            }
        } else {
            // Fallback if API fails
            presentValue = 0;
            totalInvestment = 0;
            stocksData.forEach(stock => stock.currentPrice = 0);
        }

        return res.render("portfolio", {
            stocks: stocksData,
            presentValue,
            totalInvestment,
            realizedProfit: user.realizedProfit || 0,
            AvaliableFunds: user.funds,
        });
    } catch (error) {
        console.error("Error fetching portfolio:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


const handlesellStock = async (req, res) => {
    try {
        const { stockName, quantityToSell, sellPrice: frontSellPrice, buyPrice: frontBuyPrice } = req.body;

        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const stockIndex = user.favoriteStocks.findIndex(stock => stock.name === stockName);
        if (stockIndex === -1) {
            return res.status(404).json({ error: "Stock not found in portfolio" });
        }

        const stock = user.favoriteStocks[stockIndex];
        if (stock.quantity < quantityToSell) {
            return res.status(400).json({ error: "Not enough quantity to sell" });
        }

        let sellPrice = frontSellPrice;
        try {
            const response = await axios.get("https://real-time-finance-data.p.rapidapi.com/stock-overview", {
                params: { symbol: stock.name, language: "en" },
                headers: {
                    "x-rapidapi-host": process.env.RAPIDAPI_HOST,
                    "x-rapidapi-key": process.env.RAPIDAPI_KEY,
                },
            });
            sellPrice = response.data?.data?.price || frontSellPrice;
        } catch (apiError) {
            // Continue with frontend price if API fails
        }

        const buyPrice = frontBuyPrice || stock.price;
        const profit = (sellPrice - buyPrice) * quantityToSell;


        stock.quantity -= quantityToSell;
        if (stock.quantity === 0) {
            user.favoriteStocks.splice(stockIndex, 1);
        }

        user.realizedProfit = (user.realizedProfit || 0) + profit;
        user.AvaliableFunds= (user.AvaliableFunds || 0) + (sellPrice * quantityToSell);
        await user.save();

        return res.json({ message: "Stock sold successfully", realizedProfit: user.realizedProfit });

    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const handleGetWatchlist = async (req, res) => {
    if (!req.user) {
        return res.redirect("/login");
    }

    try {
        const user = await User.findById(req.user._id);
        if (!user){

    return res.status(404).json({ error: "User not found" });
        }

        let watchlistData = [];

        for (let symbol of user.watchlist) {
            try {
                const response = await axios.get("https://real-time-finance-data.p.rapidapi.com/stock-overview", {
                    params: { symbol: `${symbol}:NSE`, language: "en" },
                    headers: {
                        "x-rapidapi-host": RAPIDAPI_HOST,
                        "x-rapidapi-key": RAPIDAPI_KEY,
                    },
                });

                const stockData = response.data.data;

                if (stockData) {
                    watchlistData.push({
                        symbol: symbol,
                        companyName: stockData.about || "N/A",
                        currentPrice: stockData.price || 0,
                        changePercent: stockData.change_percent || "0%",
                    });
                }
            } catch (error) {
                console.error(`Error fetching data for ${symbol}:`, error.message);
                watchlistData.push({
                    symbol: symbol,
                    companyName: "N/A",
                    currentPrice: 0,
                    changePercent: "0%",
                });
            }
        }

        res.render("watchlist", { watchlist: watchlistData });

    } catch (error) {
        console.error("Error fetching watchlist:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const handleRemoveWatchlist = async (req, res) => {
    try {
        const { stockName } = req.body;
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const stockIndex = user.watchlist.findIndex(stock => stock.toLowerCase() === stockName.toLowerCase());

     
        if (stockIndex === -1) {
            return res.status(404).json({ error: "Stock not found in watchlist" });
        }

        user.watchlist.splice(stockIndex, 1);
        await user.save();

        return res.json({ message: "Stock removed from watchlist successfully" });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
};


  
  
const handleAddWatchlist = async (req, res) => {
    if (!req.user) {return res.redirect("/login");
    }
    try {
        const { stockSymbol } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!user.watchlist.includes(stockSymbol)) {
            user.watchlist.push(stockSymbol);
            await user.save();
        }
    
        res.json({ message: "Stock added to watchlist", watchlist: user.watchlist });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const handleDashbord=async (req, res) => {
    try {
        const users = await User.find().sort({ realizedProfit: -1 });
        res.render('dashboard', { users });
    } catch (err) {
        res.status(500).send('Error fetching leaderboard');
    }
}



module.exports = {
    handleUserSignup,
    handleUserLogin,
    handleStockDetails,
    handleAddPortfolio,
    handlePortfolio,
    handlesellStock,
    handleGetWatchlist,
    handleRemoveWatchlist,
    handleAddWatchlist,
    handleDashbord,
    handleUserLogout,
};
