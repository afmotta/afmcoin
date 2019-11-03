import CryptoJS from "crypto-js";
import Block from "./Block";
import { broadcastLatest } from "./p2p";

export const calculateHash = (
  index: number,
  previousHash: string,
  timestamp: number,
  data: string
): string =>
  CryptoJS.SHA256(index + previousHash + timestamp + data).toString();

const calculateHashForBlock = (block: Block): string =>
  calculateHash(block.index, block.previousHash, block.timestamp, block.data);

export const genesisBlock: Block = new Block(
  0,
  "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7",
  null,
  1465154705,
  "AFM Chain genesis block"
);

let blockchain: Block[] = [genesisBlock];

export const getBlockchain = (): Block[] => blockchain;

export const getLatestBlock = (): Block => blockchain[blockchain.length - 1];

export const generateNextBlock = (blockData: string): Block => {
  const previousBlock: Block = getLatestBlock();
  const nextIndex: number = previousBlock.index + 1;
  const nextTimestamp: number = new Date().getTime() / 1000;
  const nextHash: string = calculateHash(
    nextIndex,
    previousBlock.hash,
    nextTimestamp,
    blockData
  );
  const newBlock: Block = new Block(
    nextIndex,
    nextHash,
    previousBlock.hash,
    nextTimestamp,
    blockData
  );
  return newBlock;
};

export const isValidBlockStructure = (block: Block): boolean =>
  typeof block.index === "number" &&
  typeof block.hash === "string" &&
  typeof block.previousHash === "string" &&
  typeof block.timestamp === "number" &&
  typeof block.data === "string";

const isValidNewBlock = (newBlock: Block, previousBlock: Block): boolean => {
  if (!isValidBlockStructure(newBlock)) {
    console.log("invalid structure");
    return false;
  }
  if (previousBlock.index + 1 !== newBlock.index) {
    console.log("invalid index");
    return false;
  }
  if (previousBlock.hash !== newBlock.previousHash) {
    console.log("invalid previoushash");
    return false;
  }
  const hashForNewBlock = calculateHashForBlock(newBlock);
  if (hashForNewBlock !== newBlock.hash) {
    console.log(`${typeof newBlock.hash} ${typeof hashForNewBlock}`);
    console.log(`invalid hash: ${hashForNewBlock} ${newBlock.hash}`);
    return false;
  }
  return true;
};

const isValidChain = (blockchainToValidate: Block[]): boolean => {
  const isValidGenesis = (block: Block): boolean =>
    JSON.stringify(block) === JSON.stringify(genesisBlock);

  if (!isValidGenesis(blockchainToValidate[0])) {
    return false;
  }

  for (let i = 1; i < blockchainToValidate.length; i += 1) {
    if (
      !isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])
    ) {
      return false;
    }
  }
  return true;
};

export const addBlockToChain = (newBlock: Block): boolean => {
  if (isValidNewBlock(newBlock, getLatestBlock())) {
    blockchain.push(newBlock);
    return true;
  }
  return false;
};

export const replaceChain = (newBlocks: Block[]): void => {
  if (isValidChain(newBlocks) && newBlocks.length > getBlockchain().length) {
    console.log(
      "Received blockchain is valid. Replacing current blockchain with received blockchain"
    );
    blockchain = newBlocks;
    broadcastLatest();
  } else {
    console.log("Received blockchain invalid");
  }
};

export const addBlock = (newBlock: Block): void => {
  if (isValidNewBlock(newBlock, getLatestBlock())) {
    blockchain.push(newBlock);
  }
};
