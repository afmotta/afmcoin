import * as bodyParser from "body-parser";
import express from "express";

import Block from "./Block";
import { generateNextBlock, getBlockchain } from "./blockchain";
import { connectToPeers, getSockets, initP2PServer } from "./p2p";

const httpPort: number = parseInt(process.env.HTTP_PORT, 10) || 3001;
const p2pPort: number = parseInt(process.env.P2P_PORT, 10) || 6001;

const initHttpServer = (myHttpPort: number): void => {
  const app = express();
  app.use(bodyParser.json());

  app.get("/blocks", (req, res) => {
    res.send(getBlockchain());
  });
  app.post("/mineBlock", (req, res) => {
    const newBlock: Block = generateNextBlock(req.body.data);
    res.send(newBlock);
  });
  app.get("/peers", (req, res) => {
    res.send(
      getSockets().map(
        (s: any) => `${s._socket.remoteAddress}:${s._socket.remotePort}`
      )
    );
  });
  app.post("/addPeer", (req, res) => {
    connectToPeers(req.body.peer);
    res.send();
  });

  app.listen(myHttpPort, () => {
    console.log(`Listening http on port: ${myHttpPort}`);
  });
};
3
initHttpServer(httpPort);
initP2PServer(p2pPort);
