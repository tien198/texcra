import type { IShardRouter } from '#/core/ports/shard-router.port'

const HEX_PREFIX_PATTERN = /^[0-9a-fA-F]{8,}$/

export class SemanticShardRouterAdapter implements IShardRouter {
  public constructor(
    private readonly shardCount: number = 5,
    private readonly prefix: string = 'coordinator-shard',
  ) {
    if (!Number.isSafeInteger(shardCount) || shardCount <= 0) {
      throw new RangeError('shardCount must be a positive safe integer.')
    }
    if (!prefix.trim()) {
      throw new TypeError('prefix must be a non-empty string.')
    }
  }

  public resolveShardName(semanticHash: string): string {
    const normalized = semanticHash.trim()
    if (!HEX_PREFIX_PATTERN.test(normalized)) {
      throw new TypeError(
        'semanticHash must be a valid hex string of at least 8 characters.',
      )
    }

    const head = Number.parseInt(normalized.slice(0, 8), 16) >>> 0
    const shardIndex = head % this.shardCount
    return `${this.prefix}-${shardIndex}`
  }
}
