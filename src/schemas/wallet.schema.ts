import { z } from 'zod';

export const CreateWalletSchema = z.object({
  name: z.string().min(1).max(50),
  chain: z.enum(['ETHEREUM', 'BITCOIN']),
});

export const DeriveAddressSchema = z.object({
  walletId: z.string().uuid(),
});

export type CreateWalletInput = z.infer<typeof CreateWalletSchema>;
export type DeriveAddressInput = z.infer<typeof DeriveAddressSchema>;