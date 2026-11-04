export interface IShardRouter {
  // eslint-disable-next-line @typescript-eslint/method-signature-style
  resolveShardName(semanticHash: string): string
}
