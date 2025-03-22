const express=require('express');
const router=express.Router();
const {cheackAuth}=require('../middleware/auth')

const { handleStockDetails, handleAddPortfolio, handlePortfolio,handlesellStock,handleAddWatchlist,handleGetWatchlist,handleRemoveWatchlist,handleDashbord} = require('../controllers/user');

router.post("/remove-watchlist",cheackAuth, handleRemoveWatchlist);
router.get('/leaderboard', cheackAuth, handleDashbord);
router.get('/portfolio', cheackAuth,handlePortfolio);
router.post('/AddPortfolio',cheackAuth,handleAddPortfolio);
router.post("/sell", cheackAuth, handlesellStock);
router.post("/add-watchlist", cheackAuth, handleAddWatchlist);
router.get("/get-watchlist", cheackAuth, handleGetWatchlist);


router.get('/:symbol',cheackAuth,handleStockDetails);

module.exports = router;