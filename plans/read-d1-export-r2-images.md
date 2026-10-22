# Plan: các lệnh đọc D1 và xuất ảnh từ R2 local

Ngày tổng hợp: 2026-10-19.

Tài liệu ghi lại các lệnh Codex đã dùng để chẩn đoán D1, đọc metadata ảnh và lấy ảnh từ R2 trong phiên làm việc này, cùng mẫu lệnh do `smoke-upload.ts` tạo. Việc viết tài liệu không chạy lại các lệnh dữ liệu bên dưới. Nếu cần thực hiện thêm, chờ người dùng duyệt theo `AGENTS.md`.

## 1. Thư mục chạy và tài nguyên

Chạy từ workspace root:

```bash
cd /home/tien/Documents/code/texcra
```

| Thành phần           | Giá trị đang dùng                 |
| -------------------- | --------------------------------- |
| Workspace package    | `worker`                          |
| Wrangler config      | `apps/worker/wrangler.toml`       |
| D1 binding           | `DB`                              |
| D1 database name     | `texcra-db`                       |
| R2 binding           | `MEDIA_BUCKET`                    |
| R2 bucket name       | `texcra-media`                    |
| State local mặc định | `apps/worker/.wrangler/state/v3/` |

`pnpm --filter worker exec ...` chạy CLI trong `apps/worker`. Vì vậy `--config wrangler.toml` và đường dẫn `--file .wrangler/...` bên trong các lệnh này được tính từ `apps/worker`.

| Cú pháp                                 | Ý nghĩa                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `--config.verify-deps-before-run=false` | Thiết lập pnpm dùng trong repository để tránh tự cài dependency khi chạy kiểm chứng |
| `--filter worker`                       | Chọn package `worker` trong monorepo                                                |
| `exec wrangler`                         | Dùng Wrangler đã cài trong project                                                  |
| `--local`                               | Truy cập dữ liệu local trên máy                                                     |
| `--config wrangler.toml`                | Đọc cấu hình binding và tài nguyên                                                  |
| `--command "..."`                       | SQL cần thực thi trên D1                                                            |
| `--json`                                | Trả kết quả D1 dưới dạng JSON                                                       |
| `--file ...`                            | Đường dẫn file đích khi lấy object từ R2                                            |

## 2. Đọc D1: kiểm tra database đã có bảng chưa

Lệnh đã dùng để điều tra lỗi `PERSISTENCE_FAILED`:

```bash
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler d1 execute DB --local --config wrangler.toml --command "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name" --json
```

SQL:

```sql
SELECT name
FROM sqlite_master
WHERE type = 'table'
ORDER BY name;
```

Kết quả khi chẩn đoán là `results: []`: D1 local chưa có bảng ứng dụng, bao gồm `media`.

Kiểm tra migration đang chờ áp dụng:

```bash
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler d1 migrations list DB --local --config wrangler.toml
```

Kết quả khi đó có một migration chờ áp dụng:

```text
20261007141913_friendly_dormammu/migration.sql
```

### Lệnh khởi tạo đã dùng khi D1 còn trống

Đây là lệnh **thay đổi schema**, được ghi lại để giải thích bước xử lý lỗi; không phải lệnh đọc metadata hoặc tải ảnh:

```bash
pnpm --config.verify-deps-before-run=false run worker:db:migrate:local
```

Script root gọi `pnpm --filter worker run db:migrate:local`; script trong worker thực thi:

```bash
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler d1 migrations apply texcra-db --local --config wrangler.toml
```

Migration đã được áp dụng thành công trong phiên này, tạo schema D1 local. Không cần chạy bước khởi tạo để xem một ảnh đã upload thành công.

## 3. Đọc D1: tìm ảnh upload gần nhất

Lệnh đã dùng để chọn ảnh cần xuất:

```bash
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler d1 execute DB --local --config wrangler.toml --command "SELECT id, filename, url FROM media ORDER BY id DESC LIMIT 1" --json
```

SQL đầy đủ:

```sql
SELECT id, filename, url
FROM media
ORDER BY id DESC
LIMIT 1;
```

- `SELECT id, filename, url`: lấy mã bản ghi, tên original và URL.
- `FROM media`: đọc bảng metadata ảnh.
- `ORDER BY id DESC`: xếp ID từ lớn xuống nhỏ.
- `LIMIT 1`: chỉ lấy một bản ghi có ID lớn nhất.

Kết quả thực tế tại thời điểm xuất ảnh:

```json
{
  "id": 2,
  "filename": "1374cb02-259c-4746-bb28-61b60c63602c-original.png",
  "url": "http://localhost:3000/media/1374cb02-259c-4746-bb28-61b60c63602c/1374cb02-259c-4746-bb28-61b60c63602c-original.png"
}
```

