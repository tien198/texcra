export interface SidecarNodeState {
  readonly nodeId: string
  readonly activeLoad: number
  readonly maxCapacity: number
  readonly isWarm: boolean
}

export interface IBinPacker {
  // eslint-disable-next-line @typescript-eslint/method-signature-style
  rankNodes(
    nodes: readonly SidecarNodeState[],
    weight?: number,
  ): SidecarNodeState[]
  // eslint-disable-next-line @typescript-eslint/method-signature-style
  selectNode(
    nodes: readonly SidecarNodeState[],
    weight?: number,
  ): SidecarNodeState | null
}
