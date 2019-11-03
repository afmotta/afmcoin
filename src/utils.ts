import CryptoJS from "crypto-js";
import Block from "./Block";

export const calculateHash = (
  index: number,
  previousHash: string,
  timestamp: number,
  data: string
): string =>
  CryptoJS.SHA256(index + previousHash + timestamp + data).toString();

export const genesisBlock: Block = new Block(
  0,
  "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7",
  null,
  1465154705,
  "AFM Chain genesis block"
);