Upload ID dùng trong các lệnh xuất phía dưới là `1374cb02-259c-4746-bb28-61b60c63602c`. Nếu đã upload thêm ảnh, kết quả mới có thể khác; thay upload ID trong key và đường dẫn xuất khi muốn lấy ảnh khác.

## 4. Xuất original và 7 variants từ R2

R2 object key lấy từ pathname của URL, bỏ dấu `/` đầu tiên. Ví dụ:

```text
URL:    http://localhost:3000/media/1374cb02-259c-4746-bb28-61b60c63602c/1374cb02-259c-4746-bb28-61b60c63602c-original.png
Key:    media/1374cb02-259c-4746-bb28-61b60c63602c/1374cb02-259c-4746-bb28-61b60c63602c-original.png
Bucket: texcra-media
```

`wrangler r2 object get` nhận đối số theo dạng `<bucket>/<key>`, đọc object R2 và ghi một bản sao ra file đích.

### 4.1. Tạo thư mục nhận ảnh

Lệnh chạy từ root:

```bash
mkdir -p apps/worker/.wrangler/downloads/1374cb02-259c-4746-bb28-61b60c63602c
```

### 4.2. Original PNG

```bash
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler r2 object get texcra-media/media/1374cb02-259c-4746-bb28-61b60c63602c/1374cb02-259c-4746-bb28-61b60c63602c-original.png --local --config wrangler.toml --file .wrangler/downloads/1374cb02-259c-4746-bb28-61b60c63602c/original.png
```

### 4.3. Thumbnail

```bash
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler r2 object get texcra-media/media/1374cb02-259c-4746-bb28-61b60c63602c/1374cb02-259c-4746-bb28-61b60c63602c-thumbnail.webp --local --config wrangler.toml --file .wrangler/downloads/1374cb02-259c-4746-bb28-61b60c63602c/thumbnail.webp
```

### 4.4. Square

```bash
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler r2 object get texcra-media/media/1374cb02-259c-4746-bb28-61b60c63602c/1374cb02-259c-4746-bb28-61b60c63602c-square.webp --local --config wrangler.toml --file .wrangler/downloads/1374cb02-259c-4746-bb28-61b60c63602c/square.webp
```

### 4.5. Small

```bash
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler r2 object get texcra-media/media/1374cb02-259c-4746-bb28-61b60c63602c/1374cb02-259c-4746-bb28-61b60c63602c-small.webp --local --config wrangler.toml --file .wrangler/downloads/1374cb02-259c-4746-bb28-61b60c63602c/small.webp
```

### 4.6. Medium

```bash
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler r2 object get texcra-media/media/1374cb02-259c-4746-bb28-61b60c63602c/1374cb02-259c-4746-bb28-61b60c63602c-medium.webp --local --config wrangler.toml --file .wrangler/downloads/1374cb02-259c-4746-bb28-61b60c63602c/medium.webp
```

### 4.7. Large

```bash
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler r2 object get texcra-media/media/1374cb02-259c-4746-bb28-61b60c63602c/1374cb02-259c-4746-bb28-61b60c63602c-large.webp --local --config wrangler.toml --file .wrangler/downloads/1374cb02-259c-4746-bb28-61b60c63602c/large.webp
```

### 4.8. Xlarge

```bash
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler r2 object get texcra-media/media/1374cb02-259c-4746-bb28-61b60c63602c/1374cb02-259c-4746-bb28-61b60c63602c-xlarge.webp --local --config wrangler.toml --file .wrangler/downloads/1374cb02-259c-4746-bb28-61b60c63602c/xlarge.webp
```

### 4.9. OG

```bash
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler r2 object get texcra-media/media/1374cb02-259c-4746-bb28-61b60c63602c/1374cb02-259c-4746-bb28-61b60c63602c-og.webp --local --config wrangler.toml --file .wrangler/downloads/1374cb02-259c-4746-bb28-61b60c63602c/og.webp
```

### 4.10. Xác nhận định dạng file đã xuất

Lệnh đã dùng:

```bash
file apps/worker/.wrangler/downloads/1374cb02-259c-4746-bb28-61b60c63602c/*
```

Kết quả đã kiểm tra:

| File             | Định dạng | Kích thước |
| ---------------- | --------- | ---------- |
| `original.png`   | PNG       | 1585×992   |
| `thumbnail.webp` | WebP      | 300×169    |
| `square.webp`    | WebP      | 500×500    |
| `small.webp`     | WebP      | 540×338    |
| `medium.webp`    | WebP      | 808×506    |
| `large.webp`     | WebP      | 1259×788   |
| `xlarge.webp`    | WebP      | 1585×992   |
| `og.webp`        | WebP      | 1200×630   |

