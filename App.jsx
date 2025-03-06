import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import {
  Container,
  Typography,
  Autocomplete,
  TextField,
  Card,
  CardContent,
  CircularProgress,
  Box,
  Grid,
  Paper,
} from "@mui/material";
import { green, red } from "@mui/material/colors";

const socket = io("http://localhost:5000");

const App = () => {
  const [niftyStocks, setNiftyStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState("RELIANCE.NS");
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/nifty500.json")
      .then((res) => res.json())
      .then((data) => setNiftyStocks(data));

    socket.emit("selectStock", selectedStock);

    socket.on("stockUpdate", (data) => {
      if (data.symbol === selectedStock) {
        setStockData((prevData) => [...prevData.slice(-50), data]); // Store last 50 updates
      }
    });

    return () => socket.off("stockUpdate");
  }, [selectedStock]);

  const handleStockSelect = (event, newValue) => {
    setLoading(true);
    setSelectedStock(newValue);
    socket.emit("selectStock", newValue);
    setLoading(false);
  };

  const renderPriceChange = (percentChange) => {
    const color = percentChange >= 0 ? green[500] : red[500];
    return (
      <Typography
        variant="h6"
        style={{ color, fontWeight: "bold" }}
      >
        {percentChange}%
      </Typography>
    );
  };

  return (
    <Container style={{ textAlign: "center", padding: "20px" }}>
      <Typography variant="h4" gutterBottom>
        NIFTY 500 Real-Time Stock Updates 📊
      </Typography>

      {/* Searchable Autocomplete for Stock Selection */}
      <Autocomplete
        value={selectedStock}
        onChange={handleStockSelect}
        options={niftyStocks}
        getOptionLabel={(option) => option}
        style={{ marginBottom: 20, width: "100%", maxWidth: 500, margin: "0 auto" }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Stock"
            variant="outlined"
            fullWidth
            InputProps={{
              ...params.InputProps,
              endAdornment: loading ? (
                <CircularProgress color="inherit" size={24} />
              ) : null,
            }}
          />
        )}
      />

      {/* Stock Information Card */}
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                {selectedStock}
              </Typography>
              <Typography variant="h6">
                Price: ${stockData[stockData.length - 1]?.price || "Loading..."}
              </Typography>
              {renderPriceChange(stockData[stockData.length - 1]?.percentChange || 0)}
              <Typography variant="h6">
                Volume: {stockData[stockData.length - 1]?.volume || "Loading..."}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Price Trend Line Chart */}
        <Grid item xs={12} sm={6} md={8}>
          <Paper elevation={3} style={{ padding: "20px" }}>
            <Typography variant="h5">Price Trend</Typography>
            <LineChart width={800} height={400} data={stockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={["auto", "auto"]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#8884d8"
                strokeWidth={2}
                activeDot={{ r: 8 }}
                animationDuration={1500}
              />
            </LineChart>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default App;
