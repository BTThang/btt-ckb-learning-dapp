const express = require("express");
const cors = require("cors");
const { ccc } = require("@ckb-ccc/ccc");

const app = express();
const port = 3000;

app.use(cors());

// Create CKB Testnet client
const client = new ccc.ClientPublicTestnet();

console.log("CKB Testnet client created!");

// API: Get latest CKB Testnet block
app.get("/api/ckb/tip", async (req, res) => {
  try {
    const tip = await client.getTip();

    res.json({
      blockNumber: tip.toString(),
    });
  } catch (error) {
    console.error("Failed to get latest block:", error);

    res.status(500).json({
      error: "Failed to get latest CKB block",
    });
  }
});

// API: Get CKB balance by address
app.get("/api/ckb/balance", async (req, res) => {
  try {
    const address = req.query.address;

    if (!address) {
      return res.status(400).json({
        error: "Address is required",
      });
    }

    const { script: lock } = await ccc.Address.fromString(
      address,
      client,
    );

    const balance = await client.getBalanceSingle(lock);

    res.json({
      address,
      balance: ccc.fixedPointToString(balance),
      unit: "CKB",
    });
  } catch (error) {
    console.error("Failed to get balance:", error);

    res.status(400).json({
      error: "Invalid address or failed to get balance",
    });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});