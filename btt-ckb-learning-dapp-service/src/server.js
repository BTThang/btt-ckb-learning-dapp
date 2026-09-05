const { ccc } = require("@ckb-ccc/ccc");

async function main() {
  console.log("CCC loaded successfully!");

  const client = new ccc.ClientPublicTestnet();

  console.log("CKB Testnet client created!");

  const tip = await client.getTip();

  console.log("Latest CKB Testnet block:", tip.toString());

  console.log("\nClient methods related to Cell:");

  console.log(
    Object.getOwnPropertyNames(
      Object.getPrototypeOf(client)
    ).filter((name) =>
      name.toLowerCase().includes("cell")
    )
  );
}

main().catch((error) => {
  console.error("Error:", error);
});