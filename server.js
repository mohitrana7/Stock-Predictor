require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
let lastPrices = {};
let NIFTY_STOCKS = [];

// Load NIFTY 500 stock symbols from a file
const loadNiftyStocks = () => {
  try {
    const data = fs.readFileSync("nifty500.json");
    NIFTY_STOCKS = JSON.parse(data);
    console.log(`Loaded ${NIFTY_STOCKS.length} NIFTY stocks`);
  } catch (error) {
    console.error("Error loading NIFTY stocks:", error);
  }
};

// Fetch stock price from Alpha Vantage API
const fetchStockPrice = async (symbol) => {
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${API_KEY}`
    );

    const timeSeries = response.data["Time Series (1min)"];
    if (!timeSeries) return null;

    const latestTime = Object.keys(timeSeries)[0];
    const latestData = timeSeries[latestTime];

    const price = parseFloat(latestData["1. open"]).toFixed(2);
    const volume = latestData["5. volume"];

    const prevPrice = lastPrices[symbol] || price;
    lastPrices[symbol] = price;

    const percentChange = (((price - prevPrice) / prevPrice) * 100).toFixed(2);

    return { symbol, price, percentChange, volume, timestamp: latestTime };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
};

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("selectStock", async (symbol) => {
    console.log(`User selected stock: ${symbol}`);
    const stockData = await fetchStockPrice(symbol);
    if (stockData) {
      socket.emit("stockUpdate", stockData);
    }
  });

  setInterval(async () => {
    const selectedStocks = NIFTY_STOCKS.slice(0, 5); // Fetch 5 stocks per minute to avoid rate limits
    for (let stock of selectedStocks) {
      const stockData = await fetchStockPrice(stock);
      if (stockData) {
        io.emit("stockUpdate", stockData);
      }
    }
  }, 60000); // Updates every minute

  socket.on("disconnect", () => console.log("Client disconnected"));
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  loadNiftyStocks();
});
