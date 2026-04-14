import { getGoldenStates } from "./src/tasks/agent/vectorDB.js";

async function checkChromaData() {
  const testSuiteId = "demo-amazon-macbook-001";
  console.log(`🔍 Querying Chroma DB for Test Suite: ${testSuiteId}\n`);
  
  try {
    const data = await getGoldenStates(testSuiteId);

    if (data.length === 0) {
      console.log("No golden states found in the database for this test suite.");
    } else {
      console.log(`✅ Found ${data.length} golden states stored in the Vector database:\n`);
      // We log safely, omitting long embeddings buffer to keep terminal output clean
      const displayData = data.map((item) => ({
        ...item,
        embedding: item.embedding ? `<vector data: ${item.embedding.length} dimensions>` : '<no embedding returned>',
      }));

      console.log(JSON.stringify(displayData, null, 2));
    }
  } catch (error) {
    console.error("❌ Failed to query database:", error);
  }
}

checkChromaData();
