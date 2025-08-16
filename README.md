1) Cài Vercel CLI (tùy chọn để dev local):
   npm i -g vercel

2) Tạo thư mục & copy file theo cấu trúc phía trên. Lưu ý: 
   - index.html, app.js, styles.css đặt ở root.
   - Tạo thư mục api và đặt todos.js vào đó.
   - package.json ở root.

3) (Tùy chọn – Lưu trữ bền) Tạo database Upstash Redis và lấy 2 biến môi trường:
   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
   Lên Vercel > Project > Settings > Environment Variables > thêm 2 biến này.

4) Deploy:
   - Dùng CLI: trong thư mục dự án chạy `vercel` rồi `vercel --prod`.
   - Hoặc push repo lên GitHub và Import vào Vercel (Zero-config).

5) Truy cập: https://<tên-dự-án>.vercel.app
   API sẽ ở: /api/todos

Ghi chú: Không cần Express. Vercel Functions dùng native Node handler như file api/todos.js ở trên.
Front-end có fallback localStorage nên dùng được ngay cả khi chưa cấu hình Redis.
