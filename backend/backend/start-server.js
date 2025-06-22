const express = require("express");
const app = express();
const PORT = process.env.PORT || 8082;

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "ITSM Backend API",
    version: "2.1.0"
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
