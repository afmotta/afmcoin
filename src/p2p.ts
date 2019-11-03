import WebSocket from "ws";
import Block from "./Block";
import {
  addBlockToChain,
  getBlockchain,
  getLatestBlock,
  isValidBlockStructure,
  replaceChain
} from "./blockchain";

const sockets: WebSocket[] = [];

enum MessageType {
  QUERY_LATEST = 0,
  QUERY_ALL = 1,
  RESPONSE_BLOCKCHAIN = 2
}

class Message {
  public type: MessageType;
  public data: unknown;
}

const JSONToObject = <T>(data: string): T => {
  try {
    return JSON.parse(data);
  } catch (e) {
    console.log(e);
    return null;
  }
};

const write = (ws: WebSocket, message: Message): void =>
  ws.send(JSON.stringify(message));

const broadcast = (message: Message): void =>
  sockets.forEach(socket => write(socket, message));

const responseLatestMsg = (): Message => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify([getLatestBlock()])
});

const queryChainLengthMsg = (): Message => ({
  type: MessageType.QUERY_LATEST,
  data: null
});

const queryAllMsg = (): Message => ({
  type: MessageType.QUERY_ALL,
  data: null
});

const responseChainMsg = (): Message => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify(getBlockchain())
});

const handleBlockchainResponse = (receivedBlocks: Block[]): void => {
  if (receivedBlocks.length === 0) {
    console.log("received block chain size of 0");
    return;
  }
  const latestBlockReceived: Block = receivedBlocks[receivedBlocks.length - 1];
  if (!isValidBlockStructure(latestBlockReceived)) {
    console.log("block structuture not valid");
    return;
  }
  const latestBlockHeld: Block = getLatestBlock();
  if (latestBlockReceived.index > latestBlockHeld.index) {
    console.log(
      `blockchain possibly behind. We got: ${latestBlockHeld.index}. Peer got: ${latestBlockReceived.index}`
    );
    if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
      if (addBlockToChain(latestBlockReceived)) {
        broadcast(responseLatestMsg());
      }
    } else if (receivedBlocks.length === 1) {
      console.log("We have to query the chain from our peer");
      broadcast(queryAllMsg());
    } else {
      console.log("Received blockchain is longer than current blockchain");
      replaceChain(receivedBlocks);
    }
  } else {
    console.log(
      "received blockchain is not longer than received blockchain. Do nothing"
    );
  }
};

const initMessageHandler = (ws: WebSocket): void => {
  ws.on("message", (data: string) => {
    const message: Message = JSONToObject<Message>(data);
    if (message === null) {
      console.log(`could not parse received JSON message: ${data}`);
      return;
    }
    console.log(`Received message ${JSON.stringify(message)}`);
    if (message.type === MessageType.QUERY_LATEST) {
      write(ws, responseLatestMsg());
    }
    if (message.type === MessageType.QUERY_ALL) {
      write(ws, responseChainMsg());
    }
    if (message.type === MessageType.RESPONSE_BLOCKCHAIN) {
      const receivedBlocks: Block[] = JSONToObject<Block[]>(
        message.data as string
      );
      if (receivedBlocks === null) {
        console.log(`invalid blocks received: ${message.data}`);
      }
      handleBlockchainResponse(receivedBlocks);
    }
  });
};

const initErrorHandler = (ws: WebSocket): void => {
  const closeConnection = (myWs: WebSocket): void => {
    console.log(`connection failed to peer: ${myWs.url}`);
    sockets.splice(sockets.indexOf(myWs), 1);
  };
  ws.on("close", () => closeConnection(ws));
  ws.on("error", () => closeConnection(ws));
};

const initConnection = (ws: WebSocket): void => {
  sockets.push(ws);
  initMessageHandler(ws);
  initErrorHandler(ws);
  write(ws, queryChainLengthMsg());
};

export const initP2PServer = (p2pPort: number): void => {
  const server: WebSocket.Server = new WebSocket.Server({ port: p2pPort });
  server.on("connection", (ws: WebSocket) => {
    initConnection(ws);
  });
  console.log(`listening websocket p2p port on: ${p2pPort}`);
};

export const getSockets = (): WebSocket[] => sockets;

export const broadcastLatest = (): void => {
  broadcast(responseLatestMsg());
};

export const connectToPeers = (newPeer: string): void => {
  const ws: WebSocket = new WebSocket(newPeer);
  ws.on("open", () => {
    initConnection(ws);
  });
  ws.on("error", () => {
    console.log("connection failed");
  });
};
