import { useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import * as spore from "@ckb-ccc/spore";

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
  const [xudtBalance, setXudtBalance] = useState<string | null>(null);
  const [xudtLoading, setXudtLoading] = useState(false);
  const [xudtIssueLoading, setXudtIssueLoading] = useState(false);
  const [xudtIssueTxHash, setXudtIssueTxHash] =
    useState<string | null>(null);
  const [xudtReceiver, setXudtReceiver] = useState("");
  const [xudtAmount, setXudtAmount] = useState("");
  const [xudtQueryAddress, setXudtQueryAddress] = useState("");
  const [sporeContent, setSporeContent] = useState("Hello CKB Spore!");
  const [sporeLoading, setSporeLoading] = useState(false);
  const [sporeTxHash, setSporeTxHash] = useState("");
  const [sporeId, setSporeId] = useState("");
  const [sporeReceiver, setSporeReceiver] = useState("");
  const [sporeTransferLoading, setSporeTransferLoading] =
    useState(false);
  const [sporeMeltLoading, setSporeMeltLoading] =
    useState(false);
  const [signMessage, setSignMessage] = useState("Hello CKB!");
  const [messageSignature, setMessageSignature] =
    useState<any>(null);
  const [messageVerifyResult, setMessageVerifyResult] = useState("");
  const [appTxHistory, setAppTxHistory] = useState<
    {
      txHash: string;
      type: string;
      timestamp: string;
      status: string;
      detail?: string;
    }[]
  >(() => {
    const savedHistory =
      localStorage.getItem("appTxHistory");

    return savedHistory
      ? JSON.parse(savedHistory)
      : [];
  });

  // Get CKB address
  useEffect(() => {

    console.log(
      "KnownScript OutputTypeProxyLock:",
      ccc.KnownScript.OutputTypeProxyLock
    );

    console.log(
      "KnownScript TypeId:",
      ccc.KnownScript.TypeId
    );

    console.log(
      "KnownScript XUdt:",
      ccc.KnownScript.XUdt
    );

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

  useEffect(() => {
    localStorage.setItem(
      "appTxHistory",
      JSON.stringify(appTxHistory),
    );
  }, [appTxHistory]);

  async function mintNewXudt() {
    if (!signer) return;

    try {
      // =========================================================
      // 1. Get Type ID Cell
      // =========================================================

      const typeIdCell = await signer.client.getCellLive(
        {
          txHash:
            "0x63b330fff9df73da688c238f11d18d9a482f8d7e2990e5811b5ba9d4b10063a6",
          index: 0,
        },
        true,
      );

      if (!typeIdCell) {
        throw new Error("Type ID Cell is not live");
      }

      console.log("Type ID Cell:", typeIdCell);

      // =========================================================
      // 2. Get Owner Cell
      // =========================================================

      const ownerCell = await signer.client.getCellLive(
        {
          txHash:
            "0x4f524e5fea099c73e8bfa4c2dc8b042dccebcc17c49cf1586a36a033ff580cd0",
          index: 0,
        },
        true,
      );

      if (!ownerCell) {
        throw new Error("Owner Cell is not live");
      }

      console.log("Owner Cell:", ownerCell);

      // =========================================================
      // 3. Re-create Type ID Script
      // =========================================================

      const typeIdArgs =
        "0x552ba96191994b6942aa55f0d210f5e8319bf7dc4310435ac3d0faa668c22feb";

      const typeIdScript = await ccc.Script.fromKnownScript(
        signer.client,
        ccc.KnownScript.TypeId,
        typeIdArgs,
      );

      console.log("Type ID Script:", typeIdScript);

      // =========================================================
      // 4. Create Output Type Proxy Lock
      // =========================================================

      const outputTypeLock =
        await ccc.Script.fromKnownScript(
          signer.client,
          ccc.KnownScript.OutputTypeProxyLock,
          typeIdScript.hash(),
        );

      console.log(
        "Output Type Proxy Lock:",
        outputTypeLock,
      );

      // Inspect KnownScript information
      const proxyLockInfo =
        await signer.client.getKnownScript(
          ccc.KnownScript.OutputTypeProxyLock,
        );

      console.log(
        "===== OUTPUT TYPE PROXY LOCK INFO =====",
      );

      console.log(
        "codeHash:",
        proxyLockInfo.codeHash,
      );

      console.log(
        "hashType:",
        proxyLockInfo.hashType,
      );

      console.log(
        "cellDeps:",
        proxyLockInfo.cellDeps,
      );

      // =========================================================
      // 5. Create new xUDT Type Script
      // =========================================================

      const xudtType = await ccc.Script.fromKnownScript(
        signer.client,
        ccc.KnownScript.XUdt,
        outputTypeLock.hash(),
      );

      console.log(
        "xUDT Type Script:",
        xudtType,
      );

      // =========================================================
      // 6. Get xUDT code dependency
      // =========================================================

      const xudtKnownScript =
        await signer.client.getKnownScript(
          ccc.KnownScript.XUdt,
        );

      const xudtCodeDeps =
        await signer.client.getCellDeps(
          xudtKnownScript.cellDeps,
        );

      const code =
        xudtCodeDeps[0].outPoint;

      console.log(
        "xUDT code dependency:",
        code,
      );

      const udt = new ccc.udt.Udt(
        code,
        xudtType,
      );

      // =========================================================
      // 7. Get receiver
      // =========================================================

      const { script: receiverLock } =
        await signer.getRecommendedAddressObj();

      console.log(
        "Receiver Lock:",
        receiverLock,
      );

      // =========================================================
      // 8. Create base transaction
      //
      // Input #0 = Type ID Cell
      // Input #1 = Owner Cell
      //
      // Output #0 = Type ID Cell
      // =========================================================

      const tx = ccc.Transaction.from({
        inputs: [
          {
            previousOutput:
              typeIdCell.outPoint,
          },
          {
            previousOutput:
              ownerCell.outPoint,
          },
        ],

        outputs: [
          typeIdCell.cellOutput,
        ],

        outputsData: [
          typeIdCell.outputData,
        ],
      });

      console.log(
        "===== BASE MINT TX =====",
      );

      console.log(tx);

      // =========================================================
      // 9. Mint 100 xUDT
      //
      // 8 decimals:
      //
      // 100 xUDT
      // = 100 * 10^8
      // = 10,000,000,000 raw units
      // =========================================================

      const { res: mintTx } =
        await udt.mint(
          signer,
          [
            {
              to: receiverLock,
              amount: 10_000_000_000n,
            },
          ],
          tx,
        );

      console.log(
        "===== AFTER UDT.MINT =====",
      );

      console.log(
        "Mint TX:",
        mintTx,
      );

      // =========================================================
      // 9.1 Add OutputTypeProxyLock dependency
      //
      // Input #1 is Owner Cell.
      //
      // Owner Cell uses:
      // OutputTypeProxyLock
      //
      // Therefore the mint transaction must contain
      // the code dependency of OutputTypeProxyLock.
      // =========================================================

      await mintTx.addCellDepsOfKnownScripts(
        signer.client,
        ccc.KnownScript.OutputTypeProxyLock,
      );

      console.log(
        "===== AFTER ADD OUTPUT TYPE PROXY LOCK DEP =====",
      );

      console.log(
        "Cell Deps:",
        mintTx.cellDeps,
      );

      // =========================================================
      // 10. Complete CKB capacity
      // =========================================================

      await mintTx.completeInputsByCapacity(
        signer,
      );

      console.log(
        "===== AFTER COMPLETE CAPACITY =====",
      );

      console.log(
        "Inputs:",
        mintTx.inputs,
      );

      console.log(
        "Outputs:",
        mintTx.outputs,
      );

      // =========================================================
      // 11. Complete transaction fee
      // =========================================================

      await mintTx.completeFeeBy(
        signer,
      );


      console.log(
        "===== AFTER COMPLETE FEE =====",
      );

      console.log(
        "Inputs:",
        mintTx.inputs,
      );

      console.log(
        "Outputs:",
        mintTx.outputs,
      );

      console.log(
        "Outputs Data:",
        mintTx.outputsData,
      );

      console.log(
        "Cell Deps:",
        mintTx.cellDeps,
      );

      // =========================================================
      // 12. FINAL TRANSACTION
      //
      // DO NOT BROADCAST YET
      // =========================================================

      console.log(
        "====================================",
      );

      console.log(
        "===== FINAL MINT TRANSACTION =====",
      );

      console.log(
        "Inputs:",
        mintTx.inputs,
      );

      console.log(
        "Outputs:",
        mintTx.outputs,
      );

      console.log(
        "Outputs Data:",
        mintTx.outputsData,
      );

      console.log(
        "Cell Deps:",
        mintTx.cellDeps,
      );

      console.log(
        "====================================",
      );

      // =========================================================
      // IMPORTANT:
      // Tạm thời chưa broadcast
      // =========================================================
      const txHash = await signer.sendTransaction(mintTx);

      console.log("===== xUDT MINT SUCCESS =====");
      console.log("Mint TX Hash:", txHash);
      const confirmed =
        await signer.client.waitTransaction(
          txHash,
          1,
        );

      console.log("===== MINT TX CONFIRMED =====");
      console.log(confirmed);
      const txStatus =
        await signer.client.getTransaction(txHash);

      console.log(
        "===== MINT TX STATUS =====",
        txStatus,
      );

      alert(
        `100 xUDT minted successfully!\n\nTX Hash: ${txHash}`,
      );

    } catch (error) {
      console.error(
        "Mint xUDT failed:",
        error,
      );
    }
  }

  async function inspectNewXudt() {
    if (!signer) return;

    try {
      const typeIdArgs =
        "0x552ba96191994b6942aa55f0d210f5e8319bf7dc4310435ac3d0faa668c22feb";

      // Type ID Script
      const typeIdScript = await ccc.Script.fromKnownScript(
        signer.client,
        ccc.KnownScript.TypeId,
        typeIdArgs,
      );

      console.log("Type ID Script:", typeIdScript);

      // The Type ID Script hash identifies this xUDT.
      const xudtTypeArgs = typeIdScript.hash();

      console.log("New xUDT Type Args:", xudtTypeArgs);

      // xUDT Type Script
      const xudtType = await ccc.Script.fromKnownScript(
        signer.client,
        ccc.KnownScript.XUdt,
        xudtTypeArgs,
      );

      console.log("New xUDT Type Script:", xudtType);

    } catch (error) {
      console.error("Inspect new xUDT failed:", error);
    }
  }

  async function createXudtOwnerCell() {
    if (!signer) return;

    try {
      const typeIdArgs =
        "0x552ba96191994b6942aa55f0d210f5e8319bf7dc4310435ac3d0faa668c22feb";

      // Create Type ID Script
      const typeIdScript = await ccc.Script.fromKnownScript(
        signer.client,
        ccc.KnownScript.TypeId,
        typeIdArgs,
      );

      console.log("Type ID Script:", typeIdScript);

      // Create Output Type Proxy Lock
      const outputTypeLock =
        await ccc.Script.fromKnownScript(
          signer.client,
          ccc.KnownScript.OutputTypeProxyLock,
          typeIdScript.hash(),
        );

      console.log("Output Type Proxy Lock:", outputTypeLock);

      // Create Owner Cell
      const tx = ccc.Transaction.from({
        outputs: [
          {
            lock: outputTypeLock,
          },
        ],
      });

      console.log("Owner Cell TX before inputs:", tx);

      await tx.completeInputsByCapacity(signer);

      console.log("Owner Cell TX after inputs:", tx);

      await tx.completeFeeBy(signer);


      console.log("Owner Cell TX after fee:", tx);

      const txHash = await signer.sendTransaction(tx);

      console.log("Owner Cell TX Hash:", txHash);

      // IMPORTANT:
      // We only build for now.
      // Do NOT broadcast yet.
    } catch (error) {
      console.error("Create xUDT Owner Cell failed:", error);
    }
  }

  async function createTypeId() {
    if (!signer) return;

    try {
      const result = await ccc.typeId.createTypeId({
        signer,
        data: "0x",
      });

      console.log("===== TYPE ID =====");
      console.log("Type ID:", result.id);
      console.log("Output index:", result.index);
      console.log("Transaction:", result.tx);
      console.log(
        "Type ID output:",
        result.tx.outputs[result.index],
      );

      // Complete fee
      await result.tx.completeFeeBy(signer);

      console.log("Transaction after fee:", result.tx);

      // Broadcast
      const txHash = await signer.sendTransaction(result.tx);

      console.log("Type ID TX Hash:", txHash);

      alert(
        `Type ID created successfully!\n\n` +
        `Type ID: ${result.id}\n\n` +
        `TX Hash: ${txHash}`,
      );

    } catch (error) {
      console.error("Create Type ID failed:", error);

      alert(
        `Create Type ID failed:\n${String(error)}`,
      );
    }
  }
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
      const allTransactions: {
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
        allTransactions.push({
          txHash: txRecord.txHash,
          blockNumber: txRecord.blockNumber.toString(),
        });
      }

      // Sort by block number: newest first
      allTransactions.sort(
        (a, b) =>
          Number(b.blockNumber) - Number(a.blockNumber),
      );

      // Keep latest 10 transactions
      const foundTransactions =
        allTransactions.slice(0, 10);

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

  async function transferXudt() {
    if (!signer) return;

    try {
      // =========================================================
      // 1. xUDT Type Script
      // =========================================================

      const xudtArgs =
        "0xe7b4dfefe01e736895142578e00996e9649f204b05ef1c4cae88d8f4b42b984b";

      const xudtType = await ccc.Script.fromKnownScript(
        signer.client,
        ccc.KnownScript.XUdt,
        xudtArgs,
      );

      // =========================================================
      // 2. Get xUDT code dependency
      // =========================================================

      const xudtKnownScript =
        await signer.client.getKnownScript(
          ccc.KnownScript.XUdt,
        );

      const xudtCodeDeps =
        await signer.client.getCellDeps(
          xudtKnownScript.cellDeps,
        );

      const code =
        xudtCodeDeps[0].outPoint;

      const udt = new ccc.udt.Udt(
        code,
        xudtType,
      );

      // =========================================================
      // 3. Convert receiver address -> Lock Script
      // =========================================================

      const { script: receiverLock } =
        await ccc.Address.fromString(
          xudtReceiver,
          signer.client,
        );

      // =========================================================
      // 4. Convert amount
      //
      // xUDT has 8 decimals
      //
      // Example:
      // "20" xUDT
      // -> 2,000,000,000 raw units
      // =========================================================

      const amount =
        BigInt(xudtAmount) * 100_000_000n;

      // =========================================================
      // 5. Create xUDT transfer transaction
      // =========================================================

      const { res: tx } =
        await udt.transfer(
          signer,
          [
            {
              to: receiverLock,
              amount,
            },
          ],
        );

      console.log(
        "===== AFTER UDT.TRANSFER =====",
      );

      console.log(tx);

      // =========================================================
      // 6. Collect xUDT inputs + create xUDT change
      // =========================================================

      await udt.completeBy(
        tx,
        signer,
      );

      // =========================================================
      // 7. Complete CKB capacity
      // =========================================================

      await tx.completeInputsByCapacity(
        signer,
      );

      // =========================================================
      // 8. Complete transaction fee
      // =========================================================

      await tx.completeFeeBy(
        signer,
      );

      // =========================================================
      // 9. Send transaction
      // =========================================================

      const txHash =
        await signer.sendTransaction(tx);

      console.log(
        "===== xUDT TRANSFER SUCCESS =====",
      );

      console.log(
        "Transfer TX Hash:",
        txHash,
      );

      const transferTx = await signer.client.getTransaction(txHash);

      console.log(
        "===== TRANSFER TX OUTPUT #0 =====",
      );

      console.log(
        "Output #0:",
        transferTx?.transaction.outputs[0],
      );

      console.log(
        "OutputData #0:",
        transferTx?.transaction.outputsData[0],
      );

      alert(
        `${xudtAmount} xUDT transferred successfully!\n\nTX Hash: ${txHash}`,
      );

    } catch (error) {
      console.error(
        "xUDT transfer failed:",
        error,
      );
    }
  }

  async function createSpore() {
    if (!signer) return;

    setSporeLoading(true);

    try {
      const { tx, id } = await spore.createSpore({
        signer,
        data: {
          contentType: "text/plain",
          content: new TextEncoder().encode(
            sporeContent,
          ),
        },
      });

      console.log("===== SPORE CREATED =====");
      console.log("Spore ID:", id);
      setSporeId(id);
      console.log("Transaction:", tx);

      await tx.completeInputsByCapacity(
        signer,
      );

      await tx.completeFeeBy(
        signer,
      );

      const txHash =
        await signer.sendTransaction(tx);

      setAppTxHistory((prev) => {
        const exists = prev.some(
          (item) => item.txHash === txHash,
        );

        if (exists) {
          return prev;
        }

        return [
          {
            txHash,
            type: "Spore",
            timestamp: new Date().toLocaleString(),
            status: "submitted",
            detail: "Create Spore",
          },
          ...prev,
        ];
      });

      console.log(
        "===== SPORE TRANSACTION SUCCESS =====",
      );

      console.log(
        "Spore ID:",
        id,
      );

      console.log(
        "Spore TX Hash:",
        txHash,
      );

      const sporeTx =
        await signer.client.getTransaction(txHash);

      console.log("===== SPORE TX =====");
      console.log("Status:", sporeTx?.status);

      if (sporeTx?.status) {
        setAppTxHistory((prev) =>
          prev.map((item) =>
            item.txHash === txHash
              ? {
                ...item,
                status: sporeTx.status,
              }
              : item,
          ),
        );
      }

      waitForTransactionStatus(txHash).catch(
        (error) =>
          console.error(
            "Failed to track transaction:",
            error,
          ),
      );

      console.log(
        "Outputs:",
        sporeTx?.transaction?.outputs,
      );
      console.log(
        "Outputs Data:",
        sporeTx?.transaction?.outputsData,
      );

      alert(
        `Spore created successfully!\n\nSpore ID: ${id}\n\nTX Hash: ${txHash}`,
      );
    } catch (error) {
      console.error(
        "Failed to create Spore:",
        error,
      );
    } finally {
      setSporeLoading(false);
    }
  }

  async function transferSpore() {
    if (!signer || !sporeId || !sporeReceiver) return;

    setSporeTransferLoading(true);

    try {
      const { script: receiverLock } =
        await ccc.Address.fromString(
          sporeReceiver,
          signer.client,
        );

      console.log("===== SPORE TRANSFER =====");
      console.log("Spore ID:", sporeId);
      console.log("Receiver:", sporeReceiver);
      console.log("Receiver Lock:", receiverLock);

      const { tx } = await spore.transferSpore({
        signer,
        id: sporeId,
        to: receiverLock,
      });

      console.log(
        "Transfer transaction before completion:",
        tx,
      );

      await tx.completeInputsByCapacity(
        signer,
      );

      await tx.completeFeeBy(
        signer,
      );

      const txHash =
        await signer.sendTransaction(tx);

      console.log(
        "===== SPORE TRANSFER SUCCESS =====",
      );

      console.log("Spore ID:", sporeId);
      console.log("Transfer TX Hash:", txHash);

      setAppTxHistory((prev) => {
        const exists = prev.some(
          (item) => item.txHash === txHash,
        );

        if (exists) {
          return prev;
        }

        return [
          {
            txHash,
            type: "Spore",
            timestamp: new Date().toLocaleString(),
            status: "submitted",
            detail: "Transfer Spore",
          },
          ...prev,
        ];
      });

      await waitForTransactionStatus(txHash);

      alert(
        `Spore transferred successfully!\n\nSpore ID: ${sporeId}\n\nTX Hash: ${txHash}`,
      );
    } catch (error) {
      console.error(
        "Failed to transfer Spore:",
        error,
      );
    } finally {
      setSporeTransferLoading(false);
    }
  }

  async function meltSpore() {
    if (!signer || !sporeId) return;

    setSporeMeltLoading(true);

    try {
      console.log("===== SPORE MELT =====");
      console.log("Spore ID:", sporeId);

      const { tx } = await spore.meltSpore({
        signer,
        id: sporeId,
      });

      console.log(
        "Melt transaction before completion:",
        tx,
      );

      await tx.completeFeeBy(signer);

      console.log(
        "Melt transaction before signing:",
        tx,
      );

      const signedTx =
        await signer.signTransaction(tx);

      console.log(
        "Signed Melt transaction:",
        signedTx,
      );

      const txHash =
        await signer.client.sendTransaction(
          signedTx,
        );

      console.log(
        "===== SPORE MELT SUCCESS =====",
      );

      console.log(
        "Spore ID:",
        sporeId,
      );

      console.log(
        "Melt TX Hash:",
        txHash,
      );

      setAppTxHistory((prev) => {
        const exists = prev.some(
          (item) => item.txHash === txHash,
        );

        if (exists) {
          return prev;
        }

        return [
          {
            txHash,
            type: "Spore",
            timestamp: new Date().toLocaleString(),
            status: "submitted",
            detail: "Melt Spore",
          },
          ...prev,
        ];
      });

      await waitForTransactionStatus(
        txHash,
      );

      alert(
        `Spore melted successfully!\n\nSpore ID: ${sporeId}\n\nTX Hash: ${txHash}`,
      );
    } catch (error) {
      console.error(
        "Failed to melt Spore:",
        error,
      );
    } finally {
      setSporeMeltLoading(false);
    }
  }

  async function waitForTransactionStatus(
    txHash: string,
  ) {
    if (!signer) return;

    for (let i = 0; i < 20; i++) {
      try {
        const txInfo =
          await signer.client.getTransaction(txHash);

        const status = txInfo?.status;

        console.log(
          `Transaction check ${i + 1}:`,
          status,
        );

        if (status === "committed") {
          setAppTxHistory((prev) =>
            prev.map((item) =>
              item.txHash === txHash
                ? {
                  ...item,
                  status: "committed",
                }
                : item,
            ),
          );

          await refreshBlockchainData();

          return;
        }
      } catch (error) {
        console.error(
          `Transaction check ${i + 1} failed:`,
          error,
        );
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 3000),
      );
    }

    setAppTxHistory((prev) =>
      prev.map((item) =>
        item.txHash === txHash
          ? {
            ...item,
            status: "pending",
          }
          : item,
      ),
    );
  }

  async function readSpore() {
    if (!signer || !sporeTxHash) return;

    try {
      const sporeTx =
        await signer.client.getTransaction(
          sporeTxHash,
        );

      console.log("===== READ SPORE =====");

      console.log(
        "Transaction Status:",
        sporeTx?.status,
      );

      console.log(
        "Outputs:",
        sporeTx?.transaction?.outputs,
      );

      console.log(
        "Outputs Data:",
        sporeTx?.transaction?.outputsData,
      );


      const data =
        sporeTx?.transaction?.outputsData?.[0];

      if (data) {
        const hex = data.startsWith("0x")
          ? data.slice(2)
          : data;

        const bytes = Uint8Array.from(
          hex.match(/.{1,2}/g)!.map((byte) =>
            parseInt(byte, 16),
          ),
        );

        const view = new DataView(
          bytes.buffer,
        );

        // SporeData molecule offsets
        const contentTypeOffset =
          view.getUint32(4, true);

        const contentOffset =
          view.getUint32(8, true);

        // Bytes length is stored at the offset
        const contentTypeLength =
          view.getUint32(
            contentTypeOffset,
            true,
          );

        const contentLength =
          view.getUint32(
            contentOffset,
            true,
          );

        const contentTypeBytes =
          bytes.slice(
            contentTypeOffset + 4,
            contentTypeOffset +
            4 +
            contentTypeLength,
          );

        const contentBytes =
          bytes.slice(
            contentOffset + 4,
            contentOffset +
            4 +
            contentLength,
          );

        const contentType =
          new TextDecoder().decode(
            contentTypeBytes,
          );

        const content =
          new TextDecoder().decode(
            contentBytes,
          );

        console.log(
          "Spore Content Type:",
          contentType,
        );

        console.log(
          "Spore Content:",
          content,
        );
      }

    } catch (error) {
      console.error(
        "Failed to read Spore:",
        error,
      );
    }
  }

  async function signMessageText() {
    if (!signer) return;

    try {
      const result =
        await signer.signMessage(
          signMessage,
        );

      console.log("===== MESSAGE SIGNED =====");
      console.log("Message:", signMessage);
      console.log("Signature:", result);

      setMessageSignature(result);
      console.log(
        "Signature string:",
        result.signature,
      );
    } catch (error) {
      console.error(
        "Failed to sign message:",
        error,
      );
    }
  }

  async function verifyMessageText() {
    if (!messageSignature) return;

    try {
      const signature = messageSignature;

      const isValid =
        await ccc.Signer.verifyMessage(
          signMessage,
          signature,
        );

      console.log(
        "===== MESSAGE VERIFIED =====",
      );

      console.log(
        "Message:",
        signMessage,
      );

      console.log(
        "Verification result:",
        isValid,
      );

      setMessageVerifyResult(
        isValid
          ? "Valid signature ✅"
          : "Invalid signature ❌",
      );
    } catch (error) {
      console.error(
        "Failed to verify message:",
        error,
      );

      setMessageVerifyResult(
        "Verification failed ❌",
      );
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

  function decodeUdtAmount(data: string): bigint {
    const hex = data.startsWith("0x")
      ? data.slice(2)
      : data;

    const bytes = hex.match(/.{2}/g) ?? [];

    let result = 0n;

    for (let i = 0; i < bytes.length; i++) {
      result +=
        BigInt(`0x${bytes[i]}`) <<
        BigInt(8 * i);
    }

    return result;
  }

  function formatUdtAmount(
    amount: bigint,
    decimals: number,
  ): string {
    const divisor = 10n ** BigInt(decimals);

    const whole = amount / divisor;
    const fraction = amount % divisor;

    if (fraction === 0n) {
      return whole.toString();
    }

    return `${whole}.${fraction
      .toString()
      .padStart(decimals, "0")
      .replace(/0+$/, "")}`;
  }

  async function refreshXudtBalance() {
    if (!signer) return;

    setXudtLoading(true);

    try {
      // =========================================================
      // 1. xUDT Type Args của token mới
      //
      // Đây là:
      // hash(OutputTypeProxyLock)
      //
      // Type ID:
      // 0x552ba961...
      //
      // OutputTypeProxyLock hash:
      // 0x44c825...
      // =========================================================

      const xudtArgs =
        "0xe7b4dfefe01e736895142578e00996e9649f204b05ef1c4cae88d8f4b42b984b";

      // =========================================================
      // 2. Re-create xUDT Type Script
      // =========================================================

      const type = await ccc.Script.fromKnownScript(
        signer.client,
        ccc.KnownScript.XUdt,
        xudtArgs,
      );

      const testCell = await signer.client.getCellLive(
        {
          txHash:
            "0xebfc1fe4a90ce9fd54330b1df8e9b7ced475b6f0d269e1a78adf785c0a9aeb8d",
          index: 1,
        },
        true,
      );

      console.log("===== MINTED xUDT CELL DIRECT CHECK =====");
      console.log("Cell:", testCell);

      console.log("===== NEW xUDT TYPE SCRIPT =====");
      console.log("Code Hash:", type.codeHash);
      console.log("Hash Type:", type.hashType);
      console.log("Args:", type.args);
      console.log("Type Hash:", type.hash());

      // =========================================================
      // 3. Get current wallet address
      // =========================================================

      const currentAddress =
        xudtQueryAddress ||
        await signer.getRecommendedAddress();

      console.log(
        "Current wallet address:",
        currentAddress,
      );

      // =========================================================
      // 4. Convert address -> Lock Script
      // =========================================================

      const { script: lock } =
        await ccc.Address.fromString(
          currentAddress,
          signer.client,
        );

      console.log("===== ADDRESS LOCK =====");
      console.log(lock);
      console.log(
        "Wallet Lock Hash:",
        lock.hash(),
      );

      // =========================================================
      // 5. Find all Live Cells of this xUDT type
      // =========================================================

      let totalAmount = 0n;
      let totalCells = 0;
      let myCells = 0;

      for await (
        const cell of signer.client.findCells(
          {
            script: type,
            scriptType: "type",
            scriptSearchMode: "exact",
          },
          "asc",
          100,
        )
      ) {
        totalCells++;

        // =======================================================
        // 6. Check whether this Cell belongs to current wallet
        // =======================================================

        if (
          cell.cellOutput.lock.hash() ===
          lock.hash()
        ) {
          myCells++;

          const amount =
            decodeUdtAmount(
              cell.outputData,
            );

          totalAmount += amount;

        }
      }

      // =========================================================
      // 7. Summary
      // =========================================================

      console.log(
        "====================================",
      );

      console.log(
        "Total new xUDT cells:",
        totalCells,
      );

      const mintTx = await signer.client.getTransaction(
        "0xebfc1fe4a90ce9fd54330b1df8e9b7ced475b6f0d269e1a78adf785c0a9aeb8d",
      );

      console.log("===== MINT TX OUTPUTS =====");
      console.log(mintTx?.transaction?.outputs);
      console.log("===== MINT TX OUTPUTS DATA =====");
      console.log(mintTx?.transaction?.outputsData);

      console.log(
        "My new xUDT cells:",
        myCells,
      );

      console.log(
        "Total raw xUDT amount:",
        totalAmount.toString(),
      );

      // =========================================================
      // 8. Format balance
      //
      // 8 decimals:
      //
      // 10,000,000,000 raw
      // = 100.00000000 xUDT
      // =========================================================

      const formattedAmount =
        formatUdtAmount(
          totalAmount,
          8,
        );

      console.log(
        "Formatted new xUDT amount:",
        formattedAmount,
      );

      // =========================================================
      // 9. Update UI
      // =========================================================

      setXudtBalance(
        formattedAmount,
      );

    } catch (error) {
      console.error(
        "Failed to query new xUDT balance:",
        error,
      );
    } finally {
      setXudtLoading(false);
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

  async function getBackendTransaction() {
    try {
      const txHash =
        "0x011798e6c17f0769d9755cce47aed5f4026880de09051795ee2d70a777f29a7b";

      const response = await fetch(
        `http://localhost:3000/api/ckb/transaction?txHash=${txHash}`,
      );

      if (!response.ok) {
        throw new Error("Backend transaction request failed");
      }

      const data = await response.json();

      console.log(
        "===== TRANSACTION FROM BACKEND =====",
      );

      console.log(
        "Transaction Hash:",
        data.txHash,
      );

      console.log(
        "Transaction Status:",
        data.status,
      );

      console.log(
        "Transaction:",
        data.transaction,
      );
    } catch (error) {
      console.error(
        "Failed to get transaction from backend:",
        error,
      );
    }
  }
  useEffect(() => {
    getBackendTransaction();
  }, []);

  // Automatically load blockchain data when signer changes
  useEffect(() => {
    if (!signer) {
      setBalance(null);
      setCells([]);
      setTransactions([]);
      setXudtBalance(null);
      return;
    }

    refreshBlockchainData();
    refreshXudtBalance();
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
          <section>
            <h2>App Transaction History</h2>

            {appTxHistory.length === 0 ? (
              <p>No app transactions yet.</p>
            ) : (
              <ul>
                {appTxHistory.map((item, index) => (
                  <li key={`${item.txHash}-${index}`}>
                    <p>
                      <strong>Type:</strong> {item.type}
                    </p>

                    <p>
                      <strong>Transaction Hash:</strong>{" "}
                      {item.txHash}
                    </p>

                    <p>
                      <strong>Time:</strong> {item.timestamp}
                    </p>

                    <p>
                      <strong>Status:</strong> {item.status}
                    </p>

                    {item.detail && (
                      <p>
                        <strong>Detail:</strong> {item.detail}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      <div>
        <strong>xUDT Balance:</strong>{" "}
        {xudtLoading
          ? "Loading..."
          : xudtBalance !== null
            ? `${xudtBalance} xUDT`
            : "-"}

        <div style={{ marginTop: "20px" }}>
          <h2>Issue xUDT</h2>

          <button
            onClick={createXudtOwnerCell}
            disabled={xudtIssueLoading}
          >
            {xudtIssueLoading
              ? "Creating Owner Cell..."
              : "Create xUDT Owner Cell"}
          </button>

          {xudtIssueTxHash && (
            <div
              style={{
                border: "1px solid #4caf50",
                padding: "15px",
                marginTop: "15px",
              }}
            >
              <p>
                <strong>
                  Owner Cell transaction sent!
                </strong>
              </p>

              <p style={{ wordBreak: "break-all" }}>
                TX Hash: {xudtIssueTxHash}
              </p>

              <a
                href={`https://testnet.explorer.nervos.org/transaction/${xudtIssueTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View transaction on CKB Testnet Explorer
              </a>
            </div>
          )}
        </div>
        <button
          onClick={createTypeId}
          disabled={!signer}
        >
          Create Type ID
        </button>
        <button
          onClick={mintNewXudt}
        >
          Mint New xUDT
        </button>

        <div
          style={{
            marginTop: "20px",
            padding: "16px",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <input
            type="text"
            placeholder="Address to check xUDT balance"
            value={xudtQueryAddress}
            onChange={(e) =>
              setXudtQueryAddress(e.target.value)
            }
            style={{
              width: "100%",
              padding: "8px",
              marginBottom: "10px",
            }}
          />
          <button
            onClick={refreshXudtBalance}
            disabled={!xudtQueryAddress || xudtLoading}
          >
            Check xUDT Balance
          </button>

          <h3>Transfer xUDT</h3>

          <input
            type="text"
            placeholder="Receiver CKB address"
            value={xudtReceiver}
            onChange={(e) =>
              setXudtReceiver(e.target.value)
            }
            style={{
              width: "100%",
              padding: "8px",
              marginBottom: "10px",
            }}
          />

          <input
            type="number"
            placeholder="Amount"
            value={xudtAmount}
            onChange={(e) =>
              setXudtAmount(e.target.value)
            }
            style={{
              width: "100%",
              padding: "8px",
              marginBottom: "10px",
            }}
          />

          <button
            onClick={transferXudt}
            disabled={
              !xudtReceiver ||
              !xudtAmount ||
              xudtLoading
            }
          >
            Transfer xUDT
          </button>

          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          >
            <h3>Create Spore</h3>

            <input
              type="text"
              placeholder="Spore content"
              value={sporeContent}
              onChange={(e) =>
                setSporeContent(e.target.value)
              }
              style={{
                width: "100%",
                padding: "8px",
                marginBottom: "10px",
              }}
            />

            <button
              onClick={createSpore}
              disabled={!sporeContent || sporeLoading}
            >
              Create Spore
            </button>
          </div>
          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          >
            <h3>Transfer Spore</h3>

            <input
              type="text"
              placeholder="Spore ID"
              value={sporeId}
              onChange={(e) =>
                setSporeId(e.target.value)
              }
              style={{
                width: "100%",
                marginBottom: "10px",
                padding: "8px",
              }}
            />

            <input
              type="text"
              placeholder="Receiver CKB Address"
              value={sporeReceiver}
              onChange={(e) =>
                setSporeReceiver(e.target.value)
              }
              style={{
                width: "100%",
                marginBottom: "10px",
                padding: "8px",
              }}
            />

            <button
              onClick={transferSpore}
              disabled={
                sporeTransferLoading ||
                !sporeId ||
                !sporeReceiver
              }
            >
              {sporeTransferLoading
                ? "Transferring..."
                : "Transfer Spore"}
            </button>
            <button
              onClick={meltSpore}
              disabled={
                sporeMeltLoading ||
                !sporeId
              }
              style={{
                marginTop: "10px",
              }}
            >
              {sporeMeltLoading
                ? "Melting..."
                : "Melt Spore"}
            </button>
          </div>
          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          >
            <h3>Sign Message</h3>

            <input
              type="text"
              placeholder="Message to sign"
              value={signMessage}
              onChange={(e) =>
                setSignMessage(e.target.value)
              }
              style={{
                width: "100%",
                padding: "8px",
                marginBottom: "10px",
              }}
            />

            <button
              onClick={signMessageText}
            >
              Sign Message
            </button>

            {messageSignature && (
              <p
                style={{
                  wordBreak: "break-all",
                  marginTop: "10px",
                }}
              >
                <strong>Signature:</strong>{" "}
                {messageSignature.signature}
              </p>
            )}
          </div>
          <button
            onClick={verifyMessageText}
            disabled={!messageSignature}
            style={{
              marginTop: "10px",
              marginLeft: "10px",
            }}
          >
            Verify Message
          </button>

          {messageVerifyResult && (
            <p style={{ marginTop: "10px" }}>
              <strong>{messageVerifyResult}</strong>
            </p>
          )}
          <button
            onClick={readSpore}
            disabled={!sporeTxHash}
            style={{
              marginLeft: "10px",
            }}
          >
            Read Spore
          </button>
          <input
            type="text"
            placeholder="Spore Transaction Hash"
            value={sporeTxHash}
            onChange={(e) =>
              setSporeTxHash(e.target.value)
            }
            style={{
              width: "100%",
              padding: "8px",
              marginBottom: "10px",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;