Các bản sao có thể mở bằng trình xem ảnh hoặc trình duyệt tại:

```text
/home/tien/Documents/code/texcra/apps/worker/.wrangler/downloads/1374cb02-259c-4746-bb28-61b60c63602c/
```

## 5. Các lệnh đọc storage do smoke-upload.ts tạo

Ngoài những lệnh xuất thủ công ở trên, script `apps/worker/scripts/smoke-upload.ts` gọi Wrangler để kiểm tra ảnh vừa upload. Script dùng `cwd = apps/worker`; phần dưới giữ dạng lệnh tại thư mục đó.

### 5.1. Đọc lại từng object R2 vào thư mục tạm

Mẫu lệnh được tạo cho original và từng variant:

```bash
pnpm --config.verify-deps-before-run=false exec wrangler r2 object get texcra-media/<object-key> --file <temporary-output-file> --local --config wrangler.toml --persist-to /home/tien/Documents/code/texcra/apps/worker/.wrangler/state
```

`<object-key>` và `<temporary-output-file>` là placeholder, không phải nội dung chạy nguyên văn. Script tạo đường dẫn tạm bằng `mkdtemp`, lấy đủ 8 objects rồi kiểm tra checksum original, byte length và WebP headers. Các file tạm được dọn sau khi kiểm tra; chúng khác với 8 ảnh xuất cố định trong `.wrangler/downloads/`.

### 5.2. Đọc đầy đủ một row D1 bằng filename original

Trong lần smoke upload Codex chạy thành công (`mediaId = 1`), upload ID là `20240bb6-2e68-4b5f-865d-d2b3bc2d5391`. Lệnh tương ứng do script tạo:

```bash
pnpm --config.verify-deps-before-run=false exec wrangler d1 execute DB --command "SELECT * FROM media WHERE filename = '20240bb6-2e68-4b5f-865d-d2b3bc2d5391-original.png'" --json --local --config wrangler.toml --persist-to /home/tien/Documents/code/texcra/apps/worker/.wrangler/state
```

`SELECT *` lấy toàn bộ cột của row để script đối chiếu metadata original, focal point, thumbnail URL và 42 cột variant với response HTTP. Filename thay đổi theo upload ID của từng lần chạy.

### 5.3. Lệnh root đã dùng để kích hoạt smoke upload

```bash
pnpm --config.verify-deps-before-run=false run worker:smoke:upload apps/worker/public/images/continuum-craft.png
```

Lệnh này **tạo upload mới** qua HTTP trước khi kiểm tra R2/D1; không cần chạy lại nó nếu chỉ muốn đọc hoặc xuất một ảnh đã có.

## 6. Các lệnh đã dùng để xác định thư mục storage

Liệt kê SQLite state local lúc chẩn đoán D1:

```bash
rg --files apps/worker/.wrangler/state -g '*.sqlite' -g '!agent-do-not-touch/**'
```

Liệt kê file R2 local, bao gồm blob và metadata:

```bash
rg --files --hidden --no-ignore apps/worker/.wrangler/state/v3/r2
```

Blob vật lý nằm trong:

```text
apps/worker/.wrangler/state/v3/r2/texcra-media/blobs/
```

Tên blob là tên nội bộ của Wrangler. Các lệnh `r2 object get` ở bước 4 tra cứu theo object key để xuất đúng dữ liệu với tên `.png`/`.webp` dễ mở.

## 7. State tùy chỉnh và kết quả cần đạt

Các lệnh trực tiếp ở bước 2–4 dùng state mặc định. Nếu Worker chạy với `--persist-to /some/state`, thêm cùng `--persist-to /some/state` vào các lệnh `d1 execute`, `d1 migrations list` và `r2 object get` để đọc đúng dữ liệu của phiên đó. Với CLI, truyền thư mục state gốc; Wrangler tự quản lý thư mục con `v3`.

Kết quả cần đạt khi thực hiện lại phần đọc/xuất:

1. Xác định được row D1 và upload ID cần xem.
2. Lấy đúng original cùng 7 variants từ bucket `texcra-media`.
3. Có 8 file có tên và định dạng rõ ràng trong thư mục download.
4. Phân biệt được metadata D1, object key R2 và blob vật lý mà Wrangler quản lý.

## 8. Nội dung cần xác nhận

Bản này giữ upload ID và đường dẫn thực tế để đối chiếu lịch sử. Người dùng xác nhận có cần thêm bản rút gọn dùng biến `UPLOAD_ID` để tái sử dụng cho lần upload khác hay không.
