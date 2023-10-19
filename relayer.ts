import * as dotenv from 'dotenv';
import { ethers } from 'ethers'
import { GelatoRelayPack } from '@safe-global/relay-kit'
import Safe, { EthersAdapter, getSafeContract } from '@safe-global/protocol-kit'
import { MetaTransactionData, MetaTransactionOptions, OperationType, RelayTransaction } from '@safe-global/safe-core-sdk-types'
import "axios";
import axios from 'axios';

dotenv.config();

// Customize the following variables
// https://chainlist.org
const RPC_URL = process.env.RPC_URL!
const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
const signer = new ethers.Wallet(process.env.OWNER_1_PRIVATE_KEY!, provider)
const safeAddress = '0x26934E3C66BEbC61ACE5Fb31088FeD70C51D3EAF' // Safe from which the transaction will be sent. Replace with your Safe address
const chainId = 5

// This mints 1 wei worth of token to user
const data = '0x40c10f1900000000000000000000000026934e3c66bebc61ace5fb31088fed70c51d3eaf0000000000000000000000000000000000000000000000000de0b6b3a7640000'

// Get Gelato Relay API Key: https://relay.gelato.network/
const GELATO_RELAY_API_KEY = process.env.GELATO_RELAY_API_KEY!

// Usually a limit of 21000 is used but for smart contract interactions, you can increase to 100000 because of the more complex interactions.
const gasLimit = '100000'

// Create a transaction object
const safeTransactionData: MetaTransactionData = {
  to: "0x04da0f65b6EA3AC7FeF68BE33eE758f07af1C86a",
  data,
  value: '0x0',
  operation: OperationType.Call
}
const options: MetaTransactionOptions = {
  gasLimit,
  isSponsored: true
}

// Create the Protocol and Relay Kits instances

export async function relayTransaction() {
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: signer
  })

  const safeSDK = await Safe.create({
    ethAdapter,
    safeAddress
  })

  const relayKit = new GelatoRelayPack(GELATO_RELAY_API_KEY)

  // Prepare the transaction
  const safeTransaction = await safeSDK.createTransaction({
    safeTransactionData
  })

  const signedSafeTx = await safeSDK.signTransaction(safeTransaction)
  const safeSingletonContract = await getSafeContract({ ethAdapter, safeVersion: await safeSDK.getContractVersion() })

  const encodedTx = safeSingletonContract.encode('execTransaction', [
    signedSafeTx.data.to,
    signedSafeTx.data.value,
    signedSafeTx.data.data,
    signedSafeTx.data.operation,
    signedSafeTx.data.safeTxGas,
    signedSafeTx.data.baseGas,
    signedSafeTx.data.gasPrice,
    signedSafeTx.data.gasToken,
    signedSafeTx.data.refundReceiver,
    signedSafeTx.encodedSignatures()
  ])

  const relayTransaction: RelayTransaction = {
    target: safeAddress,
    encodedTransaction: encodedTx,
    chainId: chainId,
    options
  }
  const response = await relayKit.relayTransaction(relayTransaction)

  console.log(`Relay Transaction Task ID: https://relay.gelato.digital/tasks/status/${response.taskId}`)
  const taskResp = await axios.get(`https://relay.gelato.digital/tasks/status/${response.taskId}`);
  return taskResp.data;
}
