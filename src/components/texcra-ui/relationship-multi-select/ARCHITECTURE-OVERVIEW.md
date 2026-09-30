## 1. Main Goal

1. **Server-side pagination** — Create a TanStack Start server function that returns options in paginated chunks, with search/filter support
2. **Async search** — Typing in the select triggers server-side queries via `AsyncPaginate`'s `loadOptions`

## 2. Architecture Overview

```mermaid
flowchart TD
    subgraph "Client (Browser)"
        A["AsyncPaginate Component"] -->|"loadOptions(search, page)"| B["Server Function Call"]
        A -->|"scroll to bottom"| A2["Load Next Page"]
        A2 -->|"loadOptions(search, page+1)"| B
    end

    subgraph "Server (TanStack Start)"
        B -->|"RPC"| C["getRelationshipOptionsServerFn"]
        C --> D["Filter by search"]
        D --> E["Paginate: slice(offset, offset+limit)"]
        E --> F["Return { options, hasMore }"]
    end

    F -->|"Response"| A
```

---

### Dependency

Install `react-select-async-paginate`:

```bash
pnpm add react-select-async-paginate
```
