/**
 * @notice Finds Gitcoin bulk checkout transactions that were Dai only, and for a given
 * number of donations per transaction, keeps the data point with the highest gasUsed per
 * number of donations, and plots the data. The resulting plotly dashboard is used to
 * generate a linear best-fit line.
 */

require("dotenv").config();

const { ethers } = require("ethers");
const plotly = require("plotly")(process.env.PLOTLY_USERNAME, process.env.PLOTLY_API_KEY);

const bulkCheckoutAbi = [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":true,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"address","name":"dest","type":"address"},{"indexed":true,"internalType":"address","name":"donor","type":"address"}],"name":"DonationSent","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":true,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"address","name":"dest","type":"address"}],"name":"TokenWithdrawn","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"inputs":[{"components":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address payable","name":"dest","type":"address"}],"internalType":"struct BulkCheckout.Donation[]","name":"_donations","type":"tuple[]"}],"name":"donate","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address payable","name":"_dest","type":"address"}],"name":"withdrawEther","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_tokenAddress","type":"address"},{"internalType":"address","name":"_dest","type":"address"}],"name":"withdrawToken","outputs":[],"stateMutability":"nonpayable","type":"function"}];
const bulkCheckoutAddress = "0x7d655c57f71464B6f83811C55D84009Cd9f5221C";
const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

// For an array of objects containing numDonations and gasUsed fields, filter the list such that
// only the max gasUsed value for a given numDonations value remains
function filterDonationList(list) {
  let filteredList = [];

  for (let index = 0; index < list.length; index++) {
    let entry = list[index];

    const currentMaxIndex = filteredList.findIndex((e) => {
      return e.numDonations === entry.numDonations;
    });
    const isNewMax =
      currentMaxIndex === -1 || filteredList[currentMaxIndex].gasUsed < entry.gasUsed;

    if (isNewMax) {
      // remove existing entry
      if (currentMaxIndex > -1) {
        filteredList.splice(currentMaxIndex, 1);
      }

      // add new entry
      filteredList.push(entry);
    }
  }

  return filteredList;
}

// Main execution
(async function () {
  // Setup
  const provider = new ethers.providers.getDefaultProvider();
  const endBlock = await provider.getBlockNumber();
  const contract = new ethers.Contract(bulkCheckoutAddress, bulkCheckoutAbi, provider);

  // Get list of all events with tx hashes that are from Dai donations
  const startBlock = 10245999; // block contract was deployed at
  const logs = await contract.queryFilter("DonationSent", startBlock, endBlock);
  const events = logs.map((log) => {
    return {
      event: contract.interface.parseLog(log),
      txHash: log.transactionHash,
    };
  });

  // Get list of transaction hashes that used exclusively Dai
  const daiOnlyTxs = events
    .filter((event) => event.event.args.token === daiAddress) // ensure token used was Dai
    .map((event) => event.txHash) // only save off tx hash
    .filter((txHash, index, array) => array.indexOf(txHash) === index); // only keep unique ones
  console.log(`${daiOnlyTxs.length} Dai-only transactions found`);

  // Get array of objects containing gasUsed and number of donations
  const promises = daiOnlyTxs.map((txHash) => provider.getTransactionReceipt(txHash));
  const receipts = await Promise.all(promises);
  const rawData = receipts.map((receipt) => {
    return {
      gasUsed: Number(receipt.gasUsed.toString()),
      // Number of donations made in that transactions is half the total number of events because
      // the only events are Transfer and DonationSent and both are emitted with each donation
      numDonations: receipt.logs.length / 2,
    };
  });

  // Plot raw data
  const rawPlotData = [
    {
      x: rawData.map((tx) => tx.numDonations),
      y: rawData.map((tx) => tx.gasUsed),
      type: "scatter",
      mode: "markers",
    },
  ];
  const layout1 = {
    title: "Number of Donations vs. Gas Used, All",
    xaxis: { title: "Number of Donations" },
    yaxis: { title: "Gas used" },
  };
  const plotSettings1 = {
    layout: layout1,
    fileopt: "overwrite",
    filename: "donationCount-vs-gasUsed-all",
  };
  plotly.plot(rawPlotData, plotSettings1, function (err, msg) {
    if (err) return console.log(err);
    console.log(msg);
  });

  // Now we filter the data to only keep the most expensive tx for a given number of donations
  const filteredData = filterDonationList(rawData);

  // Plot filtered data
  const filteredPlotData = [
    {
      x: filteredData.map((tx) => tx.numDonations),
      y: filteredData.map((tx) => tx.gasUsed),
      type: "scatter",
      mode: "markers",
    },
  ];
  const layout2 = {
    title: "Number of Donations vs. Gas Used, Max Only",
    xaxis: { title: "Number of Donations" },
    yaxis: { title: "Gas used" },
  };
  const plotSettings2 = {
    layout: layout2,
    fileopt: "overwrite",
    filename: "donationCount-vs-gasUsed-max",
  };
  plotly.plot(filteredPlotData, plotSettings2, function (err, msg) {
    if (err) return console.log(err);
    console.log(msg);
  });
})();
