const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const path = require("path");
const User = require("../models/user");
const { setUser, getUser, removeUser } = require('../service/auth');
require("dotenv").config();

// Put your API keys/hosts here in an array for round-robin
const apiCredentials = [
    { host: process.env.RAPIDAPI_HOST_1, key: process.env.RAPIDAPI_KEY_1 },
    { host: process.env.RAPIDAPI_HOST_2, key: process.env.RAPIDAPI_KEY_2 },
    { host: process.env.RAPIDAPI_HOST_3, key: process.env.RAPIDAPI_KEY_3 },
];

let currentApiIndex = 0;

// Round-robin selector
function getNextApiCredentials() {
    const creds = apiCredentials[currentApiIndex];
    currentApiIndex = (currentApiIndex + 1) % apiCredentials.length;
    return creds;
}

async function handleUserSignup(req, res) {
    const { name, email, password } = req.body;
    const user = await User.findOne({ email });

    if (user) {
        return res.render("signup", { error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword });

    res.render('login', { error: null }); 
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
        // Get credentials for all three API calls
        const { host: host1, key: key1 } = getNextApiCredentials();
        const { host: host2, key: key2 } = getNextApiCredentials();
        const { host: host3, key: key3 } = getNextApiCredentials();

        const [stockResponse, incomeResponse, cashFlowResponse] = await Promise.all([
            axios.get("https://real-time-finance-data.p.rapidapi.com/stock-overview", {
                params: { symbol, language: "en" },
                headers: { "x-rapidapi-host": host1, "x-rapidapi-key": key1 },
                timeout: 10000
            }),
            axios.get("https://real-time-finance-data.p.rapidapi.com/company-income-statement", {
                params: { symbol, period: "QUARTERLY", language: "en" },
                headers: { "x-rapidapi-host": host2, "x-rapidapi-key": key2 },
                timeout: 10000
            }),
            axios.get("https://real-time-finance-data.p.rapidapi.com/company-cash-flow", {
                params: { symbol, period: "QUARTERLY", language: "en" },
                headers: { "x-rapidapi-host": host3, "x-rapidapi-key": key3 },
                timeout: 10000
            })
        ]);

        const stockData = stockResponse.data;
        const incomeData = incomeResponse.data?.data?.income_statement || [];
        const cashFlowData = cashFlowResponse.data?.data?.cash_flow || [];

        const pastFourQuarters = incomeData.slice(0, 4).map((quarter) => ({
            period: quarter?.date || 'N/A',
            revenue: quarter?.revenue ? (quarter.revenue / 10000000).toFixed(2) : 0,
            netIncome: quarter?.net_income ? (quarter.net_income / 10000000).toFixed(2) : 0,
            eps: quarter?.earnings_per_share || 0,
            netProfitMargin: quarter?.net_profit_margin || 0,
            EBITDA: quarter?.EBITDA ? (quarter.EBITDA / 10000000).toFixed(2) : 0
        }));

        const pastFourCashFlows = cashFlowData.slice(0, 4).map((flow) => ({
            period: flow?.date || 'N/A',
            netIncome: flow?.net_income ? (flow.net_income / 10000000).toFixed(2) : 0,
            cashFromOperations: flow?.cash_from_operations ? (flow.cash_from_operations / 10000000).toFixed(2) : 0,
            cashFromInvesting: flow?.cash_from_investing ? (flow.cash_from_investing / 10000000).toFixed(2) : 0,
            cashFromFinancing: flow?.cash_from_financing ? (flow.cash_from_financing / 10000000).toFixed(2) : 0,
            netChangeInCash: flow?.net_change_in_cash ? (flow.net_change_in_cash / 10000000).toFixed(2) : 0,
            freeCashFlow: flow?.free_cash_flow ? (flow.free_cash_flow / 10000000).toFixed(2) : 0
        }));

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
                pastFourQuarters,
                pastFourCashFlows
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
                pastFourQuarters: [],
                pastFourCashFlows: []
            });
        }
    } catch (error) {
        console.error("Error fetching stock, income, or cash flow data:", error.response?.data || error.message);
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
            pastFourQuarters: [],
            pastFourCashFlows: []
        });
    }
}

async function handleAddPortfolio(req, res) {
    if (!req.user) {
        return res.render('login', { error: 'Invalid Email or Password' }); 
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

        if (user.funds < totalCost) {
            return res.status(400).json({ error: "Insufficient funds to buy this stock" });
        }

        const existingStockIndex = user.favoriteStocks.findIndex(stock => stock.name === stockName);
        if (existingStockIndex !== -1) {
            const existingStock = user.favoriteStocks[existingStockIndex];
            const totalQuantity = existingStock.quantity + qty;
            existingStock.price = ((existingStock.price * existingStock.quantity) + (price * qty)) / totalQuantity;
            existingStock.quantity = totalQuantity;
        } else {
            const newStock = {
                name: stockName,
                price: price,
                quantity: qty
            };
            user.favoriteStocks.push(newStock);
        }

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

        const stockPromises = user.favoriteStocks.map(async (stock) => {
            let currentPrice = 0;
            try {
                const { host, key } = getNextApiCredentials();
                const response = await axios.get("https://real-time-finance-data.p.rapidapi.com/stock-overview", {
                    params: { symbol: stock.name, language: "en" },
                    headers: {
                        "x-rapidapi-host": host,
                        "x-rapidapi-key": key,
                    },
                });
                currentPrice = response.data?.data?.price || 0;
            } catch (error) {
                console.error(`Error fetching price for ${stock.name}:`, error.message);
                apiFailed = true;
            }

            return {
                symbol: stock.name,
                quantity: stock.quantity,
                pastPrice: stock.price,
                currentPrice,
            };
        });

        const stocksData = await Promise.all(stockPromises);

        if (!apiFailed) {
            for (const stock of stocksData) {
                presentValue += stock.quantity * stock.currentPrice;
                totalInvestment += stock.quantity * stock.pastPrice;
            }
        } else {
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
            const { host, key } = getNextApiCredentials();
            const response = await axios.get("https://real-time-finance-data.p.rapidapi.com/stock-overview", {
                params: { symbol: stock.name, language: "en" },
                headers: {
                    "x-rapidapi-host": host,
                    "x-rapidapi-key": key,
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
        user.AvaliableFunds = (user.AvaliableFunds || 0) + (sellPrice * quantityToSell);
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
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        let watchlistData = [];

        for (let symbol of user.watchlist) {
            try {
                const { host, key } = getNextApiCredentials();
                const response = await axios.get("https://real-time-finance-data.p.rapidapi.com/stock-overview", {
                    params: { symbol: `${symbol}:NSE`, language: "en" },
                    headers: {
                        "x-rapidapi-host": host,
                        "x-rapidapi-key": key,
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
    if (!req.user) {
        return res.redirect("/login");
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

const handleDashbord = async (req, res) => {
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
