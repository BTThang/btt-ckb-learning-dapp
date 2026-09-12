import { useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";

function App() {
  const { open, wallet } = ccc.useCcc();
  const signer = ccc.useSigner();

  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [cells, setCells] = useState<ccc.Cell[]>([]);
  const [loading, setLoading] = useState(false);
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [transactions, setTransactions] = useState<
    {
      txHash: string;
      blockNumber: string;
    }[]
  >([]);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [backendBlock, setBackendBlock] = useState<string | null>(null);
  const [backendBalance, setBackendBalance] = useState<string | null>(null);

  // Get CKB address
  useEffect(() => {
    if (!signer) {
      setAddress(null);
      return;
    }

    let cancelled = false;

    signer
      .getRecommendedAddress()
      .then((addr) => {
        if (!cancelled) {
          setAddress(addr);
        }
      })
      .catch((error) => {
        console.error("Failed to get CKB address:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [signer]);

  // Refresh balance and Live Cells
  async function refreshBlockchainData() {
    if (!signer) {
      return;
    }

    const currentSigner = signer;

    setLoading(true);

    try {
      // Get balance
      const amount = await currentSigner.getBalance();

      setBalance(
        ccc.fixedPointToString(amount)
      );

      // Get Live Cells
      const { script: lock } =
        await currentSigner.getRecommendedAddressObj();

      const foundCells: ccc.Cell[] = [];

      for await (
        const cell of currentSigner.client.findCellsByLock(lock)
      ) {
        foundCells.push(cell);
      }

      setCells(foundCells);

      // Get transaction history
      const foundTransactions: {
        txHash: string;
        blockNumber: string;
      }[] = [];

      for await (
        const txRecord of currentSigner.client.findTransactionsByLock(
          lock,
          null,
          true,
        )
      ) {
        foundTransactions.push({
          txHash: txRecord.txHash,
          blockNumber: txRecord.blockNumber.toString(),
        });

        // Limit to latest 10 transactions
        if (foundTransactions.length >= 10) {
          break;
        }
      }

      setTransactions(foundTransactions);
    } catch (error) {
      console.error(
        "Failed to refresh blockchain data:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }
  // Send CKB transaction
  async function sendCkb() {
    if (!signer) return;

    if (!receiver.trim()) {
      alert("Please enter receiver address");
      return;
    }

    if (!amount.trim()) {
      alert("Please enter amount");
      return;
    }

    setSending(true);

    try {
      // 1. Convert receiver address to Lock Script
      const { script: lock } = await ccc.Address.fromString(
        receiver.trim(),
        signer.client,
      );

      // 2. Create transaction
      const tx = ccc.Transaction.from({
        outputs: [
          {
            capacity: ccc.fixedPointFrom(amount),
            lock,
          },
        ],
      });

      console.log("Transaction created:", tx);

      // 3. Find enough input Cells
      await tx.completeInputsByCapacity(signer);

      console.log("Inputs completed:", tx);

      // 4. Calculate fee and create change
      await tx.completeFeeBy(signer);

      console.log("Fee completed:", tx);

      // 5. Send transaction through wallet
      const txHash = await signer.sendTransaction(tx);

      console.log("Transaction sent:", txHash);

      setLastTxHash(txHash);

      alert(`Transaction sent!\nTX Hash: ${txHash}`);

      // 6. Clear form
      setReceiver("");
      setAmount("");

      // 7. Refresh balance, cells and transactions
      await refreshBlockchainData();
    } catch (error) {
      console.error("Failed to send CKB:", error);
      alert("Failed to send transaction. Check console for details.");
    } finally {
      setSending(false);
    }
  }

  async function getBackendTip() {
    try {
      const response = await fetch(
        "http://localhost:3000/api/ckb/tip",
      );

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data = await response.json();

      setBackendBlock(data.blockNumber);
    } catch (error) {
      console.error("Failed to get backend tip:", error);
    }
  }

  async function getBackendBalance() {
    if (!address) return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/ckb/balance?address=${encodeURIComponent(address)}`
      );

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data = await response.json();

      setBackendBalance(data.balance);
    } catch (error) {
      console.error("Failed to get balance from backend:", error);
    }
  }

  // Automatically load blockchain data when signer changes
  useEffect(() => {
    if (!signer) {
      setBalance(null);
      setCells([]);
      setTransactions([]);
      return;
    }

    refreshBlockchainData();
  }, [signer]);

  return (
    <div style={{ padding: "40px" }}>
      <h1>CKB Learning DApp</h1>

      {!wallet || !signer ? (
        <button onClick={open}>
          Connect Wallet
        </button>
      ) : (
        <div>
          <p>Wallet connected!</p>

          <p>
            Wallet: {wallet.name}
          </p>

          <p>
            Signer: {signer.constructor.name}
          </p>

          <p>
            Address: {address ?? "Loading..."}
          </p>

          <p>
            Balance:{" "}
            {balance !== null
              ? `${balance} CKB`
              : "Loading..."}
          </p>

          <button
            onClick={refreshBlockchainData}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button onClick={getBackendTip}>
            Get Latest Block from Backend
          </button>

          <button onClick={getBackendBalance}>
            Get Balance from Backend
          </button>

          {backendBlock && (
            <p>
              Latest CKB Testnet Block from Backend:{" "}
              {backendBlock}
            </p>
          )}

          {backendBalance && (
            <p>
              Balance from Backend: {backendBalance} CKB
            </p>
          )}

          <h2>Send CKB</h2>

          <div style={{ marginBottom: "10px" }}>
            <input
              type="text"
              placeholder="Receiver address"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              style={{ width: "500px", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <input
              type="number"
              placeholder="Amount (CKB)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: "200px", padding: "8px" }}
            />
          </div>

          <button onClick={sendCkb} disabled={sending}>
            {sending ? "Sending..." : "Send CKB"}
          </button>

          {lastTxHash && (
            <div
              style={{
                border: "1px solid #4caf50",
                padding: "15px",
                marginTop: "15px",
              }}
            >
              <p>
                <strong>Transaction sent successfully!</strong>
              </p>

              <p style={{ wordBreak: "break-all" }}>
                TX Hash: {lastTxHash}
              </p>

              <a
                href={`https://testnet.explorer.nervos.org/transaction/${lastTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View transaction on CKB Testnet Explorer
              </a>
            </div>
          )}

          <h2>Live Cells</h2>

          <p>
            Found {cells.length} Live Cell(s)
          </p>

          {cells.length === 0 ? (
            <p>No Live Cells found.</p>
          ) : (
            cells.map((cell, index) => (
              <div
                key={`${cell.outPoint.txHash}-${cell.outPoint.index}`}
                style={{
                  border: "1px solid #ccc",
                  padding: "15px",
                  marginTop: "10px",
                }}
              >
                <p>
                  <strong>Cell #{index}</strong>
                </p>

                <p>
                  OutPoint:{" "}
                  {cell.outPoint.txHash}:
                  {cell.outPoint.index}
                </p>

                <p>
                  Capacity:{" "}
                  {ccc.fixedPointToString(
                    cell.cellOutput.capacity
                  )}{" "}
                  CKB
                </p>

                <p>
                  Type Script:{" "}
                  {cell.cellOutput.type
                    ? "Yes"
                    : "None"}
                </p>

                <p>
                  Data: {cell.outputData}
                </p>
              </div>
            ))
          )}
          <h2>Transaction History</h2>

          <p>
            Found {transactions.length} Transaction(s)
          </p>

          {transactions.length === 0 ? (
            <p>No transactions found.</p>
          ) : (
            transactions.map((tx, index) => (
              <div
                key={tx.txHash}
                style={{
                  border: "1px solid #ccc",
                  padding: "15px",
                  marginTop: "10px",
                }}
              >
                <p>
                  <strong>Transaction #{index}</strong>
                </p>

                <p>
                  TX Hash: {tx.txHash}
                </p>

                <p>
                  Block: {tx.blockNumber}
                </p>
                <a
                  href={`https://testnet.explorer.nervos.org/transaction/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on CKB Testnet Explorer
                </a>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default App;