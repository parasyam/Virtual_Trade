
    const stocks = [
        
        { symbol: "ADANIENT", name: "Adani Enterprises" },
        { symbol: "ADANIPORTS", name: "Adani Ports" },
        { symbol: "APOLLOHOSP", name: "Apollo Hospitals" },
        { symbol: "ASIANPAINT", name: "Asian Paints" },
        { symbol: "AXISBANK", name: "Axis Bank" },
        { symbol: "BAJAJ-AUTO", name: "Bajaj Auto" },
        { symbol: "BAJFINANCE", name: "Bajaj Finance" },
        { symbol: "BAJAJFINSV", name: "Bajaj Finserv" },
        { symbol: "BPCL", name: "Bharat Petroleum" },
        { symbol: "BHARTIARTL", name: "Bharti Airtel" },
        { symbol: "BRITANNIA", name: "Britannia Industries" },
        { symbol: "CIPLA", name: "Cipla" },
        { symbol: "COALINDIA", name: "Coal India" },
        { symbol: "DIVISLAB", name: "Divis Laboratories" },
        { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories" },
        { symbol: "EICHERMOT", name: "Eicher Motors" },
        { symbol: "GRASIM", name: "Grasim Industries" },
        { symbol: "HCLTECH", name: "HCL Technologies" },
        { symbol: "HDFCBANK", name: "HDFC Bank" },
        { symbol: "HDFCLIFE", name: "HDFC Life" },
        { symbol: "HEROMOTOCO", name: "Hero MotoCorp" },
        { symbol: "HINDALCO", name: "Hindalco Industries" },
        { symbol: "HINDUNILVR", name: "Hindustan Unilever" },
        { symbol: "ICICIBANK", name: "ICICI Bank" },
        { symbol: "INFY", name: "Infosys" },
        { symbol: "ITC", name: "ITC Limited" },
        { symbol: "JSWSTEEL", name: "JSW Steel" },
        { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank" },
        { symbol: "LT", name: "Larsen & Toubro" },
        { symbol: "M&M", name: "Mahindra & Mahindra" },
        { symbol: "MARUTI", name: "Maruti Suzuki" },
        { symbol: "NESTLEIND", name: "Nestlé India" },
        { symbol: "NTPC", name: "NTPC Limited" },
        { symbol: "RELIANCE", name: "Reliance Industries" },
        { symbol: "SBIN", name: "State Bank of India" },
        { symbol: "TATAMOTORS", name: "Tata Motors" },
        { symbol: "TCS", name: "Tata Consultancy Services" },
        { symbol: "TECHM", name: "Tech Mahindra" },
        { symbol: "TITAN", name: "Titan Company" },
        { symbol: "ULTRACEMCO", name: "UltraTech Cement" }
    ];
    function filterStocks() {
            const input = document.getElementById('searchBox').value.toUpperCase();
            const suggestions = document.getElementById('suggestions');
            suggestions.innerHTML = "";
            if (input.length > 0) {
                const filteredStocks = stocks.filter(stock =>
                    stock.name.toUpperCase().includes(input) || stock.symbol.toUpperCase().includes(input)
                );
                filteredStocks.forEach(stock => {
                    const suggestionDiv = document.createElement('div');
                    suggestionDiv.textContent = `${stock.name} (${stock.symbol})`;
                    suggestionDiv.addEventListener('click', () => 
                    window.location.href = `/stock/${stock.symbol}`);
                    suggestions.appendChild(suggestionDiv);
                });
                suggestions.style.display = 'block';
            } else {
                suggestions.style.display = 'none';
            }
        }

     document.getElementById("addToportfolioBtn").addEventListener("click", function () {
         console.log("watch click");
    const stockData = JSON.parse(this.getAttribute("data-stock"));
    const stockName = stockData.symbol;
    const stockPrice = stockData.stockPrice;

    // Show the quantity input popup
    const quantityPopup = document.getElementById("quantityPopup");
    quantityPopup.style.display = "block";

    // Handle submit action
    document.getElementById("confirmQuantity").onclick = function () {
        const quantity = document.getElementById("quantityInput").value;

        if (!quantity || isNaN(quantity) || quantity <= 0) {
            alert("Please enter a valid quantity!");
            return;
        }

        fetch("/stock/AddPortfolio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stockName, stockPrice, quantity })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            quantityPopup.style.display = "none"; 
        })
        .catch(error => console.error("Error:", error));
    };
});


document.getElementById("addToWatchlistBtn").addEventListener("click", function () {
      console.log("Watchlist click");
      const stockData = JSON.parse(this.getAttribute("data-stock"));
      const stockName = stockData.symbol;

      // API call to add the stock to watchlist
      fetch("/stock/add-watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockSymbol: stockName })
        })
      .then(response => response.json())
      .then(data => {
          alert(data.message);  // Show success or error
      })
      .catch(error => console.error("Error adding to watchlist:", error));
  });

    document.addEventListener("DOMContentLoaded", function() {
        var ctx = document.getElementById('fdchart').getContext('2d');

        document.getElementById("but")?.addEventListener("click", function(){
            document.getElementById("result").style.display = "block";
        });

        document.getElementById("closing")?.addEventListener("click", function(){
            document.getElementById("div0").style.display = "none";
            document.getElementById("open").style.display = "block";
        });

        document.getElementById("open")?.addEventListener("click", function(){
            document.getElementById("div0").style.display = "block";
            document.getElementById("open").style.display = "none";
        });

      });


