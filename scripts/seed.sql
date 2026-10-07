-- Seed Users
INSERT INTO users (id, name, email, updated_at, created_at)
VALUES 
  (1, 'Admin User', 'admin@example.com', unixepoch() * 1000, unixepoch() * 1000),
  (2, 'Guest User', 'guest@example.com', unixepoch() * 1000, unixepoch() * 1000);

-- Seed Authors
INSERT INTO authors (id, name, bio, user_id, updated_at, created_at)
VALUES 
  (1, 'Admin Author', 'The main admin author of the blog.', 1, unixepoch() * 1000, unixepoch() * 1000),
  (2, 'Guest Author', 'A guest author.', 2, unixepoch() * 1000, unixepoch() * 1000);

-- Seed Categories
INSERT INTO categories (id, title, generate_slug, slug, updated_at, created_at)
VALUES 
  (1, 'Technology', 1, 'technology', unixepoch() * 1000, unixepoch() * 1000),
  (2, 'Lifestyle', 1, 'lifestyle', unixepoch() * 1000, unixepoch() * 1000),
  (3, 'Web Development', 1, 'web-development', unixepoch() * 1000, unixepoch() * 1000);

-- Update Category 3 to be child of Category 1
UPDATE categories SET parent_id = 1 WHERE id = 3;

-- Seed Posts
INSERT INTO posts (id, title, content, meta_title, meta_description, slug, status, updated_at, created_at)
VALUES 
  (1, 'Hello World', '{"root":{"children":[{"type":"paragraph","children":[{"type":"text","text":"This is my first post!","version":1}]}],"direction":null,"format":"","indent":0,"type":"root","version":1}}', 'Hello World', 'My very first post', 'hello-world', 'published', unixepoch() * 1000, unixepoch() * 1000),
  (2, 'Drizzle ORM and D1', '{"root":{"children":[{"type":"paragraph","children":[{"type":"text","text":"Using Drizzle with Cloudflare D1 is amazing.","version":1}]}],"direction":null,"format":"","indent":0,"type":"root","version":1}}', 'Drizzle ORM and D1', 'Drizzle ORM + D1', 'drizzle-orm-and-d1', 'published', unixepoch() * 1000, unixepoch() * 1000),
  (3, 'Draft Post', '{"root":{"children":[{"type":"paragraph","children":[{"type":"text","text":"This is a draft post.","version":1}]}],"direction":null,"format":"","indent":0,"type":"root","version":1}}', 'Draft Post', 'A draft post', 'draft-post', 'draft', unixepoch() * 1000, unixepoch() * 1000);

-- Seed posts_categories
INSERT INTO posts_categories (parent_id, category_id, "order")
VALUES 
  (1, 2, 1),
  (2, 1, 1),
  (2, 3, 2);

-- Seed posts_populated_authors
INSERT INTO posts_populated_authors (id, parent_id, author_id, name, "order")
VALUES 
  ('auth_post1', 1, 1, 'Admin Author', 1),
  ('auth_post2', 2, 1, 'Admin Author', 1),
  ('auth_post3', 3, 2, 'Guest Author', 1);
