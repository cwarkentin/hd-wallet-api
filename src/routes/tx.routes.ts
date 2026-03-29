import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { WalletService } from '../services/wallet.service.js';
import { EthService } from '../services/eth.service.js';
import { BtcService } from '../services/btc.service.js';
import { decrypt } from '../crypto/encryption.js';
import { deriveWallet } from '../crypto/hd.js';
import { buildBitcoinTx } from '../crypto/btc.js';

// ---- Schemas ----

const SendEthSchema = z.object({
  walletId: z.string().uuid(),
  fromIndex: z.number().int().min(0).default(0),
  toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  amountEth: z.string().regex(/^\d+(\.\d+)?$/, 'Invalid amount'),
});

const SendBtcSchema = z.object({
  walletId: z.string().uuid(),
  fromIndex: z.number().int().min(0).default(0),
  toAddress: z.string().min(10),
  amountSats: z.number().int().min(546), // dust threshold
  feeRate: z.enum(['slow', 'standard', 'fast']).default('standard'),
});

// ---- Routes ----

const txRoutes: FastifyPluginAsync = async (server) => {
  const walletService = new WalletService(server.prisma);
  const ethService = new EthService();
  const btcService = new BtcService();

  // POST /tx/eth/send
  server.post('/eth/send', async (request, reply) => {
    const body = SendEthSchema.parse(request.body);

    // 1. Load wallet and decrypt mnemonic
    const wallet = await walletService.getWallet(body.walletId);
    if (wallet.chain !== 'ETHEREUM') {
      return reply.code(400).send({ error: 'Wallet is not an Ethereum wallet' });
    }

    const mnemonic = decrypt(wallet.encryptedMnemonic);

    // 2. Derive the private key for the requested address index
    const { privateKey, address: fromAddress } = await deriveWallet(
      mnemonic,
      'ETHEREUM',
      body.fromIndex
    );

    // 3. Sign and broadcast
    const result = await ethService.signAndBroadcast({
      privateKeyHex: privateKey,
      toAddress: body.toAddress,
      amountEth: body.amountEth,
      fromAddress,
    });

    return reply.code(201).send({
      from: fromAddress,
      to: body.toAddress,
      amountEth: body.amountEth,
      ...result,
    });
  });

  // POST /tx/btc/send
  server.post('/btc/send', async (request, reply) => {
    const body = SendBtcSchema.parse(request.body);

    // 1. Load wallet and decrypt mnemonic
    const wallet = await walletService.getWallet(body.walletId);
    if (wallet.chain !== 'BITCOIN') {
      return reply.code(400).send({ error: 'Wallet is not a Bitcoin wallet' });
    }

    const mnemonic = decrypt(wallet.encryptedMnemonic);

    // 2. Derive the private key and address
    const { privateKey, address: fromAddress } = await deriveWallet(
      mnemonic,
      'BITCOIN',
      body.fromIndex
    );

    // 3. Fetch UTXOs and fee estimates
    const [utxos, feeEstimates] = await Promise.all([
      btcService.getUTXOs(fromAddress),
      btcService.getFeeEstimates(),
    ]);

    if (utxos.length === 0) {
      return reply.code(400).send({ error: 'No UTXOs available — address has no funds' });
    }

    const feeRate = feeEstimates[body.feeRate];

    // 4. Build and sign the transaction
    const rawTxHex = buildBitcoinTx({
      utxos,
      toAddress: body.toAddress,
      amount: body.amountSats,
      changeAddress: fromAddress, // send change back to same address
      feeRate,
      privateKeyHex: privateKey,
    });

    // 5. Broadcast
    const result = await btcService.broadcast(rawTxHex);

    return reply.code(201).send({
      from: fromAddress,
      to: body.toAddress,
      amountSats: body.amountSats,
      feeRate,
      ...result,
    });
  });

  // GET /tx/eth/history/:walletId
  server.get<{ Params: { walletId: string } }>('/eth/history/:walletId', async (request, reply) => {
    const wallet = await walletService.getWallet(request.params.walletId);
    if (wallet.chain !== 'ETHEREUM') {
      return reply.code(400).send({ error: 'Wallet is not an Ethereum wallet' });
    }

    const history = await Promise.all(
      wallet.addresses.map(async (addr) => {
        const txs = await ethService.getTransactionHistory(addr.address);
        return { address: addr.address, ...txs };
      })
    );

    return reply.send({ walletId: wallet.id, history });
  });

  // GET /tx/btc/history/:walletId
  server.get<{ Params: { walletId: string } }>('/btc/history/:walletId', async (request, reply) => {
    const wallet = await walletService.getWallet(request.params.walletId);
    if (wallet.chain !== 'BITCOIN') {
      return reply.code(400).send({ error: 'Wallet is not a Bitcoin wallet' });
    }

    const history = await Promise.all(
      wallet.addresses.map(async (addr) => {
        const txs = await btcService.getTransactionHistory(addr.address);
        return { address: addr.address, transactions: txs };
      })
    );

    return reply.send({ walletId: wallet.id, history });
  });

  // GET /tx/btc/fees
  server.get('/btc/fees', async (_request, reply) => {
    const fees = await btcService.getFeeEstimates();
    return reply.send(fees);
  });
};

export default txRoutes;