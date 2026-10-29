import type { IBinPacker, SidecarNodeState } from '#/core/ports/bin-packer.port'

export class FillFirstBinPackerAdapter implements IBinPacker {
  public rankNodes(
    nodes: readonly SidecarNodeState[],
    weight: number = 1,
  ): SidecarNodeState[] {
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new RangeError('weight must be a positive finite number.')
    }

    return nodes
      .filter(
        (node) =>
          Number.isFinite(node.activeLoad) &&
          Number.isFinite(node.maxCapacity) &&
          node.activeLoad >= 0 &&
          node.maxCapacity > 0 &&
          node.activeLoad + weight <= node.maxCapacity,
      )
      .slice()
      .sort((a, b) => {
        if (a.isWarm !== b.isWarm) {
          return a.isWarm ? -1 : 1
        }
        if (b.activeLoad !== a.activeLoad) {
          return b.activeLoad - a.activeLoad
        }
        return a.nodeId.localeCompare(b.nodeId)
      })
  }

  public selectNode(
    nodes: readonly SidecarNodeState[],
    weight: number = 1,
  ): SidecarNodeState | null {
    return this.rankNodes(nodes, weight)[0] ?? null
  }
}
