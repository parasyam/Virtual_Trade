const express=require('express');
const router=express.Router();
const {cheackAuth}=require('../middleware/auth')

const { handleStockDetails, handleAddPortfolio, handlePortfolio,handlesellStock } = require('../controllers/user');

router.get('/portfolio', cheackAuth,handlePortfolio);
router.get('/:symbol',cheackAuth,handleStockDetails);
router.post('/AddPortfolio',cheackAuth,handleAddPortfolio);
router.post("/sell",handlesellStock);
module.exports = router;