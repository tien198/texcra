/plan Propose plan.
The goal is to bypass the Worker's 128MB V8 Isolate memory limit by offloading heavy image manipulation to a Cloudflare Container, processing the image immediately upon upload, and serving it directly from R2 to minimize compute costs and avoid cold starts.

# Tech Stack

- **API/Gateway:** Cloudflare Workers (TypeScript)
- **Processing Environment:** Cloudflare Containers (Linux + Node.js)
- **Image Processing Library:** `sharp` (C/C++ native, running inside the Container)
- **Storage:** Cloudflare R2

# Architectural Flow to Implement

## 1. Write-Path (Upload & Process)

- **Worker:** Receives the multipart/form-data upload request from the client. Authenticates the request.
- **Worker -> Container:** Instead of loading the file into RAM, the Worker MUST stream the uploaded file directly to the Cloudflare Container using `fetch()` and `ReadableStream`.
- **Container (`sharp`):**
  - Receives the stream.
  - Processes the image into variants that defined in dbml schema below (optimized WebP/AVIF).
  - Streams/Uploads the processed variants directly into the Cloudflare R2 bucket.
- **Response:** The Container replies to the Worker with the final R2 object keys/URLs, and the Worker returns this JSON to the client.

- The image upload with the _**focal and crop**_, reference the following types, _**edit it if neccessary**, splite Interface and Implementation (for Adapter Pattern)
  to ensure the image process governance: 2D Screen/Canvas Coordinate System

```typescript
// Định nghĩa vị trí cắt ảnh (Bounding Box)
export interface CropData {
  x: number
  y: number
  width: number
  height: number
  unit?: 'px' | '%' // Hỗ trợ crop theo pixel tuyệt đối hoặc % tương đối
  rotation?: number
  focalPoint?: { x: number; y: number } // Điểm neo trọng tâm, hữu ích khi hiển thị responsive
}

// Cấu hình cho từng phiên bản ảnh xuất ra (thumbnail, large, webp...)
export interface VariantConfig {
  id: string // VD: 'thumbnail', 'hero', 'original'
  width?: number
  height?: number
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
  quality?: number // 1 - 100
}

// Định dạng dữ liệu đầu vào chuẩn hóa
export interface ImageFile {
  data: File | Blob | Buffer | Uint8Array // Đa hình: chạy được trên Browser, Node.js, hoặc Edge (Worker)
  filename: string
  mimeType: string
}

// interfaces/IImageProcessor.ts
export interface ProcessImageResult {
  thumbnailUrl: string
  largeUrl: string
}

export interface IImageProcessor {
  // Nhận vào luồng ảnh từ client và trả về thông tin ảnh đã lưu
  uploadAndProcess(
    imageStream: ReadableStream,
    fileName: string,
  ): Promise<ProcessImageResult>
}
```

Make Processing Environment as an Adapter.

**Ensure that the variants follow the schema (the schema is prerequisite):**

```dbml
Table "media" {
  "id" integer [pk]
  "alt" text
  "caption" text
  "folder_id" integer
  "updated_at" integer [not null, default: 0]
  "created_at" integer [not null, default: 0]
  "url" text
  "thumbnail_u_r_l" text
  "filename" text
  "mime_type" text
  "filesize" numeric
  "width" numeric
  "height" numeric
  "focal_x" numeric
  "focal_y" numeric
  "sizes_thumbnail_url" text
  "sizes_thumbnail_width" numeric
  "sizes_thumbnail_height" numeric
  "sizes_thumbnail_mime_type" text
  "sizes_thumbnail_filesize" numeric
  "sizes_thumbnail_filename" text
  "sizes_square_url" text
  "sizes_square_width" numeric
  "sizes_square_height" numeric
  "sizes_square_mime_type" text
  "sizes_square_filesize" numeric
  "sizes_square_filename" text
  "sizes_small_url" text
  "sizes_small_width" numeric
  "sizes_small_height" numeric
  "sizes_small_mime_type" text
  "sizes_small_filesize" numeric
  "sizes_small_filename" text
  "sizes_medium_url" text
  "sizes_medium_width" numeric
  "sizes_medium_height" numeric
  "sizes_medium_mime_type" text
  "sizes_medium_filesize" numeric
  "sizes_medium_filename" text
  "sizes_large_url" text
  "sizes_large_width" numeric
  "sizes_large_height" numeric
  "sizes_large_mime_type" text
  "sizes_large_filesize" numeric
  "sizes_large_filename" text
  "sizes_xlarge_url" text
  "sizes_xlarge_width" numeric
  "sizes_xlarge_height" numeric
  "sizes_xlarge_mime_type" text
  "sizes_xlarge_filesize" numeric
  "sizes_xlarge_filename" text
  "sizes_og_url" text
  "sizes_og_width" numeric
  "sizes_og_height" numeric
  "sizes_og_mime_type" text
  "sizes_og_filesize" numeric
  "sizes_og_filename" text

  Indexes {
    created_at [name: "media_created_at_idx"]
    filename [unique, name: "media_filename_idx"]
    folder_id [name: "media_folder_idx"]
    sizes_large_filename [name: "media_sizes_large_sizes_large_filename_idx"]
    sizes_medium_filename [name: "media_sizes_medium_sizes_medium_filename_idx"]
    sizes_og_filename [name: "media_sizes_og_sizes_og_filename_idx"]
    sizes_small_filename [name: "media_sizes_small_sizes_small_filename_idx"]
    sizes_square_filename [name: "media_sizes_square_sizes_square_filename_idx"]
    sizes_thumbnail_filename [name: "media_sizes_thumbnail_sizes_thumbnail_filename_idx"]
    sizes_xlarge_filename [name: "media_sizes_xlarge_sizes_xlarge_filename_idx"]
    updated_at [name: "media_updated_at_idx"]
  }
}

```

# Key Constraints & Requirements

1. **Memory Safety:** You must use streams (`TransformStream`, `.pipe()`, or `pipeline`) across the Worker and Container. Never load the entire image buffer into memory on the Worker.
2. **Container Setup:** Provide a complete `Dockerfile` that installs Node.js, `sharp`, and necessary Linux dependencies.
3. **Infrastructure as Code:** Provide the `wrangler.toml` configuration mapping the Worker, the R2 bucket bindings, and the Container configuration.

Ensure the code is robust, fully typed, and includes basic error handling for stream failures.

```






```

/plan Refine the plan.

- R2 bucket name: texcra-media
- R2 public access: variants be served via R2 public bucket
- Variant dimensions — The DB schema defines 7 size variants. Use following dimensions:

| Variant     | Max Width | Max Height | Format | Quality |
| ----------- | --------- | ---------- | ------ | ------- |
| `thumbnail` | 300       | 169        | webp   | 80      |
| `square`    | 500       | 500        | webp   | 80      |
| `small`     | 600       | 338        | webp   | 80      |
| `medium`    | 900       | 506        | webp   | 82      |
| `large`     | 1400      | 788        | webp   | 82      |
| `xlarge`    | 1920      | 1080       | webp   | 85      |
| `og`        | 1200      | 630        | webp   | 85      |

- Using Durable Object Container API for image processing
